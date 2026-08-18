import type { Model, PlanEntry, ScoreTerm } from "../../shared/types.js";
import { capabilityRange, signalsOf } from "../../engine/signals.js";
import { esc } from "../dom.js";

/** The sourcing-confidence badge shown next to a model wherever it appears. */
export function verificationBadge(model: Model): string {
  const label =
    model.verification === "confirmed"
      ? "Confirmed"
      : model.verification === "drifted"
        ? "Source drift"
        : "Unconfirmed";
  const title =
    model.verification === "confirmed"
      ? `Provider page read on ${model.verifiedAt}; name, status and capabilities matched.`
      : model.verification === "drifted"
        ? (model.driftNote ?? "The provider page no longer matches this entry.")
        : "Carried over from an earlier review. Not re-confirmed against the provider page in the latest sweep.";
  return `<span class="verify ${esc(model.verification)}" title="${esc(title)}">${label}</span>`;
}

/** Published pricing, or an honest statement that there is none. */
export function priceTag(model: Model): string {
  const { input, output, note } = model.pricing;
  if (input === null || output === null) {
    return `<span class="price estimated" title="${esc(note ?? "No published price")}"><strong>Cost class ${model.costClass}/5</strong><small>estimated</small></span>`;
  }
  return `<span class="price" title="Published provider pricing, per million tokens"><strong>$${input} / $${output}</strong><small>per M tokens in / out</small></span>`;
}

/** The three public visibility and range signals, as compact badges. */
export function signalBadges(model: Model): string {
  const signals = signalsOf(model);
  const exposure = signals.realWorldExposure
    ? `Observed platform activity ${signals.realWorldExposure}/100`
    : "Comparable platform activity not observed";
  return `<span class="signal-row"><i>Public-source reach ${signals.ecosystemMaturity}/100</i><i>${esc(exposure)}</i><i>Capability range ${capabilityRange(model)}/24</i></span>`;
}

/** Four non-equivalent readings shown together without blending their claims. */
export function resultReadings(entry: PlanEntry): string {
  const readings = entry.readings;
  const source =
    readings.sourceConfidence === "confirmed"
      ? "Official provider page confirmed"
      : readings.sourceConfidence === "drifted"
        ? "Provider source changed · review needed"
        : "Official source carried over · recheck pending";
  const performance =
    readings.measuredPerformance.evidenceLevel === "tested"
      ? `Tested for all ${readings.measuredPerformance.relevantCapabilities} relevant capabilities · ${readings.measuredPerformance.score.toFixed(1)}/5`
      : readings.measuredPerformance.evidenceLevel === "partly-tested"
        ? `${readings.measuredPerformance.testedCapabilities}/${readings.measuredPerformance.relevantCapabilities} capabilities tested · remaining result estimated`
        : `Estimated only · no relevant application test yet`;
  return `<div class="result-readings">
    <div class="result-reading"><b>Model fit</b><span>${readings.modelFit.matched}/${readings.modelFit.total} stated job capabilities</span></div>
    <div class="result-reading"><b>Source confidence</b><span>${esc(source)}</span></div>
    <div class="result-reading"><b>Ecosystem visibility</b><span>${readings.ecosystemVisibility}/100 public proxy</span></div>
    <div class="result-reading"><b>Performance evidence</b><span>${esc(performance)}</span></div>
  </div>`;
}

/** The minimum a thing needs for its links to be rendered. */
export interface Linkable {
  readonly name: string;
  readonly sourceUrl: string;
  readonly ollamaUrl: string | null;
}

/** Provider and Ollama links. Takes the narrow shape so registry match rows,
 *  which carry only these three fields, can use it without a cast. */
export function modelLinks(model: Linkable, compact = false): string {
  const links = [
    `<a href="${esc(model.sourceUrl)}" target="_blank" rel="noreferrer" aria-label="${esc(model.name)} provider page">Provider site ↗</a>`,
  ];
  if (model.ollamaUrl) {
    links.push(
      `<a class="ollama" href="${esc(model.ollamaUrl)}" target="_blank" rel="noreferrer" aria-label="${esc(model.name)} on Ollama">Ollama ↗</a>`,
    );
  }
  return `<span class="model-links${compact ? " compact" : ""}">${links.join("")}</span>`;
}

/** A 1-5 dot meter. */
export function dots(value: number, invert = false): string {
  const filled = invert ? 6 - value : value;
  return `<span class="dots">${[1, 2, 3, 4, 5]
    .map((step) => `<i class="dot ${step <= filled ? "on" : ""}"></i>`)
    .join("")}</span>`;
}

export function statusLabel(status: string): string {
  return { active: "Current", preview: "Preview", mature: "Older model", retired: "Withdrawn" }[status] ?? status;
}

export function friendlySourceType(value: string): string {
  return (
    {
      "Gateway availability": "Model marketplace list",
      "Inference availability": "Hosted model list",
      "Community metadata": "Technical information list",
    }[value] ?? "Model source"
  );
}

/**
 * The full score breakdown for one pick.
 *
 * Every term that contributed, with its detail and its signed value, summing to
 * the total. This is the difference between a tool that ranks and a tool that
 * explains: a reader who disagrees with a recommendation can see precisely which
 * assumption to argue with.
 */
export function breakdownTable(entry: PlanEntry): string {
  const rows = [...entry.terms]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .map(
      (term: ScoreTerm) => `<div class="term ${term.value >= 0 ? "positive" : "negative"}">
        <span>${esc(term.label)}</span>
        <small>${esc(term.detail)}</small>
        <strong>${term.value > 0 ? "+" : ""}${term.value}</strong>
      </div>`,
    )
    .join("");
  const total = entry.terms.reduce((sum, term) => sum + term.value, 0);
  return `<div class="breakdown">
    <div class="breakdown-head"><span>Why this model scored where it did</span><span>contribution</span></div>
    ${rows}
    <div class="breakdown-total"><span>Total score</span><span>${Math.round(total * 100) / 100}</span></div>
  </div>`;
}

/** Negative terms as compact chips, so trade-offs are visible without expanding. */
export function tradeOffChips(entry: PlanEntry): string {
  const negatives = entry.terms.filter((term) => term.value < 0);
  if (negatives.length === 0) return "";
  return `<div class="tradeoffs">${negatives
    .map((term) => `<span title="${esc(term.detail)}">${esc(term.label)} ${term.value}</span>`)
    .join("")}</div>`;
}
