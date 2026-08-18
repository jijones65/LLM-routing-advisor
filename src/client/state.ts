import type { Brief, Capability, Model, Role, Strategy } from "../shared/types.js";
import type { Archetype, ContextOption, NeedGroup } from "../data/taxonomy.js";
import type { RetiredModel } from "../data/catalog.js";

/** The payload the server serialises into `#bootstrap-data`. */
export interface Bootstrap {
  readonly models: Model[];
  readonly capabilityLabels: Record<Capability, string>;
  readonly needGroups: NeedGroup[];
  readonly archetypes: Archetype[];
  readonly taxonomyVersion: string;
  readonly businessGoals: ContextOption[];
  readonly industries: ContextOption[];
  readonly domains: ContextOption[];
  readonly riskLevels: ContextOption[];
  readonly strategies: Record<string, Strategy>;
  readonly primaryStrategyIds: string[];
  readonly otherStrategyIds: string[];
  readonly baseRoles: Record<string, Role>;
  readonly specialistRoles: Record<string, Role>;
  readonly retired: RetiredModel[];
  readonly verification: { confirmed: number; unconfirmed: number; drifted: number; total: number };
  readonly usageSnapshot: { sourceUrl: string; asOf: string; method: string };
  readonly signalMethod: string;
  readonly verifiedAt: string;
  readonly catalogVersion: string;
  readonly scoringVersion: string;
  readonly providerCount: number;
}

/** Read the server-provided bootstrap payload. */
export function readBootstrap(): Bootstrap {
  const element = document.getElementById("bootstrap-data");
  if (!element?.textContent) throw new Error("Bootstrap data is missing from the page.");
  return JSON.parse(element.textContent) as Bootstrap;
}

/**
 * Mutable brief state, less the derived capability list.
 *
 * `Brief` is deeply readonly so the engine cannot mutate what it is given. The
 * client needs one mutable copy to hold the user's in-progress choices, which is
 * what this is — the readonly modifiers are stripped deliberately, and
 * `completeBrief` converts it back into a `Brief` before any scoring happens.
 */
export type BriefInput = {
  -readonly [K in keyof Omit<Brief, "cases">]: Brief[K] extends readonly (infer T)[] ? T[] : Brief[K];
};

export const initialBrief: BriefInput = {
  archetype: "knowledge-assistant",
  customApplicationType: "",
  needs: ["internal-knowledge", "write-explain", "validate"],
  businessGoal: "service",
  industry: "general",
  domain: "general",
  risk: "medium",
  planStyle: "balanced",
  dataControl: false,
  openPreferred: false,
  multiVendor: true,
};

/** Filters for the registry comparison table. */
export interface RegistryQuery {
  q: string;
  source: string;
  provider: string;
  classification: string;
  offset: number;
  limit: number;
}

export const initialRegistryQuery: RegistryQuery = {
  q: "",
  source: "all",
  provider: "all",
  classification: "all",
  offset: 0,
  limit: 50,
};

/** Which score breakdowns the user has expanded, by role id. */
export const expandedBreakdowns = new Set<string>();

export type TrialOutcome = "pass" | "partial" | "fail";

/** User-recorded results. They are not model runs and are saved with the plan. */
export const trialOutcomes = new Map<string, TrialOutcome>();

/** Keep results separate when the application brief or plan style changes. */
export function trialScopeKey(brief: BriefInput, styleId: string): string {
  return [
    brief.archetype,
    brief.customApplicationType?.trim().toLowerCase() ?? "",
    [...brief.needs].sort().join(","),
    brief.businessGoal,
    brief.industry,
    brief.domain,
    brief.risk,
    styleId,
  ].join("::");
}
