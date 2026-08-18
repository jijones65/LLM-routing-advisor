import type { Model, ModelSignals } from "../shared/types.js";
import { OPENROUTER_USAGE } from "../data/usage-snapshot.js";

/** Per-model tallies gathered from the saved registry snapshots. */
export interface RegistryTally {
  readonly sourceIds: ReadonlySet<string>;
  readonly listings: number;
  readonly huggingFaceDownloads: number;
  readonly checkedAt: string | null;
}

const EMPTY_TALLY: RegistryTally = {
  sourceIds: new Set(),
  listings: 0,
  huggingFaceDownloads: 0,
  checkedAt: null,
};

/**
 * How the two headline signals are built, spelled out so the UI can show it.
 *
 * Both are bounded 0-100 composites of things that are *observable*: how many
 * independent lists carry the model, how many ways it can be deployed, whether
 * it has an official Ollama entry, Hugging Face downloads where it has a hub
 * presence, and the dated OpenRouter usage snapshot. None of that measures how
 * good a model is. Presenting them as separate axes from `quality` is the point.
 */
export const SIGNAL_METHOD =
  "Ecosystem visibility proxy only: source presence, hosted listings, deployment options, official Ollama availability, " +
  "Hugging Face downloads where available, and a dated OpenRouter top-ten token-usage snapshot. " +
  "Not a user count, market share or quality test.";

/** Log-scaled points, so an order of magnitude matters and noise does not. */
function logPoints(value: number, scale: number, cap: number): number {
  if (value <= 0) return 0;
  return Math.min(cap, Math.round(Math.log10(value + 1) * scale));
}

/** Compute the ecosystem and exposure signals for one model. */
export function computeSignals(model: Model, tally: RegistryTally = EMPTY_TALLY): ModelSignals {
  const sourceCount = tally.sourceIds.size;
  const deployments = new Set(model.deployments);
  const usage = OPENROUTER_USAGE.models[model.id];

  const statusPoints = model.status === "mature" ? 15 : model.status === "active" ? 12 : 4;
  const ecosystemMaturity = Math.min(
    100,
    statusPoints +
      Math.min(18, deployments.size * 6) +
      Math.min(48, sourceCount * 8) +
      (model.ollamaUrl ? 8 : 0) +
      // Available both as an API and as weights you can run: the strongest
      // single indicator that a model is not going to disappear on you.
      (deployments.has("hosted") && deployments.has("open-weight") ? 8 : 0),
  );

  const usagePoints = usage ? Math.max(7, (11 - usage.rank) * 7) : 0;
  const realWorldExposure = Math.min(
    100,
    usagePoints +
      Math.min(18, sourceCount * 3) +
      logPoints(tally.listings, 10, 15) +
      logPoints(tally.huggingFaceDownloads, 2, 15),
  );

  return {
    ecosystemMaturity,
    realWorldExposure,
    sourceCount,
    listingCount: tally.listings,
    huggingFaceDownloads: tally.huggingFaceDownloads,
    openRouterUsageRank: usage?.rank ?? 0,
    openRouterTokensTrillion: usage?.tokensTrillion ?? 0,
    checkedAt: tally.checkedAt,
  };
}

/** Attach signals to every model in a catalogue. */
export function withSignals(
  models: readonly Model[],
  tallies: ReadonlyMap<string, RegistryTally> = new Map(),
): Model[] {
  return models.map((model) => ({ ...model, signals: computeSignals(model, tallies.get(model.id) ?? EMPTY_TALLY) }));
}

/** Read signals off a model, tolerating a catalogue that has none attached. */
export function signalsOf(model: Model): ModelSignals {
  return (
    model.signals ?? {
      ecosystemMaturity: 0,
      realWorldExposure: 0,
      sourceCount: 0,
      listingCount: 0,
      huggingFaceDownloads: 0,
      openRouterUsageRank: 0,
      openRouterTokensTrillion: 0,
      checkedAt: null,
    }
  );
}

/**
 * How many different kinds of work a model covers, capped at 24.
 *
 * Used by the breadth and focus plan styles as opposites of each other: a broad
 * model scores well on one and badly on the other, which is what makes the two
 * styles produce genuinely different teams rather than reshuffled versions of
 * the same one.
 */
export function capabilityRange(model: Model): number {
  return Math.min(
    24,
    new Set(model.cases).size +
      Math.min(5, new Set(model.roles).size) +
      Math.min(4, new Set(model.modalities).size) +
      Math.min(3, new Set(model.deployments).size),
  );
}

/** The blended 0-100 adoption figure the scoring code consumes. */
export function adoptionScore(model: Model): number {
  const signals = signalsOf(model);
  return Math.round((signals.ecosystemMaturity + signals.realWorldExposure) / 2);
}
