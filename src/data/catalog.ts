import type {
  Capability,
  Deployment,
  Model,
  ModelStatus,
  Modality,
  Pricing,
  RoleId,
  Tier,
  VerificationState,
} from "../shared/types.js";
import { CAPABILITY_TESTS } from "./capability-tests.js";
import { CATALOG_TABLE, RETIRED_TABLE } from "./catalog.data.js";
import { CATALOG_VERSION, OLLAMA_LIBRARY, PROVIDER_SOURCES, VERIFIED_AT } from "./providers.js";

const CASE_CODES: Readonly<Record<string, Capability>> = {
  r: "reasoning",
  k: "knowledge",
  c: "coding",
  g: "rag",
  s: "research",
  v: "vision",
  o: "voice",
  a: "automation",
  p: "private",
  m: "multilingual",
  t: "agents",
  y: "safety",
};

const DEPLOYMENT_CODES: Readonly<Record<string, Deployment>> = {
  h: "hosted",
  w: "open-weight",
  p: "private cloud",
  e: "edge",
};

const MODALITY_CODES: Readonly<Record<string, Modality>> = {
  t: "text",
  i: "image",
  a: "audio",
  v: "video",
};

const VERIFICATION_CODES: Readonly<Record<string, VerificationState>> = {
  c: "confirmed",
  u: "unconfirmed",
  d: "drifted",
};

const TIERS: readonly Tier[] = ["Frontier", "Balanced", "Efficient", "Specialist", "Open / local", "Research"];

const ROLE_IDS: readonly RoleId[] = [
  "primary",
  "planner",
  "worker",
  "validator",
  "researcher",
  "coder",
  "vision",
  "voice",
  "private",
];

/** Non-numeric context values the table accepts, and how they read in the UI. */
const CONTEXT_LABELS: Readonly<Record<string, string>> = {
  realtime: "Realtime",
  managed: "Managed run",
  code: "Code window",
  agent: "Agent loop",
  multimodal: "Multimodal",
};

/**
 * Turn published pricing into a 1-5 cost class.
 *
 * The blend is 75% input / 25% output, which approximates a retrieval-heavy
 * application: long grounded prompts, comparatively short answers. It is
 * deliberately one fixed assumption rather than a per-model guess, so two
 * models are always compared on the same basis.
 *
 * Buckets are chosen so that each step is roughly a 3-4x jump in spend, which
 * is the granularity at which the choice actually changes an architecture.
 */
export function deriveCostClass(pricing: Pricing): number {
  if (pricing.input === null || pricing.output === null) return 3;
  const blended = pricing.input * 0.75 + pricing.output * 0.25;
  if (blended <= 0.5) return 1;
  if (blended <= 2) return 2;
  if (blended <= 6) return 3;
  if (blended <= 15) return 4;
  return 5;
}

/** Format a token count the way a person would say it. */
export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${millions % 1 === 0 ? millions : millions.toFixed(2).replace(/0+$/, "")}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

function fail(row: number, message: string): never {
  throw new Error(`catalog row ${row}: ${message}`);
}

function decode<T>(row: number, column: string, codes: Readonly<Record<string, T>>, raw: string): T[] {
  return raw
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => {
      const value = codes[code];
      if (value === undefined) fail(row, `unknown ${column} code "${code}"`);
      return value;
    });
}

/** Parse the price column into published pricing plus a cost class. */
function parsePrice(row: number, raw: string): { pricing: Pricing; costClass: number } {
  if (raw.startsWith("local:")) {
    const estimate = Number(raw.slice(6));
    if (!Number.isInteger(estimate) || estimate < 1 || estimate > 5) fail(row, `bad local cost class "${raw}"`);
    return {
      pricing: {
        input: null,
        output: null,
        note: "Self-hosted. Cost is your own compute, so no per-token price applies.",
      },
      costClass: estimate,
    };
  }
  if (raw.startsWith("~")) {
    const estimate = Number(raw.slice(1));
    if (!Number.isInteger(estimate) || estimate < 1 || estimate > 5) fail(row, `bad cost estimate "${raw}"`);
    return {
      pricing: { input: null, output: null, note: "No published per-token price was found on the provider page." },
      costClass: estimate,
    };
  }
  const [input, output] = raw.split("/").map(Number);
  if (!Number.isFinite(input) || !Number.isFinite(output)) fail(row, `bad price "${raw}"`);
  const pricing: Pricing = { input, output };
  return { pricing, costClass: deriveCostClass(pricing) };
}

/**
 * Derive lifecycle status from the entry itself rather than storing it twice.
 *
 * A name containing "Preview" is a preview. Anything whose family the provider
 * has already superseded reads as `mature`: still supported, but not what a new
 * application should start on.
 */
function deriveStatus(name: string, id: string): ModelStatus {
  if (name.includes("Preview")) return "preview";
  const supersededPrefixes = ["llama-3", "glm-4-", "glm-5-1", "deepseek-r1", "palmyra-x4", "step-3-5", "exaone-4-0"];
  if (supersededPrefixes.some((prefix) => id.startsWith(prefix))) return "mature";
  if (id === "gemini-3-6-flash" || id === "seed-1-6" || id === "seed-1-8") return "mature";
  if (id === "command-a" || id === "ernie-5" || id === "kimi-k2-6" || id === "minimax-m2-7") return "mature";
  return "active";
}

/** A model the provider has stopped listing. */
export interface RetiredModel {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly removedAt: string;
  readonly reason: string;
}

function parseRetired(): RetiredModel[] {
  return RETIRED_TABLE.trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const [id, name, provider, removedAt, reason] = line.split("|");
      return { id, name, provider, removedAt, reason };
    });
}

/** Parse and validate the catalogue table. Throws on any malformed row. */
export function parseCatalog(table: string = CATALOG_TABLE): Model[] {
  const rows = table
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const seen = new Set<string>();

  return rows.map((line, index) => {
    const row = index + 1;
    const columns = line.split("|");
    if (columns.length < 14) fail(row, `expected 14 columns, found ${columns.length}`);

    const [
      id,
      name,
      provider,
      tier,
      quality,
      speed,
      context,
      price,
      cases,
      roles,
      deployments,
      modalities,
      verification,
      summary,
      driftNote,
    ] = columns;

    if (seen.has(id)) fail(row, `duplicate id "${id}"`);
    seen.add(id);

    const sourceUrl = PROVIDER_SOURCES[provider];
    if (!sourceUrl) fail(row, `provider "${provider}" has no entry in PROVIDER_SOURCES`);
    if (!TIERS.includes(tier as Tier)) fail(row, `unknown tier "${tier}"`);

    const qualityScore = Number(quality);
    const speedScore = Number(speed);
    for (const [label, value] of [
      ["quality", qualityScore],
      ["speed", speedScore],
    ] as const) {
      if (!Number.isInteger(value) || value < 1 || value > 5) fail(row, `${label} must be 1-5, found "${value}"`);
    }

    const contextTokens = /^\d+$/.test(context) ? Number(context) : null;
    const contextLabel = contextTokens !== null ? formatContext(contextTokens) : CONTEXT_LABELS[context];
    if (!contextLabel) fail(row, `unknown context value "${context}"`);

    const { pricing, costClass } = parsePrice(row, price);

    const roleList = roles
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) as RoleId[];
    for (const role of roleList) {
      if (!ROLE_IDS.includes(role)) fail(row, `unknown role "${role}"`);
    }

    const verificationState = VERIFICATION_CODES[verification];
    if (!verificationState) fail(row, `unknown verification code "${verification}"`);
    if (verificationState === "drifted" && !driftNote) fail(row, "drifted entries must carry a drift note");

    return {
      id,
      name,
      provider,
      family: name.split(" ").slice(0, 2).join(" "),
      tier: tier as Tier,
      status: deriveStatus(name, id),
      quality: qualityScore,
      speed: speedScore,
      costClass,
      pricing,
      contextTokens,
      contextLabel,
      cases: decode(row, "capability", CASE_CODES, cases),
      // Published benchmark results, where any survived conflict resolution.
      // Attached here rather than stored in the catalogue table so a model's facts
      // and its measured evidence stay separately sourced and separately dated.
      ...(CAPABILITY_TESTS.byModel.has(id) ? { capabilityTests: CAPABILITY_TESTS.byModel.get(id) } : {}),
      roles: roleList,
      deployments: decode(row, "deployment", DEPLOYMENT_CODES, deployments),
      modalities: decode(row, "modality", MODALITY_CODES, modalities),
      summary,
      sourceUrl,
      ollamaUrl: OLLAMA_LIBRARY[id] ?? null,
      verifiedAt: VERIFIED_AT,
      verification: verificationState,
      ...(driftNote ? { driftNote } : {}),
      catalogVersion: CATALOG_VERSION,
    } satisfies Model;
  });
}

/** The parsed catalogue. Frozen so no request handler can mutate shared state. */
export const CATALOG: readonly Model[] = Object.freeze(parseCatalog());

/** Models dropped because a provider stopped listing them. */
export const RETIRED: readonly RetiredModel[] = Object.freeze(parseRetired());

/** Human-readable labels for each capability, used across the UI. */
export const CAPABILITY_LABELS: Readonly<Record<Capability, string>> = {
  reasoning: "Reasoning & decisions",
  knowledge: "Knowledge work",
  coding: "Coding & engineering",
  rag: "Internal knowledge search",
  research: "Current web research",
  vision: "Images & documents",
  voice: "Live voice",
  automation: "High-volume operations",
  private: "Private / on-device",
  multilingual: "Many languages",
  agents: "Software & tools",
  safety: "Checking & safety",
};
