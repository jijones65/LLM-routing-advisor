import { CATALOG_VERSION, VERIFIED_AT } from "../../data/providers.js";
import { OPENROUTER_USAGE } from "../../data/usage-snapshot.js";
import { RETIRED } from "../../data/catalog.js";
import { SCORING_VERSION } from "../../data/strategies.js";
import { TAXONOMY_VERSION } from "../../data/taxonomy.js";
import { SIGNAL_METHOD } from "../../engine/signals.js";
import type { D1Database } from "../db/index.js";
import {
  deleteBlueprint,
  getAudit,
  getBlueprint,
  getCatalog,
  getRegistries,
  getRegistryCandidates,
  listBlueprints,
  saveBlueprint,
  updateBlueprint,
  type BlueprintPayload,
} from "../db/repo.js";
import { generateBlueprintSpecification, specificationFilename } from "../blueprints/specification.js";

/** No caching anywhere: every response depends on live source state. */
const NO_STORE = { "cache-control": "no-store" } as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...NO_STORE } });

const flag = (url: URL, name: string): boolean => url.searchParams.get(name) === "1";

/**
 * GET /api/catalog — the scored catalogue plus its provenance.
 *
 * Falls back to the bundled catalogue on any storage error, because a model
 * catalogue that cannot be read is a far worse failure than one without
 * adoption signals attached.
 */
export async function catalogRoute(db: D1Database | undefined): Promise<Response> {
  const { models, source } = await getCatalog(db);
  return json({
    models,
    source,
    verifiedAt: VERIFIED_AT,
    catalogVersion: CATALOG_VERSION,
    scoringVersion: SCORING_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    retired: RETIRED,
    usageSnapshot: OPENROUTER_USAGE,
    signalMethod: SIGNAL_METHOD,
  });
}

/** GET /api/audit — sourcing state, scope, watchlist and registry rollup. */
export async function auditRoute(url: URL, db: D1Database | undefined): Promise<Response> {
  try {
    return json(
      await getAudit(db, {
        check: flag(url, "check"),
        force: flag(url, "force"),
        refreshRegistry: flag(url, "registry"),
        forceRegistry: flag(url, "forceRegistry"),
      }),
    );
  } catch (error) {
    return json({ ...(await getAudit(undefined)), error: String(error) });
  }
}

/** GET /api/registries — per-source reconciliation summary. */
export async function registriesRoute(url: URL, db: D1Database | undefined): Promise<Response> {
  try {
    return json(await getRegistries(db, { refresh: flag(url, "refresh"), force: flag(url, "force") }));
  } catch (error) {
    return json({ sources: [], summary: null, status: "error", error: String(error) }, 502);
  }
}

/** GET /api/registry-candidates — paged, filtered endpoint comparison rows. */
export async function candidatesRoute(url: URL, db: D1Database | undefined): Promise<Response> {
  try {
    return json(
      await getRegistryCandidates(db, {
        refresh: flag(url, "refresh"),
        force: flag(url, "force"),
        q: url.searchParams.get("q") ?? "",
        provider: url.searchParams.get("provider") ?? "all",
        sourceId: url.searchParams.get("source") ?? "all",
        classification: url.searchParams.get("classification") ?? "all",
        offset: Number(url.searchParams.get("offset") ?? 0),
        limit: Number(url.searchParams.get("limit") ?? 50),
      }),
    );
  } catch (error) {
    return json({ rows: [], providers: [], sources: [], total: 0, status: "error", error: String(error) }, 502);
  }
}

/** Reject a payload that would save a plan with nothing in it. */
function validateBlueprint(payload: unknown): BlueprintPayload | string {
  if (payload === null || typeof payload !== "object") return "The request body must be an object.";
  const candidate = payload as Record<string, unknown>;
  if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) return "A plan needs a name.";
  if (!Array.isArray(candidate.features) || candidate.features.length === 0) {
    return "A plan needs at least one capability from the brief.";
  }
  if (!Array.isArray(candidate.routing) || candidate.routing.length === 0) {
    return "A plan needs at least one model choice.";
  }
  return candidate as unknown as BlueprintPayload;
}

/** GET and POST /api/blueprints — list or save a plan. */
export async function blueprintsRoute(request: Request, db: D1Database | undefined): Promise<Response> {
  if (!db) return json({ error: "Saving plans needs persistent storage, which is unavailable here." }, 503);

  if (request.method === "GET") return json({ blueprints: await listBlueprints(db) });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }

  const validated = validateBlueprint(body);
  if (typeof validated === "string") return json({ error: validated }, 400);

  const id = await saveBlueprint(db, validated);
  return json({ id, saved: true, markdownUrl: `/api/blueprints/${encodeURIComponent(id)}/markdown` }, 201);
}

/** GET/PATCH/DELETE one saved plan, or GET its generated Markdown file. */
export async function blueprintRoute(
  request: Request,
  db: D1Database | undefined,
  id: string,
  markdown = false,
): Promise<Response> {
  if (!db) return json({ error: "Saved plans need persistent storage, which is unavailable here." }, 503);
  if (!id || id.length > 100) return json({ error: "The saved plan id is invalid." }, 400);
  if (markdown && request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!markdown && request.method !== "GET" && request.method !== "PATCH" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  const existing = await getBlueprint(db, id);
  if (!existing) return json({ error: "Saved plan not found." }, 404);

  if (request.method === "DELETE") {
    await deleteBlueprint(db, id);
    return json({ deleted: true, id });
  }

  if (markdown) {
    const specification =
      typeof existing.payload.specificationMarkdown === "string"
        ? existing.payload.specificationMarkdown
        : generateBlueprintSpecification(existing.payload as Record<string, unknown>);
    return new Response(specification, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${specificationFilename(existing.payload as Record<string, unknown>)}"`,
        ...NO_STORE,
      },
    });
  }

  if (request.method === "GET") {
    const specificationMarkdown =
      typeof existing.payload.specificationMarkdown === "string"
        ? existing.payload.specificationMarkdown
        : generateBlueprintSpecification(existing.payload as Record<string, unknown>);
    return json({ blueprint: { ...existing, specificationMarkdown } });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }
  const change = body as Record<string, unknown>;
  if (typeof change.name !== "string" || change.name.trim().length === 0) {
    return json({ error: "A saved plan needs a name." }, 400);
  }
  if (typeof change.specificationMarkdown !== "string" || change.specificationMarkdown.trim().length === 0) {
    return json({ error: "The draft specification cannot be empty." }, 400);
  }
  if (change.specificationMarkdown.length > 200_000) {
    return json({ error: "The draft specification is too large to save." }, 413);
  }

  const updated = await updateBlueprint(db, id, change as { name: string; specificationMarkdown: string });
  return json({
    blueprint: updated ? { ...updated, specificationMarkdown: updated.payload.specificationMarkdown as string } : null,
  });
}
