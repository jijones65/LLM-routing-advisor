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

function trialStatus(plan: SavedPlan): string {
  const trials = records(record(plan.payload.teamEvaluation).trials);
  const outcomes = trials.map((trial) => trial.outcome);
  if (outcomes.includes("fail")) return "A recorded trial failed";
  if (outcomes.length > 0 && outcomes.every((outcome) => outcome === "pass")) return "All recorded trials passed";
  const recorded = outcomes.filter((outcome) => outcome && outcome !== "not-tested").length;
  return recorded ? `${recorded}/${outcomes.length} trials recorded` : "Not yet trial-tested";
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
      `<div class="saved-compare-empty"><strong>Compare saved plans</strong><span>Select two or three plans to compare their application, plan style, team, trials and version stamps.</span></div>`,
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
        ${row("Trial state", (plan) => esc(trialStatus(plan)))}
        ${row("Catalogue", (plan) => esc(plan.payload.catalogVersion))}
        ${row("Scoring", (plan) => esc(plan.payload.scoringVersion))}
        ${row("Categories", (plan) => esc(plan.payload.taxonomyVersion))}
      </tbody>
    </table></div>`,
  );
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
    <label class="saved-edit-field"><span>Plan name</span><input id="saved-plan-name" maxlength="160" value="${esc(plan.name)}"></label>
    <label class="saved-edit-field"><span>Draft application specification</span><small>Known application and team facts are filled in. Complete every [Fill in: …] field. Plans created from an upload finish with a complete extracted-source appendix; keep the original file as the authority for visual material.</small><textarea id="saved-plan-markdown" rows="28" spellcheck="true">${esc(plan.specificationMarkdown)}</textarea></label>
    <div class="saved-detail-actions">
      <button class="save" type="button" id="update-saved-plan" data-plan-id="${esc(plan.id)}">Save edits</button>
      <button type="button" data-detail-export="${esc(plan.id)}">Export complete plan (.md)</button>
    </div>`,
  );
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
      const index = plans.findIndex((plan) => plan.id === data.blueprint?.id);
      if (index >= 0) plans[index] = data.blueprint;
      renderList();
      renderDetail(data.blueprint);
      toast("Saved plan and draft updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "The edits could not be saved");
    } finally {
      save.disabled = false;
    }
  });
}
