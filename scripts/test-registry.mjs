import worker from "../worker/index.js";

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...args) { this.args = args; return this; }
  async run() {
    if (this.sql.startsWith("INSERT INTO registry_snapshots")) {
      const [source_id, name, source_url, catalog_url, cadence_hours] = this.args;
      const prior = this.db.rows.get(source_id) || {
        source_id, models_json: "[]", last_checked_at: null, last_http_status: null,
        last_fingerprint: null, drift_status: "uninitialized", error_message: null,
      };
      this.db.rows.set(source_id, {...prior, name, source_url, catalog_url, cadence_hours});
    } else if (this.sql.includes("SET models_json=?")) {
      const [models_json, last_checked_at, last_http_status, last_fingerprint, drift_status, source_id] = this.args;
      Object.assign(this.db.rows.get(source_id), {models_json, last_checked_at, last_http_status, last_fingerprint, drift_status, error_message: null});
    } else if (this.sql.includes("SET last_checked_at=?") && this.sql.includes("registry_snapshots")) {
      const [last_checked_at, last_http_status, error_message, source_id] = this.args;
      Object.assign(this.db.rows.get(source_id), {last_checked_at, last_http_status, drift_status: "error", error_message});
    }
    return {success: true};
  }
  async first() {
    if (this.sql.includes("FROM registry_snapshots WHERE source_id=?")) return this.db.rows.get(this.args[0]) || null;
    return null;
  }
  async all() {
    if (this.sql.includes("FROM registry_snapshots ORDER BY name")) return {results: [...this.db.rows.values()]};
    return {results: []};
  }
}

class MemoryD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) { return new Statement(this, sql); }
  async batch(statements) { for (const statement of statements) await statement.run(); return statements.map(() => ({success: true})); }
}

const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input).startsWith("https://router.requesty.ai/v1/models")) {
    return Response.json({data: [
      {id: "openai/gpt-5-6-sol", description: "Reasoning model"},
      {id: "vertex/anthropic.claude-sonnet-5@us-east5", description: "Regional hosted model"},
      {id: "anthropic/claude-sonnet-5", description: "Direct hosted model"},
      {id: "zai/glm-5-2", description: "Language model"},
      {id: "requesty/new-model-x", description: "Unverified language model"},
      {id: "openai/text-embedding-4", description: "Embedding model"},
    ]});
  }
  if (String(input).startsWith("https://openrouter.ai/api/v1/models")) {
    return Response.json({data: [
      {id: "openai/gpt-5-6-sol", name: "GPT 5.6 Sol", context_length: 256000, architecture: {input_modalities: ["text"]}, supported_parameters: ["reasoning"], pricing: {prompt: "0.000001", completion: "0.000004"}},
      {id: "openrouter/new-model-y", name: "New Model Y", architecture: {input_modalities: ["text", "image"]}, supported_parameters: [], pricing: {}},
      {id: "openai/text-embedding-4", name: "Embedding Model", architecture: {input_modalities: ["text"]}, supported_parameters: [], pricing: {}},
    ]});
  }
  if (String(input).startsWith("https://ai-gateway.vercel.sh/v1/models")) {
    return Response.json({data: [
      {id: "openai/gpt-5-6-sol", name: "GPT 5.6 Sol", type: "language", context_window: 256000, modalities: {input: ["text"]}, supported_parameters: ["reasoning"], pricing: {input: "0.000001", output: "0.000004"}},
      {id: "vercel/new-model-z", name: "New Model Z", type: "language", modalities: {input: ["text"]}, supported_parameters: [], pricing: {}},
      {id: "vercel/image-gen-z", name: "Image Generator Z", type: "image", modalities: {input: ["text"]}, supported_parameters: [], pricing: {}},
    ]});
  }
  if (String(input).startsWith("https://huggingface.co/api/models")) {
    return Response.json([
      {id: "openai/gpt-5-6-sol", modelId: "openai/gpt-5-6-sol", pipeline_tag: "text-generation", downloads: 1000, tags: ["reasoning"]},
      {id: "community/hf-only-model", modelId: "community/hf-only-model", pipeline_tag: "text-generation", downloads: 500, tags: []},
    ]);
  }
  if (String(input).startsWith("https://models.dev/models.json")) {
    return Response.json({
      "openai/gpt-5-6-sol": {id: "openai/gpt-5-6-sol", name: "GPT 5.6 Sol", description: "Reasoning model", reasoning: true, modalities: {input: ["text"]}, limit: {context: 256000}},
      "community/models-dev-only": {id: "community/models-dev-only", name: "Models Dev Only", description: "Metadata record", modalities: {input: ["text"]}},
    });
  }
  if (String(input).startsWith("https://api.litellm.ai/model_catalog")) {
    return Response.json({data: [
      {id: "gpt-5-6-sol", provider: "openai", mode: "chat", max_input_tokens: 256000, supports_reasoning: true},
      {id: "litellm-only-model", provider: "community", mode: "chat"},
      {id: "dall-e-3", provider: "openai", mode: "image_generation"},
    ], total_count: 3, has_more: false, page: 1, page_size: 500});
  }
  return nativeFetch(input, init);
};

try {
  const db = new MemoryD1();
  const response = await worker.fetch(new Request("https://example.test/api/registries?refresh=1&force=1"), {DB: db});
  const payload = await response.json();
  const source = payload.sources[0];
  const expected = {
    endpointCount: 6,
    candidateEndpointCount: 5,
    uniqueCandidateCount: 4,
    duplicateVariantCount: 1,
    excludedEndpointCount: 1,
    possibleCatalogMatches: 3,
    unresolvedCandidateCount: 1,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (source[key] !== value) throw new Error(`${key}: expected ${value}, received ${source[key]}`);
  }
  const candidatesResponse = await worker.fetch(new Request("https://example.test/api/registry-candidates?limit=100"), {DB: db});
  const candidates = await candidatesResponse.json();
  if (candidates.total !== 19) throw new Error(`candidate rows: expected 19, received ${candidates.total}`);
  if (candidates.sources.length !== 6) throw new Error("expected six independently labelled discovery sources");
  if (candidates.summary.crossReferencedIdentityCount !== 1) throw new Error(`cross-source identities: expected 1, received ${candidates.summary.crossReferencedIdentityCount}`);
  if (candidates.summary.maxSourceOverlap !== 6) throw new Error(`max source overlap: expected 6, received ${candidates.summary.maxSourceOverlap}`);
  if (candidates.rows.filter((row) => row.classification === "possible-match").length !== 9) throw new Error("expected nine source-level possible matches");
  if (candidates.rows.filter((row) => row.classification === "review").length !== 6) throw new Error("expected six source-level review candidates");
  if (candidates.rows.filter((row) => row.classification === "excluded").length !== 4) throw new Error("expected four excluded non-LLM records");
  console.log(JSON.stringify({status: payload.status, ...expected, discoverySources: candidates.sources.length, candidateRows: candidates.total, crossReferencedIdentityCount: candidates.summary.crossReferencedIdentityCount}));
} finally {
  globalThis.fetch = nativeFetch;
}
