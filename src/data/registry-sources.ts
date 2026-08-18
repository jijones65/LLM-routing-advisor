/**
 * Third-party model lists the app cross-references.
 *
 * None of these is an official provider source, and the distinction is load
 * bearing: a model appearing on four gateways tells you it is widely *available*,
 * not that its provider currently documents it. The `evidenceClass` on each
 * source is what the UI uses to keep that difference visible.
 */
export interface RegistrySource {
  readonly id: string;
  readonly name: string;
  /** The machine-readable endpoint polled on `cadenceHours`. */
  readonly sourceUrl: string;
  /** The human-facing page, for the "open source" link. */
  readonly catalogUrl: string;
  readonly cadenceHours: number;
  readonly evidenceClass: "Gateway availability" | "Inference availability" | "Community metadata";
  readonly role: string;
}

export const REGISTRY_SOURCES: readonly RegistrySource[] = [
  {
    id: "requesty-public",
    name: "Requesty model list",
    sourceUrl: "https://router.requesty.ai/v1/models",
    catalogUrl: "https://www.requesty.ai/models",
    cadenceHours: 6,
    evidenceClass: "Gateway availability",
    role: "Shows models listed by Requesty. It helps find available models but is not an official provider check.",
  },
  {
    id: "openrouter-public",
    name: "OpenRouter model list",
    sourceUrl: "https://openrouter.ai/api/v1/models?output_modalities=all",
    catalogUrl: "https://openrouter.ai/models",
    cadenceHours: 6,
    evidenceClass: "Gateway availability",
    role: "Shows models listed by OpenRouter with a common set of technical details. It is not an official provider check.",
  },
  {
    id: "vercel-gateway",
    name: "Vercel AI Gateway",
    sourceUrl: "https://ai-gateway.vercel.sh/v1/models",
    catalogUrl: "https://vercel.com/ai-gateway/models",
    cadenceHours: 6,
    evidenceClass: "Gateway availability",
    role: "Shows models available through Vercel AI Gateway. It is not an official provider check.",
  },
  {
    id: "huggingface-inference",
    name: "Hugging Face hosted model list",
    sourceUrl:
      "https://huggingface.co/api/models?inference_provider=all&pipeline_tag=text-generation&sort=downloads&direction=-1&limit=1000",
    catalogUrl: "https://huggingface.co/models?inference_provider=all&pipeline_tag=text-generation",
    cadenceHours: 12,
    evidenceClass: "Inference availability",
    role: "The 1,000 most-downloaded text-generation models available through Hugging Face hosting. A sample, not the full Hub.",
  },
  {
    id: "models-dev",
    name: "Models.dev model information",
    sourceUrl: "https://models.dev/models.json",
    catalogUrl: "https://models.dev",
    cadenceHours: 12,
    evidenceClass: "Community metadata",
    role: "Technical information about models from many providers. Helps compare details but does not show current availability.",
  },
  {
    id: "litellm-catalog",
    name: "LiteLLM model list",
    sourceUrl: "https://api.litellm.ai/model_catalog?page=1&page_size=500",
    catalogUrl: "https://models.litellm.ai",
    cadenceHours: 12,
    evidenceClass: "Community metadata",
    role: "Model names, prices, capabilities and hosted versions from many providers. Extra names and provider versions stay visible.",
  },
];

export const REGISTRY_SOURCE_INDEX: ReadonlyMap<string, RegistrySource> = new Map(
  REGISTRY_SOURCES.map((source) => [source.id, source]),
);
