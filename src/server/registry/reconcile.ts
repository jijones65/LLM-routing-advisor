import type { Model } from "../../shared/types.js";
import { REGISTRY_SOURCE_INDEX, type RegistrySource } from "../../data/registry-sources.js";
import { CatalogMatcher, normalizeModelId } from "./normalize.js";
import type { RegistryEndpoint } from "./parse.js";

/**
 * Endpoints that are not language models.
 *
 * They are matched and labelled rather than dropped, so the source counts a user
 * sees stay reconcilable against the source's own published total. Silently
 * filtering would make the app's numbers impossible to check against OpenRouter.
 */
export const NON_LANGUAGE_ENDPOINT =
  /(?:^|[/_-])(embedding|embeddings|rerank|reranker|moderation|whisper|transcrib|speech-to-text|text-to-speech|tts|dall-e|image-gen|video-gen|stable-diffusion|flux|sora|veo|music)(?:$|[/_-])/i;

/** A stored registry snapshot row, as it comes back from D1. */
export interface SnapshotRow {
  readonly source_id: string;
  readonly name: string;
  readonly source_url: string;
  readonly catalog_url: string;
  readonly cadence_hours: number;
  readonly models_json: string;
  readonly last_checked_at: string | null;
  readonly last_http_status: number | null;
  readonly last_fingerprint: string | null;
  readonly drift_status: string;
  readonly error_message: string | null;
}

export type Classification = "possible-match" | "review" | "excluded";

/** One endpoint from one source, resolved against the catalogue. */
export interface EndpointRecord {
  readonly id: string;
  readonly normalizedId: string;
  readonly provider: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly evidenceClass: string;
  readonly classification: Classification;
  readonly description: string;
  readonly inputPrice: number | null;
  readonly outputPrice: number | null;
  readonly contextWindow: number | null;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsCaching: boolean;
  readonly match: { id: string; name: string; provider: string; sourceUrl: string; ollamaUrl: string | null } | null;
  identitySourceCount?: number;
  identitySources?: string[];
}

const UNKNOWN_SOURCE: Pick<RegistrySource, "evidenceClass" | "role"> = {
  evidenceClass: "Community metadata",
  role: "Source configuration is not available in this build.",
};

function sourceConfig(id: string): Pick<RegistrySource, "evidenceClass" | "role"> {
  return REGISTRY_SOURCE_INDEX.get(id) ?? UNKNOWN_SOURCE;
}

function parseSnapshot(row: SnapshotRow): RegistryEndpoint[] {
  try {
    const parsed: unknown = JSON.parse(row.models_json || "[]");
    return Array.isArray(parsed) ? (parsed as RegistryEndpoint[]) : [];
  } catch {
    return [];
  }
}

/** Resolve one endpoint against the catalogue. */
export function toEndpointRecord(
  endpoint: RegistryEndpoint,
  row: SnapshotRow,
  matcher: CatalogMatcher,
): EndpointRecord {
  const id = String(endpoint.id ?? "");
  const description = String(endpoint.description ?? "");
  const excluded = NON_LANGUAGE_ENDPOINT.test(`${id} ${description}`);
  const normalizedId = normalizeModelId(id);
  const match = excluded ? null : matcher.find(normalizedId);
  const config = sourceConfig(row.source_id);

  return {
    id,
    normalizedId,
    provider: id.includes("/") ? id.split("/")[0] : "unqualified",
    sourceId: row.source_id,
    sourceName: row.name,
    sourceUrl: row.catalog_url,
    evidenceClass: config.evidenceClass,
    classification: excluded ? "excluded" : match ? "possible-match" : "review",
    description,
    inputPrice: endpoint.inputPrice ?? null,
    outputPrice: endpoint.outputPrice ?? null,
    contextWindow: endpoint.contextWindow ?? null,
    supportsVision: Boolean(endpoint.supportsVision),
    supportsReasoning: Boolean(endpoint.supportsReasoning),
    supportsCaching: Boolean(endpoint.supportsCaching),
    match: match
      ? {
          id: match.id,
          name: match.name,
          provider: match.provider,
          sourceUrl: match.sourceUrl,
          ollamaUrl: match.ollamaUrl,
        }
      : null,
  };
}

/** Per-source reconciliation summary. */
export interface SourceSummary {
  readonly id: string;
  readonly name: string;
  readonly sourceUrl: string;
  readonly catalogUrl: string;
  readonly evidenceClass: string;
  readonly role: string;
  readonly cadenceHours: number;
  readonly status: string;
  readonly lastCheckedAt: string | null;
  readonly httpStatus: number | null;
  readonly errorMessage: string | null;
  readonly endpointCount: number;
  readonly candidateEndpointCount: number;
  readonly uniqueCandidateCount: number;
  readonly providerCount: number;
  readonly duplicateVariantCount: number;
  readonly excludedEndpointCount: number;
  readonly possibleCatalogMatches: number;
  readonly unresolvedCandidateCount: number;
  readonly reviewQueue: readonly { key: string; count: number; example: string }[];
}

/** Reconcile one source's snapshot against the catalogue. */
export function reconcileSource(row: SnapshotRow, matcher: CatalogMatcher): SourceSummary {
  const endpoints = parseSnapshot(row);
  const candidates = endpoints.filter(
    (endpoint) => !NON_LANGUAGE_ENDPOINT.test(`${String(endpoint.id ?? "")} ${String(endpoint.description ?? "")}`),
  );

  const providers = new Set<string>();
  const groups = new Map<string, { key: string; count: number; example: string }>();

  for (const endpoint of candidates) {
    const id = String(endpoint.id ?? "");
    providers.add(id.includes("/") ? id.split("/")[0] : "unqualified");
    const key = normalizeModelId(id);
    const group = groups.get(key) ?? { key, count: 0, example: id };
    group.count += 1;
    groups.set(key, group);
  }

  const matchedCatalog = new Set<string>();
  const unresolved: { key: string; count: number; example: string }[] = [];
  for (const [key, group] of groups) {
    const match = matcher.find(key);
    if (match) matchedCatalog.add(match.id);
    else unresolved.push(group);
  }
  unresolved.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const config = sourceConfig(row.source_id);
  return {
    id: row.source_id,
    name: row.name,
    sourceUrl: row.source_url,
    catalogUrl: row.catalog_url,
    evidenceClass: config.evidenceClass,
    role: config.role,
    cadenceHours: Number(row.cadence_hours),
    status: row.drift_status,
    lastCheckedAt: row.last_checked_at,
    httpStatus: row.last_http_status,
    errorMessage: row.error_message,
    endpointCount: endpoints.length,
    candidateEndpointCount: candidates.length,
    uniqueCandidateCount: groups.size,
    providerCount: providers.size,
    duplicateVariantCount: Math.max(0, candidates.length - groups.size),
    excludedEndpointCount: Math.max(0, endpoints.length - candidates.length),
    possibleCatalogMatches: matchedCatalog.size,
    unresolvedCandidateCount: unresolved.length,
    reviewQueue: unresolved.slice(0, 60),
  };
}

/** Cross-source aggregate: the numbers behind the overlap view. */
export interface RegistryAggregate {
  readonly sourceCount: number;
  readonly endpointCount: number;
  readonly candidateEndpointCount: number;
  readonly uniqueCandidateCount: number;
  readonly providerCount: number;
  readonly crossReferencedIdentityCount: number;
  readonly sourceOnlyIdentityCount: number;
  readonly overlapRate: number;
  readonly maxSourceOverlap: number;
  readonly sourceCountDistribution: { one: number; two: number; three: number; fourPlus: number };
  readonly overlapPairs: readonly {
    sourceAId: string;
    sourceA: string;
    sourceBId: string;
    sourceB: string;
    count: number;
  }[];
  readonly duplicateVariantCount: number;
  readonly excludedEndpointCount: number;
  readonly possibleCatalogMatches: number;
  readonly unresolvedCandidateCount: number;
  readonly reviewQueue: readonly { key: string; count: number; example: string; sourceCount: number }[];
  readonly lastCheckedAt: string | null;
}

/**
 * Aggregate every source into one picture, plus per-record identity annotations.
 *
 * The interesting output is `overlapRate`: the share of normalised model names
 * that appear on more than one list. It is the honest answer to "how much do
 * these lists actually agree?", and agreement between gateways is still not
 * confirmation from a provider — which is why it is reported separately from
 * `possibleCatalogMatches` rather than blended into one confidence number.
 */
export function aggregateRegistry(
  rows: readonly SnapshotRow[],
  matcher: CatalogMatcher,
): { records: EndpointRecord[]; summary: RegistryAggregate } {
  const records: EndpointRecord[] = [];
  for (const row of rows) {
    for (const endpoint of parseSnapshot(row)) records.push(toEndpointRecord(endpoint, row, matcher));
  }

  const candidates = records.filter((record) => record.classification !== "excluded");
  const sourceNames = new Map(rows.map((row) => [row.source_id, row.name]));
  const matchedCatalog = new Set<string>();
  const groups = new Map<
    string,
    { key: string; count: number; example: string; sources: Set<string>; matched: boolean }
  >();

  for (const record of candidates) {
    const group = groups.get(record.normalizedId) ?? {
      key: record.normalizedId,
      count: 0,
      example: record.id,
      sources: new Set<string>(),
      matched: false,
    };
    group.count += 1;
    group.sources.add(record.sourceId);
    if (record.match) {
      group.matched = true;
      matchedCatalog.add(record.match.id);
    }
    groups.set(record.normalizedId, group);
  }

  // Annotate each record with how many sources share its identity, so a row in
  // the UI can say "also found in OpenRouter and Vercel" without a second pass.
  for (const record of records) {
    const group = groups.get(record.normalizedId);
    if (!group) continue;
    record.identitySourceCount = group.sources.size;
    record.identitySources = [...group.sources]
      .filter((id) => id !== record.sourceId)
      .map((id) => sourceNames.get(id) ?? id);
  }

  const groupList = [...groups.values()];
  const distribution = { one: 0, two: 0, three: 0, fourPlus: 0 };
  const pairCounts = new Map<string, number>();

  for (const group of groupList) {
    const ids = [...group.sources].sort();
    if (ids.length === 1) distribution.one += 1;
    else if (ids.length === 2) distribution.two += 1;
    else if (ids.length === 3) distribution.three += 1;
    else distribution.fourPlus += 1;

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const key = `${ids[i]}||${ids[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const overlapPairs = [...pairCounts]
    .map(([key, count]) => {
      const [a, b] = key.split("||");
      return { sourceAId: a, sourceA: sourceNames.get(a) ?? a, sourceBId: b, sourceB: sourceNames.get(b) ?? b, count };
    })
    .sort((a, b) => b.count - a.count || a.sourceA.localeCompare(b.sourceA));

  const crossReferencedIdentityCount = groupList.filter((group) => group.sources.size > 1).length;
  const unresolved = groupList
    .filter((group) => !group.matched)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const lastCheckedAt =
    rows
      .map((row) => row.last_checked_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    records,
    summary: {
      sourceCount: rows.length,
      endpointCount: records.length,
      candidateEndpointCount: candidates.length,
      uniqueCandidateCount: groups.size,
      providerCount: new Set(candidates.map((record) => record.provider)).size,
      crossReferencedIdentityCount,
      sourceOnlyIdentityCount: distribution.one,
      overlapRate: groups.size ? Math.round((crossReferencedIdentityCount / groups.size) * 1000) / 10 : 0,
      maxSourceOverlap: groupList.reduce((max, group) => Math.max(max, group.sources.size), 0),
      sourceCountDistribution: distribution,
      overlapPairs,
      duplicateVariantCount: Math.max(0, candidates.length - groups.size),
      excludedEndpointCount: records.length - candidates.length,
      possibleCatalogMatches: matchedCatalog.size,
      unresolvedCandidateCount: unresolved.length,
      reviewQueue: unresolved.slice(0, 60).map((group) => ({
        key: group.key,
        count: group.count,
        example: group.example,
        sourceCount: group.sources.size,
      })),
      lastCheckedAt,
    },
  };
}

/** Build per-model adoption tallies from stored snapshots. */
export function tallyFromSnapshots(
  rows: readonly SnapshotRow[],
  matcher: CatalogMatcher,
): Map<string, { sourceIds: Set<string>; listings: number; huggingFaceDownloads: number; checkedAt: string | null }> {
  const tallies = new Map<
    string,
    { sourceIds: Set<string>; listings: number; huggingFaceDownloads: number; checkedAt: string | null }
  >();

  for (const row of rows) {
    for (const endpoint of parseSnapshot(row)) {
      const record = toEndpointRecord(endpoint, row, matcher);
      const id = record.match?.id;
      if (!id) continue;

      const tally = tallies.get(id) ?? {
        sourceIds: new Set<string>(),
        listings: 0,
        huggingFaceDownloads: 0,
        checkedAt: null,
      };
      tally.sourceIds.add(row.source_id);
      tally.listings += 1;

      if (row.source_id === "huggingface-inference") {
        const downloads = /([\d,.]+) downloads/i.exec(record.description);
        if (downloads) {
          tally.huggingFaceDownloads = Math.max(
            tally.huggingFaceDownloads,
            Number(downloads[1].replaceAll(",", "")) || 0,
          );
        }
      }
      if (row.last_checked_at && (!tally.checkedAt || row.last_checked_at > tally.checkedAt)) {
        tally.checkedAt = row.last_checked_at;
      }
      tallies.set(id, tally);
    }
  }
  return tallies;
}
