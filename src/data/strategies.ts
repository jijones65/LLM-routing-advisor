import type { Strategy } from "../shared/types.js";

/** Bumped whenever ranking behaviour or its evidence interpretation changes. */
export const SCORING_VERSION = "2026.08.19-1";

/**
 * Plan styles, as declarative weight sets.
 *
 * Each number is a multiplier on one normalised model attribute inside
 * `scoreModel`. Because the weights live here rather than inside branching
 * scoring code, the difference between two plan styles is readable in one place
 * and testable. Job-specific operating policies then adjust these weights so a
 * routine worker can optimise throughput without treating a primary model,
 * specialist or checker as the same kind of call.
 *
 * Adoption weights are kept small on purpose. Routed-token volume is a
 * popularity signal, not a quality measurement, and letting it drive selection
 * would turn this tool into a bandwagon.
 */
export const STRATEGIES: Readonly<Record<string, Strategy>> = {
  quality: {
    id: "quality",
    name: "Quality first",
    short: "Highest expected quality",
    description:
      "Sets the highest planning quality target for every job, then still reports price, speed and lower-cost routes.",
    quality: 8,
    cost: 0.25,
    latency: 0.25,
    adoption: 0.01,
  },
  balanced: {
    id: "balanced",
    name: "Balanced",
    short: "Results, cost and speed",
    description:
      "Uses job-specific quality targets, then balances operating cost and response time for the work assigned to each model.",
    quality: 3,
    cost: 3,
    latency: 2,
    adoption: 0.03,
  },
  cost: {
    id: "cost",
    name: "Cost optimised",
    short: "Lowest cost that can meet the job",
    description:
      "Uses efficient models first for repeatable work, but keeps stronger models and checking for difficult, uncertain or high-impact jobs.",
    quality: 1,
    cost: 8,
    latency: 1,
    adoption: 0.01,
  },
  proven: {
    id: "proven",
    name: "Visible ecosystem reach",
    short: "Public sources and platforms",
    description:
      "Starts with job fit, then modestly favours models visible across more public sources and deployment channels. It does not estimate total users or reliability.",
    quality: 3,
    cost: 1,
    latency: 1,
    adoption: 0.08,
  },
  broad: {
    id: "broad",
    name: "Broad capability range",
    short: "Fewer, more versatile models",
    description: "Prefers versatile models that can cover more of the application brief.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    breadth: 1.6,
  },
  focused: {
    id: "focused",
    name: "Focused specialist team",
    short: "Several focused, efficient models",
    description:
      "Builds a lower-cost team of models judged against separate job-quality targets, then tests routing and the complete result.",
    quality: 2,
    cost: 4,
    latency: 2,
    adoption: 0.02,
    focus: 2.2,
  },
  speed: {
    id: "speed",
    name: "Speed first",
    short: "Fast interaction",
    description: "Gives extra weight to models suited to fast responses.",
    quality: 2,
    cost: 1,
    latency: 5,
    adoption: 0.02,
  },
  private: {
    id: "private",
    name: "Private or local",
    short: "Controlled data",
    description: "Prefers downloadable, private-cloud or on-device models.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    forceData: true,
  },
  simple: {
    id: "simple",
    name: "Simple one-provider team",
    short: "Fewer integrations",
    description: "Keeps the team with one provider where possible.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    singleProvider: true,
  },
  resilient: {
    id: "resilient",
    name: "Resilient multi-provider team",
    short: "Lower provider dependence",
    description: "Uses different providers where close matches are available.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    forceMulti: true,
  },
  downloadable: {
    id: "downloadable",
    name: "Downloadable models",
    short: "Weights you can run",
    description: "Prefers models with official downloadable weights.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    forceOpen: true,
  },
  available: {
    id: "available",
    name: "Hosted and widely available",
    short: "Easy API access",
    description: "Prefers current provider-hosted models with simple API access.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.1,
    preferHosted: true,
  },
  assurance: {
    id: "assurance",
    name: "High assurance",
    short: "More independent checking",
    description: "Adds an evidence checker and gives more weight to safety capabilities.",
    quality: 6,
    cost: 0.5,
    latency: 0.5,
    adoption: 0.03,
    highAssurance: true,
  },
  small: {
    id: "small",
    name: "Smallest practical team",
    short: "Fewer models to manage",
    description: "Keeps the primary model, the most important specialist and a checker.",
    quality: 2,
    cost: 2,
    latency: 2,
    adoption: 0.02,
    teamLimit: 3,
  },
};

/** Shown as cards on the brief. */
export const PRIMARY_STRATEGY_IDS: readonly string[] = ["quality", "balanced", "cost", "proven", "broad", "focused"];

/** Available from the "another style" dropdown. */
export const OTHER_STRATEGY_IDS: readonly string[] = [
  "speed",
  "private",
  "simple",
  "resilient",
  "downloadable",
  "available",
  "assurance",
  "small",
];
