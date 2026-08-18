import type { Brief, Capability, Model, RoleId, ScoreTerm, ScoredModel, Strategy } from "../shared/types.js";
import { adoptionScore, capabilityRange, signalsOf } from "./signals.js";

/** Deployments that keep data inside an environment you control. */
const CONTROLLED_DEPLOYMENTS = new Set(["open-weight", "private cloud", "edge"]);

/** The preferences a plan style strengthens regardless of what the brief said. */
export interface EffectiveSettings {
  readonly dataControl: boolean;
  readonly openPreferred: boolean;
  readonly multiVendor: boolean;
  readonly highAssurance: boolean;
}

/** Combine the brief's stated limits with the ones a plan style implies. */
export function effectiveSettings(brief: Brief, strategy: Strategy): EffectiveSettings {
  return {
    dataControl: brief.dataControl || Boolean(strategy.forceData),
    openPreferred: brief.openPreferred || Boolean(strategy.forceOpen),
    multiVendor: strategy.singleProvider ? false : strategy.forceMulti ? true : brief.multiVendor,
    highAssurance: Boolean(strategy.highAssurance) || brief.risk === "high",
  };
}

/**
 * Which selected application capabilities matter most for each team job.
 *
 * The primary model is judged against the whole brief. Specialists are judged
 * on their speciality, so a focused coding model is not penalised for lacking
 * voice or vision capabilities assigned to other members of the team.
 */
const JOB_CAPABILITIES: Readonly<Partial<Record<RoleId, readonly Capability[]>>> = {
  planner: ["reasoning", "agents", "coding", "automation"],
  worker: ["automation", "knowledge", "rag", "multilingual", "private"],
  validator: ["safety", "reasoning", "research", "knowledge"],
  coder: ["coding", "agents", "reasoning", "safety"],
  researcher: ["research", "rag", "knowledge", "reasoning"],
  vision: ["vision", "knowledge", "reasoning", "rag"],
  voice: ["voice", "multilingual", "agents"],
  private: ["private", "safety", "knowledge"],
};

/** The selected requirements used to score one job. Never returns an empty set. */
export function jobRequirements(role: RoleId, brief: Brief): readonly Capability[] {
  if (role === "primary") return brief.cases;
  const allowed = JOB_CAPABILITIES[role] ?? brief.cases;
  const relevant = brief.cases.filter((capability) => allowed.includes(capability));
  return relevant.length > 0 ? relevant : brief.cases;
}

/** Best available quality value for this job, with an explicit evidence basis. */
export function qualityForJob(
  model: Model,
  role: RoleId,
  brief: Brief,
): { value: number; tested: number; total: number; basis: string } {
  const requirements = jobRequirements(role, brief);
  const tests = requirements
    .map((capability) => model.capabilityTests?.[capability])
    .filter(
      (test): test is NonNullable<typeof test> =>
        test !== undefined && Number.isFinite(test.score) && test.score >= 1 && test.score <= 5,
    );
  if (tests.length === 0) {
    return { value: model.quality, tested: 0, total: requirements.length, basis: "versioned catalogue estimate" };
  }
  const testedTotal = tests.reduce((total, test) => total + test.score, 0);
  const estimatedTotal = model.quality * Math.max(0, requirements.length - tests.length);
  return {
    value: (testedTotal + estimatedTotal) / requirements.length,
    tested: tests.length,
    total: requirements.length,
    basis:
      tests.length === requirements.length
        ? "capability-specific test results"
        : `${tests.length}/${requirements.length} capability-specific tests, with the untested requirements estimated`,
  };
}

/** Why a model was excluded from consideration for a job, if it was. */
export interface Exclusion {
  readonly model: Model;
  readonly reason: string;
}

/**
 * Eligibility is deliberately narrow. A missing capability or deployment
 * preference lowers the score but does not hide the model; only a withdrawn
 * model is removed from a current recommendation.
 */
export function ineligibleReason(
  model: Model,
  role: RoleId,
  settings: EffectiveSettings,
  strategy: Strategy,
): string | null {
  void role;
  void settings;
  void strategy;
  if (model.status === "retired") return "no longer listed by its provider";
  return null;
}

/**
 * Score one model for one job under one plan style.
 *
 * Returns the total alongside every named contribution, so the UI can show a
 * user exactly why a model placed where it did instead of asserting a number.
 * Building the breakdown is the primary output here; the total is just its sum.
 *
 * Terms come in two kinds. *Value* terms — brief coverage, provider job label,
 * quality, safety capability — are positive-only: they measure what a model
 * brings. *Trade-off* terms — cost, speed and lifecycle — are
 * signed around a neutral midpoint, so the breakdown can show what a choice
 * costs as well as what it gains.
 */
export function scoreModel(model: Model, role: RoleId, brief: Brief, strategy: Strategy): ScoredModel {
  const settings = effectiveSettings(brief, strategy);
  const terms: ScoreTerm[] = [];

  const push = (label: string, value: number, detail: string): void => {
    if (value !== 0) terms.push({ label, value: Math.round(value * 100) / 100, detail });
  };

  // Job coverage. Missing a capability is a strong warning, not an exclusion.
  // The asymmetry keeps partially useful models visible while ensuring complete
  // job coverage normally wins before cost or public visibility breaks a tie.
  const requirements = jobRequirements(role, brief);
  const matched = requirements.filter((capability) => model.cases.includes(capability));
  const missed = requirements.filter((capability) => !model.cases.includes(capability));
  push(
    "Job capability fit",
    matched.length * 7 - missed.length * 4,
    `${matched.length} of ${requirements.length} capabilities needed for this job are stated for this model${missed.length ? `; missing ${missed.join(", ")}` : ""}`,
  );

  // The provider's own role label. Evidence, not a gate — see ROLE_REQUIREMENTS.
  const roleMatch = model.roles.includes(role);
  push(
    "Provider job label",
    roleMatch ? 2 : 0,
    roleMatch
      ? `the provider positions this model for the ${role} job; this is supporting context, not performance evidence`
      : `the provider does not list ${role} among this model's usual jobs, so it is judged on capabilities alone`,
  );

  const quality = qualityForJob(model, role, brief);
  // A general catalogue estimate is useful for sorting candidates, but it is
  // not allowed to carry the same weight as a relevant application test.
  const qualityConfidence = quality.tested === 0 ? 0.6 : quality.tested < quality.total ? 0.8 : 1;
  push(
    "Expected quality",
    quality.value * strategy.quality * qualityConfidence,
    `${quality.basis} ${quality.value.toFixed(1)}/5 × weight ${strategy.quality} × evidence factor ${qualityConfidence}`,
  );

  // Operating cost and speed are scored *relative to the middle of the range*, so
  // an expensive model shows a negative contribution rather than a small positive
  // one. Ranking is unaffected — centring shifts every model in a ranking by the
  // same constant — but it means the breakdown reads honestly: a frontier model
  // chosen despite its price now says so, instead of claiming cost helped.
  //
  // Where the provider publishes per-token pricing the cost class is derived from
  // it. Where it does not, the class is an estimate and the term is discounted,
  // because leaning hard on a number nobody published is how a tool like this
  // quietly starts recommending whatever it guessed was cheapest.
  const published = model.pricing.input !== null && model.pricing.output !== null;
  const confidence = published ? 1 : 0.8;
  const priceDetail = published
    ? `$${model.pricing.input}/$${model.pricing.output} per million tokens, cost class ${model.costClass}/5`
    : `cost class ${model.costClass}/5, estimated — ${model.pricing.note ?? "no published price"}`;
  push("Operating cost", (3 - model.costClass) * strategy.cost * 0.75 * confidence, priceDetail);

  push(
    "Speed",
    (model.speed - 3) * strategy.latency * 0.65,
    `speed estimate ${model.speed}/5, against a mid-range 3/5, × weight ${strategy.latency}`,
  );

  const adoption = adoptionScore(model);
  const signals = signalsOf(model);
  if (strategy.adoption > 0) {
    const usageNote =
      signals.openRouterUsageRank > 0
        ? `, ranked #${signals.openRouterUsageRank} on OpenRouter with ${signals.openRouterTokensTrillion}T tokens routed`
        : ", no comparable public usage observed";
    push(
      "Ecosystem visibility",
      adoption * strategy.adoption,
      `ecosystem ${signals.ecosystemMaturity}/100 and exposure ${signals.realWorldExposure}/100${usageNote}`,
    );
  }

  // Breadth and focus are normalised to the same 0-5 scale as `quality` before
  // the weight is applied. Left un-normalised — as the prototype had them — a
  // 24-point range times a 1.8 weight buries every other consideration, and the
  // focused plan style ends up recommending a 28K-context role-play model as a
  // general routine worker purely because it does few things.
  const range = capabilityRange(model);
  if (strategy.breadth) {
    const breadthScore = (range / 24) * 5;
    push("Capability breadth", breadthScore * strategy.breadth, `covers ${range}/24 kinds of work`);
  }
  if (strategy.focus) {
    const specialist = model.tier === "Specialist";
    const focusScore = ((24 - range) / 24) * 4 + (specialist ? 1 : 0);
    push(
      "Narrow focus",
      focusScore * strategy.focus,
      `covers ${range}/24 kinds of work${specialist ? ", and the provider positions it as a specialist" : ""}`,
    );
  }

  if (settings.openPreferred) {
    const open = model.deployments.includes("open-weight");
    push(
      "Downloadable weights",
      open ? 7 : -3,
      open ? "official downloadable weights are available" : "no official downloadable weights",
    );
  }

  if (settings.dataControl) {
    const controlled = model.deployments.some((deployment) => CONTROLLED_DEPLOYMENTS.has(deployment));
    push(
      "Controlled deployment",
      controlled ? 9 : -14,
      controlled
        ? "can run in a private, local or controlled environment"
        : "provider-hosted only; this strongly conflicts with the data-control preference",
    );
  }

  if (strategy.preferHosted) {
    const hosted = model.deployments.includes("hosted");
    push("Hosted API", hosted ? 4 : -2, hosted ? "available as a provider-hosted API" : "requires self-hosting");
  }

  if (settings.highAssurance) {
    const safety = model.cases.includes("safety");
    push(
      "Safety capability",
      safety ? 4 : 0,
      safety ? "the provider lists checking and safety work among its uses" : "no stated safety-checking capability",
    );
  }

  // Lifecycle. Preview models can vanish or change under you; superseded ones
  // work but are not where a new application should start.
  const statusValue = model.status === "active" ? 2 : model.status === "preview" ? -1 : -2;
  push(
    "Lifecycle",
    statusValue,
    model.status === "active"
      ? "current model"
      : model.status === "preview"
        ? "preview: the provider may change or withdraw it"
        : "superseded by a newer model in the same family",
  );

  const score = terms.reduce((total, term) => total + term.value, 0);
  return {
    model,
    score: Math.round(score * 100) / 100,
    terms,
    readings: {
      modelFit: { matched: matched.length, total: requirements.length, missing: missed },
      sourceConfidence: model.verification,
      ecosystemVisibility: adoption,
      measuredPerformance: {
        measured: quality.tested > 0,
        evidenceLevel: quality.tested === 0 ? "estimated" : quality.tested < quality.total ? "partly-tested" : "tested",
        score: Math.round(quality.value * 100) / 100,
        testedCapabilities: quality.tested,
        relevantCapabilities: quality.total,
        basis: quality.basis,
      },
    },
  };
}

/**
 * Rank every current model for a job, and report withdrawn records separately.
 *
 * Exclusions are returned rather than silently dropped: "no model in the
 * catalogue can do this" is the single most useful thing this tool can tell
 * someone, and it only works if the engine keeps the receipts.
 */
export function rankForRole(
  catalog: readonly Model[],
  role: RoleId,
  brief: Brief,
  strategy: Strategy,
): { ranked: ScoredModel[]; excluded: Exclusion[] } {
  const settings = effectiveSettings(brief, strategy);
  const ranked: ScoredModel[] = [];
  const excluded: Exclusion[] = [];

  for (const model of catalog) {
    const reason = ineligibleReason(model, role, settings, strategy);
    if (reason) {
      excluded.push({ model, reason });
      continue;
    }
    ranked.push(scoreModel(model, role, brief, strategy));
  }

  // Stable ordering: score first, then name, so equal scores never reshuffle
  // between requests and a user comparing two plan styles sees real differences.
  ranked.sort((a, b) => b.score - a.score || a.model.name.localeCompare(b.model.name));
  return { ranked, excluded };
}

/**
 * Turn a raw score into a 0-100 fit figure.
 *
 * Normalised across the whole ranked set rather than divided by the top score.
 * Dividing by the top score — as the prototype did — produces nonsense whenever
 * scores go negative, which they routinely do under the cost-first weights: a
 * model scoring -2 against a top score of -1 came out as 200% fit.
 */
export function fitPercent(score: number, ranked: readonly ScoredModel[]): number {
  if (ranked.length === 0) return 0;
  const top = ranked[0].score;
  const bottom = ranked[ranked.length - 1].score;
  if (top === bottom) return 100;
  return Math.max(0, Math.min(100, Math.round(((score - bottom) / (top - bottom)) * 100)));
}
