import type { Capability, Model } from "../../shared/types.js";
import { byId, esc, setHtml, setText } from "../dom.js";
import type { Bootstrap } from "../state.js";
import { dots, modelLinks, priceTag, signalBadges, statusLabel, verificationBadge } from "./shared.js";

/** Populate the explorer's filter dropdowns from the catalogue itself. */
export function initExploreFilters(boot: Bootstrap, catalog: readonly Model[]): void {
  const providers = [...new Set(catalog.map((model) => model.provider))].sort();
  setHtml(
    "provider-filter",
    `<option value="all">All providers</option>${providers.map((name) => `<option>${esc(name)}</option>`).join("")}`,
  );
  setHtml(
    "case-filter",
    `<option value="all">All capabilities</option>${Object.entries(boot.capabilityLabels)
      .map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`)
      .join("")}`,
  );
}

/** Render the catalogue explorer, applying the current filters. */
export function renderModels(boot: Bootstrap, catalog: readonly Model[]): void {
  const query = byId<HTMLInputElement>("model-search").value.trim().toLowerCase();
  const provider = byId<HTMLSelectElement>("provider-filter").value;
  const capability = byId<HTMLSelectElement>("case-filter").value;
  const deployment = byId<HTMLSelectElement>("deployment-filter").value;

  const matches = catalog.filter((model) => {
    if (provider !== "all" && model.provider !== provider) return false;
    if (capability !== "all" && !model.cases.includes(capability as Capability)) return false;
    if (deployment !== "all" && !model.deployments.includes(deployment as Model["deployments"][number])) return false;
    if (!query) return true;
    const haystack = [
      model.name,
      model.provider,
      model.family,
      model.tier,
      model.summary,
      ...model.cases.map((entry) => boot.capabilityLabels[entry]),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  setText("match-count", String(matches.length));
  setText("match-label", `${matches.length} of ${catalog.length} distinct model variants`);

  setHtml(
    "model-list",
    matches.length === 0
      ? '<div class="empty">No model variants match these filters.</div>'
      : matches
          .map(
            (model) => `<article class="model-row">
        <div class="model-id">
          <strong>${esc(model.name)}</strong>
          <small>${esc(model.provider)} · ${esc(model.tier)}</small>
          <span class="status ${esc(model.status)}">${esc(statusLabel(model.status))}</span>
          ${verificationBadge(model)}
        </div>
        <div class="model-copy">
          <p>${esc(model.summary)}</p>
          <div class="tags">${model.cases
            .map((entry) => `<span>${esc(boot.capabilityLabels[entry])}</span>`)
            .join("")}</div>
          <div class="tags">${model.deployments.map((entry) => `<span>${esc(entry)}</span>`).join("")}</div>
          ${signalBadges(model)}
          ${modelLinks(model)}
          ${model.driftNote ? `<small class="rank-reason">Source drift: ${esc(model.driftNote)}</small>` : ""}
        </div>
        <div class="facts">
          <div><span>Quality est.</span>${dots(model.quality)}</div>
          <div><span>Speed est.</span>${dots(model.speed)}</div>
          <div><span>Cost</span>${dots(model.costClass, true)}</div>
          <div><span>Context</span><strong>${esc(model.contextLabel)}</strong></div>
          <div class="price-cell">${priceTag(model)}</div>
        </div>
      </article>`,
          )
          .join(""),
  );
}
