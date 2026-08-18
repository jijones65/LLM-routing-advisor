import type { RegistrySource } from "../../data/registry-sources.js";

/** One model as a third-party list describes it, flattened to a common shape. */
export interface RegistryEndpoint {
  readonly id: string;
  readonly inputPrice: number | null;
  readonly outputPrice: number | null;
  readonly contextWindow: number | null;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsCaching: boolean;
  readonly description: string;
}

type Json = Record<string, unknown>;

const asRecord = (value: unknown): Json => (value !== null && typeof value === "object" ? (value as Json) : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asStrings = (value: unknown): string[] => asArray(value).map(String);
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const clip = (value: unknown, length = 240): string => String(value ?? "").slice(0, length);

/**
 * Adapters, one per source, because every list has its own schema.
 *
 * Each returns the common `RegistryEndpoint` shape. Keeping them as separate
 * named functions rather than one branching parser means a source changing its
 * response format is a one-function fix with a matching one-fixture test.
 */
const PARSERS: Record<string, (payload: unknown) => RegistryEndpoint[]> = {
  "models-dev": (payload) =>
    Object.entries(asRecord(payload))
      .map(([key, raw]) => {
        const entry = asRecord(raw);
        const modalities = asRecord(entry.modalities);
        const input = asStrings(modalities.input);
        return {
          id: String(entry.id ?? key),
          inputPrice: null,
          outputPrice: null,
          contextWindow: asNumber(asRecord(entry.limit).context),
          supportsVision: Boolean(entry.attachment) || input.includes("image"),
          supportsReasoning: Boolean(entry.reasoning),
          supportsCaching: false,
          description: clip(entry.description ?? entry.name),
        };
      })
      .filter((endpoint) => endpoint.id),

  "openrouter-public": (payload) =>
    listOf(payload).map((raw) => {
      const entry = asRecord(raw);
      const architecture = asRecord(entry.architecture);
      const pricing = asRecord(entry.pricing);
      const parameters = asStrings(entry.supported_parameters);
      return {
        id: String(entry.id ?? ""),
        inputPrice: asNumber(Number(pricing.prompt)),
        outputPrice: asNumber(Number(pricing.completion)),
        contextWindow: asNumber(entry.context_length),
        supportsVision: asStrings(architecture.input_modalities).includes("image"),
        supportsReasoning:
          Boolean(entry.reasoning) || parameters.includes("reasoning") || parameters.includes("include_reasoning"),
        supportsCaching: pricing.input_cache_read != null || parameters.includes("cache_control"),
        description: clip(entry.description ?? entry.name),
      };
    }),

  "vercel-gateway": (payload) =>
    listOf(payload).map((raw) => {
      const entry = asRecord(raw);
      const parameters = asStrings(entry.supported_parameters);
      const pricing = asRecord(entry.pricing);
      return {
        id: String(entry.id ?? ""),
        inputPrice: asNumber(Number(pricing.input)),
        outputPrice: asNumber(Number(pricing.output)),
        contextWindow: asNumber(entry.context_window),
        supportsVision: asStrings(asRecord(entry.modalities).input).includes("image"),
        supportsReasoning:
          parameters.includes("reasoning") ||
          parameters.includes("include_reasoning") ||
          asArray(entry.reasoning_options).length > 0,
        supportsCaching: parameters.includes("cache_control"),
        description: clip(entry.description ?? entry.name),
      };
    }),

  "huggingface-inference": (payload) =>
    listOf(payload).map((raw) => {
      const entry = asRecord(raw);
      const tags = asStrings(entry.tags);
      const pipeline = String(entry.pipeline_tag ?? "text-generation");
      return {
        id: String(entry.id ?? entry.modelId ?? ""),
        inputPrice: null,
        outputPrice: null,
        contextWindow: null,
        supportsVision: pipeline === "image-text-to-text" || tags.includes("image-text-to-text"),
        supportsReasoning: tags.some((tag) => /reasoning|thinking/i.test(tag)),
        supportsCaching: false,
        // Downloads are carried in the description because the signals layer
        // parses them back out as an adoption input.
        description: clip(`${pipeline} · ${Number(entry.downloads ?? 0).toLocaleString()} downloads`),
      };
    }),

  "litellm-catalog": (payload) =>
    listOf(payload).map((raw) => {
      const entry = asRecord(raw);
      const provider = String(entry.provider ?? "unqualified");
      const rawId = String(entry.id ?? "");
      const deprecation = entry.deprecation_date ? ` · deprecates ${String(entry.deprecation_date)}` : "";
      return {
        id: rawId.startsWith(`${provider}/`) ? rawId : `${provider}/${rawId}`,
        inputPrice: asNumber(entry.input_cost_per_token),
        outputPrice: asNumber(entry.output_cost_per_token),
        contextWindow: asNumber(entry.max_input_tokens) ?? asNumber(entry.max_tokens),
        supportsVision: Boolean(entry.supports_vision),
        supportsReasoning: Boolean(entry.supports_reasoning),
        supportsCaching: Boolean(entry.supports_prompt_caching),
        description: clip(`${provider} · ${String(entry.mode ?? "model metadata")}${deprecation}`),
      };
    }),
};

/** OpenAI-compatible lists are either a bare array or `{ data: [...] }`. */
function listOf(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  return asArray(asRecord(payload).data);
}

/** Default adapter for any OpenAI-compatible list, e.g. Requesty. */
function parseGeneric(payload: unknown): RegistryEndpoint[] {
  return listOf(payload).map((raw) => {
    const entry = asRecord(raw);
    return {
      id: String(entry.id ?? ""),
      inputPrice: asNumber(entry.input_price),
      outputPrice: asNumber(entry.output_price),
      contextWindow: asNumber(entry.context_window),
      supportsVision: Boolean(entry.supports_vision),
      supportsReasoning: Boolean(entry.supports_reasoning),
      supportsCaching: Boolean(entry.supports_caching),
      description: clip(entry.description),
    };
  });
}

/** Flatten one source's response into comparable endpoint records. */
export function parseRegistryPayload(source: RegistrySource, payload: unknown): RegistryEndpoint[] {
  const parser = PARSERS[source.id] ?? parseGeneric;
  return parser(payload).filter((endpoint) => endpoint.id.length > 0);
}
