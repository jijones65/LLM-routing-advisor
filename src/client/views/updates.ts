import { esc, num, setHtml, setText } from "../dom.js";
import type { Bootstrap } from "../state.js";
import type { Model } from "../../shared/types.js";

/**
 * The change log.
 *
 * Written as data rather than markup so an entry is a one-line addition, and so
 * the dates stay next to the claims they date.
 */
const CHANGES: readonly { state: string; title: string; scope: string; date: string; detail: string }[] = [
  {
    state: "Corrected",
    title: "D1 catalogue and evidence rows aligned with this release",
    scope: "Data · migrations",
    date: "18 Aug 2026",
    detail:
      "The database projection now contains the same 109 model variants as the published catalogue, and superseded official-source rows are removed. Saved application plans and all six registry snapshots are preserved.",
  },
  {
    state: "Added",
    title: "More starting application types and a custom type field",
    scope: "Application design · taxonomy",
    date: "18 Aug 2026",
    detail:
      "The application list now includes product comparison, procurement, meetings, learning, sales, compliance, data insight, localisation and cybersecurity examples. A user can name another type, keep a suggested type as the starter, and adjust What it must do to build the team without pretending that the name alone determines requirements.",
  },
  {
    state: "Rebuilt",
    title: "Single-file prototype split into a typed source tree",
    scope: "Architecture",
    date: "18 Aug 2026",
    detail:
      "The catalogue, scoring engine, evidence layer, registry reconciliation, API routes and interface were one 213KB file. They are now separate typed modules with tests, bundled back to a single worker for deployment.",
  },
  {
    state: "Added",
    title: "Published pricing drives the cost score",
    scope: "Data · cost",
    date: "18 Aug 2026",
    detail:
      "Where a provider publishes per-token pricing, the cost class is derived from it rather than estimated. This corrected Claude Opus 5, which the prototype scored as inexpensive while the provider lists it at $5/$25 per million tokens.",
  },
  {
    state: "Added",
    title: "Every recommendation shows its full scoring",
    scope: "Recommendations",
    date: "18 Aug 2026",
    detail:
      "Each choice can be expanded to show every term that contributed, with its value and reasoning. Trade-offs — anything counting against a pick — are shown without expanding.",
  },
  {
    state: "Fixed",
    title: "Match percentages no longer exceed 100%",
    scope: "Recommendations",
    date: "18 Aug 2026",
    detail:
      "Fit was calculated as a share of the top score, which produced impossible figures whenever scores went negative — routine under the cost-first weights. It is now normalised across the ranked set.",
  },
  {
    state: "Fixed",
    title: "Capability breadth and focus no longer overwhelm the score",
    scope: "Recommendations",
    date: "18 Aug 2026",
    detail:
      "Both are now normalised to the same scale as the quality estimate. Previously the focused plan style recommended a 28K-context role-play model as a general routine worker purely because it does few things.",
  },
  {
    state: "Refined",
    title: "Missing capabilities remain visible",
    scope: "Recommendations",
    date: "18 Aug 2026",
    detail:
      "A missing capability, hosted-only deployment or lack of downloadable weights lowers fit instead of hiding a current model. The score shows the conflict, so users can inspect alternatives and decide how firm a preference really is.",
  },
  {
    state: "Added",
    title: "Four different readings stay separate",
    scope: "Recommendations · evidence",
    date: "18 Aug 2026",
    detail:
      "Each team choice now shows model fit, source confidence, ecosystem visibility and measured performance separately. Source confidence describes the catalogue record; it is not treated as proof that the model performs better.",
  },
  {
    state: "Refined",
    title: "Specialists are judged on their assigned job",
    scope: "Recommendations · teams",
    date: "18 Aug 2026",
    detail:
      "A coding, research, vision, voice or private model is scored against the requirements relevant to that job rather than every ability required by the whole application. Full teams are shown on plan cards so broad and specialist approaches can be compared.",
  },
  {
    state: "Refined",
    title: "Ecosystem visibility replaces claims about users",
    scope: "Recommendations · visibility",
    date: "18 Aug 2026",
    detail:
      "Public source presence, deployment options and dated platform activity have a modest ranking weight in every plan style. The app does not call this market share, user count, reliability or measured quality.",
  },
  {
    state: "Added",
    title: "Capability tests can replace general quality estimates",
    scope: "Recommendations · measured performance",
    date: "18 Aug 2026",
    detail:
      "The scoring contract now accepts versioned, capability-specific test results. Until a relevant test exists, the interface clearly labels quality and speed as estimates; saved plans retain the catalogue and scoring versions used.",
  },
  {
    state: "Documented",
    title: "Future rebuild specification added",
    scope: "Architecture · governance",
    date: "18 Aug 2026",
    detail:
      "SPECIFICATION.md records the product language, evidence layers, ranking contract, team-planning rules, data model, acceptance tests, versioning and open refinements for later rebuilding and continued improvement.",
  },
  {
    state: "Corrected",
    title: "xAI, Alibaba, Cohere and Amazon entries reconciled",
    scope: "Data · providers",
    date: "18 Aug 2026",
    detail:
      "Grok 4.20, 4.5 and the multi-agent preview were replaced by Grok 4.6; Qwen 3.7 Max by Qwen3.8-Max; the Command models were corrected from downloadable to provider-hosted; and Nova 2 Pro Preview was withdrawn as it is no longer listed.",
  },
  {
    state: "Added",
    title: "Missing models and one missing provider",
    scope: "Data · coverage",
    date: "18 Aug 2026",
    detail:
      "GPT-5.6 Cyber, GPT-Realtime 2.1 Mini, Ministral 3 8B and Gemini 3.6 Flash were added, along with Xiaomi MiMo-V2.5 — which was absent entirely despite ranking fourth by routed tokens.",
  },
];

/** Render the update centre. */
export function renderUpdates(boot: Bootstrap, catalog: readonly Model[]): void {
  const byProvider = new Map<string, number>();
  for (const model of catalog) byProvider.set(model.provider, (byProvider.get(model.provider) ?? 0) + 1);

  setText("published-count", String(catalog.length));
  setText("provider-total", `${byProvider.size} providers in the catalogue`);
  setHtml(
    "provider-counts",
    [...byProvider.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([provider, count]) => `<div><span>${esc(provider)}</span><strong>${count}</strong></div>`)
      .join(""),
  );

  setHtml(
    "events",
    CHANGES.map(
      (change) => `<article class="event">
      <span class="event-state">${esc(change.state)}</span>
      <div>
        <strong>${esc(change.title)}</strong>
        <small>${esc(change.scope)} · ${esc(change.date)}</small>
        <p>${esc(change.detail)}</p>
      </div>
    </article>`,
    ).join(""),
  );

  setText("retired-count", `${num(boot.retired.length)} removed`);
  setHtml(
    "retired-list",
    boot.retired.length === 0
      ? '<div class="empty">No models have been withdrawn in this review.</div>'
      : boot.retired
          .map(
            (item) => `<div class="retired-item">
        <div><strong>${esc(item.name)}</strong><small>${esc(item.provider)} · removed ${esc(item.removedAt)}</small></div>
        <small>${esc(item.reason)}</small>
      </div>`,
          )
          .join(""),
  );
}
