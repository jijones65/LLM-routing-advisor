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
  readonly auth: {
    readonly required: boolean;
    readonly configured: boolean;
    readonly supabaseUrl: string;
    readonly publishableKey: string;
    readonly googleEnabled: boolean;
  };
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

/** Explicit model choices, kept separate for every brief, plan style and team job. */
export const modelChoiceOverrides = new Map<string, string>();

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

export function modelChoiceKey(brief: BriefInput, styleId: string, roleId: string): string {
  return `${trialScopeKey(brief, styleId)}::model-choice::${roleId}`;
}

export function modelChoicesFor(brief: BriefInput, styleId: string): Record<string, string> {
  const prefix = `${trialScopeKey(brief, styleId)}::model-choice::`;
  return Object.fromEntries(
    [...modelChoiceOverrides.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, modelId]) => [key.slice(prefix.length), modelId]),
  );
}

export function clearModelChoicesFor(brief: BriefInput, styleId: string): void {
  const prefix = `${trialScopeKey(brief, styleId)}::model-choice::`;
  for (const key of modelChoiceOverrides.keys()) if (key.startsWith(prefix)) modelChoiceOverrides.delete(key);
}
