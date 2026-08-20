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
    state: "Added",
    title: "Passwordless email accounts keep saved plans separate",
    scope: "Accounts · saved plans · privacy",
    date: "20 Aug 2026",
    detail:
      "Users can request a secure, one-time sign-in link by email without creating a password. Supabase validates the session; the Advisor stores only the local account record and plan ownership in D1. Every saved-plan read, edit, export and delete, plus project-document import, is checked on the server against the signed-in user. Google sign-in is deliberately deferred to a later release.",
  },
  {
    state: "Refined",
    title: "Project-document import is now generic and structure-first",
    scope: "Application design · plans · specifications",
    date: "19 Aug 2026",
    detail:
      "Upload any readable project document as PDF or DOCX. The importer indexes headings, selects a bounded evidence set, maps generic specification concepts and reports confidence and review items. Useful named sections that do not fit a standard field are retained under their original headings in the saved Markdown instead of being discarded or forced into the wrong field. It does not treat any example document's wording as special. Unsupported categories do not overwrite current choices, negated statements are not counted as positive evidence, and existing team or model architecture stays separate from advisor candidates. The file is read transiently and not retained.",
  },
  {
    state: "Added",
    title: "Compact, edge and IoT choices now have a clear place",
    scope: "Catalogue · applications · architecture",
    date: "19 Aug 2026",
    detail:
      "FunctionGemma 270M and the Qwen3-VL 2B and 4B variants bring the catalogue to 112 models. The explorer now distinguishes small language models, edge language models, edge vision-language models and on-device action specialists. Real-time asset tracking, predictive maintenance and edge vision safety are new starting application types. Device runtimes, perception models, trackers, positioning and IoT platforms are shown separately as required non-model components rather than being mislabelled as language models.",
  },
  {
    state: "Refined",
    title: "Skills now explain their meaning and each model's fit",
    scope: "Application design · recommendations · evidence",
    date: "19 Aug 2026",
    detail:
      "The Skills checklist now has 37 choices under eight simple questions. Each title opens a short explanation, examples and a boundary on hover, keyboard focus or tap. The supplied capability, business-process and SFIA examples were used to find gaps—not treated as a complete standard. Every proposed team member now traces its assigned Skills to the model's stated capabilities, recorded tests and any partial gaps without presenting a stated match as measured proof.",
  },
  {
    state: "Refined",
    title: "Every job now combines a quality target with cost-aware routing",
    scope: "Recommendations · quality · cost",
    date: "19 Aug 2026",
    detail:
      "Primary, planning, specialist and checking jobs now give more weight to task-specific quality, while the routine worker gives more weight to cost and volume. A soft quality target penalises material shortfalls without hiding a model. Every job shows its route, escalation rule and useful-work measure; saved specifications retain them.",
  },
  {
    state: "Fixed",
    title: "Close model choices are visible in the headline teams",
    scope: "Recommendations · user choice",
    date: "19 Aug 2026",
    detail:
      "Every job with two or more models less than three raw-score points from its leader now shows its dropdown directly in all six headline team cards as well as in the detailed job card. A headline choice opens that plan style, updates both views, preserves the advisor score and clears trials recorded against the previous roster.",
  },
  {
    state: "Added",
    title: "Measured performance now has data behind it",
    scope: "Data · measured performance",
    date: "19 Aug 2026",
    detail:
      "Published benchmark results were collected for 19 of the 109 catalogue models across seven benchmarks, so the measured-performance reading and the evidence tie-break are live rather than inert. Coverage, and the fact that it reflects which vendors publish evaluations rather than which models are better, is reported in the coverage check.",
  },
  {
    state: "Added",
    title: "Benchmarks are recorded as protocols, not just names",
    scope: "Data · methodology",
    date: "19 Aug 2026",
    detail:
      "Each accepted benchmark pins its version and run conditions. Humanity's Last Exam with tools enabled and without are separate protocols because the same models score 10 to 14 points apart, and Terminal-Bench was excluded entirely because its results move 15 to 20 points with the agent scaffold rather than the model.",
  },
  {
    state: "Added",
    title: "Disagreeing sources produce no result rather than an average",
    scope: "Data · measured performance",
    date: "19 Aug 2026",
    detail:
      "Vals AI and BenchLM report DeepSeek V4 Pro at 96.4% and 80.6% on the same SWE-bench snapshot. Rather than splitting the difference, no coding result is recorded and the disagreement is shown. Where several sources agree and one is far out, the majority is used and the outlier stays on the record.",
  },
  {
    state: "Added",
    title: "Saturated benchmarks confirm a capability without ranking it",
    scope: "Recommendations",
    date: "19 Aug 2026",
    detail:
      "Frontier models sit between 88% and 95% on GPQA Diamond, a spread narrower than the benchmark's own variance. Results are mapped through coarse bands so every saturated model lands level and the tie-break sequence moves on, instead of an order being invented from the last decimal place.",
  },
  {
    state: "Fixed",
    title: "Summary tiles lost their layout",
    scope: "Interface",
    date: "19 Aug 2026",
    detail:
      "The coverage, sourcing and registry summary rows render tiles through a class the stylesheet expected but the views were not applying, so values and labels ran together. The grid also now fits whatever number of tiles a row carries.",
  },
  {
    state: "Added",
    title: "Users can choose another model inside a three-point band",
    scope: "Recommendations · user choice",
    date: "18 Aug 2026",
    detail:
      "Each team job now shows a dropdown when two or more models are less than three raw-score points from the leader. A user choice is labelled and saved without changing the advisor's scores or automatic choice. Changing the roster clears prior trial outcomes for that plan style so old results are not attached to a new team.",
  },
  {
    state: "Refined",
    title: "Close calls now use visible application and ecosystem tie-breakers",
    scope: "Recommendations · decisions",
    date: "18 Aug 2026",
    detail:
      "When raw scores are less than one point apart, the advisor keeps the raw order visible and checks measured performance evidence, application specialisation and then ecosystem reach. Every reading and the deciding reason are shown. A provider-concentration note also warns when one provider leads most headline plans; concentration is not treated as measured proof.",
  },
  {
    state: "Added",
    title: "Saved plans can be deleted",
    scope: "Plans · control",
    date: "18 Aug 2026",
    detail:
      "Each saved-plan card now has a Delete action. The advisor names the plan and warns that deletion is permanent before removing the saved team, its draft specification and its place in any comparison.",
  },
  {
    state: "Added",
    title: "Saved plans can be reopened, compared, edited and exported",
    scope: "Plans · specifications",
    date: "18 Aug 2026",
    detail:
      "Save this team plan now creates an editable Markdown application specification. The Saved plans tab can restore a brief and its recorded trials, compare up to three teams, edit the plan name or draft, and export the current specification as a Markdown file.",
  },
  {
    state: "Added",
    title: "A plain-language About tab",
    scope: "Guidance · interface",
    date: "18 Aug 2026",
    detail:
      "The new guide explains what every working tab does, what its evidence cannot prove and a five-step path from an application idea to a tested model team. It also distinguishes a candidate from a proven winner and source confirmation from performance testing.",
  },
  {
    state: "Added",
    title: "Close calls replace false numerical certainty",
    scope: "Recommendations · decisions",
    date: "18 Aug 2026",
    detail:
      "A raw difference below one score point is treated as a close call rather than proof of a better model. The later tie-break refinement shown above makes the catalogue's provisional choice explicit while the same real-task trial remains the deciding evidence.",
  },
  {
    state: "Added",
    title: "Complete-team checks and a five-part trial worksheet",
    scope: "Teams · evaluation",
    date: "18 Aug 2026",
    detail:
      "Every proposed team now receives structural checks for coverage, assigned-job fit, complementarity, role duplication, independent checking, routing complexity and fallback independence. Users can record the same representative, hand-off, conflict, failure-recovery and load trials for every plan style; saved plans retain the results.",
  },
  {
    state: "Refined",
    title: "Untested quality and provider role labels carry less weight",
    scope: "Recommendations · evidence",
    date: "18 Aug 2026",
    detail:
      "A general quality estimate now receives a 0.6 evidence factor, partial capability tests receive 0.8 and complete relevant tests receive full weight. A provider's usual-job label contributes two points rather than eight and is described as context, not performance evidence.",
  },
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
      "The application list now includes product comparison, procurement, meetings, learning, sales, compliance, data insight, localisation and cybersecurity examples. A user can name another type, keep a suggested type as the starter, and adjust its Skills to build the team without pretending that the name alone determines requirements.",
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
