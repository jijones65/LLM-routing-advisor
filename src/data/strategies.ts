import type { Strategy } from "../shared/types.js";

/** Bumped whenever ranking behaviour or its evidence interpretation changes. */
export const SCORING_VERSION = "2026.08.18-4";

/**
 * Plan styles, as declarative weight sets.
 *
 * Each number is a multiplier on one normalised model attribute inside
 * `scoreModel`. Because the weights live here rather than inside branching
 * scoring code, the difference between two plan styles is readable in one place
 * and testable: "Cost first" weights cheapness eight times as heavily as
 * "Quality first" does, and that is the whole of the difference.
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
      "Gives the most weight to the best available quality evidence for each job, even when cost or speed is less favourable.",
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
      "Balances expected quality, operating cost and response time after checking that the model fits the job.",
    quality: 3,
    cost: 3,
    latency: 2,
    adoption: 0.03,
  },
  cost: {
    id: "cost",
    name: "Cost first",
    short: "Lowest practical cost",
    description: "Uses efficient models for routine work and saves stronger models for difficult jobs.",
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
      "Builds a lower-cost team of models judged on their separate jobs, then compares the complete team with broader models.",
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
