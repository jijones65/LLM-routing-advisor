/**
 * The official page for each provider, and the version stamp for the whole
 * catalogue. Every model inherits its provider's source URL unless the
 * catalogue overrides it.
 */

/** The date the catalogue was last reviewed against official provider pages. */
export const VERIFIED_AT = "2026-08-19";

/** Bumped whenever catalogue facts or scoring behaviour change. */
export const CATALOG_VERSION = "2026.08.19-1";

/**
 * Official documentation page per provider. These are the pages the evidence
 * layer polls; a change in page content raises a review item.
 */
export const PROVIDER_SOURCES: Readonly<Record<string, string>> = {
  OpenAI: "https://developers.openai.com/api/docs/models",
  Anthropic: "https://platform.claude.com/docs/en/about-claude/models/overview",
  Google: "https://ai.google.dev/gemini-api/docs/models",
  xAI: "https://docs.x.ai/developers/models",
  DeepSeek: "https://api-docs.deepseek.com/quick_start/pricing/",
  Mistral: "https://docs.mistral.ai/models/overview",
  Alibaba: "https://help.aliyun.com/en/model-studio/model-deployment-introduction",
  Xiaomi: "https://huggingface.co/XiaomiMiMo",
  Moonshot: "https://platform.kimi.ai/docs/models",
  "Z.AI": "https://docs.z.ai/guides/llm/glm-5",
  MiniMax: "https://platform.minimax.io/docs/guides/models-intro",
  Meta: "https://huggingface.co/meta-llama",
  Cohere: "https://docs.cohere.com/v1/docs/models",
  Amazon: "https://aws.amazon.com/nova/models/",
  IBM: "https://research.ibm.com/blog/granite-4-1-ai-foundation-models",
  Microsoft: "https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/overview",
  NVIDIA: "https://build.nvidia.com/models",
  Perplexity: "https://docs.perplexity.ai/docs/sonar/models",
  AI21: "https://docs.ai21.com/docs/jamba-foundation-models",
  ByteDance: "https://seed.bytedance.com/en/models",
  Baidu: "https://cloud.baidu.com/doc/qianfan-docs/s/7m95lyy43",
  Tencent: "https://cloud.tencent.com/document/product/1729/104753",
  StepFun: "https://huggingface.co/stepfun-ai",
  Writer: "https://dev.writer.com/home/models",
  "LG AI": "https://huggingface.co/LGAI-EXAONE",
  NAVER: "https://huggingface.co/naver-hyperclovax",
  TII: "https://huggingface.co/tiiuae",
};

/** Official model-specific pages where the provider's general list is too broad. */
export const MODEL_SOURCE_OVERRIDES: Readonly<Record<string, string>> = {
  "functiongemma-270m": "https://ai.google.dev/gemma/docs/functiongemma/model_card",
  "qwen3-vl-2b": "https://huggingface.co/Qwen/Qwen3-VL-2B-Instruct",
  "qwen3-vl-4b": "https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct",
};

/**
 * Where a model can be pulled with Ollama. Only official library entries — a
 * community re-upload is not the same artefact and is excluded on purpose.
 */
export const OLLAMA_LIBRARY: Readonly<Record<string, string>> = {
  "gpt-oss-120b": "https://ollama.com/library/gpt-oss:120b",
  "gpt-oss-20b": "https://ollama.com/library/gpt-oss:20b",
  "gemma-4-31b": "https://ollama.com/library/gemma4:31b",
  "gemma-4-26b-a4b": "https://ollama.com/library/gemma4:26b",
  "gemma-4-12b": "https://ollama.com/library/gemma4:12b",
  "gemma-4-e4b": "https://ollama.com/library/gemma4:e4b",
  "gemma-4-e2b": "https://ollama.com/library/gemma4:e2b",
  "deepseek-v4-pro": "https://ollama.com/library/deepseek-v4-pro",
  "deepseek-v4-flash": "https://ollama.com/library/deepseek-v4-flash",
  "deepseek-r1": "https://ollama.com/library/deepseek-r1",
  "deepseek-r1-0528": "https://ollama.com/library/deepseek-r1:671b-0528",
  "llama-4-maverick": "https://ollama.com/library/llama4:maverick",
  "llama-4-scout": "https://ollama.com/library/llama4:scout",
  "llama-3-3-70b": "https://ollama.com/library/llama3.3:70b",
  "mistral-small-4": "https://ollama.com/library/mistral-small4",
  "mistral-large-3": "https://ollama.com/library/mistral-large3",
  "phi-4-mm": "https://ollama.com/library/phi4-multimodal",
  "phi-4-mini": "https://ollama.com/library/phi4-mini",
  "granite-4-1-30b": "https://ollama.com/library/granite4.1:30b",
  "granite-4-1-8b": "https://ollama.com/library/granite4.1:8b",
  "qwen-3-5-9b": "https://ollama.com/library/qwen3.5:9b",
  "nemotron-3-nano": "https://ollama.com/library/nemotron3-nano",
  "glm-4-7": "https://ollama.com/library/glm4.7",
  "kimi-k3": "https://ollama.com/library/kimi-k3",
};
