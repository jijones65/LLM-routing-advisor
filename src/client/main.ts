import { completeBrief, DIVERSITY_FIT_THRESHOLD, planFor } from "../engine/planning.js";
import { jobRequirements } from "../engine/scoring.js";
import { withSignals } from "../engine/signals.js";
import { evaluateTeam } from "../engine/team-evaluation.js";
import { byId, esc, fillSelect, setHtml, toast } from "./dom.js";
import {
  expandedBreakdowns,
  initialBrief,
  initialRegistryQuery,
  readBootstrap,
  trialOutcomes,
  trialScopeKey,
  type BriefInput,
  type RegistryQuery,
  type TrialOutcome,
} from "./state.js";
import { renderAudit, type AuditResponse } from "./views/audit.js";
import { renderDesign, type DesignContext } from "./views/design.js";
import { initExploreFilters, renderModels } from "./views/explore.js";
import { loadRegistry } from "./views/registry.js";
import { initSavedPlans, loadSavedPlans, type SavedPlan } from "./views/saved.js";
import { renderUpdates } from "./views/updates.js";

const boot = readBootstrap();
// Signals arrive already attached from the server; recomputing is a cheap no-op
// that keeps the client working if it is ever served a bare catalogue.
const catalog = boot.models.some((model) => model.signals) ? boot.models : withSignals(boot.models);

const brief: BriefInput = { ...initialBrief };
const registryQuery: RegistryQuery = { ...initialRegistryQuery };

const context: DesignContext = { boot, catalog, brief, registrySummary: null };
let savedPlansLoaded = false;

/** Re-render the design view. Every brief control funnels through here. */
function refresh(): void {
  context.brief = brief;
  renderDesign(context);
}

// ---------------------------------------------------------------------------
// Static population of the brief controls
// ---------------------------------------------------------------------------

fillSelect("archetype", boot.archetypes);
fillSelect("business-goal", boot.businessGoals);
fillSelect("industry", boot.industries);
fillSelect("domain", boot.domains);
fillSelect("risk-level", boot.riskLevels);

setHtml(
  "capabilities",
  boot.needGroups
    .map(
      (group) =>
        `<div class="capability-group"><strong>${esc(group.name)}</strong><div class="cap-grid">${group.items
          .map(
            (need) =>
              `<button class="cap" type="button" data-need="${esc(need.id)}" aria-pressed="false"><span>${esc(need.name)}</span><i>+</i></button>`,
          )
          .join("")}</div></div>`,
    )
    .join(""),
);

setHtml(
  "primary-styles",
  boot.primaryStrategyIds
    .map((id) => {
      const strategy = boot.strategies[id];
      return `<button class="style-card" type="button" data-style="${esc(id)}" aria-pressed="false"><strong>${esc(strategy.name)}</strong><small>${esc(strategy.short)}</small></button>`;
    })
    .join(""),
);

setHtml(
  "other-style",
  `<option value="">Choose another style…</option>${boot.otherStrategyIds
    .map(
      (id) =>
        `<option value="${esc(id)}">${esc(boot.strategies[id].name)} — ${esc(boot.strategies[id].short)}</option>`,
    )
    .join("")}`,
);

initExploreFilters(boot, catalog);

// ---------------------------------------------------------------------------
// Brief interactions
// ---------------------------------------------------------------------------

byId<HTMLSelectElement>("archetype").addEventListener("change", (event) => {
  const id = (event.target as HTMLSelectElement).value;
  const archetype = boot.archetypes.find((item) => item.id === id) ?? boot.archetypes[0];
  brief.archetype = archetype.id;
  brief.customApplicationType = "";
  byId<HTMLInputElement>("custom-application").value = "";
  brief.needs = [...archetype.needs];
  refresh();
});

byId<HTMLInputElement>("custom-application").addEventListener("input", (event) => {
  brief.customApplicationType = (event.target as HTMLInputElement).value.slice(0, 100);
  refresh();
});

byId("capabilities").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>(".cap");
  const need = button?.dataset.need;
  if (!need) return;
  const index = brief.needs.indexOf(need);
  // At least one capability must stay selected; an empty brief has no meaning.
  if (index >= 0 && brief.needs.length > 1) brief.needs = brief.needs.filter((entry) => entry !== need);
  else if (index < 0) brief.needs = [...brief.needs, need];
  refresh();
});

byId("primary-styles").addEventListener("click", (event) => {
  const card = (event.target as HTMLElement).closest<HTMLElement>(".style-card");
  if (!card?.dataset.style) return;
  brief.planStyle = card.dataset.style;
  refresh();
});

byId("team-compare").addEventListener("click", (event) => {
  const option = (event.target as HTMLElement).closest<HTMLElement>(".team-option");
  if (!option?.dataset.teamStyle) return;
  brief.planStyle = option.dataset.teamStyle;
  refresh();
});

byId<HTMLSelectElement>("other-style").addEventListener("change", (event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (!value) return;
  brief.planStyle = value;
  refresh();
});

// Score-breakdown toggles are delegated from the list, since the cards are
// re-rendered on every change and per-card listeners would leak.
byId("route-list").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>(".why");
  const roleId = button?.dataset.breakdown;
  if (!roleId) return;
  if (expandedBreakdowns.has(roleId)) expandedBreakdowns.delete(roleId);
  else expandedBreakdowns.add(roleId);
  refresh();
});

byId("team-evaluation").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-trial-key]");
  const key = button?.dataset.trialKey;
  if (!key) return;
  if (button.dataset.trialClear === "true") trialOutcomes.delete(key);
  else if (button.dataset.trialOutcome) trialOutcomes.set(key, button.dataset.trialOutcome as TrialOutcome);
  refresh();
});

for (const [elementId, key] of [
  ["business-goal", "businessGoal"],
  ["industry", "industry"],
  ["domain", "domain"],
  ["risk-level", "risk"],
] as const) {
  byId<HTMLSelectElement>(elementId).addEventListener("change", (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (key === "risk") brief.risk = value as BriefInput["risk"];
    else brief[key] = value;
    refresh();
  });
}

for (const [elementId, key] of [
  ["data-control", "dataControl"],
  ["open-preferred", "openPreferred"],
  ["multi-vendor", "multiVendor"],
] as const) {
  byId<HTMLInputElement>(elementId).addEventListener("change", (event) => {
    brief[key] = (event.target as HTMLInputElement).checked;
    refresh();
  });
}

// ---------------------------------------------------------------------------
// Explorer interactions
// ---------------------------------------------------------------------------

for (const id of ["model-search", "provider-filter", "case-filter", "deployment-filter"]) {
  byId(id).addEventListener(id === "model-search" ? "input" : "change", () => renderModels(boot, catalog));
}

// ---------------------------------------------------------------------------
// Registry interactions
// ---------------------------------------------------------------------------

const onRegistrySummary = (summary: Record<string, unknown>): void => {
  context.registrySummary = summary;
  refresh();
};

let searchTimer: number | undefined;
byId<HTMLInputElement>("registry-search").addEventListener("input", (event) => {
  registryQuery.q = (event.target as HTMLInputElement).value;
  registryQuery.offset = 0;
  // Debounced: each keystroke otherwise re-runs a full cross-source aggregation.
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => void loadRegistry(registryQuery, {}, onRegistrySummary), 260);
});

for (const [id, key] of [
  ["registry-source", "source"],
  ["registry-provider", "provider"],
  ["registry-classification", "classification"],
] as const) {
  byId<HTMLSelectElement>(id).addEventListener("change", (event) => {
    registryQuery[key] = (event.target as HTMLSelectElement).value;
    registryQuery.offset = 0;
    void loadRegistry(registryQuery, {}, onRegistrySummary);
  });
}

byId("registry-prev").addEventListener("click", () => {
  registryQuery.offset = Math.max(0, registryQuery.offset - registryQuery.limit);
  void loadRegistry(registryQuery, {}, onRegistrySummary);
});
byId("registry-next").addEventListener("click", () => {
  registryQuery.offset += registryQuery.limit;
  void loadRegistry(registryQuery, {}, onRegistrySummary);
});
byId("registry-refresh-now").addEventListener("click", () => {
  void loadRegistry(registryQuery, { refresh: true, force: true }, onRegistrySummary);
});

// ---------------------------------------------------------------------------
// Audit interactions
// ---------------------------------------------------------------------------

let auditLoading = false;

async function loadAudit(options: { check?: boolean; force?: boolean; registry?: boolean } = {}): Promise<void> {
  if (auditLoading) return;
  auditLoading = true;
  const checkButton = byId<HTMLButtonElement>("check-source");
  const refreshButton = byId<HTMLButtonElement>("refresh-registry");
  checkButton.disabled = true;
  refreshButton.disabled = true;

  try {
    const params = new URLSearchParams();
    if (options.check) params.set("check", "1");
    if (options.force) params.set("force", "1");
    if (options.registry) params.set("registry", "1");
    const response = await fetch(`/api/audit?${params}`, { cache: "no-store" });
    const data = (await response.json()) as AuditResponse;
    renderAudit(boot, data, catalog.length);
    if (options.check && data.checkResult) {
      toast(`Checked ${data.checkResult.sourceId}: ${data.checkResult.status}`);
    }
  } catch {
    toast("The coverage check could not be loaded");
  } finally {
    auditLoading = false;
    checkButton.disabled = false;
    refreshButton.disabled = false;
  }
}

byId("check-source").addEventListener("click", () => void loadAudit({ check: true, force: true }));
byId("refresh-registry").addEventListener("click", () => void loadAudit({ registry: true, force: true }));

// ---------------------------------------------------------------------------
// Saving a plan
// ---------------------------------------------------------------------------

byId("save-blueprint").addEventListener("click", async () => {
  const saveButton = byId<HTMLButtonElement>("save-blueprint");
  if (saveButton.disabled) return;
  saveButton.disabled = true;
  const originalLabel = saveButton.textContent;
  saveButton.textContent = "Saving…";
  const complete = completeBrief(brief);
  const plan = planFor(catalog, complete, complete.planStyle);
  const evaluation = evaluateTeam(plan.entries, complete);
  const trialScope = trialScopeKey(brief, plan.strategy.id);
  const strategy = boot.strategies[complete.planStyle] ?? boot.strategies.balanced;

  try {
    const response = await fetch("/api/blueprints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `${strategy.name} team · ${complete.customApplicationType?.trim() || boot.archetypes.find((item) => item.id === complete.archetype)?.name || complete.archetype}`,
        brief: complete,
        features: complete.cases,
        routing: plan.entries.map((entry) => ({
          role: entry.role.id,
          roleLabel: entry.role.label,
          jobRequirements: jobRequirements(entry.role.role, complete),
          modelId: entry.model.id,
          modelName: entry.model.name,
          provider: entry.model.provider,
          rank: entry.rank,
          fit: entry.fit,
          readings: entry.readings,
          decision: entry.decision,
        })),
        teamEvaluation: {
          checks: evaluation.checks,
          trials: evaluation.trials.map((trial) => ({
            ...trial,
            outcome: trialOutcomes.get(`${trialScope}::${trial.id}`) ?? "not-tested",
          })),
        },
        catalogVersion: boot.catalogVersion,
        scoringVersion: boot.scoringVersion,
        taxonomyVersion: boot.taxonomyVersion,
        diversityFitThreshold: DIVERSITY_FIT_THRESHOLD,
        savedAt: new Date().toISOString(),
      }),
    });
    const data = (await response.json()) as { error?: string; markdownUrl?: string };
    if (!response.ok || !data.markdownUrl) {
      toast(data.error ?? "The plan could not be saved");
      return;
    }
    const link = byId<HTMLAnchorElement>("saved-markdown-link");
    link.href = data.markdownUrl;
    link.hidden = false;
    toast("Team plan saved — draft specification ready");
    if (savedPlansLoaded) void loadSavedPlans();
  } catch {
    toast("The plan could not be saved");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
});

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

let auditLoaded = false;
let registryLoaded = false;

function activateTab(target: string, selectedTab?: HTMLElement): void {
  for (const other of document.querySelectorAll<HTMLElement>(".tab")) {
    other.classList.toggle("active", selectedTab ? other === selectedTab : other.dataset.tab === target);
  }
  for (const page of document.querySelectorAll<HTMLElement>(".page")) page.classList.remove("active");
  document.getElementById(`${target}-page`)?.classList.add("active");

  if (target === "saved") {
    savedPlansLoaded = true;
    void loadSavedPlans();
  }
  if (target === "explore") renderModels(boot, catalog);
  if (target === "registry" && !registryLoaded) {
    registryLoaded = true;
    void loadRegistry(registryQuery, { refresh: true }, onRegistrySummary);
  }
  if (target === "audit-layer" && !auditLoaded) {
    auditLoaded = true;
    void loadAudit();
  }
  if (target === "updates") renderUpdates(boot, catalog);
}

initSavedPlans(boot, (plan: SavedPlan) => {
  const saved = plan.payload.brief as Partial<BriefInput> | undefined;
  if (!saved) {
    toast("This older saved plan has no brief to reopen; its draft can still be edited or exported");
    return;
  }
  brief.archetype = boot.archetypes.some((item) => item.id === saved.archetype)
    ? (saved.archetype as string)
    : initialBrief.archetype;
  brief.customApplicationType = typeof saved.customApplicationType === "string" ? saved.customApplicationType : "";
  brief.needs = Array.isArray(saved.needs) && saved.needs.length ? [...saved.needs] : [...initialBrief.needs];
  brief.businessGoal = saved.businessGoal ?? initialBrief.businessGoal;
  brief.industry = saved.industry ?? initialBrief.industry;
  brief.domain = saved.domain ?? initialBrief.domain;
  brief.risk = saved.risk ?? initialBrief.risk;
  brief.planStyle = saved.planStyle ?? initialBrief.planStyle;
  brief.dataControl = Boolean(saved.dataControl);
  brief.openPreferred = Boolean(saved.openPreferred);
  brief.multiVendor = saved.multiVendor !== false;

  const scope = trialScopeKey(brief, brief.planStyle);
  const evaluation = plan.payload.teamEvaluation as {
    trials?: { id?: string; outcome?: TrialOutcome | "not-tested" }[];
  };
  for (const trial of evaluation?.trials ?? []) {
    if (!trial.id) continue;
    const key = `${scope}::${trial.id}`;
    trialOutcomes.delete(key);
    if (trial.outcome === "pass" || trial.outcome === "partial" || trial.outcome === "fail")
      trialOutcomes.set(key, trial.outcome);
  }
  refresh();
  activateTab("design");
  toast("Saved plan reopened in Application design");
});

for (const tab of document.querySelectorAll<HTMLElement>(".tab")) {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    if (!target) return;
    activateTab(target, tab);
  });
}

byId("live-state").innerHTML = `<i></i>Catalogue ${esc(boot.catalogVersion)} · reviewed ${esc(boot.verifiedAt)}`;

refresh();
