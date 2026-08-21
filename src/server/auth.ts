export interface AuthEnv {
  readonly AUTH_REQUIRED?: string;
  readonly CLAIM_LEGACY_PLANS?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_PUBLISHABLE_KEY?: string;
  readonly SUPABASE_GOOGLE_ENABLED?: string;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
}

export interface AuthBootstrap {
  readonly required: boolean;
  readonly configured: boolean;
  readonly supabaseUrl: string;
  readonly publishableKey: string;
  readonly googleEnabled: boolean;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const cleanUrl = (value: string | undefined): string => (value ?? "").trim().replace(/\/+$/, "");

export function authBootstrap(env: AuthEnv): AuthBootstrap {
  const required = env.AUTH_REQUIRED === "true";
  const supabaseUrl = cleanUrl(env.SUPABASE_URL);
  const publishableKey = (env.SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  return {
    required,
    configured: Boolean(supabaseUrl && publishableKey),
    supabaseUrl,
    publishableKey,
    googleEnabled: env.SUPABASE_GOOGLE_ENABLED === "true",
  };
}

function displayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, 120);
  return cleaned || null;
}

/**
 * Validate a Supabase access token against the project's Auth service.
 *
 * No service-role key is needed or accepted. The publishable key identifies the
 * project; the user's bearer token proves the session and is rechecked by
 * Supabase on every protected request.
 */
export async function authenticateRequest(request: Request, env: AuthEnv): Promise<AuthenticatedUser> {
  if (env.AUTH_REQUIRED !== "true") {
    return { id: "legacy-private-owner", email: "private-owner", displayName: "Private owner" };
  }

  const config = authBootstrap(env);
  if (!config.configured) {
    throw new AuthenticationError("Account sign-in is not configured yet.", 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ") || authorization.length < 20) {
    throw new AuthenticationError("Sign in to use saved plans and document imports.", 401);
  }

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      authorization: authorization,
      accept: "application/json",
    },
  });
  if (!response.ok) throw new AuthenticationError("Your sign-in has expired. Please sign in again.", 401);

  const body = (await response.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!id || !email) throw new AuthenticationError("The signed-in account could not be identified.", 401);

  const metadata =
    body.user_metadata !== null && typeof body.user_metadata === "object"
      ? (body.user_metadata as Record<string, unknown>)
      : {};
  return {
    id,
    email,
    displayName: displayName(metadata.full_name) ?? displayName(metadata.name),
  };
}

export function authenticationResponse(error: unknown): Response | null {
  if (!(error instanceof AuthenticationError)) return null;
  return new Response(JSON.stringify({ error: error.message }), {
    status: error.status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
