import type { Capability, Model, PlanEntry } from "../../shared/types.js";
import { completeBrief, planFor, recommendedTools, type Plan } from "../../engine/planning.js";
import { evaluateTeam, type TeamTrial } from "../../engine/team-evaluation.js";
import { explainPlan } from "../../engine/explain.js";
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
} {
  const covered = requirements.filter((capability) =>
    entries.some((entry) => entry.model.cases.includes(capability)),
  ).length;
  return {
    covered,
    total: requirements.length,
    lowerCost: entries.filter((entry) => entry.model.costClass <= 2).length,
  };
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
      ? `<label class="model-choice-control"><span>Choose among models within 3 raw-score points</span><select data-model-choice-role="${esc(entry.role.id)}"><option value="">Use advisor choice — ${esc(entry.advisorChoice.model.name)}</option>${entry.choiceCandidates
          .map(
            (candidate) =>
              `<option value="${esc(candidate.model.id)}" ${selectedOverride === candidate.model.id ? "selected" : ""}>#${candidate.rank} ${esc(candidate.model.name)} · ${candidate.score.toFixed(2)}</option>`,
          )
          .join(
            "",
          )}</select><small>Choosing here records a user override. It does not change the raw score or prove that the model is better.</small></label>`
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
          const roster = team.entries
            .map((entry) => `<span><b>${esc(entry.role.label)}</b><em>${esc(entry.model.name)}</em></span>`)
            .join("");
          return `<button class="team-option ${brief.planStyle === styleId ? "active" : ""}" data-team-style="${esc(styleId)}">
          <span>${esc(option.name)}</span>
          <strong>${esc(primary.model.name)}</strong>
          <small>Primary · ${summary.covered}/${summary.total} team coverage · ${summary.lowerCost}/${team.entries.length} lower-cost jobs · ${teamProviders.size} providers</small>
          <small class="team-trial-state">${esc(trialState)}</small>
          <div class="team-preview">${roster}</div>
        </button>`;
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
