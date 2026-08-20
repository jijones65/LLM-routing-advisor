import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Bootstrap } from "./state.js";

type AuthConfig = Bootstrap["auth"];
type AuthListener = (user: User | null) => void;

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
      flowType: "pkce",
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
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
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
