import assert from "node:assert/strict";
import { test } from "node:test";
import { FakeD1, stubFetch } from "./fake-d1.mjs";
import worker from "../build/server/index.js";
import {
  getAudit,
  getCatalog,
  getRegistries,
  getRegistryCandidates,
  listBlueprints,
  saveBlueprint,
  syncCatalog,
  verificationSummary,
} from "../build/server/db/repo.js";
import { loadSnapshots, refreshSource } from "../build/server/registry/refresh.js";
import { REGISTRY_SOURCES } from "../build/data/registry-sources.js";
import { ensureSchema } from "../build/server/db/index.js";

/** A fresh in-memory database. The schema is applied lazily, per binding. */
function freshDb() {
  return new FakeD1();
}

const request = (path, init) => new Request(`https://advisor.test${path}`, init);

test("the schema applies and is idempotent", async () => {
  const db = freshDb();
  await getCatalog(db);
  await getCatalog(db);
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  assert.deepEqual(
    tables.results.map((row) => row.name),
    ["application_blueprints", "catalog_models", "registry_snapshots", "source_evidence"],
  );
  db.close();
});

test("the catalogue is served even with no database at all", async () => {
  const { models, source } = await getCatalog(undefined);
  assert.ok(models.length > 100);
  assert.equal(source, "bundled");
  for (const model of models) assert.ok(model.signals, `${model.id} has no signals attached`);
});

test("the D1 catalogue projection is aligned with the bundled release", async () => {
  const db = freshDb();
  await ensureSchema(db);
  await db
    .prepare("INSERT INTO catalog_models (id, data_json, updated_at) VALUES (?, ?, ?)")
    .bind("legacy-example", JSON.stringify({ catalogVersion: "superseded" }), "2026-08-17T00:00:00Z")
    .run();

  await syncCatalog(db);
  const rows = await db.prepare("SELECT data_json FROM catalog_models ORDER BY id").all();
  assert.equal(rows.results.length, 109);
  assert.ok(
    rows.results.every((row) => JSON.parse(row.data_json).catalogVersion === "2026.08.18-2"),
    "every stored catalogue row should use the current version",
  );
  db.close();
});

test("a database failure falls back to the bundled catalogue", async () => {
  const broken = {
    prepare() {
      throw new Error("storage is down");
    },
    async batch() {
      throw new Error("storage is down");
    },
  };
  const { models, source } = await getCatalog(broken);
  assert.equal(source, "bundled-fallback");
  assert.ok(models.length > 100, "a storage failure must not empty the catalogue");
});

test("GET / renders a complete page", async () => {
  const db = freshDb();
  const response = await worker.fetch(request("/"), { DB: db });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);

  const html = await response.text();
  assert.match(html, /<!doctype html>/);
  assert.match(html, /<\/html>\s*$/);
  assert.match(html, /id="bootstrap-data"/);
  assert.match(html, /LLM Application Routing Advisor/);
  assert.match(html, /data-tab="about"/);
  assert.match(html, /id="about-page"/);
  for (const tab of ["Application design", "Model explorer", "Live registry", "Coverage check", "Update centre"]) {
    assert.match(html, new RegExp(`<h2>${tab}</h2>`), `the About guide is missing ${tab}`);
  }
  assert.match(html, /What each tab does—and what it cannot prove/);
  for (const label of [
    "Recommendation ranking",
    "Source-evidence layer",
    "Registry-snapshot layer",
    "Coverage-audit layer",
  ]) {
    assert.match(html, new RegExp(label), `the coverage map is missing ${label}`);
  }
  // Every element the client looks up must exist in the shell.
  for (const id of [
    "archetype",
    "custom-application",
    "capabilities",
    "primary-styles",
    "other-style",
    "route-list",
    "team-evaluation",
    "route-stats",
    "team-compare",
    "tool-list",
    "readout",
    "model-list",
    "model-search",
    "provider-filter",
    "case-filter",
    "deployment-filter",
    "endpoint-list",
    "registry-summary",
    "registry-queue",
    "registry-status",
    "verification-summary",
    "coverage-summary",
    "coverage-matrix",
    "watchlist-grid",
    "retired-list",
    "events",
    "toast",
    "save-blueprint",
    "check-source",
    "refresh-registry",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `the shell is missing #${id}`);
  }
  db.close();
});

test("the rendered page has balanced tags and no unsubstituted placeholders", async () => {
  const db = freshDb();
  const html = await (await worker.fetch(request("/"), { DB: db })).text();
  assert.ok(!html.includes("{{"), "an interpolation placeholder survived rendering");
  assert.ok(!html.includes("undefined</"), "an undefined value reached the markup");

  const opens = (html.match(/<section\b/g) ?? []).length;
  const closes = (html.match(/<\/section>/g) ?? []).length;
  assert.equal(opens, closes, `unbalanced <section> tags: ${opens} open, ${closes} closed`);
  db.close();
});

test("the bootstrap payload is valid JSON and carries what the client needs", async () => {
  const db = freshDb();
  const html = await (await worker.fetch(request("/"), { DB: db })).text();
  const match = /<script id="bootstrap-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(match, "the bootstrap script block is missing");
  const data = JSON.parse(match[1]);
  for (const key of [
    "models",
    "archetypes",
    "strategies",
    "needGroups",
    "capabilityLabels",
    "retired",
    "verification",
    "scoringVersion",
    "taxonomyVersion",
  ]) {
    assert.ok(data[key], `bootstrap is missing ${key}`);
  }
  assert.ok(data.models.length > 100);
  // No raw closing tag may survive, or the script block terminates early.
  assert.ok(!match[1].includes("</script"), "an unescaped closing tag is in the payload");
  db.close();
});

test("GET /api/catalog returns models and provenance", async () => {
  const db = freshDb();
  const response = await worker.fetch(request("/api/catalog"), { DB: db });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.ok(body.models.length > 100);
  assert.ok(body.verifiedAt);
  assert.ok(body.catalogVersion);
  assert.ok(body.scoringVersion);
  assert.ok(body.taxonomyVersion);
  assert.ok(Array.isArray(body.retired));
  assert.ok(body.signalMethod.includes("Not a user count"), "the method note must state what it is not");
  db.close();
});

test("GET /api/health responds", async () => {
  const response = await worker.fetch(request("/api/health"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
});

test("an unknown path is a 404 and a wrong method is a 405", async () => {
  const db = freshDb();
  assert.equal((await worker.fetch(request("/nope"), { DB: db })).status, 404);
  assert.equal((await worker.fetch(request("/api/catalog", { method: "POST" }), { DB: db })).status, 405);
  assert.equal((await worker.fetch(request("/api/blueprints", { method: "DELETE" }), { DB: db })).status, 405);
  db.close();
});

test("saving a plan validates the payload", async () => {
  const db = freshDb();
  const post = (body) =>
    worker.fetch(
      request("/api/blueprints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
      { DB: db },
    );

  assert.equal((await post("not json at all")).status, 400);
  assert.equal((await post({ name: "", features: ["a"], routing: ["b"] })).status, 400);
  assert.equal((await post({ name: "x", features: [], routing: ["b"] })).status, 400);
  assert.equal((await post({ name: "x", features: ["a"], routing: [] })).status, 400);

  const ok = await post({ name: "Balanced team", features: ["knowledge"], routing: [{ role: "primary" }] });
  assert.equal(ok.status, 201);
  const { id, saved } = await ok.json();
  assert.ok(id);
  assert.equal(saved, true);

  const listed = await (await worker.fetch(request("/api/blueprints"), { DB: db })).json();
  assert.equal(listed.blueprints.length, 1);
  assert.equal(listed.blueprints[0].name, "Balanced team");
  db.close();
});

test("saving a plan reports clearly when there is no storage", async () => {
  const response = await worker.fetch(
    request("/api/blueprints", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }),
    {},
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /storage/i);
});

test("a long plan name is truncated rather than rejected", async () => {
  const db = freshDb();
  await saveBlueprint(db, { name: "n".repeat(500), features: ["a"], routing: ["b"] });
  const rows = await listBlueprints(db);
  assert.equal(rows[0].name.length, 160);
  db.close();
});

test("a registry source is fetched, stored and reconciled", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");
  const stub = stubFetch({
    "openrouter.ai/api": {
      data: [
        {
          id: "anthropic/claude-opus-5",
          context_length: 1_000_000,
          pricing: { prompt: 0.000005, completion: 0.000025 },
        },
        { id: "openai/gpt-5.6-luna", context_length: 1_050_000, pricing: { prompt: 0.0000002, completion: 0.0000012 } },
        { id: "openai/text-embedding-3-large", pricing: {} },
      ],
    },
  });
  try {
    const row = await refreshSource(db, source, true);
    assert.equal(row.drift_status, "current");
    assert.equal(row.last_http_status, 200);
    assert.equal(JSON.parse(row.models_json).length, 3);

    const view = await getRegistries(db);
    const reconciled = view.sources.find((entry) => entry.id === "openrouter-public");
    assert.equal(reconciled.endpointCount, 3);
    assert.equal(reconciled.excludedEndpointCount, 1);
    assert.equal(reconciled.possibleCatalogMatches, 2);
    assert.ok(view.method.includes("not confirmation"), "the method note must not overclaim");
  } finally {
    stub.restore();
    db.close();
  }
});

test("a failed refresh keeps the last good snapshot", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");

  const good = stubFetch({ "openrouter.ai/api": { data: [{ id: "anthropic/claude-opus-5" }] } });
  await refreshSource(db, source, true);
  good.restore();

  const bad = stubFetch({ "openrouter.ai/api": () => new Response("gateway down", { status: 503 }) });
  const row = await refreshSource(db, source, true);
  bad.restore();

  assert.equal(row.drift_status, "error");
  assert.equal(row.last_http_status, 503);
  assert.equal(JSON.parse(row.models_json).length, 1, "the good snapshot was lost on failure");
  db.close();
});

test("an empty response is treated as an error, not as zero models", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");
  const good = stubFetch({ "openrouter.ai/api": { data: [{ id: "anthropic/claude-opus-5" }] } });
  await refreshSource(db, source, true);
  good.restore();

  const empty = stubFetch({ "openrouter.ai/api": { data: [] } });
  const row = await refreshSource(db, source, true);
  empty.restore();

  assert.equal(row.drift_status, "error");
  assert.match(row.error_message, /no usable models/);
  assert.equal(JSON.parse(row.models_json).length, 1);
  db.close();
});

test("a changed payload is flagged as changed", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");
  let first = stubFetch({ "openrouter.ai/api": { data: [{ id: "anthropic/claude-opus-5" }] } });
  await refreshSource(db, source, true);
  first.restore();

  const second = stubFetch({
    "openrouter.ai/api": { data: [{ id: "anthropic/claude-opus-5" }, { id: "openai/gpt-5.6-sol" }] },
  });
  const row = await refreshSource(db, source, true);
  second.restore();
  assert.equal(row.drift_status, "changed");
  db.close();
});

test("a source within its cadence is not re-fetched", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");
  const first = stubFetch({ "openrouter.ai/api": { data: [{ id: "anthropic/claude-opus-5" }] } });
  await refreshSource(db, source, true);
  first.restore();

  const second = stubFetch({ "openrouter.ai/api": { data: [{ id: "should-not-be-fetched" }] } });
  await refreshSource(db, source, false);
  assert.equal(second.calls.length, 0, "a source inside its cadence was fetched anyway");
  second.restore();
  db.close();
});

test("registry candidates paginate and filter", async () => {
  const db = freshDb();
  const source = REGISTRY_SOURCES.find((entry) => entry.id === "openrouter-public");
  const stub = stubFetch({
    "openrouter.ai/api": {
      data: Array.from({ length: 120 }, (_unused, index) => ({ id: `vendor/model-${index}`, description: "test" })),
    },
  });
  await refreshSource(db, source, true);
  stub.restore();

  const page = await getRegistryCandidates(db, { limit: 25, offset: 0 });
  assert.equal(page.rows.length, 25);
  assert.equal(page.total, 120);
  assert.equal(page.hasMore, true);

  const last = await getRegistryCandidates(db, { limit: 25, offset: 100 });
  assert.equal(last.rows.length, 20);
  assert.equal(last.hasMore, false);

  const searched = await getRegistryCandidates(db, { q: "model-11", limit: 100 });
  assert.ok(searched.total > 0 && searched.total < 120);
  for (const row of searched.rows) assert.match(row.id, /model-11/);

  // The limit is clamped so a crafted query cannot ask for the whole set.
  const clamped = await getRegistryCandidates(db, { limit: 100000 });
  assert.ok(clamped.limit <= 200, `limit was not clamped: ${clamped.limit}`);
  db.close();
});

test("the audit view reports evidence, scope and sourcing confidence", async () => {
  const db = freshDb();
  const stub = stubFetch({ "": () => new Response("<html>docs</html>", { status: 200 }) });
  try {
    const audit = await getAudit(db, { check: true, force: true });
    assert.ok(audit.evidence.length > 20, `expected an evidence row per provider page, got ${audit.evidence.length}`);
    assert.ok(audit.scope.statement.length > 40);
    assert.ok(audit.watchlist.length > 0);
    assert.ok(audit.exclusions.length > 0);
    assert.equal(audit.verification.total, verificationSummary().total);
    assert.ok(audit.checkResult, "a forced check should report a result");
    assert.ok(["current", "changed", "error"].includes(audit.checkResult.status));
  } finally {
    stub.restore();
    db.close();
  }
});

test("the evidence projection removes superseded source rows", async () => {
  const db = freshDb();
  await getAudit(db);
  await db
    .prepare(
      `INSERT INTO source_evidence
        (source_id, provider, family, source_url, cadence_hours, expected_ids_json, scope_version, reviewed_at, drift_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      "legacy-example",
      "Legacy provider",
      "Legacy family",
      "https://example.invalid/legacy",
      168,
      "[]",
      "2026.08.17-5",
      "2026-08-17",
      "reviewed",
    )
    .run();

  const audit = await getAudit(db);
  assert.equal(audit.evidence.length, 27);
  assert.ok(!audit.evidence.some((source) => source.id === "legacy-example"));
  db.close();
});

test("every catalogue model is covered by an evidence source", async () => {
  const db = freshDb();
  const audit = await getAudit(db);
  const covered = new Set(audit.evidence.flatMap((source) => source.expectedIds));
  const { models } = await getCatalog(db);
  for (const model of models) {
    assert.ok(covered.has(model.id), `${model.id} has no evidence source watching it`);
  }
  db.close();
});

test("the audit view degrades without storage", async () => {
  const audit = await getAudit(undefined);
  assert.ok(audit.evidence.length > 0);
  assert.equal(audit.registry.status, "unavailable");
  assert.equal(audit.checkResult, null);
});

test("snapshots load without a refresh", async () => {
  const db = freshDb();
  const rows = await loadSnapshots(db);
  assert.equal(rows.length, REGISTRY_SOURCES.length, "every source should be seeded");
  for (const row of rows) assert.equal(row.drift_status, "uninitialized");
  db.close();
});
