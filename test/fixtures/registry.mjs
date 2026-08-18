/**
 * Canned responses shaped like each source's real payload.
 *
 * Used by `dev-server.mjs --fixtures` so the registry views can be developed and
 * verified without calling six third-party gateways, and by the reconciliation
 * tests so a schema change on one source shows up as one failing fixture rather
 * than as a mystery.
 */
const openRouterModel = (id, context, prompt, completion, vision = false) => ({
  id,
  name: id,
  description: `Sample listing for ${id}`,
  context_length: context,
  architecture: { input_modalities: vision ? ["text", "image"] : ["text"] },
  pricing: { prompt, completion },
  supported_parameters: ["reasoning"],
});

export const REGISTRY_FIXTURES = {
  "openrouter.ai/api": {
    data: [
      openRouterModel("anthropic/claude-opus-5", 1000000, 0.000005, 0.000025, true),
      openRouterModel("anthropic/claude-sonnet-5", 1000000, 0.000002, 0.00001, true),
      openRouterModel("openai/gpt-5.6-luna", 1050000, 0.0000002, 0.0000012, true),
      openRouterModel("openai/gpt-5.6-terra", 1050000, 0.000002, 0.000012, true),
      openRouterModel("deepseek/deepseek-v4-flash", 1000000, 0.00000044, 0.00000132),
      openRouterModel("deepseek/deepseek-v4-flash:free", 1000000, 0, 0),
      openRouterModel("z-ai/glm-5.2", 1000000, 0.0000006, 0.0000022),
      openRouterModel("xiaomi/mimo-v2.5", 256000, 0.0000001, 0.0000004),
      openRouterModel("x-ai/grok-4.6", 500000, 0.000002, 0.000006),
      openRouterModel("google/gemini-3.7-flash", 1000000, 0.0000003, 0.0000025, true),
      openRouterModel("openai/text-embedding-3-large", 8192, 0.00000013, 0),
      openRouterModel("some-lab/undocumented-model-v2", 32000, 0.000001, 0.000002),
    ],
  },
  "router.requesty.ai": {
    data: [
      {
        id: "anthropic/claude-opus-5",
        context_window: 1000000,
        supports_vision: true,
        description: "Requesty listing",
      },
      { id: "openai/gpt-5.6-luna", context_window: 1050000, description: "Requesty listing" },
      { id: "moonshot/kimi-k3", context_window: 1000000, description: "Requesty listing" },
    ],
  },
  "ai-gateway.vercel.sh": {
    data: [
      {
        id: "anthropic/claude-opus-5",
        context_window: 1000000,
        modalities: { input: ["text", "image"] },
        pricing: { input: 5, output: 25 },
        supported_parameters: ["reasoning"],
      },
      {
        id: "openai/gpt-5.6-sol",
        context_window: 1050000,
        modalities: { input: ["text", "image"] },
        pricing: { input: 5, output: 30 },
      },
      { id: "mistral/mistral-large-3", context_window: 256000, modalities: { input: ["text"] }, pricing: {} },
    ],
  },
  "huggingface.co/api/models": [
    { id: "deepseek-ai/DeepSeek-R1", pipeline_tag: "text-generation", downloads: 4100000, tags: ["reasoning"] },
    { id: "meta-llama/Llama-4-Scout", pipeline_tag: "text-generation", downloads: 2300000, tags: [] },
    { id: "google/gemma-4-31b", pipeline_tag: "image-text-to-text", downloads: 1800000, tags: [] },
    { id: "unknown-org/unknown-tune-7b", pipeline_tag: "text-generation", downloads: 412, tags: [] },
  ],
  "models.dev/models.json": {
    "claude-opus-5": {
      name: "Claude Opus 5",
      description: "Frontier reasoning",
      limit: { context: 1000000 },
      modalities: { input: ["text", "image"] },
      reasoning: true,
      attachment: true,
    },
    "gpt-5.6-sol": {
      name: "GPT-5.6 Sol",
      description: "Frontier GPT",
      limit: { context: 1050000 },
      modalities: { input: ["text", "image"] },
      reasoning: true,
    },
    "kimi-k3": { name: "Kimi K3", description: "Open frontier", limit: { context: 1000000 }, reasoning: true },
  },
  "api.litellm.ai": {
    has_more: false,
    page_size: 500,
    total_count: 4,
    data: [
      {
        id: "claude-opus-5",
        provider: "anthropic",
        max_input_tokens: 1000000,
        supports_vision: true,
        supports_prompt_caching: true,
        mode: "chat",
      },
      { id: "gpt-5.6-luna", provider: "openai", max_input_tokens: 1050000, mode: "chat" },
      { id: "command-a-plus", provider: "cohere", max_input_tokens: 128000, mode: "chat" },
      { id: "text-embedding-3-large", provider: "openai", max_input_tokens: 8192, mode: "embedding" },
    ],
  },
};
