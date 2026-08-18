import type { PlanEntry, ScoreTerm } from "../shared/types.js";
import { STRATEGIES } from "../data/strategies.js";

/**
 * Turn a score breakdown into the sentence a person actually wants.
 *
 * The prototype concatenated every factor with middots regardless of whether it
 * mattered, which read as noise. Here the terms are sorted by absolute
 * contribution and only the ones that actually moved the result are narrated —
 * the same information, ordered by how much it explains.
 */
export function explainEntry(entry: PlanEntry, limit = 4): string {
  const strategy = STRATEGIES[entry.styleId] ?? STRATEGIES.balanced;
  const ordered = [...entry.terms].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const leading = ordered.slice(0, limit);

  const clauses = leading.map((term) => {
    const direction = term.value > 0 ? "helped" : "counted against it";
    return `${term.detail} (${direction}, ${term.value > 0 ? "+" : ""}${term.value})`;
  });

  const opening = `Ranked #${entry.rank} among the current catalogue variants for this job under ${strategy.name.toLowerCase()}.`;
  const policy = entry.policyReason ? ` This choice was ${entry.policyReason}.` : "";
  const decision =
    entry.decision.state === "user-choice"
      ? ` It was explicitly selected by the user from the models inside the 3-point choice band; the raw rank remains #${entry.rank}.`
      : entry.decision.state === "tie-break-choice"
        ? ` Its raw score is inside the close-call band; ${entry.decision.tieBreakBasis?.replaceAll("-", " ")} selected it without changing the raw ranking.`
        : entry.decision.state === "too-close"
          ? ` Its ${entry.decision.scoreGap?.toFixed(2)}-point lead is inside the close-call band and is not treated as a meaningful win.`
          : entry.decision.state === "policy-choice"
            ? " It was selected by a team policy rather than as the raw score leader."
            : "";
  return `${opening} ${clauses.join("; ")}.${decision}${policy}`;
}

/** The strongest reasons for a pick, for compact display. */
export function topReasons(entry: PlanEntry, limit = 3): readonly ScoreTerm[] {
  return [...entry.terms]
    .filter((term) => term.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Anything working against a pick, so trade-offs stay visible. */
export function tradeOffs(entry: PlanEntry): readonly ScoreTerm[] {
  return [...entry.terms].filter((term) => term.value < 0).sort((a, b) => a.value - b.value);
}

/**
 * One paragraph summarising a whole plan, including what it does not prove.
 *
 * The closing caveat is not boilerplate. Everything upstream of it is a
 * rule-based shortlist built from provider documentation, and a reader who takes
 * it for a benchmark result has been misled by the tool.
 */
export function explainPlan(
  entries: readonly PlanEntry[],
  styleId: string,
  multiVendor: boolean,
  dataControl: boolean,
): string {
  const strategy = STRATEGIES[styleId] ?? STRATEGIES.balanced;
  if (entries.length === 0) {
    return "No model team could be built from the current requirements. Try relaxing the deployment or data-control limits.";
  }
  const supporting = entries.length - 1;
  const providers = new Set(entries.map((entry) => entry.model.provider)).size;
  const priced = entries.filter((entry) => entry.model.pricing.input !== null).length;
  const primary = entries[0];
  const primarySentence =
    primary.decision.state === "user-choice"
      ? `${primary.model.name} is the user's primary choice from the candidates inside the 3-point band; ${primary.advisorChoice.model.name} remains the advisor's automatic choice.`
      : primary.decision.state === "tie-break-choice"
        ? `${primary.model.name} is the primary selected by the visible ${primary.decision.tieBreakBasis?.replaceAll("-", " ")} close-call tie-breaker; it is still a candidate to test.`
        : primary.decision.state === "too-close"
          ? `${primary.model.name} is the provisional primary, but ${primary.decision.closeCandidates.map((candidate) => candidate.model.name).join(", ")} are inside the close-call band and must be compared on the same real tasks.`
          : `${primary.model.name} is the leading primary candidate.`;

  return [
    `This ${strategy.name.toLowerCase()} plan has ${supporting} supporting job${supporting === 1 ? "" : "s"} across ${providers} provider${providers === 1 ? "" : "s"}. ${primarySentence}`,
    multiVendor
      ? "It prefers a different provider for each job when another provider remains within the provisional 82% near-match range."
      : "It does not force provider diversity.",
    dataControl
      ? "Private or local options receive a strong preference; hosted-only models remain visible with a clear penalty."
      : "Provider-hosted models were included.",
    `${priced} of ${entries.length} choices are scored against published per-token pricing; the rest use an estimated cost class.`,
    "Industry and knowledge area set the testing context — they do not support a claim that a model is best for that field.",
    "A missing stated capability lowers fit but does not hide the model. Specialists are judged on the job assigned to them.",
    "Test the complete team on real examples from your own work before launch, including the coordination cost of specialist teams.",
  ].join(" ");
}
