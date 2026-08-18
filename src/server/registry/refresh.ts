import type { RegistrySource } from "../../data/registry-sources.js";
import { REGISTRY_SOURCES } from "../../data/registry-sources.js";
import { ensureSchema, fingerprint, type D1Database } from "../db/index.js";
import { parseRegistryPayload } from "./parse.js";
import type { SnapshotRow } from "./reconcile.js";

const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "LLM-Routing-Advisor-Registry-Reconciler/2.0";

/**
 * Insert any source rows that do not exist yet. Safe to call on every request.
 *
 * Applies the schema first so this module is safe to use as an entry point —
 * a scheduled refresh, or a test — without a page load having run beforehand.
 */
export async function seedRegistries(db: D1Database): Promise<void> {
  await ensureSchema(db);
  for (const source of REGISTRY_SOURCES) {
    await db
      .prepare(
        `INSERT INTO registry_snapshots (source_id, name, source_url, catalog_url, cadence_hours)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(source_id) DO UPDATE SET name=excluded.name, source_url=excluded.source_url,
           catalog_url=excluded.catalog_url, cadence_hours=excluded.cadence_hours`,
      )
      .bind(source.id, source.name, source.sourceUrl, source.catalogUrl, source.cadenceHours)
      .run();
  }
}

async function readRow(db: D1Database, sourceId: string): Promise<SnapshotRow | null> {
  return db.prepare("SELECT * FROM registry_snapshots WHERE source_id=?").bind(sourceId).first<SnapshotRow>();
}

/** LiteLLM paginates; follow the pages so the count matches its published total. */
async function fetchLiteLlmPages(first: Record<string, unknown>, init: RequestInit): Promise<unknown> {
  const pageSize = Number(first.page_size ?? 500);
  const total = Number(first.total_count ?? 0);
  const pages = Math.ceil(total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, async (_unused, index) => {
      const response = await fetch(
        `https://api.litellm.ai/model_catalog?page=${index + 2}&page_size=${pageSize}`,
        init,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as Record<string, unknown>;
    }),
  );
  const data = [
    ...(Array.isArray(first.data) ? first.data : []),
    ...rest.flatMap((page) => (Array.isArray(page.data) ? page.data : [])),
  ];
  return { data };
}

/**
 * Refresh one source if it is due, and record the outcome either way.
 *
 * A failed refresh never clears the stored snapshot. That is deliberate: the
 * catalogue and every recommendation must keep working when a third-party
 * gateway is down, so the last good data stays in place and the failure surfaces
 * as a status rather than an empty screen.
 */
export async function refreshSource(
  db: D1Database,
  source: RegistrySource,
  force = false,
): Promise<SnapshotRow | null> {
  await seedRegistries(db);
  const existing = await readRow(db, source.id);

  const due =
    force ||
    !existing?.last_checked_at ||
    Date.now() - Date.parse(existing.last_checked_at) > source.cadenceHours * 3_600_000;
  if (!due) return existing;

  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let httpStatus: number | null = null;

  try {
    const init: RequestInit = {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    };
    const response = await fetch(source.sourceUrl, init);
    httpStatus = response.status;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let payload: unknown = await response.json();
    if (source.id === "litellm-catalog") {
      const record = payload as Record<string, unknown>;
      if (record?.has_more) payload = await fetchLiteLlmPages(record, init);
    }

    const models = parseRegistryPayload(source, payload);
    // An empty list from a source that normally has hundreds means the schema
    // changed, not that the gateway lost all its models. Treat it as an error so
    // the good snapshot survives.
    if (models.length === 0) throw new Error("Source returned no usable models");

    const serialized = JSON.stringify(models);
    const mark = `sha256:${await fingerprint(serialized)}`;
    const status = existing?.last_fingerprint && existing.last_fingerprint !== mark ? "changed" : "current";

    await db
      .prepare(
        `UPDATE registry_snapshots
         SET models_json=?, last_checked_at=?, last_http_status=?, last_fingerprint=?, drift_status=?, error_message=NULL
         WHERE source_id=?`,
      )
      .bind(serialized, checkedAt, response.status, mark, status, source.id)
      .run();
    return await readRow(db, source.id);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Source check timed out" : String(error);
    await db
      .prepare(
        `UPDATE registry_snapshots
         SET last_checked_at=?, last_http_status=?, drift_status='error', error_message=?
         WHERE source_id=?`,
      )
      .bind(checkedAt, httpStatus, message.slice(0, 240), source.id)
      .run();
    return await readRow(db, source.id);
  } finally {
    clearTimeout(timer);
  }
}

/** Read every stored snapshot, optionally refreshing first. */
export async function loadSnapshots(
  db: D1Database,
  { refresh = false, force = false }: { refresh?: boolean; force?: boolean } = {},
): Promise<SnapshotRow[]> {
  await seedRegistries(db);
  if (refresh) {
    for (const source of REGISTRY_SOURCES) await refreshSource(db, source, force);
  }
  const result = await db.prepare("SELECT * FROM registry_snapshots ORDER BY name").all<SnapshotRow>();
  return result.results ?? [];
}
