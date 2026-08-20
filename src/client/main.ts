import { completeBrief, DIVERSITY_FIT_THRESHOLD, planFor, recommendedTools } from "../engine/planning.js";
import { jobRequirements } from "../engine/scoring.js";
import { withSignals } from "../engine/signals.js";
import { evaluateTeam } from "../engine/team-evaluation.js";
import { skillFitSummary } from "../engine/explain.js";
import { byId, esc, fillSelect, setHtml, toast } from "./dom.js";
import {
  clearModelChoicesFor,
  expandedBreakdowns,
  initialBrief,
  initialRegistryQuery,
  modelChoiceKey,
  modelChoiceOverrides,
  modelChoicesFor,
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
import type { ConceptPaperAnalysis } from "../shared/concept-paper.js";

const boot = readBootstrap();
// Signals arrive already attached from the server; recomputing is a cheap no-op
// that keeps the client working if it is ever served a bare catalogue.
const catalog = boot.models.some((model) => model.signals) ? boot.models : withSignals(boot.models);

const brief: BriefInput = { ...initialBrief };
const registryQuery: RegistryQuery = { ...initialRegistryQuery };

const context: DesignContext = { boot, catalog, brief, registrySummary: null };
let savedPlansLoaded = false;
let importedConcept: ConceptPaperAnalysis | null = null;

/** Re-render the design view. Every brief control funnels through here. */
function refresh(): void {
  context.brief = brief;
  renderDesign(context);
}

function renderConceptPaper(): void {
  const result = byId<HTMLElement>("concept-paper-result");
  if (!importedConcept) {
    result.hidden = true;
    result.innerHTML = "";
    return;
  }
  const filled = [
    importedConcept.objective,
    importedConcept.context,
    importedConcept.users,
    importedConcept.inputs,
    importedConcept.outputs,
    importedConcept.constraints,
    importedConcept.evaluationCriteria,
    importedConcept.edgeCases,
    importedConcept.verificationSteps,
  ].filter(Boolean).length;
  const mapped = Object.keys(importedConcept.sourceMappings ?? {}).length;
  const kind = importedConcept.documentKind.replaceAll("-", " ");
  result.hidden = false;
  result.innerHTML = `<strong>${esc(importedConcept.fileName)} imported</strong>
    <span>${esc(kind)} recognised · ${esc(importedConcept.suggestedNeeds.length)} Skills suggested · ${filled} specification areas started</span>
    <small>${esc(mapped)} source mappings recorded${importedConcept.existingArchitecture ? " · existing architecture preserved" : ""}. Review every suggestion before saving. The original file was not retained.</small>
    <button type="button" id="clear-concept-paper">Do not include these document details when saving</button>`;
}

function applyConceptPaper(analysis: ConceptPaperAnalysis): void {
  importedConcept = analysis;
  brief.archetype = boot.archetypes.some((item) => item.id === analysis.suggestedArchetype)
    ? analysis.suggestedArchetype
    : initialBrief.archetype;
  brief.customApplicationType = analysis.applicationType.slice(0, 100);
  const knownNeeds = new Set(boot.needGroups.flatMap((group) => group.items.map((item) => item.id)));
  brief.needs = analysis.suggestedNeeds.filter((need) => knownNeeds.has(need));
  if (!brief.needs.length) brief.needs = [...initialBrief.needs];
  if (boot.businessGoals.some((item) => item.id === analysis.businessGoal)) brief.businessGoal = analysis.businessGoal;
  if (boot.industries.some((item) => item.id === analysis.industry)) brief.industry = analysis.industry;
  if (boot.domains.some((item) => item.id === analysis.domain)) brief.domain = analysis.domain;
  brief.risk = analysis.risk;
  brief.planStyle = "balanced";
  brief.dataControl = analysis.dataControl;
  brief.openPreferred = analysis.openPreferred;
  brief.multiVendor = true;
  modelChoiceOverrides.clear();
  trialOutcomes.clear();
  refresh();
  renderConceptPaper();
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
        `<div class="capability-group"><div class="capability-group-title"><strong>${esc(group.name)}</strong><small>${esc(group.prompt)}</small></div><div class="cap-grid">${group.items
          .map((need) => {
            const helpId = `skill-help-${need.id}`;
            return `<button class="cap" type="button" data-need="${esc(need.id)}" aria-pressed="false" aria-describedby="${esc(helpId)}"><b>${esc(need.name)}</b><i aria-hidden="true">+</i><span class="skill-popover" id="${esc(helpId)}" role="tooltip"><strong>When to choose it</strong><span>${esc(need.guidance)}</span><strong>Examples</strong><span>${esc(need.examples)}</span><small>${esc(need.boundary)}</small></span></button>`;
          })
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
// Concept-paper import
// ---------------------------------------------------------------------------

byId<HTMLInputElement>("concept-paper-file").addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  const status = byId("concept-paper-status");
  status.classList.remove("error");
  status.textContent = file ? `${file.name} · ready to read` : "PDF or DOCX · up to 8 MB · scanned PDFs need OCR";
});

byId<HTMLButtonElement>("import-concept-paper").addEventListener("click", async () => {
  const input = byId<HTMLInputElement>("concept-paper-file");
  const button = byId<HTMLButtonElement>("import-concept-paper");
  const status = byId("concept-paper-status");
  const file = input.files?.[0];
  status.classList.remove("error");
  if (!file) {
    status.textContent = "Choose a PDF or DOCX project document first.";
    status.classList.add("error");
    return;
  }
  button.disabled = true;
  button.textContent = "Reading the paper…";
  status.textContent = "Extracting text and matching it to the application brief…";
  try {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/concept-paper", { method: "POST", body: form });
    const data = (await response.json()) as { analysis?: ConceptPaperAnalysis; error?: string };
    if (!response.ok || !data.analysis) throw new Error(data.error ?? "The concept paper could not be read.");
    applyConceptPaper(data.analysis);
    status.textContent =
      "Plan brief created from the document — review the mapped source sections, application name and Skills below.";
    toast("Concept paper imported — candidate teams updated");
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The concept paper could not be read.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
    button.textContent = "Make a plan from this document";
  }
});

byId("concept-paper-result").addEventListener("click", (event) => {
  if (!(event.target as HTMLElement).closest("#clear-concept-paper")) return;
  importedConcept = null;
  byId<HTMLInputElement>("concept-paper-file").value = "";
  const status = byId("concept-paper-status");
  status.textContent = "Document details removed from future saves; the current brief choices are unchanged.";
  status.classList.remove("error");
  renderConceptPaper();
});

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
  const option = (event.target as HTMLElement).closest<HTMLElement>(".team-option-select");
  if (!option?.dataset.teamStyle) return;
  brief.planStyle = option.dataset.teamStyle;
  refresh();
});

byId("team-compare").addEventListener("change", (event) => {
  const select = (event.target as HTMLElement).closest<HTMLSelectElement>("select[data-team-model-choice-role]");
  const roleId = select?.dataset.teamModelChoiceRole;
  const styleId = select?.dataset.teamStyle;
  if (!select || !roleId || !styleId) return;
  const key = modelChoiceKey(brief, styleId, roleId);
  if (select.value) modelChoiceOverrides.set(key, select.value);
  else modelChoiceOverrides.delete(key);
  const trialPrefix = `${trialScopeKey(brief, styleId)}::`;
  for (const trialKey of trialOutcomes.keys()) if (trialKey.startsWith(trialPrefix)) trialOutcomes.delete(trialKey);
  brief.planStyle = styleId;
  refresh();
  toast("Model choice updated — record new trials for the changed team");
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

byId("route-list").addEventListener("change", (event) => {
  const select = (event.target as HTMLElement).closest<HTMLSelectElement>("select[data-model-choice-role]");
  const roleId = select?.dataset.modelChoiceRole;
  if (!select || !roleId) return;
  const key = modelChoiceKey(brief, brief.planStyle, roleId);
  if (select.value) modelChoiceOverrides.set(key, select.value);
  else modelChoiceOverrides.delete(key);
  const trialPrefix = `${trialScopeKey(brief, brief.planStyle)}::`;
  for (const trialKey of trialOutcomes.keys()) if (trialKey.startsWith(trialPrefix)) trialOutcomes.delete(trialKey);
  refresh();
  toast("Model choice updated — record new trials for the changed team");
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

for (const id of ["model-search", "provider-filter", "case-filter", "deployment-filter", "model-profile-filter"]) {
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
  const plan = planFor(catalog, complete, complete.planStyle, modelChoicesFor(brief, complete.planStyle));
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
          skillFit: skillFitSummary(entry, complete),
          operatingPolicy: entry.operatingPolicy,
          decision: entry.decision,
          userSelected: entry.userSelected,
        })),
        teamEvaluation: {
          checks: evaluation.checks,
          trials: evaluation.trials.map((trial) => ({
            ...trial,
            outcome: trialOutcomes.get(`${trialScope}::${trial.id}`) ?? "not-tested",
          })),
        },
        tools: recommendedTools(complete),
        conceptPaper: importedConcept,
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
  importedConcept = (plan.payload.conceptPaper as ConceptPaperAnalysis | null | undefined) ?? null;
  renderConceptPaper();

  const scope = trialScopeKey(brief, brief.planStyle);
  clearModelChoicesFor(brief, brief.planStyle);
  const evaluation = plan.payload.teamEvaluation as {
    trials?: { id?: string; outcome?: TrialOutcome | "not-tested" }[];
  };
  const routing = plan.payload.routing as { role?: string; modelId?: string; userSelected?: boolean }[];
  for (const entry of routing ?? []) {
    if (entry.userSelected && entry.role && entry.modelId) {
      modelChoiceOverrides.set(modelChoiceKey(brief, brief.planStyle, entry.role), entry.modelId);
    }
  }
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
