import type { Model } from "../../shared/types.js";
import { RETIRED } from "../../data/catalog.js";
import { CATALOG_VERSION, PROVIDER_SOURCES, VERIFIED_AT } from "../../data/providers.js";
import { ARCHETYPES, BUSINESS_GOALS, DOMAINS, INDUSTRIES, NEED_GROUPS, RISK_LEVELS } from "../../data/taxonomy.js";
import { BASE_ROLES, SPECIALIST_ROLES } from "../../data/roles.js";
import { OTHER_STRATEGY_IDS, PRIMARY_STRATEGY_IDS, SCORING_VERSION, STRATEGIES } from "../../data/strategies.js";
import { CAPABILITY_LABELS } from "../../data/catalog.js";
import { OPENROUTER_USAGE } from "../../data/usage-snapshot.js";
import { SIGNAL_METHOD } from "../../engine/signals.js";
import { verificationSummary } from "../db/repo.js";
import { BRAND_MARK } from "../../client/brand.js";
import { BODY_MARKUP } from "./shell.js";
import { jsonScript } from "./html.js";

/** Injected at build time by `scripts/build.mjs`. */
declare const __STYLES__: string;
declare const __CLIENT__: string;

/**
 * Everything the client needs, serialised once into the page.
 *
 * The prototype duplicated all of this — capability labels, archetypes, plan
 * styles, role definitions — as literals inside the client script, so the same
 * facts existed twice and could disagree. Here the server is the only source and
 * the client reads it, which is why adding a plan style is now a one-file change.
 */
function bootstrapData(models: readonly Model[]): Record<string, unknown> {
  return {
    models,
    capabilityLabels: CAPABILITY_LABELS,
    needGroups: NEED_GROUPS,
    archetypes: ARCHETYPES,
    businessGoals: BUSINESS_GOALS,
    industries: INDUSTRIES,
    domains: DOMAINS,
    riskLevels: RISK_LEVELS,
    strategies: STRATEGIES,
    primaryStrategyIds: PRIMARY_STRATEGY_IDS,
    otherStrategyIds: OTHER_STRATEGY_IDS,
    baseRoles: BASE_ROLES,
    specialistRoles: SPECIALIST_ROLES,
    retired: RETIRED,
    verification: verificationSummary(),
    usageSnapshot: OPENROUTER_USAGE,
    signalMethod: SIGNAL_METHOD,
    verifiedAt: VERIFIED_AT,
    catalogVersion: CATALOG_VERSION,
    scoringVersion: SCORING_VERSION,
    providerCount: Object.keys(PROVIDER_SOURCES).length,
  };
}

/** Render the substituted markup for a given catalogue. */
function renderBody(models: readonly Model[]): string {
  const reviewed = new Date(`${VERIFIED_AT}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const substitutions: Record<string, string> = {
    MODEL_COUNT: String(models.length),
    PROVIDER_COUNT: String(Object.keys(PROVIDER_SOURCES).length),
    REVIEWED_LABEL: reviewed,
  };
  return BODY_MARKUP.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => substitutions[key] ?? whole);
}

/** Render the full HTML document. */
export function renderPage(models: readonly Model[]): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Plan an application first, then choose the model team that fits it. ${models.length} model variants, sourced from official provider pages.">
<meta name="color-scheme" content="light">
<link rel="icon" type="image/png" href="${BRAND_MARK}">
<link rel="apple-touch-icon" href="${BRAND_MARK}">
<title>LLM Application Routing Advisor</title>
<style>${__STYLES__}</style>
</head>
<body>
${renderBody(models)}
<script id="bootstrap-data" type="application/json">${jsonScript(bootstrapData(models))}</script>
<script type="module">${__CLIENT__}</script>
</body>
</html>`;
}
