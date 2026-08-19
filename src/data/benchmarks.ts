import type { Capability } from "../shared/types.js";

/**
 * How much a reported figure can be trusted, most authoritative first.
 *
 * `independent` outranks `provider` deliberately. Across the figures gathered for
 * this catalogue, provider-reported results ran systematically higher than the
 * same benchmark's own leaderboard — GPT-5.6 Terra is self-reported at 87.4% on
 * Terminal-Bench 2.1 and appears on the official leaderboard at 78.4%. That is
 * not an accusation of bad faith; vendors tune their own harness and report their
 * best configuration. It does mean a vendor's number and a third party's number
 * are not the same kind of claim.
 */
export type EvidenceTier = "benchmark" | "independent" | "provider" | "aggregator";

export const TIER_RANK: Readonly<Record<EvidenceTier, number>> = {
  benchmark: 4,
  independent: 3,
  provider: 2,
  aggregator: 1,
};

/**
 * A benchmark *protocol*: a benchmark plus the exact conditions it was run under.
 *
 * The protocol, not the benchmark, is the unit of comparison. Humanity's Last Exam
 * with tools enabled runs 10-14 points above the same benchmark without them;
 * Terminal-Bench 2.1 and 3.0 differ by fifty points on the same model. Mixing
 * either pair would produce a ranking that reflects methodology rather than
 * capability, so each combination gets its own protocol and figures are never
 * compared across protocols.
 */
export interface BenchmarkProtocol {
  readonly id: string;
  readonly benchmark: string;
  readonly datasetVersion: string;
  /** The capability this protocol is evidence for. */
  readonly capability: Capability;
  /** The run conditions that define this protocol. */
  readonly conditions: string;
  readonly url: string;
  /**
   * Band thresholds, highest first: `[minimumRawScore, normalisedScore]`.
   *
   * Bands are coarse on purpose. A benchmark result is a noisy sample of a narrow
   * task distribution, and converting a 1.5-point difference into a 0.3-point
   * scoring advantage would let sampling noise decide which model an application
   * is built on. Five bands is about as fine as the underlying evidence supports.
   */
  readonly bands: readonly (readonly [number, number])[];
  /**
   * True when current frontier models cluster at the top of this benchmark.
   *
   * A saturated protocol still confirms a model is capable; it cannot rank the
   * models that have saturated it. Flagged so the interface can say so, and so
   * the tie-break sequence correctly reports the candidates as level rather than
   * inventing an order from the last decimal place.
   */
  readonly saturated: boolean;
  /**
   * Maximum spread, in raw points, between independent reports of the same model
   * before the result is treated as contested rather than measured.
   */
  readonly conflictTolerance: number;
  /** Why this protocol was included, and what it does not show. */
  readonly caveat: string;
}

/**
 * The protocols this catalogue accepts evidence from.
 *
 * Deliberately few. Aider Polyglot and LiveCodeBench were investigated and
 * dropped: the Aider leaderboard has not been updated since August 2025, and no
 * current catalogue model appears on LiveCodeBench's. Terminal-Bench was dropped
 * because its results move 15-20 points with the agent scaffold rather than the
 * model, so a cross-model table built from it compares harnesses.
 */
export const BENCHMARK_PROTOCOLS: readonly BenchmarkProtocol[] = [
  {
    id: "swe-bench-verified",
    benchmark: "SWE-bench Verified",
    datasetVersion: "500-task human-verified subset",
    capability: "coding",
    conditions: "Resolve real GitHub issues; percentage of tasks resolved.",
    url: "https://www.swebench.com/",
    bands: [
      [90, 5],
      [80, 4],
      [65, 3],
      [45, 2],
      [0, 1],
    ],
    saturated: false,
    conflictTolerance: 5,
    caveat:
      "Measures repository-scale bug fixing in Python. It does not measure code review, greenfield design, or any other language. Reported figures for the same model snapshot vary widely between harnesses, so conflicting reports are treated as contested rather than averaged.",
  },
  {
    id: "gpqa-diamond-no-tools",
    benchmark: "GPQA Diamond",
    datasetVersion: "diamond subset, 198 expert-written science questions",
    capability: "reasoning",
    conditions: "No tools, no retrieval, single attempt.",
    url: "https://github.com/idavidrein/gpqa",
    bands: [
      [88, 5],
      [78, 4],
      [65, 3],
      [45, 2],
      [0, 1],
    ],
    saturated: true,
    conflictTolerance: 4,
    caveat:
      "Saturated as of August 2026: essentially every frontier model scores between 88% and 95%, a spread narrower than the benchmark's own run-to-run variance on 198 questions. It confirms graduate-level science reasoning is present. It cannot rank the models that have saturated it.",
  },
  {
    id: "arc-agi-2-max-effort",
    benchmark: "ARC-AGI-2",
    datasetVersion: "ARC Prize verified results, 120 tasks",
    capability: "reasoning",
    conditions: "Maximum reasoning effort, ARC Prize official harness, no external tools.",
    url: "https://arcprize.org/leaderboard",
    bands: [
      [85, 5],
      [70, 4],
      [55, 3],
      [30, 2],
      [0, 1],
    ],
    saturated: false,
    conflictTolerance: 4,
    caveat:
      "Currently the most discriminating reasoning protocol in this set: catalogue models span 59% to 93%. Measures novel abstract pattern induction, which correlates with but is not the same as reasoning on domain work. Scores move sharply with reasoning effort, so only maximum-effort runs are accepted here.",
  },
  {
    id: "aime-2026",
    benchmark: "AIME 2026",
    datasetVersion: "AIME 2026 competition problems",
    capability: "reasoning",
    conditions: "No tools; single attempt or provider-stated pass@1.",
    url: "https://maa.org/student-programs/amc/",
    bands: [
      [95, 5],
      [85, 4],
      [70, 3],
      [50, 2],
      [0, 1],
    ],
    saturated: true,
    conflictTolerance: 4,
    caveat:
      "Saturated: leading models score 94-99%, leaving almost no room to differentiate. Competition mathematics is also a narrow proxy for the reasoning most applications need.",
  },
  {
    id: "hle-no-tools",
    benchmark: "Humanity's Last Exam",
    datasetVersion: "full set, tools disabled",
    capability: "knowledge",
    conditions: "No tools, no retrieval, single answer per question.",
    url: "https://lastexam.ai/",
    bands: [
      [52, 5],
      [44, 4],
      [36, 3],
      [25, 2],
      [0, 1],
    ],
    saturated: false,
    conflictTolerance: 5,
    caveat:
      "Broad expert-level knowledge across a hundred subjects, and one of the few protocols still far from saturation (catalogue models span 35% to 56%). Enabling tools raises the same models by 10-14 points, which is why tool-enabled runs are a separate protocol and are never mixed in.",
  },
  {
    id: "hle-with-tools",
    benchmark: "Humanity's Last Exam",
    datasetVersion: "full set, tools enabled",
    capability: "research",
    conditions: "Search and code execution available.",
    url: "https://lastexam.ai/",
    bands: [
      [60, 5],
      [54, 4],
      [46, 3],
      [35, 2],
      [0, 1],
    ],
    saturated: false,
    conflictTolerance: 5,
    caveat:
      "Treated as evidence for research capability rather than knowledge, because what it measures with tools enabled is the ability to find and use sources. Not comparable with the tools-disabled protocol.",
  },
  {
    id: "mmlu-pro",
    benchmark: "MMLU-Pro",
    datasetVersion: "MMLU-Pro, 10-choice",
    capability: "knowledge",
    conditions: "No tools; provider-stated exact match or 5-shot chain of thought.",
    url: "https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro",
    bands: [
      [88, 5],
      [82, 4],
      [72, 3],
      [60, 2],
      [0, 1],
    ],
    saturated: true,
    conflictTolerance: 5,
    caveat:
      "Multiple-choice academic knowledge, largely saturated at the top of the catalogue. Useful for separating older or smaller models from current frontier ones; not for separating frontier models from each other.",
  },
];

export const PROTOCOL_INDEX: ReadonlyMap<string, BenchmarkProtocol> = new Map(
  BENCHMARK_PROTOCOLS.map((protocol) => [protocol.id, protocol]),
);

/**
 * Map a raw benchmark figure onto the catalogue's 1-5 scale.
 *
 * Band lookup rather than linear interpolation: the bands encode how much of a
 * raw difference is worth treating as a real difference, which varies enormously
 * between benchmarks. Eight points of GPQA Diamond separates nothing; eight
 * points of ARC-AGI-2 separates a lot.
 */
export function normaliseToFive(protocol: BenchmarkProtocol, rawScore: number): number {
  for (const [minimum, normalised] of protocol.bands) {
    if (rawScore >= minimum) return normalised;
  }
  return 1;
}
