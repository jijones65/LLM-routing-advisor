/**
 * Shared vocabulary for the routing advisor.
 *
 * Everything the recommendation engine reasons about is declared here so the
 * data files, the scoring code and the client all agree on one shape.
 */

/** A capability the application needs a model to have. */
export type Capability =
  | "reasoning"
  | "knowledge"
  | "coding"
  | "rag"
  | "research"
  | "vision"
  | "voice"
  | "automation"
  | "private"
  | "multilingual"
  | "agents"
  | "safety";

/** Where a model can be run. */
export type Deployment = "hosted" | "open-weight" | "private cloud" | "edge";

/** What the model can read and write. */
export type Modality = "text" | "image" | "audio" | "video";

/** A plain-language deployment profile used to find compact and edge models. */
export type ModelProfile =
  "small-language-model" | "edge-language-model" | "edge-vision-language-model" | "device-action-model";

/** The job a model is being considered for inside a plan. */
export type RoleId =
  "primary" | "planner" | "worker" | "validator" | "researcher" | "coder" | "vision" | "voice" | "private";

/** Lifecycle state of a catalogue entry. */
export type ModelStatus = "active" | "preview" | "mature" | "retired";

/** How a model is positioned by its provider. */
export type Tier = "Frontier" | "Balanced" | "Efficient" | "Specialist" | "Open / local" | "Research";

/**
 * How confident we are that this entry matches its official provider page.
 *
 * `confirmed` means a human or an agent read the provider page on `verifiedAt`
 * and the facts below matched. `unconfirmed` means the entry predates the last
 * review sweep. `drifted` means the provider page no longer agrees and the
 * entry is waiting to be corrected. The audit view surfaces these directly so
 * the catalogue never presents every entry as equally well sourced.
 */
export type VerificationState = "confirmed" | "unconfirmed" | "drifted";

/** Published API pricing, in US dollars per million tokens. */
export interface Pricing {
  /** Cost per million input tokens, or null when the provider publishes none. */
  readonly input: number | null;
  /** Cost per million output tokens, or null when the provider publishes none. */
  readonly output: number | null;
  /** Note explaining unusual pricing (off-peak rates, self-hosting, and so on). */
  readonly note?: string;
}

/** One published figure behind a capability test, with where it came from. */
export interface CapabilityTestSource {
  readonly protocolId: string;
  readonly benchmark: string;
  /** The figure as published, in the protocol's own units. */
  readonly rawScore: number;
  /** That figure mapped onto the catalogue's 1-5 scale by the protocol's bands. */
  readonly normalised: number;
  readonly sourceTier: "benchmark" | "independent" | "provider" | "aggregator";
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly harness: string;
  readonly asOf: string;
  /** True when this protocol cannot separate current frontier models. */
  readonly saturated: boolean;
  /** Other reported figures for the same model and protocol that disagreed. */
  readonly disagreements?: readonly { rawScore: number; sourceName: string; sourceUrl: string }[];
}

/**
 * A capability-specific evaluation that can replace the general quality estimate
 * for one job.
 *
 * Only present when at least one published figure survived conflict resolution.
 * A capability whose reported figures disagree beyond the protocol's tolerance
 * gets no test at all — it stays an estimate, and `contested` records why, because
 * "two reputable sources disagree by sixteen points" is information a reader needs
 * rather than an average to be split.
 */
export interface CapabilityTest {
  /** Normalised 1-5 result so it can use the existing strategy weights. */
  readonly score: number;
  readonly evaluationId: string;
  readonly datasetVersion: string;
  readonly testedAt: string;
  readonly sampleSize?: number;
  readonly evaluator?: string;
  readonly notes?: string;
  /** Every figure that contributed, so the claim can be checked. */
  readonly sources?: readonly CapabilityTestSource[];
  /** True when every contributing protocol is saturated at the top. */
  readonly saturated?: boolean;
}

/** A model and capability whose published figures disagree too much to use. */
export interface ContestedResult {
  readonly modelId: string;
  readonly capability: Capability;
  readonly protocolId: string;
  readonly benchmark: string;
  readonly spread: number;
  readonly tolerance: number;
  readonly reports: readonly { rawScore: number; sourceName: string; sourceUrl: string; sourceTier: string }[];
}

/** Adoption and ecosystem signals attached to a model at request time. */
export interface ModelSignals {
  /** 0-100 proxy for how much tooling and hosting surrounds the model. */
  readonly ecosystemMaturity: number;
  /** 0-100 proxy for observed real-world traffic. 0 means not observed. */
  readonly realWorldExposure: number;
  /** How many independent model lists mention this model. */
  readonly sourceCount: number;
  /** How many hosted listings were found across those lists. */
  readonly listingCount: number;
  /** Hugging Face downloads, where the model has a hub presence. */
  readonly huggingFaceDownloads: number;
  /** Rank in the dated OpenRouter usage snapshot, or 0 if unranked. */
  readonly openRouterUsageRank: number;
  /** Trillions of tokens routed in that snapshot. */
  readonly openRouterTokensTrillion: number;
  /** When these signals were computed. */
  readonly checkedAt: string | null;
}

/** A single model variant in the catalogue. */
export interface Model {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly family: string;
  readonly tier: Tier;
  readonly status: ModelStatus;
  /** Estimated output quality, 1-5. An estimate, not a benchmark result. */
  readonly quality: number;
  /** Optional job evidence. Relevant tests replace the general quality estimate. */
  readonly capabilityTests?: Readonly<Partial<Record<Capability, CapabilityTest>>>;
  /** Estimated responsiveness, 1-5. An estimate, not a measurement. */
  readonly speed: number;
  /** Derived 1-5 cost class, where 1 is cheapest. See `deriveCostClass`. */
  readonly costClass: number;
  readonly pricing: Pricing;
  /** Context window in tokens, or null for realtime/managed endpoints. */
  readonly contextTokens: number | null;
  /** Human-readable context description, e.g. "1.05M" or "Realtime". */
  readonly contextLabel: string;
  readonly cases: readonly Capability[];
  readonly roles: readonly RoleId[];
  readonly deployments: readonly Deployment[];
  readonly modalities: readonly Modality[];
  /** Audited discovery labels; these do not replace capability or performance evidence. */
  readonly profiles?: readonly ModelProfile[];
  readonly summary: string;
  readonly sourceUrl: string;
  readonly ollamaUrl: string | null;
  readonly verifiedAt: string;
  readonly verification: VerificationState;
  /** Set when `verification` is `drifted`: what the provider page now says. */
  readonly driftNote?: string;
  readonly catalogVersion: string;
  readonly signals?: ModelSignals;
}

/** A job inside a recommended model team. */
export interface Role {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly purpose: string;
  readonly role: RoleId;
}

/**
 * A plan style: a named, documented set of scoring weights.
 *
 * Every weight is a multiplier applied to one normalised model attribute in
 * `scoreModel`. Keeping them declarative means a plan style is auditable — you
 * can read why "Cost optimised" behaves differently from "Quality first" without
 * reading the scoring code.
 */
export interface Strategy {
  readonly id: string;
  readonly name: string;
  readonly short: string;
  readonly description: string;
  /** Weight on estimated quality. */
  readonly quality: number;
  /** Weight on cheapness. */
  readonly cost: number;
  /** Weight on speed. */
  readonly latency: number;
  /** Weight on adoption signals. Small by design — adoption is not quality. */
  readonly adoption: number;
  /** Weight on breadth of capability. */
  readonly breadth?: number;
  /** Weight on narrowness of capability. */
  readonly focus?: number;
  /** Force the data-control requirement on regardless of the brief. */
  readonly forceData?: boolean;
  /** Force the open-weights preference on. */
  readonly forceOpen?: boolean;
  /** Force provider diversity on. */
  readonly forceMulti?: boolean;
  /** Keep the whole team with one provider where possible. */
  readonly singleProvider?: boolean;
  /** Prefer provider-hosted models. */
  readonly preferHosted?: boolean;
  /** Add an independent evidence checker and weight safety capabilities. */
  readonly highAssurance?: boolean;
  /** Cap the number of jobs in the team. */
  readonly teamLimit?: number;
}

/** The user's description of the application being planned. */
export interface Brief {
  readonly archetype: string;
  /** User's own plain-language name; the selected archetype still supplies starter needs. */
  readonly customApplicationType?: string;
  readonly needs: readonly string[];
  readonly cases: readonly Capability[];
  readonly businessGoal: string;
  readonly industry: string;
  readonly domain: string;
  readonly risk: "low" | "medium" | "high";
  readonly planStyle: string;
  readonly dataControl: boolean;
  readonly openPreferred: boolean;
  readonly multiVendor: boolean;
}

/** One named contribution to a model's total score. */
export interface ScoreTerm {
  readonly label: string;
  readonly value: number;
  readonly detail: string;
}

/** A model's score for one role under one strategy, with its full breakdown. */
export interface ScoredModel {
  readonly model: Model;
  readonly score: number;
  readonly terms: readonly ScoreTerm[];
  readonly readings: RecommendationReadings;
}

/** Four different questions kept separate in the interface and saved plan. */
export interface RecommendationReadings {
  readonly modelFit: {
    readonly matched: number;
    readonly total: number;
    readonly missing: readonly Capability[];
  };
  readonly sourceConfidence: VerificationState;
  readonly ecosystemVisibility: number;
  readonly measuredPerformance: {
    readonly measured: boolean;
    readonly evidenceLevel: "estimated" | "partly-tested" | "tested";
    readonly score: number;
    readonly testedCapabilities: number;
    readonly relevantCapabilities: number;
    readonly basis: string;
  };
}

/** A ranked alternative for a job. */
export interface Alternative {
  readonly model: Model;
  readonly rank: number;
  readonly fit: number;
  readonly score: number;
  /** Readings used only when the raw score is inside the close-call band. */
  readonly tieBreak?: {
    readonly performanceEvidence: RecommendationReadings["measuredPerformance"]["evidenceLevel"];
    readonly applicationSpecialisation: number;
    readonly ecosystemReach: number;
  };
}

/** Whether the numerical order is meaningful enough to name one leader. */
export interface DecisionGuide {
  readonly state: "clear-lead" | "too-close" | "tie-break-choice" | "tested-lead" | "policy-choice" | "user-choice";
  /** Difference between first and second before any team policy is applied. */
  readonly scoreGap: number | null;
  readonly closeCallThreshold: number;
  readonly closeCandidates: readonly Alternative[];
  /** Which reading separated close raw scores, or why they remain unresolved. */
  readonly tieBreakBasis:
    "measured-performance" | "application-specialisation" | "ecosystem-reach" | "unresolved" | null;
  /** Plain-language explanation of what did, or did not, separate the candidates. */
  readonly reason: string;
  /** The most useful real task to run when estimates cannot decide. */
  readonly recommendedTest: string;
}

/**
 * How one team job should balance output quality with operating efficiency.
 *
 * This is a planning policy, not a performance result. The target and weights
 * affect the shortlist; the routing and measurement text says how to validate
 * the choice on the real application.
 */
export interface JobOperatingPolicy {
  readonly mode: "quality-critical" | "adaptive" | "high-throughput" | "assurance";
  readonly label: string;
  /** Soft planning target on the existing 1–5 quality scale. */
  readonly qualityTarget: number;
  /** Effective job-specific weights after the plan-style weights are applied. */
  readonly qualityWeight: number;
  readonly costWeight: number;
  readonly routingRule: string;
  readonly escalationRule: string;
  readonly successMeasure: string;
}

/** One job in a finished plan, with its chosen model and the reasoning. */
export interface PlanEntry {
  readonly role: Role;
  readonly model: Model;
  readonly rank: number;
  readonly fit: number;
  /** True when a plan rule overrode the top-scoring model. */
  readonly policyAdjusted: boolean;
  readonly policyReason: string | null;
  readonly terms: readonly ScoreTerm[];
  readonly readings: RecommendationReadings;
  readonly operatingPolicy: JobOperatingPolicy;
  readonly decision: DecisionGuide;
  /** The advisor's automatic choice before an allowed user override. */
  readonly advisorChoice: Alternative;
  /** Every model less than three raw-score points from the leader. */
  readonly choiceCandidates: readonly Alternative[];
  readonly userSelected: boolean;
  readonly alternatives: readonly Alternative[];
  readonly styleId: string;
}

/** A non-model component the application will also need. */
export interface ToolRecommendation {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
  readonly links?: readonly { readonly name: string; readonly url: string }[];
}
