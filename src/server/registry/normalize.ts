import type { Model } from "../../shared/types.js";

/**
 * Vendor names that appear as a dash-delimited prefix on some lists.
 *
 * Some sources qualify with a slash (`anthropic/claude-opus-5`), some with a dash
 * (`anthropic-claude-opus-5`), and some not at all (`claude-opus-5`). All three
 * must resolve to the same model.
 */
const VENDOR_PREFIX =
  /^(anthropic|openai|google|meta|mistral|mistralai|deepseek|xai|zai|z-ai|moonshot|moonshotai|qwen|alibaba|cohere|ai21|amazon|aws|nvidia|xiaomi|tencent|baidu|bytedance|perplexity|microsoft|ibm|writer|stepfun|naver|tii|minimax|lg|lgai)-/;

/**
 * Reduce a model id to a comparable identity.
 *
 * Every list names the same model differently: `anthropic/claude-opus-5`,
 * `claude-opus-5-20260210`, `models/claude-opus-5`, `claude-opus-5:free`,
 * `claude-opus-5@global`. Without normalisation the overlap statistics — the
 * whole point of comparing six lists — are meaningless, because one model counts
 * as six distinct names.
 *
 * Note what this deliberately does *not* do: strip a vendor name that appears as
 * a dash-prefix. The prototype did, and it turned `deepseek/deepseek-v4-flash`
 * into `v4-flash`, eating half the actual model name — so DeepSeek V4 Flash, the
 * single most-routed model on OpenRouter, was identified by a fragment that could
 * collide with anything else called "v4". Vendor prefixes are handled by
 * `identityVariants` instead, which keeps both readings rather than guessing.
 */
export function normalizeModelId(raw: string): string {
  let value = String(raw ?? "")
    .toLowerCase()
    .trim();

  // Vendor-qualified ids: keep everything after the first slash.
  const parts = value.split("/");
  if (parts.length > 1) value = parts.slice(1).join("/");

  value = value
    .replace(/^models\//, "")
    // Region and deployment scopes: @global, @us-east1, @apac
    .replace(/@(global|us|eu|apac|[a-z]{2,}(?:-[a-z0-9]+)+)$/i, "")
    // Access tiers: :free, :latest, :online
    .replace(/:(free|latest|online)$/i, "")
    // Dated releases: -20260210, -2026-02-10, _2026.02.10
    .replace(/(?:[-_.])(20\d{6}|20\d{2}[-_.]\d{2}[-_.]\d{2})$/, "");

  return value.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unresolved";
}

/**
 * Both readings of an identity: as given, and with a vendor dash-prefix removed.
 *
 * Generating variants on both sides of the comparison — the catalogue's keys and
 * the incoming key — is what lets `anthropic-claude-opus-5` and `claude-opus-5`
 * meet in the middle without either side losing information.
 */
export function identityVariants(key: string): string[] {
  const variants = [key];
  const stripped = key.replace(VENDOR_PREFIX, "");
  if (stripped !== key && stripped.length >= 4) variants.push(stripped);
  return variants;
}

/** Every identity a catalogue model can be recognised by. */
export function catalogKeys(model: Model): string[] {
  const base = [model.id, model.name].map(normalizeModelId);
  return [...new Set(base.flatMap(identityVariants))].filter(Boolean);
}

/**
 * Whether two normalised keys plausibly name the same model.
 *
 * Exact match, or one is a hyphen-delimited prefix of the other and long enough
 * that the prefix is meaningful. The 8-character floor stops `gpt-5` claiming
 * every GPT-5 variant on every list, which would make the overlap figures
 * fiction rather than evidence.
 */
function keysAlign(candidate: string, key: string): boolean {
  if (candidate === key) return true;
  if (candidate.length >= 8 && key.startsWith(`${candidate}-`)) return true;
  if (key.length >= 8 && candidate.startsWith(`${key}-`)) return true;
  return false;
}

/** An index for matching normalised registry keys back to catalogue models. */
export class CatalogMatcher {
  private readonly exact = new Map<string, Model>();
  private readonly entries: readonly { model: Model; keys: readonly string[] }[];

  constructor(catalog: readonly Model[]) {
    this.entries = catalog.map((model) => ({ model, keys: catalogKeys(model) }));
    // Exact hits are the overwhelming majority and this runs across thousands of
    // endpoints per refresh, so they skip the scan entirely.
    for (const entry of this.entries) {
      for (const key of entry.keys) if (!this.exact.has(key)) this.exact.set(key, entry.model);
    }
  }

  /** The catalogue model a normalised key probably refers to, if any. */
  find(key: string): Model | null {
    for (const variant of identityVariants(key)) {
      const hit = this.exact.get(variant);
      if (hit) return hit;
    }
    for (const variant of identityVariants(key)) {
      const entry = this.entries.find((item) => item.keys.some((candidate) => keysAlign(candidate, variant)));
      if (entry) return entry.model;
    }
    return null;
  }
}
