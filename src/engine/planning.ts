import type {
  Alternative,
  Brief,
  Capability,
  DecisionGuide,
  Model,
  PlanEntry,
  Role,
  ScoredModel,
  Strategy,
  ToolRecommendation,
} from "../shared/types.js";
import { BASE_ROLES, SPECIALIST_ROLES } from "../data/roles.js";
import { BUSINESS_GOALS, NEED_INDEX } from "../data/taxonomy.js";
import { STRATEGIES } from "../data/strategies.js";
import { effectiveSettings, fitPercent, jobRequirements, rankForRole, type Exclusion } from "./scoring.js";

/** Work out which capabilities the brief implies. */
export function deriveCases(brief: Omit<Brief, "cases">): Capability[] {
  const found = new Set<Capability>();
  for (const needId of brief.needs) {
    for (const capability of NEED_INDEX[needId]?.cases ?? []) found.add(capability);
  }
  const goal = BUSINESS_GOALS.find((option) => option.id === brief.businessGoal);
  for (const capability of goal?.cases ?? []) found.add(capability);
  // High risk always implies checking work, and a data-control requirement
  // always implies the private capability, whatever else the brief says.
  if (brief.risk === "high") found.add("safety");
  if (brief.dataControl) found.add("private");
  return [...found];
}

/** Fill in the derived fields of a brief. */
export function completeBrief(brief: Omit<Brief, "cases">): Brief {
  return { ...brief, cases: deriveCases(brief) };
}

/**
 * Decide which jobs the team needs.
 *
 * The shape is: a primary model, a coordinator when the work is multi-step,
 * a routine worker, whichever specialists the brief calls for, and a checker
 * last. Under a team limit the specialists are what gets cut, never the checker
 * — a smaller team is a reasonable trade-off, an unchecked one is not.
 */
export function deriveRoles(brief: Brief, strategy: Strategy): Role[] {
  const settings = effectiveSettings(brief, strategy);
  const cases = new Set(brief.cases);

  const specialists: Role[] = [];
  if (cases.has("coding")) specialists.push(SPECIALIST_ROLES.coding);
  if (cases.has("research")) specialists.push(SPECIALIST_ROLES.research);
  if (cases.has("vision")) specialists.push(SPECIALIST_ROLES.vision);
  if (cases.has("voice")) specialists.push(SPECIALIST_ROLES.voice);
  if (cases.has("private")) specialists.push(SPECIALIST_ROLES.private);
  if (brief.needs.includes("geospatial")) specialists.push(SPECIALIST_ROLES.geospatial);

  const deduped = specialists.filter((role, index) => specialists.findIndex((other) => other.id === role.id) === index);

  let roles: Role[];
  if (strategy.teamLimit) {
    const room = Math.max(0, strategy.teamLimit - 2);
    roles = [BASE_ROLES.primary, ...deduped.slice(0, room)];
  } else {
    roles = [BASE_ROLES.primary];
    if (cases.has("agents") || cases.has("reasoning")) roles.push(BASE_ROLES.planner);
    roles.push(BASE_ROLES.worker, ...deduped);
  }

  if (settings.highAssurance && !roles.some((role) => role.id === "evidence")) roles.push(BASE_ROLES.evidence);
  roles.push(BASE_ROLES.validator);

  return roles.filter((role, index) => roles.findIndex((other) => other.id === role.id) === index);
}

/** A finished plan plus everything needed to explain it. */
export interface Plan {
  readonly strategy: Strategy;
  readonly entries: readonly PlanEntry[];
  /** Jobs no catalogue model could fill, with the reason. */
  readonly unfilled: readonly { role: Role; reason: string }[];
  /** Unavailable or withdrawn models excluded from current recommendations. */
  readonly excluded: readonly Exclusion[];
}

/** Provisional near-match threshold for choosing a different provider. */
export const DIVERSITY_FIT_THRESHOLD = 82;

/** A smaller numerical gap is not treated as evidence of a real difference. */
export const CLOSE_CALL_SCORE_GAP = 1;

/** Models inside this wider band can be selected explicitly by the user. */
export const USER_CHOICE_SCORE_GAP = 3;

type TieBreakBasis = NonNullable<DecisionGuide["tieBreakBasis"]>;

interface CloseCallSelection {
  readonly chosen: ScoredModel;
  readonly close: readonly ScoredModel[];
  readonly basis: TieBreakBasis | null;
}

/**
 * How closely a model's stated strengths concentrate on the work assigned to
 * this job. Requirement coverage leads; narrow focus and the provider's job
 * positioning are supporting signals rather than performance claims.
 */
export function applicationSpecialisation(model: Model, role: Role, brief: Brief): number {
  const requirements = jobRequirements(role.role, brief);
  const matched = requirements.filter((capability) => model.cases.includes(capability)).length;
  const coverage = requirements.length ? (matched / requirements.length) * 100 : 0;
  const focus = (matched / Math.max(1, model.cases.length)) * 100;
  const jobPositioning = model.roles.includes(role.role) ? 100 : 0;
  return Math.round(coverage * 0.7 + focus * 0.2 + jobPositioning * 0.1);
}

function tieBreakReadings(candidate: ScoredModel, role: Role, brief: Brief): NonNullable<Alternative["tieBreak"]> {
  return {
    performanceEvidence: candidate.readings.measuredPerformance.evidenceLevel,
    applicationSpecialisation: applicationSpecialisation(candidate.model, role, brief),
    ecosystemReach: candidate.readings.ecosystemVisibility,
  };
}

const EVIDENCE_ORDER = { estimated: 0, "partly-tested": 1, tested: 2 } as const;

/** Resolve a sub-one-point raw-score gap without changing the raw ranking. */
function selectCloseCall(ranked: readonly ScoredModel[], role: Role, brief: Brief): CloseCallSelection {
  const top = ranked[0];
  const close = ranked.filter((candidate) => top.score - candidate.score < CLOSE_CALL_SCORE_GAP).slice(0, 4);
  if (close.length <= 1) return { chosen: top, close, basis: null };

  let remaining = [...close];
  const bestEvidence = Math.max(
    ...remaining.map((candidate) => EVIDENCE_ORDER[candidate.readings.measuredPerformance.evidenceLevel]),
  );
  remaining = remaining.filter(
    (candidate) => EVIDENCE_ORDER[candidate.readings.measuredPerformance.evidenceLevel] === bestEvidence,
  );
  if (remaining.length === 1) return { chosen: remaining[0], close, basis: "measured-performance" };

  const specialisation = new Map(
    remaining.map((candidate) => [candidate.model.id, applicationSpecialisation(candidate.model, role, brief)]),
  );
  const bestSpecialisation = Math.max(...specialisation.values());
  remaining = remaining.filter((candidate) => specialisation.get(candidate.model.id) === bestSpecialisation);
  if (remaining.length === 1) return { chosen: remaining[0], close, basis: "application-specialisation" };

  const bestReach = Math.max(...remaining.map((candidate) => candidate.readings.ecosystemVisibility));
  remaining = remaining.filter((candidate) => candidate.readings.ecosystemVisibility === bestReach);
  if (remaining.length === 1) return { chosen: remaining[0], close, basis: "ecosystem-reach" };

  return { chosen: top, close, basis: "unresolved" };
}

function decisionGuide(
  ranked: readonly ScoredModel[],
  decorate: (candidate: ScoredModel) => Alternative,
  role: Role,
  brief: Brief,
  chosen: ScoredModel,
  closeCall: CloseCallSelection,
  policyReason: string | null,
  userSelected: boolean,
  choiceCandidates: readonly ScoredModel[],
): DecisionGuide {
  const top = ranked[0];
  const second = ranked[1];
  if (userSelected) {
    const choiceGap = Math.round((top.score - chosen.score) * 100) / 100;
    return {
      state: "user-choice",
      scoreGap: choiceGap,
      closeCallThreshold: CLOSE_CALL_SCORE_GAP,
      closeCandidates: choiceCandidates.map(decorate),
      tieBreakBasis: null,
      reason: `${chosen.model.name} was selected by the user from ${choiceCandidates.length} candidates less than ${USER_CHOICE_SCORE_GAP} raw-score points from ${top.model.name}. Its raw rank is #${ranked.indexOf(chosen) + 1}; the advisor's scores and automatic choice were not rewritten.`,
      recommendedTest: `Compare the selected model and the advisor choice on the same 10 representative ${role.label.toLowerCase()} tasks before treating the override as the final choice.`,
    };
  }
  if (policyReason) {
    const policyGap = Math.round((top.score - chosen.score) * 100) / 100;
    return {
      state: "policy-choice",
      scoreGap: policyGap,
      closeCallThreshold: CLOSE_CALL_SCORE_GAP,
      closeCandidates: [decorate(top), decorate(chosen)],
      tieBreakBasis: null,
      reason: `${chosen.model.name} is not the raw score leader. It is ${policyGap.toFixed(2)} points behind ${top.model.name} and was selected by the team’s provider policy.`,
      recommendedTest: `Run both choices through the same 10 representative ${role.label.toLowerCase()} tasks and keep the policy choice only if the operational benefit outweighs any measured result gap.`,
    };
  }
  const scoreGap = second ? Math.round((top.score - second.score) * 100) / 100 : null;
  const close = closeCall.close;
  const chosenReadings = tieBreakReadings(chosen, role, brief);

  if (close.length === 1) {
    const topEvidence = top.readings.measuredPerformance;
    return {
      state: topEvidence.evidenceLevel === "tested" ? "tested-lead" : "clear-lead",
      scoreGap,
      closeCallThreshold: CLOSE_CALL_SCORE_GAP,
      closeCandidates: close.map(decorate),
      tieBreakBasis: null,
      reason:
        topEvidence.evidenceLevel === "tested"
          ? `${top.model.name} has relevant capability-test evidence and is more than ${CLOSE_CALL_SCORE_GAP} point ahead.`
          : `${top.model.name} is more than ${CLOSE_CALL_SCORE_GAP} point ahead under the selected assumptions, but its lead remains estimated until it is tested on this application.`,
      recommendedTest: `Run at least 10 representative ${role.label.toLowerCase()} tasks and compare task success, corrections, cost and response time.`,
    };
  }

  if (closeCall.basis && closeCall.basis !== "unresolved") {
    const next = close
      .filter((candidate) => candidate !== chosen)
      .map((candidate) => ({ candidate, readings: tieBreakReadings(candidate, role, brief) }))
      .sort((left, right) => {
        if (closeCall.basis === "measured-performance") {
          return EVIDENCE_ORDER[right.readings.performanceEvidence] - EVIDENCE_ORDER[left.readings.performanceEvidence];
        }
        if (closeCall.basis === "application-specialisation") {
          return right.readings.applicationSpecialisation - left.readings.applicationSpecialisation;
        }
        return right.readings.ecosystemReach - left.readings.ecosystemReach;
      })[0]!;
    const basisReason =
      closeCall.basis === "measured-performance"
        ? `${chosen.model.name} has ${chosenReadings.performanceEvidence} relevant performance evidence, ahead of ${next.readings.performanceEvidence} evidence for ${next.candidate.model.name}`
        : closeCall.basis === "application-specialisation"
          ? `${chosen.model.name} has the strongest application-specialisation reading at ${chosenReadings.applicationSpecialisation}/100, compared with ${next.readings.applicationSpecialisation}/100 for ${next.candidate.model.name}`
          : `${chosen.model.name} and the remaining candidates are level on application specialisation, so its ${chosenReadings.ecosystemReach}/100 ecosystem-reach reading separates it from ${next.candidate.model.name} at ${next.readings.ecosystemReach}/100`;
    return {
      state: "tie-break-choice",
      scoreGap,
      closeCallThreshold: CLOSE_CALL_SCORE_GAP,
      closeCandidates: close.map(decorate),
      tieBreakBasis: closeCall.basis,
      reason: `${close.map((candidate) => candidate.model.name).join(", ")} have raw scores less than ${CLOSE_CALL_SCORE_GAP} point apart. ${basisReason}. The raw scores were not rewritten.`,
      recommendedTest: `Treat this as a reasoned candidate choice, not a proven winner. Give the close candidates the same 10 representative ${role.label.toLowerCase()} tasks and compare task completion, corrections, measured cost, response time, deployment fit and failure recovery.`,
    };
  }

  return {
    state: "too-close",
    scoreGap,
    closeCallThreshold: CLOSE_CALL_SCORE_GAP,
    closeCandidates: close.map(decorate),
    tieBreakBasis: "unresolved",
    reason: `${close.map((candidate) => candidate.model.name).join(", ")} have raw scores less than ${CLOSE_CALL_SCORE_GAP} point apart, and measured performance, application specialisation and ecosystem reach do not separate them. The displayed model remains provisional.`,
    recommendedTest: `Give the close candidates the same 10 representative ${role.label.toLowerCase()} tasks. Prefer the one with better task completion and fewer corrections; if those tie, use measured total cost, response time, deployment fit and failure recovery—in that order.`,
  };
}

/**
 * Build a plan for one plan style.
 *
 * Two rules can override the top-scoring model, and both are reported on the
 * entry so a user is never shown a #4 pick without being told why:
 *   - a one-provider plan keeps the whole team on the primary's provider;
 *   - a multi-provider plan takes the best model from an unused provider, but
 *     only while it stays within the provisional near-match threshold. The
 *     threshold is visible and versioned because it is not yet empirically
 *     validated.
 */
export function planFor(
  catalog: readonly Model[],
  brief: Brief,
  styleId: string,
  userChoices: Readonly<Record<string, string>> = {},
): Plan {
  const strategy = STRATEGIES[styleId] ?? STRATEGIES.balanced;
  const settings = effectiveSettings(brief, strategy);
  const roles = deriveRoles(brief, strategy);

  const usedProviders = new Set<string>();
  const entries: PlanEntry[] = [];
  const unfilled: { role: Role; reason: string }[] = [];
  const excludedById = new Map<string, Exclusion>();
  let primaryProvider: string | null = null;

  for (const role of roles) {
    const { ranked, excluded } = rankForRole(catalog, role.role, brief, strategy);
    for (const exclusion of excluded) {
      if (!excludedById.has(exclusion.model.id)) excludedById.set(exclusion.model.id, exclusion);
    }

    if (ranked.length === 0) {
      unfilled.push({
        role,
        reason: "No current model variant is available for this job. Review withdrawn entries or update the catalogue.",
      });
      continue;
    }

    const top = ranked[0];
    const closeCall = selectCloseCall(ranked, role, brief);
    let chosen = closeCall.chosen;
    let policyReason: string | null = null;

    if (strategy.singleProvider && primaryProvider) {
      const sameProvider = ranked.find((candidate) => candidate.model.provider === primaryProvider);
      if (sameProvider && sameProvider !== chosen) {
        chosen = sameProvider;
        policyReason = `kept on ${primaryProvider} because this plan style uses one provider for the whole team`;
      }
    } else if (settings.multiVendor && usedProviders.size > 0) {
      // A percentage-of-top threshold breaks with negative scores, so compare on
      // the fit scale, which is normalised and always ordered correctly.
      const diverse = ranked.find(
        (candidate) =>
          !usedProviders.has(candidate.model.provider) &&
          fitPercent(candidate.score, ranked) >= DIVERSITY_FIT_THRESHOLD,
      );
      if (diverse && diverse !== chosen) {
        chosen = diverse;
        policyReason = `chosen over ${closeCall.chosen.model.name} to avoid depending on a single provider under the provisional ${DIVERSITY_FIT_THRESHOLD}% near-match rule`;
      }
    }

    const advisorChosen = chosen;
    const choiceCandidates = ranked.filter((candidate) => top.score - candidate.score < USER_CHOICE_SCORE_GAP);
    const requestedChoice = choiceCandidates.find((candidate) => candidate.model.id === userChoices[role.id]);
    const userSelected = Boolean(requestedChoice);
    if (requestedChoice) {
      chosen = requestedChoice;
      policyReason = null;
    }

    primaryProvider ??= chosen.model.provider;
    usedProviders.add(chosen.model.provider);

    const decorate = (candidate: (typeof ranked)[number]): Alternative => ({
      model: candidate.model,
      rank: ranked.indexOf(candidate) + 1,
      fit: fitPercent(candidate.score, ranked),
      score: candidate.score,
      tieBreak: tieBreakReadings(candidate, role, brief),
    });

    const decision = decisionGuide(
      ranked,
      decorate,
      role,
      brief,
      chosen,
      closeCall,
      policyReason,
      userSelected,
      choiceCandidates,
    );

    entries.push({
      role,
      model: chosen.model,
      rank: ranked.indexOf(chosen) + 1,
      fit: fitPercent(chosen.score, ranked),
      policyAdjusted: policyReason !== null,
      policyReason,
      terms: chosen.terms,
      readings: chosen.readings,
      decision,
      advisorChoice: decorate(advisorChosen),
      choiceCandidates: choiceCandidates.map(decorate),
      userSelected,
      alternatives: ranked
        .filter((candidate) => candidate.model.id !== chosen.model.id)
        .slice(0, 3)
        .map(decorate),
      styleId,
    });
  }

  return { strategy, entries, unfilled, excluded: [...excludedById.values()] };
}

/**
 * Non-model components the application will also need.
 *
 * Kept in the engine rather than the UI because the most valuable output of a
 * model-selection tool is often "this part should not be a model at all".
 */
export function recommendedTools(brief: Brief): ToolRecommendation[] {
  const items: ToolRecommendation[] = [];
  const has = (...needs: string[]): boolean => needs.some((need) => brief.needs.includes(need));
  const add = (id: string, name: string, reason: string): void => {
    if (!items.some((item) => item.id === id)) items.push({ id, name, reason });
  };

  if (has("documents", "internal-knowledge")) {
    add(
      "knowledge",
      "Search and knowledge store",
      "Keeps trusted documents, permissions and citations outside the model.",
    );
  }
  if (has("current-research")) {
    add("search", "Web search and source tracking", "Finds current information and records the sources used.");
  }
  if (has("geospatial")) {
    add("gis", "GIS, maps and spatial database", "Performs real distance, boundary, route and location calculations.");
  }
  if (has("software-tools", "high-volume", "coordinate-work", "code-build")) {
    add(
      "workflow",
      "Tool access and workflow controls",
      "Limits what actions models can take and records what happened.",
    );
  }
  if (has("computer-vision", "documents", "creative-design")) {
    add(
      "media",
      "Document and media processing",
      "Provides OCR, file parsing or specialist image-generation tools where needed.",
    );
  }
  if (has("listen-speak", "field-mobile")) {
    add("speech", "Speech input and output", "Handles audio capture, transcription, playback and interruptions.");
  }
  if (has("sensitive-data") || brief.dataControl) {
    add("privacy", "Identity, access and private storage", "Controls who can see data and where it is stored.");
  }
  if (has("forecast-scenarios") || brief.industry === "financial" || brief.domain === "finance") {
    add(
      "calculation",
      "Trusted data and calculation engine",
      "Keeps important figures and calculations reproducible outside free-form text.",
    );
  }
  if (brief.industry === "science" || ["health", "physical", "earth"].includes(brief.domain)) {
    add(
      "domain",
      "Domain databases and reproducible analysis",
      "Uses trusted specialist data, methods and versioned results.",
    );
  }
  if (brief.risk !== "low" || has("validate")) {
    add(
      "evaluation",
      "Evaluation set and human review",
      "Tests real examples and sends high-impact decisions to a responsible person.",
    );
  }
  return items.slice(0, 7);
}
