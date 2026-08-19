import type { Capability, CapabilityTest, CapabilityTestSource, ContestedResult } from "../shared/types.js";
import { BENCHMARK_PROTOCOLS, PROTOCOL_INDEX, TIER_RANK, normaliseToFive, type EvidenceTier } from "./benchmarks.js";
import { CAPABILITY_TEST_TABLE } from "./capability-tests.data.js";

/** One published figure, straight from the table. */
export interface TestReport {
  readonly modelId: string;
  readonly protocolId: string;
  readonly rawScore: number;
  readonly sourceTier: EvidenceTier;
  readonly asOf: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly harness: string;
  readonly note: string;
}

const TIERS: readonly EvidenceTier[] = ["benchmark", "independent", "provider", "aggregator"];

function fail(row: number, message: string): never {
  throw new Error(`capability-tests row ${row}: ${message}`);
}

/** Parse and validate the published-results table. Throws on a malformed row. */
export function parseTestReports(table: string = CAPABILITY_TEST_TABLE): TestReport[] {
  return table
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      const row = index + 1;
      const columns = line.split("|");
      if (columns.length !== 9) fail(row, `expected 9 columns, found ${columns.length}`);
      const [modelId, protocolId, rawScore, tier, asOf, sourceName, sourceUrl, harness, note] = columns;

      if (!PROTOCOL_INDEX.has(protocolId)) fail(row, `unknown protocol "${protocolId}"`);
      if (!TIERS.includes(tier as EvidenceTier)) fail(row, `unknown source tier "${tier}"`);
      const score = Number(rawScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) fail(row, `raw score out of range: "${rawScore}"`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) fail(row, `bad date "${asOf}"`);
      if (!sourceUrl.startsWith("https://")) fail(row, `source must be an https URL, found "${sourceUrl}"`);
      if (!sourceName.trim()) fail(row, "missing source name");
      if (!note.trim()) fail(row, "every figure must carry a note, even if only 'not independently reproduced'");

      return {
        modelId,
        protocolId,
        rawScore: score,
        sourceTier: tier as EvidenceTier,
        asOf,
        sourceName,
        sourceUrl,
        harness,
        note,
      };
    });
}

/**
 * Group reports of the same figure into agreement clusters.
 *
 * Sorted by value, then split wherever consecutive reports differ by more than
 * the protocol's tolerance. Two sources 1 point apart are corroborating each
 * other; two sources 16 points apart are contradicting each other, and the
 * difference matters more than the midpoint between them.
 */
function cluster(reports: readonly TestReport[], tolerance: number): TestReport[][] {
  const sorted = [...reports].sort((a, b) => a.rawScore - b.rawScore);
  const clusters: TestReport[][] = [];
  for (const report of sorted) {
    const current = clusters.at(-1);
    if (current && report.rawScore - current[0].rawScore <= tolerance) current.push(report);
    else clusters.push([report]);
  }
  return clusters;
}

/** Prefer the most authoritative report in a cluster. */
function mostAuthoritative(cluster: readonly TestReport[]): TestReport {
  return [...cluster].sort(
    (a, b) => TIER_RANK[b.sourceTier] - TIER_RANK[a.sourceTier] || b.asOf.localeCompare(a.asOf),
  )[0];
}

/** The outcome of resolving one model against one protocol. */
type Resolution =
  | { kind: "resolved"; source: CapabilityTestSource; representative: TestReport }
  | { kind: "contested"; contested: ContestedResult };

/**
 * Decide what a set of reports for one model and protocol actually establishes.
 *
 * A single dominant agreement cluster wins, and any reports outside it are
 * carried along as recorded disagreements rather than deleted. When the largest
 * clusters are tied — two sources, sixteen points apart, neither more numerous —
 * nothing is established, and saying so is the correct answer.
 */
function resolveProtocol(modelId: string, protocolId: string, reports: readonly TestReport[]): Resolution {
  const protocol = PROTOCOL_INDEX.get(protocolId)!;
  const clusters = cluster(reports, protocol.conflictTolerance);
  const largest = Math.max(...clusters.map((entry) => entry.length));
  const winners = clusters.filter((entry) => entry.length === largest);

  const spread = Math.max(...reports.map((r) => r.rawScore)) - Math.min(...reports.map((r) => r.rawScore));

  if (winners.length !== 1) {
    return {
      kind: "contested",
      contested: {
        modelId,
        capability: protocol.capability,
        protocolId,
        benchmark: protocol.benchmark,
        spread: Math.round(spread * 100) / 100,
        tolerance: protocol.conflictTolerance,
        reports: reports.map((report) => ({
          rawScore: report.rawScore,
          sourceName: report.sourceName,
          sourceUrl: report.sourceUrl,
          sourceTier: report.sourceTier,
        })),
      },
    };
  }

  const winner = winners[0];
  const representative = mostAuthoritative(winner);
  const outside = reports.filter((report) => !winner.includes(report));

  return {
    kind: "resolved",
    representative,
    source: {
      protocolId,
      benchmark: protocol.benchmark,
      rawScore: representative.rawScore,
      normalised: normaliseToFive(protocol, representative.rawScore),
      sourceTier: representative.sourceTier,
      sourceName: representative.sourceName,
      sourceUrl: representative.sourceUrl,
      harness: representative.harness,
      asOf: representative.asOf,
      saturated: protocol.saturated,
      ...(outside.length > 0
        ? {
            disagreements: outside.map((report) => ({
              rawScore: report.rawScore,
              sourceName: report.sourceName,
              sourceUrl: report.sourceUrl,
            })),
          }
        : {}),
    },
  };
}

export interface ResolvedTests {
  /** Model id to capability to the test the published figures support. */
  readonly byModel: ReadonlyMap<string, Readonly<Partial<Record<Capability, CapabilityTest>>>>;
  /** Model and capability pairs whose figures disagreed too much to use. */
  readonly contested: readonly ContestedResult[];
  /** Every model id mentioned in the table, for cross-checking the catalogue. */
  readonly modelIds: readonly string[];
}

/**
 * Turn published figures into per-capability tests.
 *
 * Where several protocols speak to one capability the normalised values are
 * averaged, which is defensible because they have already been mapped onto a
 * common coarse scale — unlike averaging raw percentages across benchmarks, which
 * would be meaningless. The contributing protocols are all recorded on the test so
 * the average can be taken apart again.
 */
export function resolveCapabilityTests(reports: readonly TestReport[] = parseTestReports()): ResolvedTests {
  const grouped = new Map<string, TestReport[]>();
  for (const report of reports) {
    const key = `${report.modelId}::${report.protocolId}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(report);
    grouped.set(key, bucket);
  }

  const perModelCapability = new Map<string, Map<Capability, CapabilityTestSource[]>>();
  const contested: ContestedResult[] = [];

  for (const [key, bucket] of grouped) {
    const [modelId, protocolId] = key.split("::");
    const resolution = resolveProtocol(modelId, protocolId, bucket);
    if (resolution.kind === "contested") {
      contested.push(resolution.contested);
      continue;
    }
    const capability = PROTOCOL_INDEX.get(protocolId)!.capability;
    const byCapability = perModelCapability.get(modelId) ?? new Map<Capability, CapabilityTestSource[]>();
    const sources = byCapability.get(capability) ?? [];
    sources.push(resolution.source);
    byCapability.set(capability, sources);
    perModelCapability.set(modelId, byCapability);
  }

  const byModel = new Map<string, Partial<Record<Capability, CapabilityTest>>>();
  for (const [modelId, byCapability] of perModelCapability) {
    const tests: Partial<Record<Capability, CapabilityTest>> = {};
    for (const [capability, sources] of byCapability) {
      const ordered = [...sources].sort((a, b) => TIER_RANK[b.sourceTier] - TIER_RANK[a.sourceTier]);
      const mean = ordered.reduce((total, source) => total + source.normalised, 0) / ordered.length;
      const latest = ordered
        .map((source) => source.asOf)
        .sort()
        .at(-1)!;
      const saturated = ordered.every((source) => source.saturated);
      tests[capability] = {
        score: Math.round(mean * 100) / 100,
        evaluationId: ordered.map((source) => source.protocolId).join("+"),
        datasetVersion: ordered.map((source) => PROTOCOL_INDEX.get(source.protocolId)!.datasetVersion).join("; "),
        testedAt: latest,
        evaluator: [...new Set(ordered.map((source) => source.sourceName))].join(", "),
        notes: saturated
          ? `Every contributing benchmark is saturated at the top of the current field, so this result confirms the capability without ranking it against other frontier models. ${ordered.map((s) => `${s.benchmark} ${s.rawScore}`).join("; ")}.`
          : `${ordered.map((s) => `${s.benchmark} ${s.rawScore} (${s.sourceTier})`).join("; ")}.`,
        sources: ordered,
        saturated,
      };
    }
    byModel.set(modelId, tests);
  }

  return {
    byModel,
    contested: contested.sort((a, b) => b.spread - a.spread),
    modelIds: [...new Set(reports.map((report) => report.modelId))].sort(),
  };
}

/** Resolved once at module load, like the catalogue itself. */
export const CAPABILITY_TESTS: ResolvedTests = resolveCapabilityTests();

/** Coverage figures for the audit view. */
export function testCoverage(): {
  models: number;
  capabilities: number;
  protocols: number;
  reports: number;
  contestedCount: number;
  saturatedOnly: number;
} {
  let capabilities = 0;
  let saturatedOnly = 0;
  for (const tests of CAPABILITY_TESTS.byModel.values()) {
    for (const test of Object.values(tests)) {
      capabilities += 1;
      if (test?.saturated) saturatedOnly += 1;
    }
  }
  return {
    models: CAPABILITY_TESTS.byModel.size,
    capabilities,
    protocols: BENCHMARK_PROTOCOLS.length,
    reports: parseTestReports().length,
    contestedCount: CAPABILITY_TESTS.contested.length,
    saturatedOnly,
  };
}
