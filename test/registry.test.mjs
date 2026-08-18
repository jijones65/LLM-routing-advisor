import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG } from "../build/data/catalog.js";
import { REGISTRY_SOURCES } from "../build/data/registry-sources.js";
import { CatalogMatcher, catalogKeys, normalizeModelId } from "../build/server/registry/normalize.js";
import { parseRegistryPayload } from "../build/server/registry/parse.js";
import {
  NON_LANGUAGE_ENDPOINT,
  aggregateRegistry,
  reconcileSource,
  tallyFromSnapshots,
  toEndpointRecord,
} from "../build/server/registry/reconcile.js";

const matcher = new CatalogMatcher(CATALOG);
const sourceById = (id) => REGISTRY_SOURCES.find((source) => source.id === id);

test("normalisation collapses the ways lists name the same model", () => {
  const variants = [
    "anthropic/claude-opus-5",
    "claude-opus-5-20260210",
    "models/claude-opus-5",
    "claude-opus-5:free",
    "claude-opus-5@global",
    "Claude-Opus-5",
  ];
  const normalised = new Set(variants.map(normalizeModelId));
  assert.equal(normalised.size, 1, `expected one identity, got: ${[...normalised].join(", ")}`);
  assert.equal([...normalised][0], "claude-opus-5");
});

test("normalisation never returns an empty identity", () => {
  for (const input of ["", "   ", "///", "!!!", null, undefined]) {
    assert.equal(normalizeModelId(input), "unresolved");
  }
});

test("normalisation strips regional and tier suffixes without eating real names", () => {
  assert.equal(normalizeModelId("openai/gpt-5.6-luna@us-east1"), "gpt-5-6-luna");
  // The prototype turned this into "v4-flash" by stripping the vendor name a
  // second time after the slash had already removed it.
  assert.equal(normalizeModelId("deepseek/deepseek-v4-flash:free"), "deepseek-v4-flash");
  assert.equal(normalizeModelId("mistral/mistral-large-3"), "mistral-large-3");
  assert.equal(normalizeModelId("qwen/qwen3.8-max"), "qwen3-8-max");
  // "-mini" is part of the name, not a suffix to strip.
  assert.equal(normalizeModelId("openai/gpt-realtime-2.1-mini"), "gpt-realtime-2-1-mini");
});

test("a dash-qualified vendor name resolves to the same model as a slash-qualified one", () => {
  for (const variant of ["anthropic/claude-opus-5", "anthropic-claude-opus-5", "claude-opus-5"]) {
    const match = matcher.find(normalizeModelId(variant));
    assert.ok(match, `${variant} did not match anything`);
    assert.equal(match.id, "claude-opus-5", `${variant} matched ${match.id}`);
  }
});

test("model names keep enough of themselves to stay distinguishable", () => {
  // With the prototype's double strip, these all collapsed toward bare version
  // fragments that could collide across providers.
  const identities = [
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v4-pro",
    "mistral/mistral-large-3",
    "mistral/mistral-small-4",
  ].map(normalizeModelId);
  assert.equal(new Set(identities).size, 4);
  for (const identity of identities) assert.ok(identity.length >= 10, `${identity} is too short to be distinctive`);
});

test("every catalogue model is recognisable from its own identity", () => {
  for (const model of CATALOG) {
    for (const key of catalogKeys(model)) {
      assert.ok(matcher.find(key), `${model.id} is not findable by its own key "${key}"`);
    }
  }
});

test("a short prefix does not match everything", () => {
  // Without the length floor, "gpt-5" would claim every GPT-5 variant on
  // every list, and the overlap statistics would be fiction.
  assert.equal(matcher.find("gpt-5"), null);
  assert.equal(matcher.find("claude"), null);
});

test("non-language endpoints are recognised", () => {
  const excluded = [
    "openai/text-embedding-3-large",
    "cohere/rerank-v3",
    "openai/whisper-1",
    "stability/stable-diffusion-xl",
    "google/veo-3",
    "openai/dall-e-3",
    "elevenlabs/tts-v2",
  ];
  for (const id of excluded) assert.ok(NON_LANGUAGE_ENDPOINT.test(id), `${id} should be excluded`);

  const kept = ["anthropic/claude-opus-5", "openai/gpt-5.6-terra", "deepseek/deepseek-v4-pro"];
  for (const id of kept) assert.ok(!NON_LANGUAGE_ENDPOINT.test(id), `${id} should be kept`);
});

test("the OpenRouter adapter reads its schema", () => {
  const payload = {
    data: [
      {
        id: "anthropic/claude-opus-5",
        name: "Claude Opus 5",
        description: "Frontier reasoning",
        context_length: 1_000_000,
        architecture: { input_modalities: ["text", "image"] },
        pricing: { prompt: 0.000005, completion: 0.000025, input_cache_read: 0.0000005 },
        supported_parameters: ["reasoning", "cache_control"],
      },
    ],
  };
  const [endpoint] = parseRegistryPayload(sourceById("openrouter-public"), payload);
  assert.equal(endpoint.id, "anthropic/claude-opus-5");
  assert.equal(endpoint.contextWindow, 1_000_000);
  assert.ok(endpoint.supportsVision);
  assert.ok(endpoint.supportsReasoning);
  assert.ok(endpoint.supportsCaching);
});

test("the models.dev adapter reads its keyed-object schema", () => {
  const payload = {
    "gpt-5.6-sol": {
      name: "GPT-5.6 Sol",
      description: "Frontier",
      limit: { context: 1_050_000 },
      modalities: { input: ["text", "image"] },
      reasoning: true,
      attachment: true,
    },
  };
  const [endpoint] = parseRegistryPayload(sourceById("models-dev"), payload);
  assert.equal(endpoint.id, "gpt-5.6-sol");
  assert.equal(endpoint.contextWindow, 1_050_000);
  assert.ok(endpoint.supportsReasoning);
});

test("the LiteLLM adapter qualifies bare ids with the provider", () => {
  const payload = {
    data: [
      { id: "claude-opus-5", provider: "anthropic", max_input_tokens: 1_000_000, supports_vision: true, mode: "chat" },
      { id: "openai/gpt-5.6-luna", provider: "openai", max_tokens: 1_050_000 },
    ],
  };
  const endpoints = parseRegistryPayload(sourceById("litellm-catalog"), payload);
  assert.equal(endpoints[0].id, "anthropic/claude-opus-5");
  assert.equal(endpoints[1].id, "openai/gpt-5.6-luna", "an already-qualified id must not be double-prefixed");
});

test("the Hugging Face adapter carries downloads through for the signals layer", () => {
  const payload = [
    { id: "deepseek-ai/DeepSeek-R1", pipeline_tag: "text-generation", downloads: 1_234_567, tags: ["reasoning"] },
  ];
  const [endpoint] = parseRegistryPayload(sourceById("huggingface-inference"), payload);
  assert.match(endpoint.description, /1,234,567 downloads/);
  assert.ok(endpoint.supportsReasoning);
});

test("adapters survive a malformed payload instead of throwing", () => {
  for (const source of REGISTRY_SOURCES) {
    for (const payload of [null, undefined, [], {}, { data: null }, { data: [null, {}, 7] }, "nonsense"]) {
      assert.doesNotThrow(
        () => parseRegistryPayload(source, payload),
        `${source.id} threw on ${JSON.stringify(payload)}`,
      );
    }
  }
});

const snapshot = (sourceId, endpoints, overrides = {}) => ({
  source_id: sourceId,
  name: sourceById(sourceId).name,
  source_url: sourceById(sourceId).sourceUrl,
  catalog_url: sourceById(sourceId).catalogUrl,
  cadence_hours: sourceById(sourceId).cadenceHours,
  models_json: JSON.stringify(endpoints),
  last_checked_at: "2026-08-18T10:00:00.000Z",
  last_http_status: 200,
  last_fingerprint: "sha256:abc",
  drift_status: "current",
  error_message: null,
  ...overrides,
});

test("reconciliation counts listings, groups and exclusions consistently", () => {
  const rows = [
    snapshot("openrouter-public", [
      { id: "anthropic/claude-opus-5", description: "" },
      { id: "anthropic/claude-opus-5-20260210", description: "" },
      { id: "openai/text-embedding-3-large", description: "" },
      { id: "some-vendor/unknown-model-9000", description: "" },
    ]),
  ];
  const summary = reconcileSource(rows[0], matcher);
  assert.equal(summary.endpointCount, 4);
  assert.equal(summary.candidateEndpointCount, 3, "the embedding endpoint should not be a candidate");
  assert.equal(summary.excludedEndpointCount, 1);
  assert.equal(summary.uniqueCandidateCount, 2, "the two Opus listings are one identity");
  assert.equal(summary.duplicateVariantCount, 1);
  assert.equal(summary.possibleCatalogMatches, 1);
  assert.equal(summary.unresolvedCandidateCount, 1);
});

test("a corrupt snapshot yields zero counts rather than an exception", () => {
  const summary = reconcileSource(snapshot("models-dev", [], { models_json: "{not json" }), matcher);
  assert.equal(summary.endpointCount, 0);
  assert.equal(summary.candidateEndpointCount, 0);
});

test("overlap is measured across sources, not within one", () => {
  const rows = [
    snapshot("openrouter-public", [{ id: "anthropic/claude-opus-5" }, { id: "openai/gpt-5.6-luna" }]),
    snapshot("vercel-gateway", [{ id: "anthropic/claude-opus-5" }, { id: "google/gemini-3.7-flash" }]),
    snapshot("models-dev", [{ id: "claude-opus-5" }]),
  ];
  const { summary } = aggregateRegistry(rows, matcher);
  assert.equal(summary.sourceCount, 3);
  assert.equal(summary.endpointCount, 5);
  assert.equal(summary.uniqueCandidateCount, 3);
  assert.equal(summary.crossReferencedIdentityCount, 1, "only Opus 5 appears in more than one source");
  assert.equal(summary.maxSourceOverlap, 3);
  assert.equal(summary.sourceCountDistribution.one, 2);
  assert.equal(summary.sourceCountDistribution.three, 1);
  assert.equal(summary.overlapRate, Math.round((1 / 3) * 1000) / 10);
  // Three sources sharing one identity means three distinct pairs.
  assert.equal(summary.overlapPairs.length, 3);
});

test("records are annotated with the other sources that share their identity", () => {
  const rows = [
    snapshot("openrouter-public", [{ id: "anthropic/claude-opus-5" }]),
    snapshot("vercel-gateway", [{ id: "claude-opus-5:free" }]),
  ];
  const { records } = aggregateRegistry(rows, matcher);
  for (const record of records) {
    assert.equal(record.identitySourceCount, 2);
    assert.equal(record.identitySources.length, 1);
  }
});

test("adoption tallies aggregate listings and downloads per model", () => {
  const rows = [
    snapshot("openrouter-public", [{ id: "anthropic/claude-opus-5" }, { id: "anthropic/claude-opus-5-20260210" }]),
    snapshot("huggingface-inference", [
      { id: "deepseek-ai/deepseek-r1", description: "text-generation · 2,000,000 downloads" },
    ]),
  ];
  const tallies = tallyFromSnapshots(rows, matcher);
  const opus = tallies.get("claude-opus-5");
  assert.equal(opus.listings, 2);
  assert.equal(opus.sourceIds.size, 1);
  const r1 = tallies.get("deepseek-r1");
  assert.equal(r1.huggingFaceDownloads, 2_000_000);
});

test("an excluded endpoint keeps its source label so counts stay reconcilable", () => {
  const row = snapshot("openrouter-public", [{ id: "openai/text-embedding-3-large", description: "" }]);
  const record = toEndpointRecord({ id: "openai/text-embedding-3-large", description: "" }, row, matcher);
  assert.equal(record.classification, "excluded");
  assert.equal(record.sourceName, sourceById("openrouter-public").name);
  assert.equal(record.match, null);
});
