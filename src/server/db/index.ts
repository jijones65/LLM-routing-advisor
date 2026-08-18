import { SCHEMA_STATEMENTS } from "./schema.js";

/**
 * The slice of the D1 API this app uses.
 *
 * Declared locally rather than pulled from `@cloudflare/workers-types` so the
 * data and engine layers stay testable under plain Node with a small fake, and
 * so the same code runs unchanged on any D1-compatible binding.
 */
export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

/**
 * Per-database record of whether the schema has been applied.
 *
 * Keyed on the binding rather than held in a single module-level flag, so two
 * databases in one process — which is exactly what a test suite is — cannot have
 * one satisfy the other's schema check. A `WeakMap` also means a discarded
 * database is not kept alive by this cache.
 */
const schemaReady = new WeakMap<D1Database, Promise<void>>();

/** Apply the schema to this database if it has not been applied already. */
export function ensureSchema(db: D1Database): Promise<void> {
  const existing = schemaReady.get(db);
  if (existing) return existing;

  const applying = (async () => {
    for (const statement of SCHEMA_STATEMENTS) {
      await db.prepare(statement).run();
    }
  })().catch((error: unknown) => {
    // Drop the record so a transient failure does not poison the binding for the
    // life of the isolate; the next request retries.
    schemaReady.delete(db);
    throw error;
  });

  schemaReady.set(db, applying);
  return applying;
}

/** A stable content fingerprint, used to detect that a source page changed. */
export async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
