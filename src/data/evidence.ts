import { CATALOG_VERSION, VERIFIED_AT } from "./providers.js";
import { CATALOG } from "./catalog.js";

/** What this catalogue is and is not, stated once and shown in the audit view. */
export const SCOPE = {
  id: "first-party-routing-models",
  version: CATALOG_VERSION,
  reviewedAt: VERIFIED_AT,
  statement:
    "Language models that are available through a provider API or official downloadable weights, have a clear job in an application, and are supported by a current official provider page.",
  providerRule:
    "The provider offers a working API or official downloadable weights, maintains clear official documentation, and supports a useful language-model task.",
  freshnessSla:
    "Official provider pages are checked every seven days. If a page changes, becomes old or cannot be reached, the app raises a review item.",
} as const;

/** One official page to poll, and the catalogue entries it is supposed to cover. */
export interface EvidenceSource {
  readonly id: string;
  readonly provider: string;
  readonly family: string;
  readonly cadenceHours: number;
  readonly sourceUrl: string;
  readonly expectedIds: readonly string[];
  readonly reviewedAt: string;
  readonly scopeVersion: string;
}

/**
 * Evidence sources are derived from the catalogue rather than hand-listed.
 *
 * The prototype maintained a second table of provider → expected model ids,
 * which drifted from the catalogue the moment either changed. Deriving it means
 * a model can never be in the catalogue without something checking its source.
 */
export const EVIDENCE: readonly EvidenceSource[] = (() => {
  const byKey = new Map<string, { provider: string; sourceUrl: string; ids: string[] }>();
  for (const model of CATALOG) {
    const key = `${model.provider}::${model.sourceUrl}`;
    const entry = byKey.get(key) ?? { provider: model.provider, sourceUrl: model.sourceUrl, ids: [] };
    entry.ids.push(model.id);
    byKey.set(key, entry);
  }
  return [...byKey.values()].map((entry) => ({
    id: `${entry.provider.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-models`,
    provider: entry.provider,
    family: `${entry.provider} models`,
    cadenceHours: 168,
    sourceUrl: entry.sourceUrl,
    expectedIds: entry.ids,
    reviewedAt: VERIFIED_AT,
    scopeVersion: SCOPE.version,
  }));
})();

/** What is deliberately left out, and why. */
export const EXCLUSION_POLICY = [
  {
    name: "Models changed by another organisation",
    reason: "They are not released by the original model provider, and their quality and licences can differ.",
  },
  {
    name: "Community-made smaller copies",
    reason: "They change how a model runs, but do not represent a different set of model capabilities.",
  },
  {
    name: "Duplicate dated API versions",
    reason: "They are not counted separately when a current model name behaves in the same way.",
  },
  {
    name: "Embedding, reordering, image-only and video-only tools",
    reason: "They perform a different kind of task and are outside this catalogue.",
  },
  {
    name: "Every size of the same model",
    reason:
      "A size is counted separately only when it changes where the model can run, its cost or the computer power it needs.",
  },
  {
    name: "Marketplace names not confirmed by the provider",
    reason: "These names help find models, but an official provider page must confirm them.",
  },
] as const;

/** Providers visible but not yet included, so the boundary is not silent. */
export const WATCHLIST = [
  { provider: "Aleph Alpha", reason: "Checking which current public models should be included." },
  { provider: "01.AI", reason: "Checking which Yi models are current and available for real applications." },
  {
    provider: "Databricks",
    reason: "Checking whether current DBRX models are distinct from third-party models on the Databricks platform.",
  },
  { provider: "Snowflake", reason: "Checking which Arctic models are current and available for general use." },
  { provider: "Sakana AI", reason: "Research releases are being watched; no stable application model included yet." },
] as const;
