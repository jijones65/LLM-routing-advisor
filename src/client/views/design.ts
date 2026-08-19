import type { Capability, Model, PlanEntry } from "../../shared/types.js";
import { completeBrief, planFor, recommendedTools, type Plan } from "../../engine/planning.js";
import { evaluateTeam, type TeamTrial } from "../../engine/team-evaluation.js";
import { explainPlan, skillFitSummary } from "../../engine/explain.js";
import { byId, esc, num, setHtml, setText } from "../dom.js";
import {
  expandedBreakdowns,
  modelChoiceKey,
  modelChoiceOverrides,
  modelChoicesFor,
  trialOutcomes,
  trialScopeKey,
  type Bootstrap,
  type BriefInput,
  type TrialOutcome,
} from "../state.js";
import { breakdownTable, modelLinks, priceTag, resultReadings, tradeOffChips, verificationBadge } from "./shared.js";

/** State the registry view also needs, so the flow diagram can show real counts. */
export interface DesignContext {
  readonly boot: Bootstrap;
  readonly catalog: readonly Model[];
  brief: BriefInput;
  registrySummary: {
    sourceCount?: number;
    endpointCount?: number;
    uniqueCandidateCount?: number;
    crossReferencedIdentityCount?: number;
  } | null;
}

/**
 * The chain from raw source listings down to the models compared for one job.
 *
 * Shown because the app's headline numbers are otherwise unfalsifiable: a reader
 * who sees "109 model variants" next to a gateway reporting 1,800 endpoints
 * should be able to follow how one became the other.
 */
function denominatorFlow(
  context: DesignContext,
  targetId: string,
  lastTitle: string,
  lastValue: string,
  lastNote: string,
): void {
  const summary = context.registrySummary ?? {};
  const stages: [string, string, string][] = [
    [
      num(summary.endpointCount),
      "Source listings",
      `${summary.sourceCount ?? "—"} sources kept separate; extra names and hosted copies included`,
    ],
    [
      num(summary.uniqueCandidateCount),
      "Names grouped together",
      `${num(summary.crossReferencedIdentityCount)} appear in at least two sources`,
    ],
    [
      num(context.catalog.length),
      "Distinct model variants",
      "One main record for each variant, grouped under a broader model family",
    ],
    [lastValue, lastTitle, lastNote],
  ];

  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `<div class="denominator-flow">
    <div class="denominator-title"><span>How the numbers connect</span><small>Large source lists are grouped and checked before the app uses them</small></div>
    <div class="denominator-stages">${stages
      .map(
        (stage, index) =>
          `${index ? '<span class="denominator-arrow" aria-hidden="true">→</span>' : ""}<div class="denominator-stage ${index === 3 ? "current" : ""}"><strong>${esc(stage[0])}</strong><span>${esc(stage[1])}</span><small>${esc(stage[2])}</small></div>`,
      )
      .join("")}</div>
  </div>`;
}

/** Which plan styles also chose this model for this job. */
function robustnessNote(context: DesignContext, entry: PlanEntry, plansByStyle: Map<string, Plan>): string {
  const agreeing = context.boot.primaryStrategyIds.filter((styleId) => {
    const other = plansByStyle.get(styleId);
    return other?.entries.some(
      (candidate) => candidate.role.id === entry.role.id && candidate.model.id === entry.model.id,
    );
  });
  if (agreeing.length < 3) return "";
  const label =
    agreeing.length === context.boot.primaryStrategyIds.length
      ? "The same rules select this model in every plan style"
      : `The same rules select this model in ${agreeing.length} of ${context.boot.primaryStrategyIds.length} plan styles`;
  return `<span class="robust" title="Rule stability is not measured proof. Styles: ${esc(agreeing.map((id) => context.boot.strategies[id].name).join(", "))}">↔ ${esc(label)} · still requires testing</span>`;
}

function decisionCard(entry: PlanEntry): string {
  const decision = entry.decision;
  const gap = decision.scoreGap === null ? "No second candidate" : `${decision.scoreGap.toFixed(2)} points`;
  const selectedChoice = entry.choiceCandidates.find((candidate) => candidate.model.id === entry.model.id);
  const candidatesToShow =
    decision.state === "user-choice"
      ? [entry.advisorChoice, selectedChoice].filter(
          (candidate, index, items): candidate is NonNullable<typeof candidate> => {
            if (!candidate) return false;
            return items.findIndex((item) => item?.model.id === candidate.model.id) === index;
          },
        )
      : decision.closeCandidates;
  const candidates = candidatesToShow
    .map((candidate) => {
      const readings = candidate.tieBreak;
      const selected = candidate.model.id === entry.model.id;
      return `<span class="${selected ? "selected" : ""}"><b>#${candidate.rank} ${esc(candidate.model.name)}${selected ? " · selected" : ""}</b><small>Raw score ${candidate.score.toFixed(2)}</small>${
        readings
          ? `<small>Performance ${esc(readings.performanceEvidence)} · application specialisation ${readings.applicationSpecialisation}/100 · ecosystem reach ${readings.ecosystemReach}/100</small>`
          : ""
      }</span>`;
    })
    .join("");

  if (decision.state === "user-choice") {
    return `<section class="decision-card user-choice">
      <div><span>Decision status</span><strong>Selected by you</strong><small>Raw rank #${entry.rank} · ${esc(gap)} from the raw-score leader</small></div>
      <div class="close-candidates">${candidates}</div>
      <p>${esc(decision.reason)}</p>
      <p><b>Still test:</b> ${esc(decision.recommendedTest)}</p>
    </section>`;
  }

  if (decision.state === "tie-break-choice") {
    return `<section class="decision-card tie-break-choice">
      <div><span>Decision status</span><strong>Close-call tie-break applied</strong><small>${esc(gap)} apart · the raw scores remain visible</small></div>
      <div class="close-candidates">${candidates}</div>
      <p>${esc(decision.reason)}</p>
      <p><b>Tie-break order:</b> measured performance evidence, then application specialisation, then ecosystem reach. Application specialisation is 70% requirement coverage, 20% concentration on this job and 10% provider job positioning.</p>
      <p><b>Still test:</b> ${esc(decision.recommendedTest)}</p>
    </section>`;
  }

  if (decision.state === "too-close") {
    return `<section class="decision-card close-call">
      <div><span>Decision status</span><strong>Too close to call</strong><small>${esc(gap)} apart · differences below ${decision.closeCallThreshold} point are not treated as meaningful</small></div>
      <div class="close-candidates">${candidates}</div>
      <p>${esc(decision.reason)}</p>
      <p><b>The catalogue tie-breakers are also level:</b> ${esc(decision.recommendedTest)}</p>
    </section>`;
  }

  if (decision.state === "policy-choice") {
    return `<section class="decision-card policy-choice">
      <div><span>Decision status</span><strong>Selected by a team policy</strong><small>${esc(gap)} from the raw score leader</small></div>
      <div class="close-candidates">${candidates}</div>
      <p>${esc(decision.reason)}</p>
      <p><b>Good tie-breaker:</b> ${esc(decision.recommendedTest)}</p>
    </section>`;
  }

  const tested = decision.state === "tested-lead";
  return `<section class="decision-card ${tested ? "tested-lead" : "estimated-lead"}">
    <div><span>Decision status</span><strong>${tested ? "Test-supported lead" : "Estimated lead"}</strong><small>${esc(gap)} ahead</small></div>
    <p>${esc(decision.reason)} ${esc(decision.recommendedTest)}</p>
  </section>`;
}

/** Trace the selected Skills through this job to the model's stated and tested evidence. */
function skillFitPanel(context: DesignContext, entry: PlanEntry): string {
  const fit = skillFitSummary(entry, completeBrief(context.brief));
  if (fit.skills.length === 0) return "";
  const rows = fit.skills
    .map((skill) => {
      const label =
        skill.state === "stated-match" ? "Stated match" : skill.state === "partial-match" ? "Partial match" : "Gap";
      return `<article class="skill-fit-row ${esc(skill.state)}">
        <div><strong>${esc(skill.name)}</strong><span>${esc(label)}</span></div>
        <p>${esc(skill.reason)}</p>
      </article>`;
    })
    .join("");

  return `<section class="skill-fit-rationale">
    <div class="skill-fit-rationale-head"><span>Skill-fit rationale</span><strong>Why ${esc(entry.model.name)} is a candidate for this job</strong></div>
    <p>${esc(fit.summary)}</p>
    <details>
      <summary>See ${fit.skills.length} skill-by-skill reason${fit.skills.length === 1 ? "" : "s"}</summary>
      <div class="skill-fit-list">${rows}</div>
    </details>
  </section>`;
}

const OUTCOME_LABELS: Readonly<Record<TrialOutcome, string>> = {
  pass: "Pass",
  partial: "Needs work",
  fail: "Fail",
};

function outcomeSummary(brief: BriefInput, styleId: string, trials: readonly TeamTrial[]): string {
  const scope = trialScopeKey(brief, styleId);
  const outcomes = trials.map((trial) => trialOutcomes.get(`${scope}::${trial.id}`));
  if (outcomes.some((outcome) => outcome === "fail")) return "Trial found a failure";
  if (outcomes.length > 0 && outcomes.every((outcome) => outcome === "pass")) return "All recorded trials passed";
  const recorded = outcomes.filter(Boolean).length;
  return recorded > 0 ? `${recorded}/${trials.length} trials recorded` : "Not trial-tested";
}

function teamEvaluationPanel(brief: BriefInput, plan: Plan): string {
  const completed = completeBrief(brief);
  const evaluation = evaluateTeam(plan.entries, completed);
  const scope = trialScopeKey(brief, plan.strategy.id);
  const recorded = evaluation.trials
    .map((trial) => trialOutcomes.get(`${scope}::${trial.id}`))
    .filter((outcome): outcome is TrialOutcome => Boolean(outcome));
  const failed = recorded.filter((outcome) => outcome === "fail").length;
  const passed = recorded.filter((outcome) => outcome === "pass").length;
  const status = failed
    ? "Needs revision"
    : passed === evaluation.trials.length
      ? "All recorded trials passed"
      : recorded.length
        ? "Partly tested"
        : "Not yet validated";

  const checks = evaluation.checks
    .map(
      (check) => `<article class="team-check ${esc(check.status)}">
        <span>${check.status === "pass" ? "Pass" : check.status === "caution" ? "Check" : "Trial needed"}</span>
        <strong>${esc(check.label)}</strong>
        <p>${esc(check.summary)}</p>
      </article>`,
    )
    .join("");

  const trials = evaluation.trials
    .map((trial) => {
      const key = `${scope}::${trial.id}`;
      const outcome = trialOutcomes.get(key);
      return `<article class="team-trial ${outcome ? `recorded ${esc(outcome)}` : ""}">
        <div><span>Real-task trial</span><strong>${esc(trial.label)}</strong></div>
        <p>${esc(trial.task)}</p>
        <small><b>Pass when:</b> ${esc(trial.success)}</small>
        <div class="trial-outcomes" aria-label="Record the ${esc(trial.label)} result">
          ${(Object.keys(OUTCOME_LABELS) as TrialOutcome[])
            .map(
              (value) =>
                `<button type="button" data-trial-key="${esc(key)}" data-trial-outcome="${value}" aria-pressed="${outcome === value}">${OUTCOME_LABELS[value]}</button>`,
            )
            .join("")}
          ${outcome ? `<button type="button" data-trial-key="${esc(key)}" data-trial-clear="true">Clear</button>` : ""}
        </div>
      </article>`;
    })
    .join("");

  return `<div class="team-evaluation-head">
      <div><span>Team validation · ${esc(plan.strategy.name)}</span><h3>${esc(status)}</h3></div>
      <p>Catalogue checks can assess the roster’s structure. Only the same real tasks run through the complete teams can show which team works best.</p>
    </div>
    <details open>
      <summary>Structural team checks</summary>
      <div class="team-check-grid">${checks}</div>
    </details>
    <details>
      <summary>Run and record the same five trials for every plan style</summary>
      <p class="trial-note">The advisor does not call model APIs. Run these tests in the intended environment, then record the observed result here. Saved plans keep the results.</p>
      <div class="team-trial-grid">${trials}</div>
    </details>`;
}

/**
 * Note when the same model fills more than one job.
 *
 * The scoring engine can legitimately pick one model for two roles, and that is
 * useful to know — it means one deployment, one set of credentials, one thing to
 * monitor. Left unsaid it just reads as the tool repeating itself.
 */
function sharedModelNote(entry: PlanEntry, entries: readonly PlanEntry[]): string {
  const others = entries.filter(
    (candidate) => candidate.model.id === entry.model.id && candidate.role.id !== entry.role.id,
  );
  if (others.length === 0) return "";
  const labels = others.map((candidate) => candidate.role.label.toLowerCase()).join(" and ");
  return `<span class="robust" title="One deployment can serve both jobs">↺ Also filling the ${esc(labels)} job</span>`;
}

function teamSummary(
  entries: readonly PlanEntry[],
  requirements: readonly Capability[],
): {
  covered: number;
  total: number;
  lowerCost: number;
  qualityTargetReady: number;
} {
  const covered = requirements.filter((capability) =>
    entries.some((entry) => entry.model.cases.includes(capability)),
  ).length;
  return {
    covered,
    total: requirements.length,
    lowerCost: entries.filter((entry) => entry.model.costClass <= 2).length,
    qualityTargetReady: entries.filter(
      (entry) => entry.readings.measuredPerformance.score >= entry.operatingPolicy.qualityTarget,
    ).length,
  };
}

/** Explain how quality and cost are combined for the selected team. */
function qualityCostPlanPanel(plan: Plan): string {
  const rows = plan.entries
    .map((entry) => {
      const policy = entry.operatingPolicy;
      const quality = entry.readings.measuredPerformance;
      const meetsTarget = quality.score >= policy.qualityTarget;
      return `<article class="job-operating-policy ${esc(policy.mode)}">
        <div class="job-policy-head">
          <span>${esc(entry.role.label)}</span>
          <strong>${esc(policy.label)}</strong>
          <small class="${meetsTarget ? "target-ready" : "target-caution"}">${meetsTarget ? "Meets" : "Below"} ${policy.qualityTarget.toFixed(2)}/5 planning target · ${esc(quality.evidenceLevel)}</small>
        </div>
        <p><b>${esc(entry.model.name)}</b> · quality weight ${policy.qualityWeight} · cost weight ${policy.costWeight}</p>
        <dl>
          <div><dt>Route</dt><dd>${esc(policy.routingRule)}</dd></div>
          <div><dt>Escalate</dt><dd>${esc(policy.escalationRule)}</dd></div>
        </dl>
      </article>`;
    })
    .join("");

  const throughputCount = plan.entries.filter((entry) => entry.operatingPolicy.mode === "high-throughput").length;
  const assuranceCount = plan.entries.filter((entry) => entry.operatingPolicy.mode === "assurance").length;

  return `<div class="quality-cost-head">
      <div><span>Quality and cost together</span><h3>Optimise the route—not every job in the same way.</h3></div>
      <p>High-quality output is a requirement for every job. Cost is reduced by giving repeatable work to efficient models and escalating uncertain, failed or high-impact work to stronger models and checking.</p>
    </div>
    <div class="quality-cost-summary">
      <article><strong>${throughputCount}</strong><span>high-throughput job${throughputCount === 1 ? "" : "s"}</span><small>Efficient first route for defined, repeatable work</small></article>
      <article><strong>${plan.entries.length - throughputCount - assuranceCount}</strong><span>adaptive or quality-critical jobs</span><small>Task quality leads cost for difficult or specialist work</small></article>
      <article><strong>${assuranceCount}</strong><span>assurance job${assuranceCount === 1 ? "" : "s"}</span><small>Checks important results before release or action</small></article>
    </div>
    <div class="job-policy-grid">${rows}</div>
    <div class="useful-work-rule"><strong>Measure useful-work efficiency</strong><span>Successful tasks that meet the output rubric per total dollar and elapsed minute—including tools, retries, fallbacks and human corrections. Token volume alone is not output quality or productivity.</span></div>
    <details class="throughput-research">
      <summary>Research behind this routing approach</summary>
      <p>A July 2026 Vercel gateway snapshot observed open-weight models handling 29% of tokens on under 4% of spend, while high-stakes spend remained concentrated in frontier models. That is evidence about one gateway's workload and spend—not proof that any model produced better results. OECD analysis also shows that open-weight value and self-hosting economics depend heavily on workload scale and operational capacity.</p>
      <p>RouteLLM and FrugalGPT show why the application should test routing or cascades: a less expensive model can start suitable work, with stronger models used selectively when the task or result requires them. Their published gains apply to their evaluation settings and must not be copied into this application's forecast.</p>
      <a href="https://www.cremornedigitalhub.com.au/blog/a-closer-look-at-the-open-weight-ai-debate/" target="_blank" rel="noreferrer">Cremorne Digital Hub article ↗</a> · <a href="https://vercel.com/blog/ai-gateway-production-index-july-2026" target="_blank" rel="noreferrer">Vercel production index ↗</a> · <a href="https://www.oecd.org/content/dam/oecd/en/publications/reports/2026/05/benefits-of-ai-openness_40eaff39/746e8c9a-en.pdf" target="_blank" rel="noreferrer">OECD analysis ↗</a> · <a href="https://arxiv.org/abs/2406.18665" target="_blank" rel="noreferrer">RouteLLM paper ↗</a> · <a href="https://arxiv.org/abs/2305.05176" target="_blank" rel="noreferrer">FrugalGPT paper ↗</a>
    </details>`;
}

/** Keep the headline and detailed job selectors on the same choice contract. */
function modelChoiceOptions(entry: PlanEntry, selectedOverride: string): string {
  return `<option value="">Use advisor choice — ${esc(entry.advisorChoice.model.name)}</option>${entry.choiceCandidates
    .map(
      (candidate) =>
        `<option value="${esc(candidate.model.id)}" ${selectedOverride === candidate.model.id ? "selected" : ""}>#${candidate.rank} ${esc(candidate.model.name)} · ${candidate.score.toFixed(2)}</option>`,
    )
    .join("")}`;
}

function roleCard(
  context: DesignContext,
  entry: PlanEntry,
  index: number,
  entries: readonly PlanEntry[],
  plansByStyle: Map<string, Plan>,
): string {
  const expanded = expandedBreakdowns.has(entry.role.id);
  const rankClass = entry.policyAdjusted ? "policy" : "";
  const policy = entry.policyReason ? `<p class="rank-reason">Plan rule: ${esc(entry.policyReason)}.</p>` : "";
  const choiceKey = modelChoiceKey(context.brief, entry.styleId, entry.role.id);
  const selectedOverride = modelChoiceOverrides.get(choiceKey) ?? "";
  const choiceControl =
    entry.choiceCandidates.length > 1
      ? `<label class="model-choice-control"><span>Choose among models within 3 raw-score points</span><select data-model-choice-role="${esc(entry.role.id)}">${modelChoiceOptions(entry, selectedOverride)}</select><small>Choosing here records a user override. It does not change the raw score or prove that the model is better.</small></label>`
      : "";

  return `<article class="role-card ${entry.role.id === "primary" ? "primary-role" : ""}">
    <div class="role-num"><div>${String(index + 1).padStart(2, "0")}<small>job</small></div></div>
    <div class="role-copy">
      <span class="role-kind">${esc(entry.role.kind)}</span>
      ${entry.role.label === entry.role.kind ? "" : `<span class="role-label">${esc(entry.role.label)}</span>`}
      <div class="model-choice">
        <strong>${esc(entry.model.name)}</strong>
        <span class="choice-rank ${rankClass}">#${entry.rank} · ${entry.fit}% of range</span>
      </div>
      <small>${esc(entry.model.provider)} · ${esc(entry.model.tier)} · ${esc(entry.model.contextLabel)} context</small>
      <div class="sourcing-row">${verificationBadge(entry.model)}${priceTag(entry.model)}</div>
      ${resultReadings(entry)}
      ${skillFitPanel(context, entry)}
      ${decisionCard(entry)}
      ${choiceControl}
      ${modelLinks(entry.model, true)}
      <p>${esc(entry.role.purpose)}</p>
      ${policy}
      ${robustnessNote(context, entry, plansByStyle)}${sharedModelNote(entry, entries)}
      ${tradeOffChips(entry)}
      <button class="why" type="button" data-breakdown="${esc(entry.role.id)}" aria-expanded="${expanded}">
        ${expanded ? "Hide the scoring" : "Why this model?"}
      </button>
      ${expanded ? breakdownTable(entry) : ""}
    </div>
    <div class="fallbacks">
      <span>Fallback choices for this job</span>
      ${entry.alternatives
        .map(
          (alternative) =>
            `<div class="fallback-item"><span class="fallback-rank">#${alternative.rank}</span><small class="fallback-name">${esc(alternative.model.name)}</small><small class="fit">${alternative.fit}% of range</small>${modelLinks(alternative.model, true)}</div>`,
        )
        .join("")}
    </div>
  </article>`;
}

/** Render the whole design view from the current brief. */
export function renderDesign(context: DesignContext): void {
  const { boot, catalog } = context;
  const brief = completeBrief(context.brief);
  const archetype = boot.archetypes.find((item) => item.id === brief.archetype) ?? boot.archetypes[0];
  const customType = brief.customApplicationType?.trim() ?? "";
  const applicationName = customType || archetype.name;
  const strategy = boot.strategies[brief.planStyle] ?? boot.strategies.balanced;

  setText(
    "archetype-help",
    customType
      ? `Using ${archetype.name.toLowerCase()} as the starting set of common needs. Adjust the choices below for ${customType}.`
      : archetype.description,
  );
  setText("case-count", `${brief.needs.length} selected`);
  byId<HTMLSelectElement>("archetype").value = brief.archetype;
  byId<HTMLInputElement>("custom-application").value = brief.customApplicationType ?? "";
  byId<HTMLInputElement>("data-control").checked = brief.dataControl;
  byId<HTMLInputElement>("open-preferred").checked = brief.openPreferred;
  byId<HTMLInputElement>("multi-vendor").checked = brief.multiVendor;

  for (const button of document.querySelectorAll<HTMLElement>(".cap")) {
    const active = brief.needs.includes(button.dataset.need ?? "");
    button.classList.toggle("active", active);
    const marker = button.querySelector("i");
    if (marker) marker.textContent = active ? "✓" : "+";
    button.setAttribute("aria-pressed", String(active));
  }
  for (const card of document.querySelectorAll<HTMLElement>(".style-card")) {
    const active = brief.planStyle === card.dataset.style;
    card.classList.toggle("active", active);
    card.setAttribute("aria-pressed", String(active));
  }

  byId<HTMLSelectElement>("other-style").value = boot.otherStrategyIds.includes(brief.planStyle) ? brief.planStyle : "";
  byId<HTMLSelectElement>("business-goal").value = brief.businessGoal;
  byId<HTMLSelectElement>("industry").value = brief.industry;
  byId<HTMLSelectElement>("domain").value = brief.domain;
  byId<HTMLSelectElement>("risk-level").value = brief.risk;

  // Every primary plan style is computed, because the comparison strip and the
  // robustness note both need to know what the alternatives would have chosen.
  const plansByStyle = new Map(
    boot.primaryStrategyIds.map((id) => [id, planFor(catalog, brief, id, modelChoicesFor(context.brief, id))]),
  );
  const plan =
    plansByStyle.get(brief.planStyle) ??
    planFor(catalog, brief, brief.planStyle, modelChoicesFor(context.brief, brief.planStyle));
  const entries = plan.entries;

  setText("route-title", `${strategy.name} team for ${applicationName.toLowerCase()}`);
  setText("selected-style-label", `Selected plan · ${strategy.name}`);
  setText(
    "team-title",
    entries.length ? `${entries.length} jobs, led by ${entries[0].model.name}` : "No team could be built",
  );
  setText("team-description", strategy.description);
  setHtml("quality-cost-plan", qualityCostPlanPanel(plan));
  setHtml("team-evaluation", teamEvaluationPanel(context.brief, plan));
  setText("rank-range", `#1–#${catalog.length} = relative position among model variants for that job`);

  const providers = new Set(entries.map((entry) => entry.model.provider));
  const openWeight = entries.filter((entry) => entry.model.deployments.includes("open-weight")).length;
  const summary = teamSummary(entries, brief.cases);
  setHtml(
    "route-stats",
    (
      [
        ["Model team", `${entries.length} jobs · ${new Set(entries.map((entry) => entry.model.id)).size} models`],
        ["Team requirement coverage", `${summary.covered} / ${summary.total}`],
        ["Meets planning quality target", `${summary.qualityTargetReady} / ${entries.length}`],
        ["Lower-cost jobs", `${summary.lowerCost} / ${entries.length}`],
        ["Providers used", String(providers.size)],
        ["Downloadable choices", `${openWeight} / ${entries.length}`],
      ] as [string, string][]
    )
      .map(([label, value]) => `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`)
      .join(""),
  );

  const primaryProviderCounts = new Map<string, number>();
  for (const styleId of boot.primaryStrategyIds) {
    const provider = plansByStyle.get(styleId)?.entries[0]?.model.provider;
    if (provider) primaryProviderCounts.set(provider, (primaryProviderCounts.get(provider) ?? 0) + 1);
  }
  const concentratedProvider = [...primaryProviderCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  const concentrationNote =
    concentratedProvider && concentratedProvider[1] >= 3
      ? `<aside class="primary-concentration"><strong>Primary-choice concentration: ${esc(concentratedProvider[0])} leads ${concentratedProvider[1]} of ${boot.primaryStrategyIds.length} headline plans.</strong><span>This reflects the current capability statements, estimates and tie-break readings. It is not measured proof that this provider is generally better. Inspect each close-call decision and test the alternatives on the same work.</span></aside>`
      : "";

  setHtml(
    "team-compare",
    concentrationNote +
      boot.primaryStrategyIds
        .map((styleId) => {
          const option = boot.strategies[styleId];
          const team = plansByStyle.get(styleId);
          const primary = team?.entries[0];
          if (!primary) return "";
          const teamProviders = new Set(team.entries.map((entry) => entry.model.provider));
          const summary = teamSummary(team.entries, brief.cases);
          const teamEvaluation = evaluateTeam(team.entries, brief);
          const trialState = outcomeSummary(context.brief, styleId, teamEvaluation.trials);
          const closeChoiceCount = team.entries.filter((entry) => entry.choiceCandidates.length > 1).length;
          const roster = team.entries
            .map((entry) => {
              const selectedOverride =
                modelChoiceOverrides.get(modelChoiceKey(context.brief, styleId, entry.role.id)) ?? "";
              return entry.choiceCandidates.length > 1
                ? `<label class="team-preview-choice"><b>${esc(entry.role.label)}</b><select data-team-model-choice-role="${esc(entry.role.id)}" data-team-style="${esc(styleId)}" aria-label="Choose the ${esc(entry.role.label)} model for the ${esc(option.name)} plan">${modelChoiceOptions(entry, selectedOverride)}</select></label>`
                : `<span><b>${esc(entry.role.label)}</b><em>${esc(entry.model.name)}</em></span>`;
            })
            .join("");
          return `<article class="team-option ${brief.planStyle === styleId ? "active" : ""}">
          <button class="team-option-select" type="button" data-team-style="${esc(styleId)}" aria-pressed="${brief.planStyle === styleId}" aria-label="Show the ${esc(option.name)} team">
            <span>${esc(option.name)}</span>
            <strong>${esc(primary.model.name)}</strong>
            <small>Primary · ${summary.covered}/${summary.total} team coverage · ${summary.qualityTargetReady}/${team.entries.length} meet planning quality target · ${summary.lowerCost}/${team.entries.length} lower-cost jobs · ${teamProviders.size} providers</small>
            <small class="team-trial-state">${esc(trialState)}</small>
          </button>
          <div class="team-preview">
            ${closeChoiceCount ? `<small class="team-choice-summary">${closeChoiceCount} ${closeChoiceCount === 1 ? "job has" : "jobs have"} close alternatives. Choose any model less than 3 raw-score points from that job's leader.</small>` : ""}
            ${roster}
          </div>
        </article>`;
        })
        .join(""),
  );

  denominatorFlow(
    context,
    "design-denominators",
    "Compared for each job",
    num(catalog.length),
    "Every current variant is scored separately for each job in the plan",
  );

  setText("brief-summary", applicationName);
  const contextLabel = [
    boot.businessGoals.find((item) => item.id === brief.businessGoal)?.name,
    boot.industries.find((item) => item.id === brief.industry)?.name,
    boot.domains.find((item) => item.id === brief.domain)?.name,
    boot.riskLevels.find((item) => item.id === brief.risk)?.name,
  ]
    .filter(Boolean)
    .join(" · ");
  setText("context-summary", contextLabel);

  // Unfilled jobs come first: "nothing in the catalogue can do this under your
  // constraints" is more important than any ranking below it.
  const unfilled = plan.unfilled
    .map(
      (item) =>
        `<div class="unfilled"><strong>${esc(item.role.label)}: no current model available</strong><small>${esc(item.reason)}</small></div>`,
    )
    .join("");
  setHtml(
    "route-list",
    unfilled + entries.map((entry, index) => roleCard(context, entry, index, entries, plansByStyle)).join(""),
  );

  setHtml(
    "tool-list",
    recommendedTools(brief)
      .map(
        (tool) => `<div class="tool-item"><strong>${esc(tool.name)}</strong><small>${esc(tool.reason)}</small></div>`,
      )
      .join(""),
  );

  setText("readout", explainPlan(entries, brief.planStyle, brief.multiVendor, brief.dataControl));
}
