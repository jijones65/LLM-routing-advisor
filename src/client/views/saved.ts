import { byId, esc, setHtml, setText, toast, when } from "../dom.js";
import type { Bootstrap, BriefInput } from "../state.js";
import { authIsRequired, authorizedFetch, downloadProtected, isSignedIn, requestSignIn } from "../auth.js";

type AnyRecord = Record<string, unknown>;

export interface SavedPlan {
  readonly id: string;
  readonly name: string;
  readonly payload: AnyRecord;
  readonly payload_json: string;
  readonly created_at: string;
  readonly updated_at: string;
}

interface SavedPlanDetail extends SavedPlan {
  readonly specificationMarkdown: string;
}

const ENVIRONMENT_NAMES: Readonly<Record<string, string>> = {
  "not-selected": "Choose an environment",
  macos: "macOS",
  windows11: "Windows 11",
  ubuntu: "Ubuntu Linux",
  "cloud-gpu": "Cloud GPU server",
};

const VALIDATION_STATUS: Readonly<Record<string, string>> = {
  "protocol-ready": "Test protocol ready",
  "in-progress": "Validation evidence in progress",
  "evidence-recorded": "Validation evidence recorded",
  "review-required": "Validation review required",
};

let boot: Bootstrap;
let onReopen: (plan: SavedPlan) => void;
let plans: SavedPlan[] = [];
let activeId: string | null = null;
const comparedIds = new Set<string>();
let loading = false;

function record(value: unknown): AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function records(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function planBrief(plan: SavedPlan): Partial<BriefInput> {
  return record(plan.payload.brief) as Partial<BriefInput>;
}

function applicationName(plan: SavedPlan): string {
  const brief = planBrief(plan);
  const custom = typeof brief.customApplicationType === "string" ? brief.customApplicationType.trim() : "";
  return custom || boot.archetypes.find((item) => item.id === brief.archetype)?.name || "Application plan";
}

function strategyName(plan: SavedPlan): string {
  const id = planBrief(plan).planStyle ?? "balanced";
  return boot.strategies[id]?.name ?? String(id);
}

function validation(plan: SavedPlan): AnyRecord {
  return record(plan.payload.validation);
}

function validationEvaluation(plan: SavedPlan): AnyRecord {
  return record(validation(plan).currentEvaluation);
}

function trialStatus(plan: SavedPlan): string {
  const validationState = validation(plan);
  const validationLabel = VALIDATION_STATUS[String(validationState.status ?? "")];
  if (validationLabel) return validationLabel;
  const trials = records(record(plan.payload.teamEvaluation).trials);
  const outcomes = trials.map((trial) => trial.outcome);
  if (outcomes.includes("fail")) return "A recorded trial failed";
  if (outcomes.length > 0 && outcomes.every((outcome) => outcome === "pass")) return "All recorded trials passed";
  const recorded = outcomes.filter((outcome) => outcome && outcome !== "not-tested").length;
  return recorded ? `${recorded}/${outcomes.length} trials recorded` : "Test protocol ready";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function comparisonMetric(plan: SavedPlan, field: string, suffix = ""): string {
  const value = numberValue(validationEvaluation(plan)[field]);
  return value === null ? "Not recorded" : `${Math.round(value * 100) / 100}${suffix}`;
}

function team(plan: SavedPlan): AnyRecord[] {
  return records(plan.payload.routing);
}

function renderList(): void {
  setText("saved-plan-count", String(plans.length));
  setText(
    "saved-plan-status",
    plans.length ? `${plans.length} saved team plan${plans.length === 1 ? "" : "s"}` : "No plans saved yet",
  );
  setHtml(
    "saved-plan-list",
    plans.length
      ? plans
          .map((plan) => {
            const roster = team(plan)
              .map(
                (entry) =>
                  `<span><b>${esc(entry.roleLabel ?? entry.role)}</b><em>${esc(entry.modelName)} · ${esc(entry.provider)}</em></span>`,
              )
              .join("");
            return `<article class="saved-plan-card ${activeId === plan.id ? "active" : ""}">
              <div class="saved-plan-card-head">
                <label class="compare-choice"><input type="checkbox" data-plan-compare="${esc(plan.id)}" ${comparedIds.has(plan.id) ? "checked" : ""}><span>Compare</span></label>
                <small>${esc(when(plan.updated_at, "date unavailable"))}</small>
              </div>
              <button class="saved-plan-open" type="button" data-plan-open="${esc(plan.id)}">
                <span>${esc(strategyName(plan))}</span>
                <strong>${esc(plan.name)}</strong>
                <small>${esc(applicationName(plan))} · ${team(plan).length} team jobs · ${esc(trialStatus(plan))}</small>
              </button>
              <div class="saved-plan-roster">${roster}</div>
              <div class="saved-plan-actions">
                <button type="button" data-plan-reopen="${esc(plan.id)}">Reopen in design</button>
                <button type="button" data-plan-open="${esc(plan.id)}">Edit draft</button>
                <button type="button" data-plan-export="${esc(plan.id)}">Export Markdown</button>
                <button class="delete-plan" type="button" data-plan-delete="${esc(plan.id)}">Delete</button>
              </div>
            </article>`;
          })
          .join("")
      : `<div class="saved-empty"><strong>No saved plans yet</strong><p>Build a candidate team in Application design, then choose <em>Save this team plan</em>. Its editable draft specification will appear here.</p></div>`,
  );
  renderComparison();
}

function renderComparison(): void {
  const selected = plans.filter((plan) => comparedIds.has(plan.id));
  if (selected.length < 2) {
    setHtml(
      "saved-plan-compare",
      `<div class="saved-compare-empty"><strong>Compare saved plans</strong><span>Select two or three plans to compare their team, validation evidence, quality, cost, speed and version stamps.</span></div>`,
    );
    return;
  }

  const row = (label: string, value: (plan: SavedPlan) => string) =>
    `<tr><th>${esc(label)}</th>${selected.map((plan) => `<td>${value(plan)}</td>`).join("")}</tr>`;
  setHtml(
    "saved-plan-compare",
    `<div class="saved-compare-head"><div><span>Side-by-side comparison</span><strong>${selected.length} saved plans</strong></div><button type="button" id="clear-plan-comparison">Clear comparison</button></div>
    <div class="saved-compare-scroll"><table>
      <thead><tr><th>Compare</th>${selected.map((plan) => `<th>${esc(plan.name)}</th>`).join("")}</tr></thead>
      <tbody>
        ${row("Application", (plan) => esc(applicationName(plan)))}
        ${row("Plan style", (plan) => esc(strategyName(plan)))}
        ${row("Team", (plan) =>
          team(plan)
            .map(
              (entry) =>
                `<span class="compare-model"><b>${esc(entry.roleLabel ?? entry.role)}</b>${esc(entry.modelName)}</span>`,
            )
            .join(""),
        )}
        ${row("Evidence state", (plan) => esc(trialStatus(plan)))}
        ${row("Shared test set", (plan) => esc(validationEvaluation(plan).sharedTestSetId ?? "Not recorded"))}
        ${row("Environment", (plan) => esc(ENVIRONMENT_NAMES[String(validation(plan).environment ?? "")] ?? "Not selected"))}
        ${row("Completion", (plan) => esc(comparisonMetric(plan, "completionPercent", "%")))}
        ${row("Observed pass rate", (plan) => esc(comparisonMetric(plan, "successRate", "%")))}
        ${row("Weighted quality", (plan) => esc(comparisonMetric(plan, "qualityScore", "/100")))}
        ${row("Recorded total cost", (plan) => {
          const value = numberValue(validationEvaluation(plan).totalCostUsd);
          return value === null ? "Not recorded" : `$${value.toFixed(4)} USD`;
        })}
        ${row("Slowest P95", (plan) => esc(comparisonMetric(plan, "p95Ms", " ms")))}
        ${row("Safety failures", (plan) => esc(comparisonMetric(plan, "safetyFailures")))}
        ${row("Routing failures", (plan) => esc(comparisonMetric(plan, "routingFailures")))}
        ${row("Catalogue", (plan) => esc(plan.payload.catalogVersion))}
        ${row("Scoring", (plan) => esc(plan.payload.scoringVersion))}
        ${row("Categories", (plan) => esc(plan.payload.taxonomyVersion))}
      </tbody>
    </table></div>`,
  );
}

function displayMetric(value: unknown, suffix = "", decimals = 1): string {
  const parsed = numberValue(value);
  return parsed === null ? "—" : `${parsed.toFixed(decimals).replace(/\.0$/, "")}${suffix}`;
}

function renderValidationWorkspace(plan: SavedPlanDetail): string {
  const state = validation(plan);
  const evaluation = validationEvaluation(plan);
  const environment = String(state.environment ?? "not-selected");
  const status = VALIDATION_STATUS[String(state.status ?? "protocol-ready")] ?? "Test protocol ready";
  const recommendations = Array.isArray(evaluation.recommendations)
    ? evaluation.recommendations.filter((value): value is string => typeof value === "string")
    : [];
  const options = Object.entries(ENVIRONMENT_NAMES)
    .filter(([value]) => value !== "not-selected")
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}" ${environment === value ? "selected" : ""}>${esc(label)}</option>`,
    )
    .join("");
  const metrics = Object.keys(evaluation).length
    ? `<div class="validation-metrics">
        <article><span>Completion</span><strong>${displayMetric(evaluation.completionPercent, "%", 0)}</strong><small>${esc(evaluation.completedTrials)} of ${esc(evaluation.expectedTrials)} trials</small></article>
        <article><span>Observed pass rate</span><strong>${displayMetric(evaluation.successRate, "%")}</strong><small>Across cases with counts</small></article>
        <article><span>Weighted quality</span><strong>${displayMetric(evaluation.qualityScore, "/100")}</strong><small>Your application rubric</small></article>
        <article><span>Total cost</span><strong>${numberValue(evaluation.totalCostUsd) === null ? "—" : `$${numberValue(evaluation.totalCostUsd)?.toFixed(4)}`}</strong><small>Recorded USD</small></article>
        <article><span>Slowest P95</span><strong>${displayMetric(evaluation.p95Ms, " ms", 0)}</strong><small>Complete-team latency</small></article>
        <article><span>Safety / routing</span><strong>${displayMetric(evaluation.safetyFailures, "", 0)} / ${displayMetric(evaluation.routingFailures, "", 0)}</strong><small>Recorded failures</small></article>
      </div>
      <div class="validation-evidence-meta">
        <span><b>Shared test set</b>${esc(evaluation.sharedTestSetId || "Not recorded")}</span>
        <span><b>Environment</b>${esc(ENVIRONMENT_NAMES[String(evaluation.environment ?? environment)] ?? "Not selected")}</span>
        <span><b>Last evaluated</b>${esc(when(typeof evaluation.evaluatedAt === "string" ? evaluation.evaluatedAt : null, "Not recorded"))}</span>
      </div>
      <div class="validation-recommendations"><strong>Proposed refinements</strong><ul>${recommendations.map((item) => `<li>${esc(item)}</li>`).join("")}</ul><small>Review these suggestions and reopen the plan to change a model or route. An upload never changes the team automatically.</small></div>`
    : `<div class="validation-ready"><strong>The test design is ready; observed evidence has not been added yet.</strong><p>Choose where you will run the team, download the protocol and complete the same trials for each candidate plan. This is a prepared validation workflow, not an unfinished catalogue entry.</p></div>`;

  return `<section class="validation-workspace" aria-labelledby="validation-workspace-title">
    <div class="validation-head">
      <div><span>Controlled team testing</span><h3 id="validation-workspace-title">${esc(status)}</h3></div>
      <em>${esc(ENVIRONMENT_NAMES[environment] ?? "Environment not selected")}</em>
    </div>
    <p>Compare quality, total cost, P95 speed, safety, routing and recovery using the same frozen examples. Keep raw outputs and logs in the approved test environment; the completed Markdown summary stays with this saved plan.</p>
    <ol class="validation-steps">
      <li><b>1</b><span><strong>Choose the run environment</strong><small>The guide adapts to local or cloud compute.</small></span></li>
      <li><b>2</b><span><strong>Download and run the protocol</strong><small>Use the same test set and rubric for every team.</small></span></li>
      <li><b>3</b><span><strong>Upload the completed .md</strong><small>The advisor evaluates evidence and proposes refinements.</small></span></li>
    </ol>
    <div class="validation-controls">
      <label><span>Compute environment</span><select id="validation-environment"><option value="">Choose…</option>${options}</select></label>
      <button type="button" id="save-validation-protocol" data-plan-id="${esc(plan.id)}">Save environment</button>
      <button type="button" id="download-validation-protocol" data-plan-id="${esc(plan.id)}" ${environment === "not-selected" ? "disabled" : ""}>Download test protocol (.md)</button>
    </div>
    <div class="validation-upload">
      <label><span>Completed test results (.md)</span><input type="file" id="validation-results-file" accept=".md,text/markdown,text/plain"></label>
      <button class="save" type="button" id="upload-validation-results" data-plan-id="${esc(plan.id)}">Upload and evaluate results</button>
      <small>The upload must be the protocol for this plan. Metadata, plan ownership and numeric ranges are checked before anything is saved.</small>
    </div>
    ${state.latestResultsFileName ? `<p class="validation-last-file"><b>Latest results:</b> ${esc(state.latestResultsFileName)} · ${esc(when(typeof evaluation.evaluatedAt === "string" ? evaluation.evaluatedAt : null, "date unavailable"))}</p>` : ""}
    ${metrics}
  </section>`;
}

function renderDetail(plan: SavedPlanDetail): void {
  const roster = team(plan)
    .map(
      (entry) =>
        `<span><b>${esc(entry.roleLabel ?? entry.role)}</b>${esc(entry.modelName)} · ${esc(entry.provider)}</span>`,
    )
    .join("");
  setHtml(
    "saved-plan-detail",
    `<div class="saved-detail-head">
      <div><span>Editable saved plan</span><h2>${esc(applicationName(plan))}</h2><small>Saved ${esc(when(plan.created_at))} · last edited ${esc(when(plan.updated_at))}</small></div>
      <button type="button" data-detail-reopen="${esc(plan.id)}">Reopen in Application design</button>
    </div>
    <div class="saved-detail-roster">${roster}</div>
    ${renderValidationWorkspace(plan)}
    <label class="saved-edit-field"><span>Plan name</span><input id="saved-plan-name" maxlength="160" value="${esc(plan.name)}"></label>
    <label class="saved-edit-field"><span>Draft application specification</span><small>Known application and team facts are filled in. Complete every [Fill in: …] field. Plans created from an upload finish with a complete extracted-source appendix; keep the original file as the authority for visual material.</small><textarea id="saved-plan-markdown" rows="28" spellcheck="true">${esc(plan.specificationMarkdown)}</textarea></label>
    <div class="saved-detail-actions">
      <button class="save" type="button" id="update-saved-plan" data-plan-id="${esc(plan.id)}">Save edits</button>
      <button type="button" data-detail-export="${esc(plan.id)}">Export complete plan (.md)</button>
    </div>`,
  );
}

function replacePlan(plan: SavedPlanDetail): void {
  const index = plans.findIndex((item) => item.id === plan.id);
  if (index >= 0) plans[index] = plan;
  renderList();
  renderDetail(plan);
}

async function loadDetail(id: string): Promise<void> {
  activeId = id;
  renderList();
  setHtml("saved-plan-detail", '<div class="saved-detail-loading">Loading the draft specification…</div>');
  try {
    const response = await authorizedFetch(`/api/blueprints/${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = (await response.json()) as { blueprint?: SavedPlanDetail; error?: string };
    if (!response.ok || !data.blueprint) throw new Error(data.error ?? "The saved plan could not be loaded");
    renderDetail(data.blueprint);
  } catch (error) {
    setHtml(
      "saved-plan-detail",
      `<div class="saved-empty"><strong>Could not open this plan</strong><p>${esc(error)}</p></div>`,
    );
  }
}

async function deletePlan(plan: SavedPlan): Promise<void> {
  try {
    const response = await authorizedFetch(`/api/blueprints/${encodeURIComponent(plan.id)}`, { method: "DELETE" });
    const data = (await response.json()) as { deleted?: boolean; error?: string };
    if (!response.ok || !data.deleted) throw new Error(data.error ?? "The saved plan could not be deleted");

    plans = plans.filter((item) => item.id !== plan.id);
    comparedIds.delete(plan.id);
    const deletedActivePlan = activeId === plan.id;
    if (deletedActivePlan) activeId = null;
    renderList();
    if (deletedActivePlan && plans[0]) await loadDetail(plans[0].id);
    else if (deletedActivePlan) setHtml("saved-plan-detail", "");
    toast(`“${plan.name}” was deleted`);
  } catch (error) {
    toast(error instanceof Error ? error.message : "The saved plan could not be deleted");
  }
}

export async function loadSavedPlans(): Promise<void> {
  if (loading) return;
  if (authIsRequired() && !isSignedIn()) {
    plans = [];
    activeId = null;
    comparedIds.clear();
    setText("saved-plan-count", "0");
    setText("saved-plan-status", "Sign in to see your saved plans");
    setHtml(
      "saved-plan-list",
      '<div class="saved-empty"><strong>Your plans are private to your account</strong><p>Sign in with a secure, one-time email link to reopen, compare, edit, export or delete saved team plans.</p><button class="save" type="button" data-saved-sign-in>Sign in</button></div>',
    );
    setHtml("saved-plan-detail", "");
    return;
  }
  loading = true;
  setText("saved-plan-status", "Loading saved plans…");
  try {
    const response = await authorizedFetch("/api/blueprints", { cache: "no-store" });
    const data = (await response.json()) as { blueprints?: SavedPlan[]; error?: string };
    if (!response.ok || !Array.isArray(data.blueprints)) throw new Error(data.error ?? "Unexpected response");
    plans = data.blueprints;
    for (const id of comparedIds) if (!plans.some((plan) => plan.id === id)) comparedIds.delete(id);
    renderList();
    if (activeId && plans.some((plan) => plan.id === activeId)) await loadDetail(activeId);
    else if (plans[0]) await loadDetail(plans[0].id);
    else setHtml("saved-plan-detail", "");
  } catch {
    setText("saved-plan-status", "Saved plans are unavailable");
    setHtml(
      "saved-plan-list",
      '<div class="saved-empty"><strong>Saved plans could not be loaded</strong><p>Your current Application design remains available. Try again shortly.</p></div>',
    );
  } finally {
    loading = false;
  }
}

export function initSavedPlans(context: Bootstrap, reopen: (plan: SavedPlan) => void): void {
  boot = context;
  onReopen = reopen;

  byId("refresh-saved-plans").addEventListener("click", () => void loadSavedPlans());
  byId("saved-plan-list").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-saved-sign-in]")) {
      requestSignIn();
      return;
    }
    const compare = target.closest<HTMLInputElement>("input[data-plan-compare]");
    if (compare?.dataset.planCompare) {
      const id = compare.dataset.planCompare;
      if (compare.checked && comparedIds.size >= 3) {
        compare.checked = false;
        toast("Compare up to three saved plans at a time");
      } else if (compare.checked) comparedIds.add(id);
      else comparedIds.delete(id);
      renderList();
      return;
    }
    const reopen = target.closest<HTMLElement>("[data-plan-reopen]")?.dataset.planReopen;
    if (reopen) {
      const plan = plans.find((item) => item.id === reopen);
      if (plan) onReopen(plan);
      return;
    }
    const deleteId = target.closest<HTMLElement>("[data-plan-delete]")?.dataset.planDelete;
    if (deleteId) {
      const plan = plans.find((item) => item.id === deleteId);
      if (
        plan &&
        window.confirm(
          `Delete “${plan.name}”? This permanently removes the saved team plan and its draft specification.`,
        )
      ) {
        void deletePlan(plan);
      }
      return;
    }
    const exportId = target.closest<HTMLElement>("[data-plan-export]")?.dataset.planExport;
    if (exportId) {
      void downloadProtected(`/api/blueprints/${encodeURIComponent(exportId)}/markdown`, "llm-advisor-plan.md").catch(
        (error) => toast(error instanceof Error ? error.message : "The plan could not be exported"),
      );
      return;
    }
    const open = target.closest<HTMLElement>("[data-plan-open]")?.dataset.planOpen;
    if (open) void loadDetail(open);
  });

  byId("saved-plan-compare").addEventListener("click", (event) => {
    if (!(event.target as HTMLElement).closest("#clear-plan-comparison")) return;
    comparedIds.clear();
    renderList();
  });

  byId("saved-plan-detail").addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;
    const reopen = target.closest<HTMLElement>("[data-detail-reopen]")?.dataset.detailReopen;
    if (reopen) {
      const plan = plans.find((item) => item.id === reopen);
      if (plan) onReopen(plan);
      return;
    }
    const exportId = target.closest<HTMLElement>("[data-detail-export]")?.dataset.detailExport;
    if (exportId) {
      void downloadProtected(`/api/blueprints/${encodeURIComponent(exportId)}/markdown`, "llm-advisor-plan.md").catch(
        (error) => toast(error instanceof Error ? error.message : "The plan could not be exported"),
      );
      return;
    }
    const configure = target.closest<HTMLButtonElement>("#save-validation-protocol");
    if (configure?.dataset.planId) {
      const environment = byId<HTMLSelectElement>("validation-environment").value;
      if (!environment) {
        toast("Choose a compute environment first");
        return;
      }
      configure.disabled = true;
      try {
        const response = await authorizedFetch(
          `/api/blueprints/${encodeURIComponent(configure.dataset.planId)}/validation-protocol`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ environment }),
          },
        );
        const data = (await response.json()) as { blueprint?: SavedPlanDetail; error?: string };
        if (!response.ok || !data.blueprint) throw new Error(data.error ?? "The test protocol could not be saved");
        replacePlan(data.blueprint);
        toast("Test environment saved — protocol ready to download");
      } catch (error) {
        toast(error instanceof Error ? error.message : "The test protocol could not be saved");
      } finally {
        configure.disabled = false;
      }
      return;
    }
    const downloadValidation = target.closest<HTMLButtonElement>("#download-validation-protocol");
    if (downloadValidation?.dataset.planId) {
      downloadValidation.disabled = true;
      try {
        await downloadProtected(
          `/api/blueprints/${encodeURIComponent(downloadValidation.dataset.planId)}/validation.md`,
          "team-validation-protocol.md",
        );
      } catch (error) {
        toast(error instanceof Error ? error.message : "The test protocol could not be downloaded");
      } finally {
        downloadValidation.disabled = false;
      }
      return;
    }
    const uploadValidation = target.closest<HTMLButtonElement>("#upload-validation-results");
    if (uploadValidation?.dataset.planId) {
      const file = byId<HTMLInputElement>("validation-results-file").files?.[0];
      if (!file) {
        toast("Choose the completed validation-results .md file first");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".md")) {
        toast("Validation results must be a Markdown (.md) file");
        return;
      }
      uploadValidation.disabled = true;
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await authorizedFetch(
          `/api/blueprints/${encodeURIComponent(uploadValidation.dataset.planId)}/validation-results`,
          { method: "POST", body: form },
        );
        const data = (await response.json()) as { blueprint?: SavedPlanDetail; error?: string };
        if (!response.ok || !data.blueprint) throw new Error(data.error ?? "The results could not be evaluated");
        replacePlan(data.blueprint);
        toast("Results evaluated and saved with this plan");
      } catch (error) {
        toast(error instanceof Error ? error.message : "The results could not be evaluated");
      } finally {
        uploadValidation.disabled = false;
      }
      return;
    }
    const save = target.closest<HTMLButtonElement>("#update-saved-plan");
    if (!save?.dataset.planId) return;
    save.disabled = true;
    try {
      const response = await authorizedFetch(`/api/blueprints/${encodeURIComponent(save.dataset.planId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: byId<HTMLInputElement>("saved-plan-name").value,
          specificationMarkdown: byId<HTMLTextAreaElement>("saved-plan-markdown").value,
        }),
      });
      const data = (await response.json()) as { blueprint?: SavedPlanDetail; error?: string };
      if (!response.ok || !data.blueprint) throw new Error(data.error ?? "The edits could not be saved");
      replacePlan(data.blueprint);
      toast("Saved plan and draft updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "The edits could not be saved");
    } finally {
      save.disabled = false;
    }
  });
}
