import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Bootstrap } from "./state.js";

type AuthConfig = Bootstrap["auth"];
type AuthListener = (user: User | null) => void;
const ACCOUNT_FILES_BUCKET = "advisor-files";

export interface StoredAccountFile {
  readonly path: string;
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
  readonly createdAt: string;
}

let config: AuthConfig = {
  required: false,
  configured: false,
  supabaseUrl: "",
  publishableKey: "",
  googleEnabled: false,
};
let client: SupabaseClient | null = null;
let session: Session | null = null;
let ready: Promise<void> = Promise.resolve();
const listeners = new Set<AuthListener>();

const notify = (): void => {
  for (const listener of listeners) listener(session?.user ?? null);
};

export function initAuth(next: AuthConfig): Promise<void> {
  config = next;
  if (!config.required || !config.configured) {
    ready = Promise.resolve().then(notify);
    return ready;
  }

  client = createClient(config.supabaseUrl, config.publishableKey, {
    auth: {
      detectSessionInUrl: true,
      // This is a browser-only Site using Supabase's standard Magic Link
      // template. The implicit callback is handled automatically from the URL
      // fragment; PKCE would require a separate token-hash email template and
      // /auth/confirm exchange route.
      flowType: "implicit",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  ready = client.auth.getSession().then(({ data }) => {
    session = data.session;
    notify();
  });
  client.auth.onAuthStateChange((_event, nextSession) => {
    session = nextSession;
    notify();
  });
  return ready;
}

export function onAuthChange(listener: AuthListener): () => void {
  listeners.add(listener);
  if (ready) void ready.then(() => listener(session?.user ?? null));
  return () => listeners.delete(listener);
}

export function authIsRequired(): boolean {
  return config.required;
}

export function authIsConfigured(): boolean {
  return config.configured;
}

export function isSignedIn(): boolean {
  return !config.required || Boolean(session?.access_token);
}

export function currentUser(): User | null {
  return session?.user ?? null;
}

export function requestSignIn(): void {
  window.dispatchEvent(new CustomEvent("advisor:sign-in"));
}

export async function sendEmailSignInLink(email: string): Promise<void> {
  await ready;
  if (!client) throw new Error("Email sign-in is not configured yet.");
  const request = client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/`, shouldCreateUser: true },
  });
  const timeout = new Promise<never>((_resolve, reject) =>
    window.setTimeout(
      () => reject(new Error("The email service did not respond within 15 seconds. Please try again shortly.")),
      15_000,
    ),
  );
  const { error } = await Promise.race([request, timeout]);
  if (!error) return;
  const message = error.message.toLowerCase();
  if (error.status === 429 || message.includes("rate") || message.includes("seconds")) {
    throw new Error("Too many sign-in emails were requested. Wait at least 60 seconds before trying again.");
  }
  if (message.includes("not authorized")) {
    throw new Error("This email service is still in testing and cannot send to that address yet.");
  }
  throw error;
}

export async function signOut(): Promise<void> {
  await ready;
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await ready;
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set("authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}

function requireStorage(): { client: SupabaseClient; user: User } {
  const user = session?.user;
  if (!client || !user) throw new Error("Sign in before using project file storage.");
  return { client, user };
}

function safeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(-120);
  return cleaned || "project-document";
}

function originalFilename(storedName: string): string {
  return storedName.replace(/^[0-9a-f-]{36}-/i, "");
}

function metadataValue(metadata: Record<string, unknown> | null | undefined, key: string): string | number {
  const value = metadata?.[key];
  return typeof value === "number" || typeof value === "string" ? value : "";
}

/** Store one supported source document inside the current user's private folder. */
export async function uploadAccountFile(file: File): Promise<StoredAccountFile> {
  const state = requireStorage();
  const objectName = `${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const path = `${state.user.id}/${objectName}`;
  const { data, error } = await state.client.storage.from(ACCOUNT_FILES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
    metadata: { originalName: file.name },
  });
  if (error) throw new Error(`The plan was created, but the original file could not be stored: ${error.message}`);
  return {
    path: data.path,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    createdAt: new Date().toISOString(),
  };
}

/** List the current user's private source documents without exposing another folder. */
export async function listAccountFiles(): Promise<StoredAccountFile[]> {
  const state = requireStorage();
  const { data, error } = await state.client.storage.from(ACCOUNT_FILES_BUCKET).list(state.user.id, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  return (data ?? [])
    .filter((file) => file.id && file.name)
    .map((file) => {
      const metadata = (file.metadata ?? {}) as Record<string, unknown>;
      const size = Number(metadataValue(metadata, "size") || 0);
      const mimeType = String(metadataValue(metadata, "mimetype") || metadataValue(metadata, "content-type") || "");
      return {
        path: `${state.user.id}/${file.name}`,
        name: String(metadataValue(metadata, "originalName") || originalFilename(file.name)),
        size: Number.isFinite(size) ? size : 0,
        mimeType,
        createdAt: file.created_at ?? file.updated_at ?? "",
      };
    });
}

function assertOwnedPath(path: string): { client: SupabaseClient; path: string } {
  const state = requireStorage();
  if (!path.startsWith(`${state.user.id}/`) || path.includes("../")) {
    throw new Error("That project file does not belong to this account.");
  }
  return { client: state.client, path };
}

export async function downloadAccountFile(path: string, filename: string): Promise<void> {
  const owned = assertOwnedPath(path);
  const { data, error } = await owned.client.storage.from(ACCOUNT_FILES_BUCKET).download(owned.path);
  if (error || !data) throw error ?? new Error("The project file could not be downloaded.");
  const objectUrl = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function deleteAccountFile(path: string): Promise<void> {
  const owned = assertOwnedPath(path);
  const { error } = await owned.client.storage.from(ACCOUNT_FILES_BUCKET).remove([owned.path]);
  if (error) throw error;
}

function downloadFilename(response: Response, fallback: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(disposition);
  return match?.[1] ?? fallback;
}

export async function downloadProtected(url: string, fallbackName: string): Promise<void> {
  const response = await authorizedFetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "The file could not be downloaded.");
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = downloadFilename(response, fallbackName);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
