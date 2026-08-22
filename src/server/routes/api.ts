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
  claimLegacyBlueprints,
  listBlueprints,
  saveBlueprint,
  upsertApplicationUser,
  updateBlueprint,
  updateBlueprintValidationProtocol,
  applyBlueprintValidationResults,
  type BlueprintPayload,
} from "../db/repo.js";
import { generateBlueprintSpecification, specificationFilename } from "../blueprints/specification.js";
import {
  createValidationState,
  isValidationEnvironment,
  ValidationDocumentError,
  type ValidationState,
} from "../blueprints/validation.js";
import { ConceptPaperError, readConceptPaper } from "../concepts/parse.js";
import { CONCEPT_PAPER_TEMPLATE } from "../concepts/template.js";
import { authenticateRequest, type AuthEnv, type AuthenticatedUser } from "../auth.js";

/** No caching anywhere: every response depends on live source state. */
const NO_STORE = { "cache-control": "no-store" } as const;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...NO_STORE } });

const flag = (url: URL, name: string): boolean => url.searchParams.get(name) === "1";

async function accountUser(request: Request, db: D1Database | undefined, env: AuthEnv): Promise<AuthenticatedUser> {
  const user = await authenticateRequest(request, env);
  if (db) {
    await upsertApplicationUser(db, user);
    if (env.CLAIM_LEGACY_PLANS === "true") await claimLegacyBlueprints(db, user.id);
  }
  return user;
}

/** GET /api/account — confirm the signed-in identity and local account tier. */
export async function accountRoute(request: Request, db: D1Database | undefined, env: AuthEnv): Promise<Response> {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const user = await accountUser(request, db, env);
  return json({ user: { id: user.id, email: user.email, displayName: user.displayName, accountTier: "free" } });
}

/** POST /api/concept-paper — read one PDF or DOCX without retaining its bytes. */
export async function conceptPaperRoute(request: Request, db: D1Database | undefined, env: AuthEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  await accountUser(request, db, env);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return json({ error: "Upload the concept paper as form data." }, 415);
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose a PDF or DOCX concept paper." }, 400);
    return json({ analysis: await readConceptPaper(file) });
  } catch (error) {
    if (error instanceof ConceptPaperError) return json({ error: error.message }, error.status);
    return json({ error: "The concept paper could not be read." }, 400);
  }
}

/** GET /api/concept-paper-template — downloadable starter based on the linked guide. */
export async function conceptPaperTemplateRoute(request: Request): Promise<Response> {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  return new Response(CONCEPT_PAPER_TEMPLATE, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="ai-application-concept-paper-template.md"',
      ...NO_STORE,
    },
  });
}

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
export async function blueprintsRoute(request: Request, db: D1Database | undefined, env: AuthEnv): Promise<Response> {
  if (!db) return json({ error: "Saving plans needs persistent storage, which is unavailable here." }, 503);
  const user = await accountUser(request, db, env);

  if (request.method === "GET") return json({ blueprints: await listBlueprints(db, user.id) });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "The request body was not valid JSON." }, 400);
  }

  const validated = validateBlueprint(body);
  if (typeof validated === "string") return json({ error: validated }, 400);

  const id = await saveBlueprint(db, validated, user.id);
  return json({ id, saved: true, markdownUrl: `/api/blueprints/${encodeURIComponent(id)}/markdown` }, 201);
}

/** GET/PATCH/DELETE one saved plan, or GET its generated Markdown file. */
export async function blueprintRoute(
  request: Request,
  db: D1Database | undefined,
  id: string,
  markdown = false,
  env: AuthEnv = {},
): Promise<Response> {
  if (!db) return json({ error: "Saved plans need persistent storage, which is unavailable here." }, 503);
  if (!id || id.length > 100) return json({ error: "The saved plan id is invalid." }, 400);
  if (markdown && request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  if (!markdown && request.method !== "GET" && request.method !== "PATCH" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  const user = await accountUser(request, db, env);
  const existing = await getBlueprint(db, id, user.id);
  if (!existing) return json({ error: "Saved plan not found." }, 404);

  if (request.method === "DELETE") {
    await deleteBlueprint(db, id, user.id);
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
  if (change.specificationMarkdown.length > 1_000_000) {
    return json({ error: "The draft specification is too large to save." }, 413);
  }

  const updated = await updateBlueprint(db, id, change as { name: string; specificationMarkdown: string }, user.id);
  return json({
    blueprint: updated ? { ...updated, specificationMarkdown: updated.payload.specificationMarkdown as string } : null,
  });
}

/** Configure, download or evaluate the test protocol attached to one saved plan. */
export async function blueprintValidationRoute(
  request: Request,
  db: D1Database | undefined,
  id: string,
  action: "validation-protocol" | "validation.md" | "validation-results",
  env: AuthEnv = {},
): Promise<Response> {
  if (!db) return json({ error: "Team validation needs persistent storage, which is unavailable here." }, 503);
  if (!id || id.length > 100) return json({ error: "The saved plan id is invalid." }, 400);
  const user = await accountUser(request, db, env);
  let existing = await getBlueprint(db, id, user.id);
  if (!existing) return json({ error: "Saved plan not found." }, 404);

  if (action === "validation.md") {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (!existing.payload.validation || typeof existing.payload.validation !== "object") {
      existing = await updateBlueprintValidationProtocol(db, id, "not-selected", user.id);
    }
    const validation = (existing?.payload.validation ??
      createValidationState(existing?.payload ?? {}, id)) as ValidationState;
    const fileName = `${String(existing?.name ?? "team-plan")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)}-validation-protocol.md`;
    return new Response(validation.protocolMarkdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName}"`,
        ...NO_STORE,
      },
    });
  }

  if (action === "validation-protocol") {
    if (request.method !== "PATCH") return new Response("Method not allowed", { status: 405 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "The request body was not valid JSON." }, 400);
    }
    const environment = (body as Record<string, unknown>)?.environment;
    if (!isValidationEnvironment(environment) || environment === "not-selected") {
      return json({ error: "Choose macOS, Windows 11, Ubuntu Linux or a cloud GPU server." }, 400);
    }
    const updated = await updateBlueprintValidationProtocol(db, id, environment, user.id);
    return json({
      blueprint: updated
        ? { ...updated, specificationMarkdown: updated.payload.specificationMarkdown as string }
        : null,
      markdownUrl: `/api/blueprints/${encodeURIComponent(id)}/validation.md`,
    });
  }

  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return json({ error: "Upload the completed Markdown results file as form data." }, 415);
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Choose a completed validation-results Markdown file." }, 400);
    if (!file.name.toLowerCase().endsWith(".md")) return json({ error: "Validation results must be a .md file." }, 415);
    if (file.size > 300_000) return json({ error: "The validation results file is larger than 300 KB." }, 413);
    const updated = await applyBlueprintValidationResults(db, id, file.name, await file.text(), user.id);
    return json({
      blueprint: updated
        ? { ...updated, specificationMarkdown: updated.payload.specificationMarkdown as string }
        : null,
      evaluation: (updated?.payload.validation as ValidationState)?.currentEvaluation,
    });
  } catch (error) {
    if (error instanceof ValidationDocumentError) return json({ error: error.message }, error.status);
    return json({ error: "The validation results could not be evaluated." }, 400);
  }
}
