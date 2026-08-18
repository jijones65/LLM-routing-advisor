import { byId, esc, num, setHtml, setText, toast, when } from "../dom.js";
import type { RegistryQuery } from "../state.js";
import { friendlySourceType, modelLinks } from "./shared.js";

interface CandidateRow {
  id: string;
  normalizedId: string;
  sourceName: string;
  sourceUrl: string;
  evidenceClass: string;
  classification: string;
  description: string;
  contextWindow: number | null;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsCaching: boolean;
  identitySourceCount?: number;
  identitySources?: string[];
  match: { id: string; name: string; provider: string; sourceUrl: string; ollamaUrl: string | null } | null;
}

interface CandidateResponse {
  rows?: CandidateRow[];
  providers?: string[];
  sources?: {
    id: string;
    name: string;
    endpointCount: number;
    evidenceClass: string;
    role: string;
    catalogUrl: string;
    status: string;
    lastCheckedAt: string | null;
  }[];
  summary?: Record<string, unknown>;
  total?: number;
  offset?: number;
  limit?: number;
  hasMore?: boolean;
}

let loading = false;

const statTiles = (stats: [string, unknown][]): string =>
  stats.map(([label, value]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("");

function renderSummary(summary: Record<string, unknown>): void {
  setText("live-endpoint-count", num(summary.endpointCount));
  setHtml(
    "live-registry-summary",
    statTiles([
      ["Sources", num(summary.sourceCount)],
      ["Source listings", num(summary.endpointCount)],
      ["Names grouped together", num(summary.uniqueCandidateCount)],
      ["Found in 2+ sources", num(summary.crossReferencedIdentityCount)],
      ["Share found in 2+ sources", `${Number(summary.overlapRate ?? 0)}%`],
      ["Most sources for one name", `${num(summary.maxSourceOverlap)} sources`],
    ]),
  );
  setText("overlap-rate", `${num(summary.crossReferencedIdentityCount)} · ${Number(summary.overlapRate ?? 0)}%`);

  const distribution = (summary.sourceCountDistribution ?? {}) as Record<string, number>;
  setHtml(
    "overlap-distribution",
    statTiles([
      ["1 source", num(distribution.one)],
      ["2 sources", num(distribution.two)],
      ["3 sources", num(distribution.three)],
      ["4+ sources", num(distribution.fourPlus)],
    ]),
  );

  const pairs = (summary.overlapPairs ?? []) as { sourceA: string; sourceB: string; count: number }[];
  setHtml(
    "overlap-pairs",
    pairs.length === 0
      ? '<div class="empty">Shared model names will appear after at least two sources update.</div>'
      : pairs
          .slice(0, 10)
          .map(
            (pair) =>
              `<div class="overlap-pair"><span title="${esc(`${pair.sourceA} × ${pair.sourceB}`)}">${esc(pair.sourceA)} × ${esc(pair.sourceB)}</span><strong>${num(pair.count)}</strong></div>`,
          )
          .join(""),
  );
}

function renderSourceLedger(sources: NonNullable<CandidateResponse["sources"]>): void {
  setHtml(
    "source-ledger",
    sources
      .map(
        (source) => `<article class="source-card">
      <span>${esc(friendlySourceType(source.evidenceClass))}</span>
      <strong>${esc(source.name)}</strong>
      <small>${num(source.endpointCount)} listings · ${esc(source.status)} · ${esc(when(source.lastCheckedAt, "awaiting refresh"))}</small>
      <small>${esc(source.role)}</small>
      <a href="${esc(source.catalogUrl)}" target="_blank" rel="noreferrer">Open source ↗</a>
    </article>`,
      )
      .join(""),
  );
}

/** Keep a select's options in sync, preserving the choice when it still exists. */
function syncSelect(
  id: string,
  allLabel: string,
  options: { value: string; label: string }[],
  current: string,
  query: RegistryQuery,
  key: "source" | "provider",
): void {
  const select = byId<HTMLSelectElement>(id);
  select.innerHTML = `<option value="all">${esc(allLabel)}</option>${options
    .map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`)
    .join("")}`;
  const stillPresent = options.some((option) => option.value === current);
  select.value = stillPresent ? current : "all";
  if (!stillPresent && current !== "all") {
    query[key] = "all";
    query.offset = 0;
  }
}

function renderRows(data: CandidateResponse): void {
  const rows = data.rows ?? [];
  setHtml(
    "endpoint-list",
    rows.length === 0
      ? '<div class="empty">No source listings match these filters.</div>'
      : rows
          .map((row) => {
            const flags: string[] = [];
            if ((row.identitySourceCount ?? 0) > 1) flags.push(`Found in ${row.identitySourceCount} sources`);
            if (row.contextWindow) flags.push(`${num(row.contextWindow)} context`);
            if (row.supportsVision) flags.push("Vision");
            if (row.supportsReasoning) flags.push("Reasoning");
            if (row.supportsCaching) flags.push("Caching");
            if (flags.length === 0) flags.push("Found in one source");

            const label =
              row.classification === "possible-match"
                ? "Possible catalogue match"
                : row.classification === "excluded"
                  ? "Not a language-model listing"
                  : "Needs review";
            const sourceLink = `<span class="model-links compact"><a href="${esc(row.sourceUrl)}" target="_blank" rel="noreferrer">${esc(row.sourceName)} ↗</a></span>`;
            const identityNote =
              (row.identitySourceCount ?? 0) > 1
                ? `Also found in: ${(row.identitySources ?? []).join(" · ")}`
                : "Found in only one current source";
            const match = row.match
              ? `<strong>${esc(row.match.name)}</strong><small>${esc(row.match.provider)} · likely name match</small>${modelLinks(row.match, true)}${sourceLink}`
              : `<strong>${esc(label)}</strong><small>${esc(
                  row.classification === "excluded"
                    ? "Kept so the source count stays complete"
                    : "Waiting for an official provider source",
                )}</small>${sourceLink}`;

            return `<article class="endpoint-row">
        <div class="endpoint-id">
          <span>${esc(friendlySourceType(row.evidenceClass))} · ${esc(row.sourceName)}</span>
          <strong title="${esc(row.id)}">${esc(row.id)}</strong>
          <small title="${esc(row.normalizedId)}">Grouped name: ${esc(row.normalizedId)}</small>
        </div>
        <div class="endpoint-copy">
          <p>${esc(row.description || "No source description supplied.")}</p>
          <small title="${esc((row.identitySources ?? []).join(" · "))}">${esc(identityNote)}</small>
          <div class="endpoint-flags">${flags.map((flag) => `<span>${esc(flag)}</span>`).join("")}</div>
        </div>
        <span class="registry-class ${esc(row.classification)}">${esc(label)}</span>
        <div class="endpoint-match">${match}</div>
      </article>`;
          })
          .join(""),
  );

  const limit = data.limit ?? 50;
  const total = data.total ?? 0;
  const offset = data.offset ?? 0;
  const page = total ? Math.floor(offset / limit) + 1 : 0;
  const pages = Math.ceil(total / limit);
  setText("registry-page-state", `Page ${page} of ${pages}`);
  byId<HTMLButtonElement>("registry-prev").disabled = offset === 0;
  byId<HTMLButtonElement>("registry-next").disabled = !data.hasMore;

  const first = total ? offset + 1 : 0;
  const last = Math.min(total, offset + (data.rows?.length ?? 0));
  const checked = when((data.summary?.lastCheckedAt as string | null) ?? null, "waiting for the first update");
  setText(
    "live-registry-result",
    `${num(total)} matching source listings · showing ${first}–${last} · latest saved update ${checked}`,
  );
}

/**
 * Fetch and render the registry comparison.
 *
 * A failure leaves the catalogue and every recommendation untouched and says so.
 * The registry is supporting evidence; if a third-party gateway is unreachable
 * the planning half of the app must keep working, and the message needs to make
 * clear that nothing about the advice has changed.
 */
export async function loadRegistry(
  query: RegistryQuery,
  options: { refresh?: boolean; force?: boolean } = {},
  onSummary?: (summary: Record<string, unknown>) => void,
): Promise<void> {
  if (loading) return;
  loading = true;
  const button = byId<HTMLButtonElement>("registry-refresh-now");
  button.disabled = true;
  if (options.force) button.textContent = "Refreshing…";

  try {
    const params = new URLSearchParams({
      q: query.q,
      source: query.source,
      provider: query.provider,
      classification: query.classification,
      offset: String(query.offset),
      limit: String(query.limit),
    });
    if (options.refresh) params.set("refresh", "1");
    if (options.force) params.set("force", "1");

    const response = await fetch(`/api/registry-candidates?${params}`, { cache: "no-store" });
    const data = (await response.json()) as CandidateResponse;
    if (!response.ok || !Array.isArray(data.rows)) throw new Error("Unexpected response");

    if (data.summary) {
      renderSummary(data.summary);
      onSummary?.(data.summary);
    }
    renderSourceLedger(data.sources ?? []);
    syncSelect(
      "registry-source",
      "All sources",
      (data.sources ?? []).map((source) => ({
        value: source.id,
        label: `${source.name} · ${num(source.endpointCount)}`,
      })),
      query.source,
      query,
      "source",
    );
    syncSelect(
      "registry-provider",
      "All provider names",
      (data.providers ?? []).map((provider) => ({ value: provider, label: provider })),
      query.provider,
      query,
      "provider",
    );
    renderRows(data);
    if (options.force) toast("Source listings updated");
  } catch {
    setHtml(
      "endpoint-list",
      '<div class="empty">The saved source listings could not be loaded. The catalogue and every recommendation are unchanged — this view is supporting evidence only.</div>',
    );
    toast("The source listings could not be loaded");
  } finally {
    loading = false;
    button.disabled = false;
    button.textContent = "Refresh sources";
  }
}
