import type { Model } from "../../shared/types.js";
import { CATALOG } from "../../data/catalog.js";
import { EVIDENCE, EXCLUSION_POLICY, SCOPE, WATCHLIST } from "../../data/evidence.js";
import { BENCHMARK_PROTOCOLS } from "../../data/benchmarks.js";
import { CAPABILITY_TESTS, testCoverage } from "../../data/capability-tests.js";
import { VERIFIED_AT } from "../../data/providers.js";
import { withSignals } from "../../engine/signals.js";
import { CatalogMatcher } from "../registry/normalize.js";
import {
  aggregateRegistry,
  reconcileSource,
  tallyFromSnapshots,
  type RegistryAggregate,
  type SourceSummary,
} from "../registry/reconcile.js";
import { loadSnapshots } from "../registry/refresh.js";
import { ensureSchema, fingerprint, type D1Database } from "./index.js";
import { generateBlueprintSpecification } from "../blueprints/specification.js";
import type { AuthenticatedUser } from "../auth.js";

const MATCHER = new CatalogMatcher(CATALOG);
const SYNCED_CATALOG_DBS = new WeakSet<object>();

/** Keep the D1 catalogue projection aligned with the bundled release. */
export async function syncCatalog(db: D1Database): Promise<void> {
  if (SYNCED_CATALOG_DBS.has(db as object)) return;

  const stored = await db.prepare("SELECT id, data_json FROM catalog_models").all<{
    id: string;
    data_json: string;
  }>();
  const rows = stored.results ?? [];
  const current =
    rows.length === CATALOG.length &&
    rows.every((row) => {
      try {
        return (JSON.parse(row.data_json) as { catalogVersion?: string }).catalogVersion === CATALOG[0].catalogVersion;
      } catch {
        return false;
      }
    });

  if (!current) {
    await db.prepare("DELETE FROM catalog_models").run();
    const statement = `INSERT INTO catalog_models (id, data_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at`;
    const updatedAt = new Date().toISOString();
    for (let index = 0; index < CATALOG.length; index += 20) {
      await db.batch(
        CATALOG.slice(index, index + 20).map((model) =>
          db.prepare(statement).bind(model.id, JSON.stringify(model), updatedAt),
        ),
      );
    }
  }

  SYNCED_CATALOG_DBS.add(db as object);
}

/**
 * The catalogue with adoption signals attached.
 *
 * When storage is unavailable this still returns a fully usable catalogue with
 * zeroed signals rather than failing. Losing the adoption axis degrades the
 * ecosystem-visibility plan style; it does not stop anyone planning an application.
 */
export async function getCatalog(db: D1Database | undefined): Promise<{ models: Model[]; source: string }> {
  if (!db) return { models: withSignals(CATALOG), source: "bundled" };
  try {
    await ensureSchema(db);
    await syncCatalog(db);
    const rows = await loadSnapshots(db);
    return { models: withSignals(CATALOG, tallyFromSnapshots(rows, MATCHER)), source: "published-registry" };
  } catch {
    return { models: withSignals(CATALOG), source: "bundled-fallback" };
  }
}

/** Insert or update the derived evidence source rows. */
export async function seedEvidence(db: D1Database): Promise<void> {
  const statement = `INSERT INTO source_evidence
      (source_id, provider, family, source_url, cadence_hours, expected_ids_json, scope_version, reviewed_at, drift_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reviewed')
    ON CONFLICT(source_id) DO UPDATE SET provider=excluded.provider, family=excluded.family,
      source_url=excluded.source_url, cadence_hours=excluded.cadence_hours,
      expected_ids_json=excluded.expected_ids_json, scope_version=excluded.scope_version,
      reviewed_at=excluded.reviewed_at`;

  // Batched because D1 charges per statement round trip and this runs on cold start.
  for (let index = 0; index < EVIDENCE.length; index += 15) {
    await db.batch(
      EVIDENCE.slice(index, index + 15).map((source) =>
        db
          .prepare(statement)
          .bind(
            source.id,
            source.provider,
            source.family,
            source.sourceUrl,
            source.cadenceHours,
            JSON.stringify(source.expectedIds),
            source.scopeVersion,
            source.reviewedAt,
          ),
      ),
    );
  }

  // This is a derived projection, not an append-only history. Remove rows from
  // superseded scopes so one provider is not shown twice after a release.
  const ids = EVIDENCE.map((source) => source.id);
  const placeholders = ids.map(() => "?").join(", ");
  await db
    .prepare(`DELETE FROM source_evidence WHERE source_id NOT IN (${placeholders})`)
    .bind(...ids)
    .run();
}

interface EvidenceRow {
  source_id: string;
  provider: string;
  family: string;
  source_url: string;
  cadence_hours: number;
  expected_ids_json: string;
  scope_version: string;
  reviewed_at: string;
  last_checked_at: string | null;
  last_http_status: number | null;
  last_fingerprint: string | null;
  drift_status: string;
  error_message: string | null;
}

export interface EvidenceView {
  readonly id: string;
  readonly provider: string;
  readonly family: string;
  readonly sourceUrl: string;
  readonly cadenceHours: number;
  readonly expectedIds: string[];
  readonly scopeVersion: string;
  readonly reviewedAt: string;
  readonly lastCheckedAt: string | null;
  readonly httpStatus: number | null;
  readonly driftStatus: string;
  readonly errorMessage: string | null;
}

/**
 * Check the single most overdue official source, then stop.
 *
 * One page per request, rather than all of them: the check runs inside a user's
 * page load, and a sweep of every official provider and model page would either time out or make the
 * app feel broken. Over normal traffic the whole set gets covered, and the
 * cadence column makes the coverage auditable.
 */
export async function checkNextEvidenceSource(
  db: D1Database,
  force = false,
): Promise<{ sourceId: string; status: string; httpStatus?: number } | null> {
  await seedEvidence(db);
  const rows = await db
    .prepare(
      `SELECT * FROM source_evidence
       ORDER BY CASE WHEN last_checked_at IS NULL THEN 0 ELSE 1 END, last_checked_at ASC`,
    )
    .all<EvidenceRow>();

  const now = Date.now();
  const candidate = (rows.results ?? []).find(
    (row) => force || !row.last_checked_at || now - Date.parse(row.last_checked_at) > row.cadence_hours * 3_600_000,
  );
  if (!candidate) return null;

  const checkedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(candidate.source_url, {
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.5",
        "user-agent": "LLM-Routing-Advisor-Evidence-Monitor/2.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    // Prefer the server's own change markers; hash the body only as a fallback,
    // since many docs pages embed build ids that change without the content doing so.
    const etag = response.headers.get("etag");
    const modified = response.headers.get("last-modified");
    const mark = etag ? `etag:${etag}` : modified ? `modified:${modified}` : `sha256:${await fingerprint(body)}`;
    const status = !response.ok
      ? "error"
      : candidate.last_fingerprint && candidate.last_fingerprint !== mark
        ? "changed"
        : "current";

    await db
      .prepare(
        `UPDATE source_evidence
         SET last_checked_at=?, last_http_status=?, last_fingerprint=?, drift_status=?, error_message=?
         WHERE source_id=?`,
      )
      .bind(
        checkedAt,
        response.status,
        mark,
        status,
        response.ok ? null : `HTTP ${response.status}`,
        candidate.source_id,
      )
      .run();
    return { sourceId: candidate.source_id, status, httpStatus: response.status };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Source check timed out" : String(error);
    await db
      .prepare("UPDATE source_evidence SET last_checked_at=?, drift_status='error', error_message=? WHERE source_id=?")
      .bind(checkedAt, message.slice(0, 240), candidate.source_id)
      .run();
    return { sourceId: candidate.source_id, status: "error" };
  } finally {
    clearTimeout(timer);
  }
}

/** The evidence layer as it looks without any stored check history. */
export function staticEvidence(): EvidenceView[] {
  return EVIDENCE.map((source) => ({
    id: source.id,
    provider: source.provider,
    family: source.family,
    sourceUrl: source.sourceUrl,
    cadenceHours: source.cadenceHours,
    expectedIds: [...source.expectedIds],
    scopeVersion: source.scopeVersion,
    reviewedAt: source.reviewedAt,
    lastCheckedAt: null,
    httpStatus: null,
    driftStatus: "reviewed",
    errorMessage: null,
  }));
}

/**
 * Benchmark-evidence coverage, including the part that is uncomfortable.
 *
 * `coveredShare` is reported next to the plan-slot figures on purpose. Models with
 * published results fill more plan slots than their share of the catalogue would
 * suggest, because the evidence factor rewards having been measured. That is the
 * documented scoring design working as specified, but it means the ranking partly
 * tracks which vendors publish benchmarks. Stating it is the only honest option.
 */
export function capabilityEvidenceSummary(): Record<string, unknown> {
  const coverage = testCoverage();
  return {
    ...coverage,
    catalogueSize: CATALOG.length,
    coveredShare: Math.round((coverage.models / CATALOG.length) * 1000) / 10,
    protocolList: BENCHMARK_PROTOCOLS.map((protocol) => ({
      id: protocol.id,
      benchmark: protocol.benchmark,
      datasetVersion: protocol.datasetVersion,
      capability: protocol.capability,
      conditions: protocol.conditions,
      saturated: protocol.saturated,
      url: protocol.url,
      caveat: protocol.caveat,
    })),
    // Resolved to the display name here, where the catalogue is in scope, so the
    // interface never has to show a reader a raw slug.
    contested: CAPABILITY_TESTS.contested.map((entry) => ({
      ...entry,
      modelName: CATALOG.find((model) => model.id === entry.modelId)?.name ?? entry.modelId,
    })),
    biasNote:
      "Benchmark coverage reflects which vendors run and publish evaluations, not which models suit an application. " +
      "Because a measured result carries more ranking weight than an estimate, well-benchmarked models are favoured " +
      "beyond their share of the catalogue. Treat an untested model as unmeasured, not as worse.",
  };
}

/** Counts of how well sourced the catalogue actually is. */
export function verificationSummary(): { confirmed: number; unconfirmed: number; drifted: number; total: number } {
  const counts = { confirmed: 0, unconfirmed: 0, drifted: 0, total: CATALOG.length };
  for (const model of CATALOG) counts[model.verification] += 1;
  return counts;
}

export interface RegistryView {
  readonly sources: readonly SourceSummary[];
  readonly summary: RegistryAggregate | null;
  readonly status: string;
  readonly method: string;
}

const REGISTRY_METHOD =
  "Gateway availability, hosted-inference availability and community metadata are cross-referenced as separate " +
  "kinds of evidence. Agreement between these lists shows a model is widely available; it is not confirmation " +
  "from the provider, which an official page must supply before an entry is marked confirmed.";

/** Reconcile the stored snapshots into the registry view. */
export async function getRegistries(
  db: D1Database | undefined,
  options: { refresh?: boolean; force?: boolean } = {},
): Promise<RegistryView> {
  if (!db) {
    return { sources: [], summary: null, status: "unavailable", method: REGISTRY_METHOD };
  }
  await ensureSchema(db);
  const rows = await loadSnapshots(db, options);
  const sources = rows.map((row) => reconcileSource(row, MATCHER));
  const { summary } = aggregateRegistry(rows, MATCHER);

  const status = sources.some((source) => source.status === "error")
    ? "error"
    : sources.some((source) => source.status === "changed")
      ? "changed"
      : sources.length > 0 && sources.every((source) => source.status === "current")
        ? "current"
        : "uninitialized";

  return { sources, summary, status, method: REGISTRY_METHOD };
}

/** Paged, filtered endpoint rows for the registry comparison table. */
export async function getRegistryCandidates(
  db: D1Database | undefined,
  options: {
    refresh?: boolean;
    force?: boolean;
    q?: string;
    provider?: string;
    sourceId?: string;
    classification?: string;
    offset?: number;
    limit?: number;
  } = {},
): Promise<Record<string, unknown>> {
  const limit = Math.min(200, Math.max(1, Number(options.limit ?? 50)));
  const offset = Math.max(0, Number(options.offset ?? 0));

  if (!db) {
    return { rows: [], providers: [], sources: [], total: 0, offset, limit, hasMore: false, status: "unavailable" };
  }
  await ensureSchema(db);
  const snapshotRows = await loadSnapshots(db, options);
  const { records, summary } = aggregateRegistry(snapshotRows, MATCHER);

  const query = String(options.q ?? "")
    .trim()
    .toLowerCase();
  const provider = options.provider ?? "all";
  const sourceId = options.sourceId ?? "all";
  const classification = options.classification ?? "all";

  const filtered = records.filter((record) => {
    if (sourceId !== "all" && record.sourceId !== sourceId) return false;
    if (provider !== "all" && record.provider !== provider) return false;
    if (classification !== "all" && record.classification !== classification) return false;
    if (query && !`${record.id} ${record.normalizedId} ${record.description}`.toLowerCase().includes(query))
      return false;
    return true;
  });

  return {
    rows: filtered.slice(offset, offset + limit),
    providers: [...new Set(records.map((record) => record.provider))].sort(),
    sources: snapshotRows.map((row) => {
      const reconciled = reconcileSource(row, MATCHER);
      return {
        id: reconciled.id,
        name: reconciled.name,
        endpointCount: reconciled.endpointCount,
        evidenceClass: reconciled.evidenceClass,
        role: reconciled.role,
        catalogUrl: reconciled.catalogUrl,
        status: reconciled.status,
        lastCheckedAt: reconciled.lastCheckedAt,
      };
    }),
    summary,
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
    status: "ok",
  };
}

/** Everything the audit view needs. */
export async function getAudit(
  db: D1Database | undefined,
  options: { check?: boolean; force?: boolean; refreshRegistry?: boolean; forceRegistry?: boolean } = {},
): Promise<Record<string, unknown>> {
  const shared = {
    scope: SCOPE,
    watchlist: WATCHLIST,
    exclusions: EXCLUSION_POLICY,
    verification: verificationSummary(),
    capabilityEvidence: capabilityEvidenceSummary(),
    verifiedAt: VERIFIED_AT,
  };

  if (!db) {
    return {
      ...shared,
      evidence: staticEvidence(),
      checkResult: null,
      registry: { sources: [], summary: null, status: "unavailable", method: REGISTRY_METHOD },
    };
  }

  await ensureSchema(db);
  await seedEvidence(db);
  const checkResult = options.check ? await checkNextEvidenceSource(db, options.force) : null;

  const rows = await db.prepare("SELECT * FROM source_evidence ORDER BY provider, family").all<EvidenceRow>();
  const evidence: EvidenceView[] = (rows.results ?? []).map((row) => ({
    id: row.source_id,
    provider: row.provider,
    family: row.family,
    sourceUrl: row.source_url,
    cadenceHours: Number(row.cadence_hours),
    expectedIds: JSON.parse(row.expected_ids_json) as string[],
    scopeVersion: row.scope_version,
    reviewedAt: row.reviewed_at,
    lastCheckedAt: row.last_checked_at,
    httpStatus: row.last_http_status,
    driftStatus: row.drift_status,
    errorMessage: row.error_message,
  }));

  const registry = await getRegistries(db, {
    refresh: options.refreshRegistry,
    force: options.forceRegistry,
  });

  return { ...shared, evidence, checkResult, registry };
}

/** A saved plan. */
export interface BlueprintPayload {
  readonly name: string;
  readonly features: readonly unknown[];
  readonly routing: readonly unknown[];
  readonly [key: string]: unknown;
}

interface BlueprintRow {
  readonly id: string;
  readonly name: string;
  readonly payload_json: string;
  readonly created_at: string;
}

export interface SavedBlueprint extends BlueprintRow {
  readonly payload: BlueprintPayload;
  readonly updated_at: string;
}

function parseBlueprintRow(row: BlueprintRow, includeSpecification = true): SavedBlueprint {
  const parsed = JSON.parse(row.payload_json) as BlueprintPayload;
  const payload = includeSpecification ? parsed : { ...parsed, specificationMarkdown: undefined };
  return {
    ...row,
    payload,
    updated_at: typeof parsed.lastEditedAt === "string" ? parsed.lastEditedAt : row.created_at,
  };
}

/** List the most recent saved plans. */
export async function listBlueprints(db: D1Database, userId = "legacy-private-owner"): Promise<SavedBlueprint[]> {
  await ensureSchema(db);
  const rows = await db
    .prepare(
      `SELECT b.id, b.name, b.payload_json, b.created_at
       FROM application_blueprints b
       INNER JOIN application_blueprint_owners o ON o.blueprint_id = b.id
       WHERE o.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT 50`,
    )
    .bind(userId)
    .all<BlueprintRow>();
  return (rows.results ?? []).map((row) => parseBlueprintRow(row, false));
}

/** Read one saved plan. */
export async function getBlueprint(
  db: D1Database,
  id: string,
  userId = "legacy-private-owner",
): Promise<SavedBlueprint | null> {
  await ensureSchema(db);
  const row = await db
    .prepare(
      `SELECT b.id, b.name, b.payload_json, b.created_at
       FROM application_blueprints b
       INNER JOIN application_blueprint_owners o ON o.blueprint_id = b.id
       WHERE b.id = ? AND o.user_id = ?`,
    )
    .bind(id, userId)
    .first<BlueprintRow>();
  return row ? parseBlueprintRow(row) : null;
}

/** Create or refresh the local account record represented by a Supabase user. */
export async function upsertApplicationUser(db: D1Database, user: AuthenticatedUser): Promise<void> {
  await ensureSchema(db);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO application_users (id, email, display_name, account_tier, created_at, last_seen_at)
       VALUES (?, ?, ?, 'free', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         last_seen_at = excluded.last_seen_at`,
    )
    .bind(user.id, user.email, user.displayName, now, now)
    .run();
}

/**
 * Assign pre-account plans to the first private owner who signs in.
 *
 * The hosted environment enables this only during the private migration stage.
 * It must be disabled before the Site becomes public.
 */
export async function claimLegacyBlueprints(db: D1Database, userId: string): Promise<void> {
  await ensureSchema(db);
  const assignedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO application_blueprint_owners (blueprint_id, user_id, assigned_at)
       SELECT b.id, ?, ?
       FROM application_blueprints b
       WHERE NOT EXISTS (
         SELECT 1 FROM application_blueprint_owners o WHERE o.blueprint_id = b.id
       )`,
    )
    .bind(userId, assignedAt)
    .run();
}

/** Save a plan, returning its new id. */
export async function saveBlueprint(
  db: D1Database,
  payload: BlueprintPayload,
  userId = "legacy-private-owner",
): Promise<string> {
  await ensureSchema(db);
  const id = crypto.randomUUID();
  const savedAt = typeof payload.savedAt === "string" ? payload.savedAt : new Date().toISOString();
  const completePayload: BlueprintPayload = {
    ...payload,
    savedAt,
    lastEditedAt: savedAt,
    specificationVersion: "1.1",
    specificationMarkdown:
      typeof payload.specificationMarkdown === "string"
        ? payload.specificationMarkdown
        : generateBlueprintSpecification({ ...payload, savedAt, lastEditedAt: savedAt }),
  };
  await db
    .prepare(
      `INSERT INTO application_users (id, email, display_name, account_tier, created_at, last_seen_at)
       VALUES (?, ?, ?, 'free', ?, ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .bind(userId, userId, null, savedAt, savedAt)
    .run();
  await db.batch([
    db
      .prepare("INSERT INTO application_blueprints (id, name, payload_json, created_at) VALUES (?, ?, ?, ?)")
      .bind(id, String(payload.name).trim().slice(0, 160), JSON.stringify(completePayload), savedAt),
    db
      .prepare("INSERT INTO application_blueprint_owners (blueprint_id, user_id, assigned_at) VALUES (?, ?, ?)")
      .bind(id, userId, savedAt),
  ]);
  return id;
}

/** Edit the human-facing name and draft specification without changing the saved team. */
export async function updateBlueprint(
  db: D1Database,
  id: string,
  change: { name: string; specificationMarkdown: string },
  userId = "legacy-private-owner",
): Promise<SavedBlueprint | null> {
  const existing = await getBlueprint(db, id, userId);
  if (!existing) return null;

  const lastEditedAt = new Date().toISOString();
  const payload: BlueprintPayload = {
    ...existing.payload,
    name: change.name.trim().slice(0, 160),
    specificationMarkdown: change.specificationMarkdown,
    specificationVersion: "1.1",
    lastEditedAt,
  };
  await db
    .prepare(
      `UPDATE application_blueprints
       SET name = ?, payload_json = ?
       WHERE id = ? AND EXISTS (
         SELECT 1 FROM application_blueprint_owners o WHERE o.blueprint_id = ? AND o.user_id = ?
       )`,
    )
    .bind(payload.name, JSON.stringify(payload), id, id, userId)
    .run();
  return getBlueprint(db, id, userId);
}

/** Permanently delete one saved plan. */
export async function deleteBlueprint(db: D1Database, id: string, userId = "legacy-private-owner"): Promise<boolean> {
  const existing = await getBlueprint(db, id, userId);
  if (!existing) return false;

  await db.batch([
    db.prepare("DELETE FROM application_blueprint_owners WHERE blueprint_id = ? AND user_id = ?").bind(id, userId),
    db.prepare("DELETE FROM application_blueprints WHERE id = ?").bind(id),
  ]);
  return true;
}
