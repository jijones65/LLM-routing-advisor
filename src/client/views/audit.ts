import { byId, esc, num, setHtml, setText, when } from "../dom.js";
import type { Bootstrap } from "../state.js";
import { friendlySourceType } from "./shared.js";

interface EvidenceView {
  id: string;
  provider: string;
  family: string;
  sourceUrl: string;
  cadenceHours: number;
  expectedIds: string[];
  reviewedAt: string;
  lastCheckedAt: string | null;
  driftStatus: string;
  errorMessage: string | null;
}

export interface AuditResponse {
  scope: { statement: string; freshnessSla: string; version: string; reviewedAt: string };
  watchlist: { provider: string; reason: string }[];
  exclusions: { name: string; reason: string }[];
  evidence: EvidenceView[];
  verification: { confirmed: number; unconfirmed: number; drifted: number; total: number };
  capabilityEvidence: {
    models: number;
    capabilities: number;
    protocols: number;
    reports: number;
    contestedCount: number;
    saturatedOnly: number;
    catalogueSize: number;
    coveredShare: number;
    biasNote: string;
    protocolList: {
      id: string;
      benchmark: string;
      datasetVersion: string;
      capability: string;
      conditions: string;
      saturated: boolean;
      url: string;
      caveat: string;
    }[];
    contested: {
      modelId: string;
      modelName: string;
      capability: string;
      benchmark: string;
      spread: number;
      tolerance: number;
      reports: { rawScore: number; sourceName: string; sourceUrl: string; sourceTier: string }[];
    }[];
  };
  checkResult: { sourceId: string; status: string } | null;
  registry: {
    sources: { id: string; name: string; endpointCount: number; evidenceClass: string; status: string }[];
    summary: Record<string, unknown> | null;
    status: string;
  };
}

/**
 * Age a source's status against its own cadence.
 *
 * A source last checked six weeks ago is "stale" regardless of what it said then,
 * and saying so is the whole value of the freshness promise. Without this, an
 * unreachable-but-once-current source would keep reading as "Current" forever.
 */
export function effectiveStatus(source: {
  driftStatus: string;
  lastCheckedAt: string | null;
  reviewedAt: string;
  cadenceHours: number;
}): string {
  if (source.driftStatus === "changed" || source.driftStatus === "error") return source.driftStatus;
  const basis = source.lastCheckedAt ?? source.reviewedAt;
  if (!basis || Date.now() - Date.parse(basis) > source.cadenceHours * 3_600_000) return "stale";
  return source.driftStatus === "current" ? "current" : "reviewed";
}

const STATUS_LABELS: Record<string, string> = {
  current: "Current",
  reviewed: "Reviewed",
  changed: "Changed",
  stale: "Stale",
  error: "Unreachable",
};

/** Render the coverage-check view. */
export function renderAudit(boot: Bootstrap, data: AuditResponse, catalogSize: number): void {
  setText("scope-statement", data.scope.statement);
  setText("scope-sla", data.scope.freshnessSla);
  setText("scope-version", `Scope ${data.scope.version} · reviewed ${data.scope.reviewedAt}`);

  setHtml(
    "scope-list",
    data.exclusions
      .map((item) => `<div><strong>${esc(item.name)}</strong><small>${esc(item.reason)}</small></div>`)
      .join(""),
  );

  // Sourcing confidence, stated as counts rather than a single percentage —
  // "83% verified" invites the reader to round it up to "verified".
  const verification = data.verification;
  setHtml(
    "verification-summary",
    (
      [
        ["Confirmed against a provider page", verification.confirmed],
        ["Unconfirmed since the last sweep", verification.unconfirmed],
        ["Provider page has drifted", verification.drifted],
        ["Model variants in total", verification.total],
      ] as [string, number][]
    )
      .map(
        ([label, value]) => `<div class="coverage-stat"><strong>${num(value)}</strong><span>${esc(label)}</span></div>`,
      )
      .join(""),
  );

  renderCapabilityEvidence(data);

  const statuses = data.evidence.map((source) => effectiveStatus(source));
  const checkedCount = data.evidence.filter((source) => source.lastCheckedAt).length;
  setText(
    "coverage-percent",
    data.evidence.length ? `${Math.round((checkedCount / data.evidence.length) * 100)}%` : "—",
  );

  setHtml(
    "coverage-summary",
    (
      [
        ["Official provider sources", data.evidence.length],
        ["Checked at least once", checkedCount],
        ["Current", statuses.filter((status) => status === "current").length],
        ["Changed or stale", statuses.filter((status) => status === "changed" || status === "stale").length],
        ["Unreachable", statuses.filter((status) => status === "error").length],
      ] as [string, number][]
    )
      .map(
        ([label, value]) => `<div class="coverage-stat"><strong>${num(value)}</strong><span>${esc(label)}</span></div>`,
      )
      .join(""),
  );

  setHtml(
    "coverage-matrix",
    data.evidence
      .map((source) => {
        const status = effectiveStatus(source);
        return `<article class="coverage-row">
      <div>
        <strong>${esc(source.provider)}</strong>
        <small>${esc(source.family)} · ${source.expectedIds.length} variant${source.expectedIds.length === 1 ? "" : "s"}</small>
      </div>
      <div>
        <span class="status ${esc(status)}">${esc(STATUS_LABELS[status] ?? "Review")}</span>
        <small>Checked ${esc(when(source.lastCheckedAt))} · every ${Math.round(source.cadenceHours / 24)} day${source.cadenceHours === 24 ? "" : "s"}</small>
        ${source.errorMessage ? `<small class="rank-reason">${esc(source.errorMessage)}</small>` : ""}
      </div>
      <a href="${esc(source.sourceUrl)}" target="_blank" rel="noreferrer">Open source ↗</a>
    </article>`;
      })
      .join(""),
  );

  const evidenceState = statuses.includes("error")
    ? "One official source could not be reached"
    : statuses.includes("changed")
      ? "An official source changed — review item raised"
      : statuses.includes("stale")
        ? "An official source is overdue for a check"
        : "Official sources are current";
  setText("evidence-state", evidenceState);

  setHtml(
    "watchlist-grid",
    data.watchlist
      .map((item) => `<div><strong>${esc(item.provider)}</strong><small>${esc(item.reason)}</small></div>`)
      .join(""),
  );

  renderRegistryPanel(data, catalogSize);
  void boot;
}

/** The registry rollup shown inside the audit view. */
function renderRegistryPanel(data: AuditResponse, catalogSize: number): void {
  const summary = data.registry.summary;
  const box = byId("registry-summary");
  const queue = byId("registry-queue");
  const status = byId("registry-status");

  if (!summary) {
    box.innerHTML = [
      "Sources",
      "Source listings",
      "Language-model listings",
      "Names grouped together",
      "Found in 2+ sources",
      "Possible catalogue match",
      "Needs review",
    ]
      .map((label) => `<div class="coverage-stat"><strong>—</strong><span>${esc(label)}</span></div>`)
      .join("");
    queue.innerHTML = "";
    status.textContent = "No saved source listings are available yet. Refresh the sources to build the comparison.";
    return;
  }

  box.innerHTML = (
    [
      ["Sources", summary.sourceCount],
      ["Source listings", summary.endpointCount],
      ["Language-model listings", summary.candidateEndpointCount],
      ["Names grouped together", summary.uniqueCandidateCount],
      ["Found in 2+ sources", summary.crossReferencedIdentityCount],
      ["Possible catalogue match", summary.possibleCatalogMatches],
      ["Needs review", summary.unresolvedCandidateCount],
    ] as [string, unknown][]
  )
    .map(
      ([label, value]) => `<div class="coverage-stat"><strong>${num(value)}</strong><span>${esc(label)}</span></div>`,
    )
    .join("");

  const sourceTags = data.registry.sources.map(
    (source) =>
      `<span>${esc(source.name)} · ${num(source.endpointCount)} · ${esc(friendlySourceType(source.evidenceClass))}</span>`,
  );
  const reviewQueue = (summary.reviewQueue ?? []) as { key: string; example: string; sourceCount: number }[];
  const reviewTags = reviewQueue
    .slice(0, 12)
    .map(
      (item) =>
        `<span title="${esc(item.example)}">${esc(item.key)} · ${item.sourceCount} source${item.sourceCount === 1 ? "" : "s"}</span>`,
    );
  queue.innerHTML =
    [...sourceTags, ...reviewTags].join("") || "<span>No grouped model names are waiting for review.</span>";

  const sourceStates = data.registry.sources.map((source) => source.status);
  const state = sourceStates.includes("error")
    ? "one source could not update; the last saved information is still shown"
    : sourceStates.includes("changed")
      ? "a source changed; the items for review were updated"
      : "source information is current";
  status.textContent =
    `${state} · last checked ${when(summary.lastCheckedAt as string | null)} · ` +
    `${num(summary.crossReferencedIdentityCount)} model names (${Number(summary.overlapRate ?? 0)}%) appear in at least two sources. ` +
    `Agreement between lists is not the same as confirmation on an official provider page — ` +
    `${num(summary.possibleCatalogMatches)} of them line up with the ${num(catalogSize)} catalogue variants.`;
}

/**
 * Render the measured-performance coverage block.
 *
 * Leads with how little of the catalogue is covered, because the natural reading
 * of "measured performance" is that the tool has tested these models, and it has
 * not — it has collected what other people published about a fraction of them.
 */
function renderCapabilityEvidence(data: AuditResponse): void {
  const evidence = data.capabilityEvidence;
  if (!evidence) return;

  setHtml(
    "evidence-summary",
    (
      [
        ["Models with any published result", `${evidence.models} of ${evidence.catalogueSize}`],
        ["Share of the catalogue", `${evidence.coveredShare}%`],
        ["Capability results in use", evidence.capabilities],
        ["Published figures collected", evidence.reports],
        ["Benchmarks accepted", evidence.protocols],
        ["Excluded as contested", evidence.contested.length],
        ["Confirming but not ranking", evidence.saturatedOnly],
      ] as [string, string | number][]
    )
      .map(
        ([label, value]) => `<div class="coverage-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`,
      )
      .join(""),
  );

  setHtml(
    "evidence-bias-note",
    `<div class="unfilled"><strong>What this coverage does and does not mean</strong><small>${esc(evidence.biasNote)}</small></div>`,
  );

  setHtml(
    "protocol-list",
    evidence.protocolList
      .map(
        (protocol) => `<article class="team-check">
      <span>${esc(protocol.capability)}${protocol.saturated ? " · saturated" : ""}</span>
      <strong>${esc(protocol.benchmark)}</strong>
      <p><b>Version:</b> ${esc(protocol.datasetVersion)}<br><b>Conditions:</b> ${esc(protocol.conditions)}</p>
      <p>${esc(protocol.caveat)}</p>
      <a href="${esc(protocol.url)}" target="_blank" rel="noreferrer">Open benchmark ↗</a>
    </article>`,
      )
      .join(""),
  );

  setHtml(
    "contested-list",
    evidence.contested.length === 0
      ? '<div class="empty">No published figures currently disagree beyond their benchmark\'s tolerance.</div>'
      : evidence.contested
          .map(
            (entry) => `<div class="retired-item">
        <div><strong>${esc(entry.modelName)}</strong><small>${esc(entry.benchmark)} · ${esc(entry.capability)}</small></div>
        <small>Reported figures differ by ${entry.spread} points, beyond the ${entry.tolerance}-point tolerance for this benchmark, so no measured result is recorded. ${entry.reports
          .map((report) => `${report.rawScore} (${esc(report.sourceName)}, ${esc(report.sourceTier)})`)
          .join(" versus ")}.</small>
      </div>`,
          )
          .join(""),
  );
}
