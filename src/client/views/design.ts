import type { Capability, Model, PlanEntry } from "../../shared/types.js";
import { completeBrief, planFor, recommendedTools, type Plan } from "../../engine/planning.js";
import { explainPlan } from "../../engine/explain.js";
import { byId, esc, num, setHtml, setText } from "../dom.js";
import { expandedBreakdowns, type Bootstrap, type BriefInput } from "../state.js";
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
      ? "Chosen by every plan style — a robust pick"
      : `Chosen by ${agreeing.length} of ${context.boot.primaryStrategyIds.length} plan styles`;
  return `<span class="robust" title="${esc(agreeing.map((id) => context.boot.strategies[id].name).join(", "))}">✓ ${esc(label)}</span>`;
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
  const plansByStyle = new Map(boot.primaryStrategyIds.map((id) => [id, planFor(catalog, brief, id)]));
  const plan = plansByStyle.get(brief.planStyle) ?? planFor(catalog, brief, brief.planStyle);
  const entries = plan.entries;

  setText("route-title", `${strategy.name} team for ${applicationName.toLowerCase()}`);
  setText("selected-style-label", `Selected plan · ${strategy.name}`);
  setText(
    "team-title",
    entries.length ? `${entries.length} jobs, led by ${entries[0].model.name}` : "No team could be built",
  );
  setText("team-description", strategy.description);
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

  setHtml(
    "team-compare",
    boot.primaryStrategyIds
      .map((styleId) => {
        const option = boot.strategies[styleId];
        const team = plansByStyle.get(styleId);
        const primary = team?.entries[0];
        if (!primary) return "";
        const teamProviders = new Set(team.entries.map((entry) => entry.model.provider));
        const summary = teamSummary(team.entries, brief.cases);
        const roster = team.entries
          .map((entry) => `<span><b>${esc(entry.role.label)}</b><em>${esc(entry.model.name)}</em></span>`)
          .join("");
        return `<button class="team-option ${brief.planStyle === styleId ? "active" : ""}" data-team-style="${esc(styleId)}">
          <span>${esc(option.name)}</span>
          <strong>${esc(primary.model.name)}</strong>
          <small>Primary · ${summary.covered}/${summary.total} team coverage · ${summary.lowerCost}/${team.entries.length} lower-cost jobs · ${teamProviders.size} providers</small>
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
