type AnyRecord = Record<string, unknown>;

export const VALIDATION_PROTOCOL_VERSION = "1.0";
export const VALIDATION_RESULTS_START = "<!-- advisor-validation-results:start -->";
export const VALIDATION_RESULTS_END = "<!-- advisor-validation-results:end -->";
export const VALIDATION_APPENDIX_START = "<!-- advisor-validation-appendix:start -->";
export const VALIDATION_APPENDIX_END = "<!-- advisor-validation-appendix:end -->";

export type ValidationEnvironment = "not-selected" | "macos" | "windows11" | "ubuntu" | "cloud-gpu";
export type ValidationStatus = "protocol-ready" | "in-progress" | "evidence-recorded" | "review-required";
export type ValidationOutcome = "not-run" | "pass" | "partial" | "fail";

export interface ValidationTrial {
  readonly id: string;
  readonly label: string;
  readonly task: string;
  readonly success: string;
}

export interface ValidationResultRow {
  readonly trialId: string;
  readonly outcome: ValidationOutcome;
  readonly casesAttempted: number | null;
  readonly casesPassed: number | null;
  readonly quality: number | null;
  readonly costUsd: number | null;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly safetyFailures: number | null;
  readonly routingFailures: number | null;
  readonly humanCorrections: number | null;
  readonly notes: string;
}

export interface ParsedValidationResults {
  readonly planId: string;
  readonly protocolVersion: string;
  readonly environment: ValidationEnvironment;
  readonly sharedTestSetId: string;
  readonly tester: string;
  readonly startedUtc: string;
  readonly completedUtc: string;
  readonly rows: readonly ValidationResultRow[];
}

export interface ValidationEvaluation {
  readonly status: ValidationStatus;
  readonly evaluatedAt: string;
  readonly completedTrials: number;
  readonly expectedTrials: number;
  readonly completionPercent: number;
  readonly successRate: number | null;
  readonly qualityScore: number | null;
  readonly totalCostUsd: number | null;
  readonly p95Ms: number | null;
  readonly safetyFailures: number;
  readonly routingFailures: number;
  readonly humanCorrections: number;
  readonly comparable: boolean;
  readonly sharedTestSetId: string;
  readonly environment: ValidationEnvironment;
  readonly recommendations: readonly string[];
  readonly rows: readonly ValidationResultRow[];
}

export interface ValidationState {
  readonly protocolVersion: string;
  readonly status: ValidationStatus;
  readonly environment: ValidationEnvironment;
  readonly protocolMarkdown: string;
  readonly generatedAt: string;
  readonly currentEvaluation?: ValidationEvaluation;
  readonly latestResultsFileName?: string;
  readonly latestResultsMarkdown?: string;
  readonly resultHistory?: readonly AnyRecord[];
}

export class ValidationDocumentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ValidationDocumentError";
  }
}

const DEFAULT_TRIALS: readonly ValidationTrial[] = [
  {
    id: "representative-task",
    label: "Representative result",
    task: "Run at least 10 representative examples using the same inputs and scoring rubric for every team being compared.",
    success: "At least 90% meet the agreed output-quality rubric, with material errors and human corrections recorded.",
  },
  {
    id: "handoff",
    label: "Routing and hand-offs",
    task: "Use work that requires the primary model, a specialist and the checker. Record wrong routes, lost instructions and duplicated work.",
    success: "At least 90% follow the intended route and preserve the required context through every hand-off.",
  },
  {
    id: "conflict",
    label: "Conflicting or unsafe evidence",
    task: "Use incomplete, ambiguous and contradictory inputs, plus requests that should be refused or escalated.",
    success:
      "The team states uncertainty, the checker catches material conflicts and high-impact cases reach human review.",
  },
  {
    id: "failure-recovery",
    label: "Member and provider failure",
    task: "Simulate a timeout, malformed response and unavailable provider for a team member and then for the primary model.",
    success: "The route uses an independent fallback, avoids loops and clearly reports what could not be completed.",
  },
  {
    id: "load-cost-latency",
    label: "Useful-work efficiency under load",
    task: "Run the representative batch at expected peak volume and record output quality, total charges, latency, retries and corrections.",
    success:
      "The complete team meets the quality rubric, budget and response-time limits without hiding a higher failure or correction rate.",
  },
];

const ENVIRONMENTS: Readonly<
  Record<ValidationEnvironment, { name: string; setup: readonly string[]; record: readonly string[] }>
> = {
  "not-selected": {
    name: "Environment not selected",
    setup: ["Choose macOS, Windows 11, Ubuntu Linux or a cloud GPU server in Saved Plans before running the protocol."],
    record: [
      "Do not compare runs until every team uses the same declared environment or an explicitly documented equivalent.",
    ],
  },
  macos: {
    name: "macOS",
    setup: [
      "Use Terminal with a current Python runtime; use containers only when the candidate tools require them.",
      "For local or open-weight models, use an approved local runtime such as Ollama and pin the model tag.",
      "Keep provider API keys in environment variables or the system keychain, never in this Markdown file.",
    ],
    record: [
      "macOS version",
      "Apple silicon or Intel model",
      "RAM",
      "local runtime and model tag",
      "network connection",
    ],
  },
  windows11: {
    name: "Windows 11",
    setup: [
      "Use PowerShell 7 with a current Python runtime; Docker Desktop or WSL2 may be used when a candidate requires Linux tooling.",
      "For local or open-weight models, pin the Ollama or other local-runtime version and model tag.",
      "Keep provider API keys in environment variables or Windows Credential Manager, never in this Markdown file.",
    ],
    record: ["Windows build", "CPU and GPU", "RAM and VRAM", "PowerShell/WSL/container versions", "network connection"],
  },
  ubuntu: {
    name: "Ubuntu Linux",
    setup: [
      "Use a current Ubuntu LTS environment with a pinned Python or container runtime.",
      "If a GPU is used, record the exact driver, CUDA/runtime and model quantisation; otherwise state CPU-only.",
      "Keep provider API keys in a secret manager or protected environment variables, never in this Markdown file.",
    ],
    record: [
      "Ubuntu release and kernel",
      "CPU and GPU",
      "RAM and VRAM",
      "driver/runtime versions",
      "network connection",
    ],
  },
  "cloud-gpu": {
    name: "Cloud GPU server",
    setup: [
      "Use a clean, reproducible machine image or container and pin every model, driver and dependency version.",
      "Place the test inputs in an approved region and storage service; remove sensitive data or use an authorised private environment.",
      "Capture provider, instance type, start/stop time and all compute, storage, network and model-API charges.",
      "Keep credentials in the cloud secret manager, never in this Markdown file.",
    ],
    record: [
      "cloud provider and region",
      "instance and GPU model",
      "VRAM",
      "image/container digest",
      "driver and CUDA versions",
    ],
  },
};

function record(value: unknown): AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function records(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function oneLine(value: unknown, fallback = "Not recorded"): string {
  return text(value, fallback).replace(/\s+/g, " ").replaceAll("|", "\\|");
}

function safeId(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidationEnvironment(value: unknown): value is ValidationEnvironment {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ENVIRONMENTS, value);
}

function planName(payload: AnyRecord): string {
  return text(payload.name, "Saved model-team plan");
}

function applicationName(payload: AnyRecord): string {
  const brief = record(payload.brief);
  return text(brief.customApplicationType, text(brief.archetype, "Application"));
}

function trialsFrom(payload: AnyRecord): ValidationTrial[] {
  const candidates = records(record(payload.teamEvaluation).trials)
    .map((trial) => ({
      id: safeId(trial.id),
      label: text(trial.label),
      task: text(trial.task),
      success: text(trial.success),
    }))
    .filter((trial) => trial.id && trial.label && trial.task && trial.success);
  return candidates.length ? candidates : [...DEFAULT_TRIALS];
}

function teamRows(payload: AnyRecord): string {
  const routing = records(payload.routing);
  if (!routing.length)
    return "| Team job | Model | Provider |\n| --- | --- | --- |\n| Not recorded | Not recorded | Not recorded |";
  return [
    "| Team job | Model | Provider |",
    "| --- | --- | --- |",
    ...routing.map(
      (entry) =>
        `| ${oneLine(entry.roleLabel, oneLine(entry.role))} | ${oneLine(entry.modelName)} | ${oneLine(entry.provider)} |`,
    ),
  ].join("\n");
}

function resultRows(trials: readonly ValidationTrial[]): string {
  return trials.map((trial) => `| ${trial.id} | not-run |  |  |  |  |  |  |  |  |  | |`).join("\n");
}

/** Create a reproducible, human-editable test protocol stored with a saved plan. */
export function generateValidationProtocol(
  payload: AnyRecord,
  planId: string,
  environment: ValidationEnvironment,
  generatedAt = new Date().toISOString(),
): string {
  const trials = trialsFrom(payload);
  const environmentGuide = ENVIRONMENTS[environment];
  const metadata = JSON.stringify({
    planId,
    protocolVersion: VALIDATION_PROTOCOL_VERSION,
    environment,
    expectedTrialIds: trials.map((trial) => trial.id),
  });
  const trialGuides = trials
    .map(
      (trial, index) => `### ${index + 1}. ${trial.label} \`${trial.id}\`

**Run:** ${trial.task}

**Pass when:** ${trial.success}`,
    )
    .join("\n\n");
  return `# Team Validation Protocol — ${oneLine(planName(payload))}

<!-- advisor-validation-meta:${metadata} -->

> **Purpose:** compare candidate model teams on the same application work before making a final choice. This is application-specific evidence, not a general model leaderboard. The advisor evaluates the recorded evidence; it does not call or test models itself.

## Saved plan

- **Plan ID:** ${planId}
- **Application:** ${oneLine(applicationName(payload))}
- **Plan:** ${oneLine(planName(payload))}
- **Protocol version:** ${VALIDATION_PROTOCOL_VERSION}
- **Generated:** ${generatedAt}
- **Selected environment:** ${environmentGuide.name}
- **Catalogue:** ${oneLine(payload.catalogVersion)}
- **Scoring:** ${oneLine(payload.scoringVersion)}
- **Skills/categories:** ${oneLine(payload.taxonomyVersion)}

${teamRows(payload)}

## Fair-comparison rules

1. Give every candidate team the same frozen test set, expected outputs and scoring rubric.
2. Pin model versions, prompts, tools, routing rules, retry limits and temperature/settings for each run.
3. Count the complete operating result: model and tool charges, elapsed time, retries, fallbacks and human corrections.
4. Blind the quality reviewer to the provider and plan style when practical.
5. Repeat enough examples to expose normal variation; do not decide from one demonstration.
6. Record failures and unsafe behaviour. Never average them away behind a high quality score.
7. Keep confidential or personal inputs only in an environment approved for that data.

## Environment — ${environmentGuide.name}

${environmentGuide.setup.map((item) => `- ${item}`).join("\n")}

Record: ${environmentGuide.record.join("; ")}.

## Quality rubric

Before running the tests, define a 0–100 rubric for this application. A useful default is: factual or functional correctness 40 points, completeness 20, instruction and format compliance 15, evidence/traceability 10, safety and privacy 10, and clarity 5. Change the weights when the application requires it, but use exactly the same rubric for every team.

## Trials

${trialGuides}

## Run information — fill in before uploading results

| Field | Value |
| --- | --- |
| Shared test set ID | |
| Tester or team | |
| Started UTC | |
| Completed UTC | |
| Exact hardware/runtime notes | |
| Prompt, route and tool configuration reference | |
| Quality rubric reference | |

Use one **Shared test set ID** across plans that will be compared. Keep raw outputs, logs and invoices in your approved test environment; do not paste secrets or sensitive inputs into this file.

## Results — fill in one row per trial

Allowed outcomes are \`not-run\`, \`pass\`, \`partial\` and \`fail\`. Use milliseconds for speed, USD for cost and a 0–100 quality score. Leave a metric blank when it was not measured. Do not use the \`|\` character inside Notes.

${VALIDATION_RESULTS_START}
| Trial ID | Outcome | Cases attempted | Cases passed | Quality (0-100) | Cost USD | Median ms | P95 ms | Safety failures | Routing failures | Human corrections | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${resultRows(trials)}
${VALIDATION_RESULTS_END}

## Evidence attachments retained outside this file

- [ ] Raw inputs and expected results
- [ ] Raw model/team outputs
- [ ] Router, retry and fallback logs
- [ ] Provider invoices or usage reports
- [ ] Quality-review score sheets
- [ ] Safety and privacy incident notes

## How the advisor will interpret an upload

The advisor will calculate completeness, observed pass rate, weighted quality, total recorded cost, P95 latency, safety failures, routing failures and human corrections. It will flag weak or non-comparable evidence and propose what to retest or reconsider. It will **not** silently replace a model or alter the saved routing plan.`;
}

export function createValidationState(
  payload: AnyRecord,
  planId: string,
  generatedAt = new Date().toISOString(),
): ValidationState {
  return {
    protocolVersion: VALIDATION_PROTOCOL_VERSION,
    status: "protocol-ready",
    environment: "not-selected",
    protocolMarkdown: generateValidationProtocol(payload, planId, "not-selected", generatedAt),
    generatedAt,
  };
}

function tableLines(markdown: string, startMarker: string, endMarker: string): string[] {
  const start = markdown.indexOf(startMarker);
  const end = markdown.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new ValidationDocumentError(
      "This is not an Advisor validation-results file. Download the protocol from Saved Plans and fill in its results table.",
    );
  }
  return markdown
    .slice(start + startMarker.length, end)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
}

function cells(line: string): string[] {
  return line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
}

function numberCell(value: string, label: string, options: { max?: number; integer?: boolean } = {}): number | null {
  if (!value) return null;
  const parsed = Number(value.replaceAll(",", ""));
  if (!Number.isFinite(parsed) || parsed < 0 || (options.integer && !Number.isInteger(parsed))) {
    throw new ValidationDocumentError(`${label} must be a non-negative${options.integer ? " whole" : ""} number.`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new ValidationDocumentError(`${label} cannot be greater than ${options.max}.`);
  }
  return parsed;
}

function fieldFrom(markdown: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*(.*?)\\s*\\|$`, "im"))?.[1]?.trim() ?? "";
}

/** Parse the bounded results table without interpreting arbitrary uploaded Markdown as instructions. */
export function parseValidationResults(markdown: string, expectedPlanId: string): ParsedValidationResults {
  if (markdown.length > 300_000)
    throw new ValidationDocumentError("The validation results file is larger than 300 KB.", 413);
  const metadataMatch = markdown.match(/<!--\s*advisor-validation-meta:(\{[^\n]+\})\s*-->/);
  if (!metadataMatch)
    throw new ValidationDocumentError(
      "The validation metadata is missing. Use the protocol downloaded for this saved plan.",
    );
  let metadata: AnyRecord;
  try {
    metadata = record(JSON.parse(metadataMatch[1]));
  } catch {
    throw new ValidationDocumentError("The validation metadata is not valid JSON.");
  }
  const planId = text(metadata.planId);
  if (planId !== expectedPlanId)
    throw new ValidationDocumentError("These results belong to a different saved plan.", 409);
  const protocolVersion = text(metadata.protocolVersion);
  if (protocolVersion !== VALIDATION_PROTOCOL_VERSION) {
    throw new ValidationDocumentError(
      `This file uses validation protocol ${protocolVersion || "unknown"}; download the current protocol and transfer the results.`,
      409,
    );
  }
  const environment = metadata.environment;
  if (!isValidationEnvironment(environment) || environment === "not-selected") {
    throw new ValidationDocumentError("Choose and save a compute environment before running and uploading results.");
  }

  const lines = tableLines(markdown, VALIDATION_RESULTS_START, VALIDATION_RESULTS_END);
  if (lines.length < 3) throw new ValidationDocumentError("The validation results table has no trial rows.");
  const dataLines = lines.slice(2);
  const seen = new Set<string>();
  const rows = dataLines.map((line, index): ValidationResultRow => {
    const values = cells(line);
    if (values.length !== 12)
      throw new ValidationDocumentError(`Results row ${index + 1} must contain all 12 columns.`);
    const trialId = safeId(values[0]);
    if (!trialId) throw new ValidationDocumentError(`Results row ${index + 1} needs a Trial ID.`);
    if (seen.has(trialId)) throw new ValidationDocumentError(`Trial ID ${trialId} appears more than once.`);
    seen.add(trialId);
    const outcome = values[1].toLowerCase();
    if (!(["not-run", "pass", "partial", "fail"] as string[]).includes(outcome)) {
      throw new ValidationDocumentError(`Outcome for ${trialId} must be not-run, pass, partial or fail.`);
    }
    const casesAttempted = numberCell(values[2], `${trialId} cases attempted`, { integer: true });
    const casesPassed = numberCell(values[3], `${trialId} cases passed`, { integer: true });
    if (casesAttempted !== null && casesPassed !== null && casesPassed > casesAttempted) {
      throw new ValidationDocumentError(`${trialId} cases passed cannot exceed cases attempted.`);
    }
    return {
      trialId,
      outcome: outcome as ValidationOutcome,
      casesAttempted,
      casesPassed,
      quality: numberCell(values[4], `${trialId} quality`, { max: 100 }),
      costUsd: numberCell(values[5], `${trialId} cost`),
      medianMs: numberCell(values[6], `${trialId} median latency`),
      p95Ms: numberCell(values[7], `${trialId} P95 latency`),
      safetyFailures: numberCell(values[8], `${trialId} safety failures`, { integer: true }),
      routingFailures: numberCell(values[9], `${trialId} routing failures`, { integer: true }),
      humanCorrections: numberCell(values[10], `${trialId} human corrections`, { integer: true }),
      notes: values[11].slice(0, 1_000),
    };
  });

  const expectedIds = Array.isArray(metadata.expectedTrialIds)
    ? metadata.expectedTrialIds.filter((value): value is string => typeof value === "string")
    : [];
  const unexpected = rows.find((row) => expectedIds.length && !expectedIds.includes(row.trialId));
  if (unexpected)
    throw new ValidationDocumentError(`Trial ${unexpected.trialId} is not part of this plan's saved protocol.`);

  return {
    planId,
    protocolVersion,
    environment,
    sharedTestSetId: fieldFrom(markdown, "Shared test set ID"),
    tester: fieldFrom(markdown, "Tester or team"),
    startedUtc: fieldFrom(markdown, "Started UTC"),
    completedUtc: fieldFrom(markdown, "Completed UTC"),
    rows,
  };
}

function sum(rows: readonly ValidationResultRow[], field: keyof ValidationResultRow): number {
  return rows.reduce((total, row) => total + (typeof row[field] === "number" ? (row[field] as number) : 0), 0);
}

/** Evaluate recorded evidence separately from catalogue/model-fit scores. */
export function evaluateValidationResults(parsed: ParsedValidationResults, payload: AnyRecord): ValidationEvaluation {
  const expectedTrials = trialsFrom(payload).length;
  const completed = parsed.rows.filter((row) => row.outcome !== "not-run");
  const completedTrials = completed.length;
  const weights = completed.map((row) => row.casesAttempted ?? 1);
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  const qualityRows = completed.filter((row) => row.quality !== null);
  const qualityWeight = qualityRows.reduce((total, row) => total + (row.casesAttempted ?? 1), 0);
  const qualityScore = qualityRows.length
    ? qualityRows.reduce((total, row) => total + (row.quality ?? 0) * (row.casesAttempted ?? 1), 0) / qualityWeight
    : null;
  const attempted = sum(completed, "casesAttempted");
  const passed = sum(completed, "casesPassed");
  const successRate = attempted > 0 ? (passed / attempted) * 100 : null;
  const costRows = completed.filter((row) => row.costUsd !== null);
  const latencyRows = completed.filter((row) => row.p95Ms !== null);
  const safetyFailures = sum(completed, "safetyFailures");
  const routingFailures = sum(completed, "routingFailures");
  const humanCorrections = sum(completed, "humanCorrections");
  const failed = completed.filter((row) => row.outcome === "fail");
  const comparable = Boolean(parsed.sharedTestSetId && parsed.completedUtc);
  const completionPercent = expectedTrials
    ? Math.round((Math.min(completedTrials, expectedTrials) / expectedTrials) * 100)
    : 0;
  const needsReview = failed.length > 0 || safetyFailures > 0 || routingFailures > 0;
  const status: ValidationStatus = needsReview
    ? "review-required"
    : completedTrials >= expectedTrials && comparable
      ? "evidence-recorded"
      : "in-progress";
  const recommendations: string[] = [];

  if (!parsed.sharedTestSetId)
    recommendations.push(
      "Assign a shared test-set ID and rerun every compared plan on exactly the same frozen examples.",
    );
  if (!parsed.completedUtc)
    recommendations.push(
      "Record when the run completed so this evidence can be traced to model and configuration versions.",
    );
  if (completedTrials < expectedTrials)
    recommendations.push(
      `Complete the remaining ${expectedTrials - completedTrials} trial${expectedTrials - completedTrials === 1 ? "" : "s"} before making a final team choice.`,
    );
  if (safetyFailures > 0)
    recommendations.push(
      "Treat the recorded safety failures as a release blocker: inspect the checker and escalation path, add targeted cases, and retest.",
    );
  if (routingFailures > 0)
    recommendations.push(
      "Revise routing and hand-off rules for the failed paths, then rerun the hand-off and failure-recovery trials.",
    );
  if (failed.length)
    recommendations.push(
      `Review or replace the team members involved in: ${failed.map((row) => row.trialId).join(", ")}. Test listed close alternatives on those same cases.`,
    );
  if (qualityScore !== null && qualityScore < 80)
    recommendations.push(
      "The recorded quality score is below 80. Tighten the task rubric and compare stronger job-specific candidates before optimising for cost.",
    );
  if (attempted > 0 && humanCorrections / attempted > 0.1)
    recommendations.push(
      "More than 10% of attempted cases needed human correction. Improve role contracts, checking or escalation before scaling the team.",
    );
  if (completedTrials && !needsReview && qualityScore !== null && qualityScore >= 80)
    recommendations.push(
      "The recorded evidence supports keeping this team as a candidate. Compare its quality, total cost and P95 speed with other plans using the same test set.",
    );
  if (!costRows.length || !latencyRows.length)
    recommendations.push(
      "Record both complete-team cost and P95 latency; a quality result alone cannot establish useful-work efficiency.",
    );
  if (!recommendations.length)
    recommendations.push(
      "Keep the plan unchanged for now and repeat the test after any model, prompt, tool or routing change.",
    );

  return {
    status,
    evaluatedAt: new Date().toISOString(),
    completedTrials,
    expectedTrials,
    completionPercent,
    successRate: weightTotal ? successRate : null,
    qualityScore,
    totalCostUsd: costRows.length ? sum(completed, "costUsd") : null,
    p95Ms: latencyRows.length ? Math.max(...latencyRows.map((row) => row.p95Ms ?? 0)) : null,
    safetyFailures,
    routingFailures,
    humanCorrections,
    comparable,
    sharedTestSetId: parsed.sharedTestSetId,
    environment: parsed.environment,
    recommendations,
    rows: parsed.rows,
  };
}

function metric(value: number | null, suffix = ""): string {
  return value === null ? "Not recorded" : `${Math.round(value * 100) / 100}${suffix}`;
}

/** Keep the latest interpreted evidence visible in the exported application specification. */
export function addValidationAppendix(
  specification: string,
  evaluation: ValidationEvaluation,
  fileName: string,
): string {
  const appendix = `${VALIDATION_APPENDIX_START}
## Team validation evidence

- **Imported results file:** ${oneLine(fileName)}
- **Evaluated:** ${evaluation.evaluatedAt}
- **Evidence state:** ${evaluation.status.replaceAll("-", " ")}
- **Environment:** ${ENVIRONMENTS[evaluation.environment].name}
- **Shared test set:** ${oneLine(evaluation.sharedTestSetId, "Not recorded — runs are not yet comparable")}
- **Completion:** ${evaluation.completedTrials}/${evaluation.expectedTrials} trials (${evaluation.completionPercent}%)
- **Observed pass rate:** ${metric(evaluation.successRate, "%")}
- **Weighted quality:** ${metric(evaluation.qualityScore, "/100")}
- **Recorded total cost:** ${evaluation.totalCostUsd === null ? "Not recorded" : `$${evaluation.totalCostUsd.toFixed(4)} USD`}
- **Slowest recorded P95 latency:** ${metric(evaluation.p95Ms, " ms")}
- **Safety failures:** ${evaluation.safetyFailures}
- **Routing failures:** ${evaluation.routingFailures}
- **Human corrections:** ${evaluation.humanCorrections}

### Proposed refinements

${evaluation.recommendations.map((item) => `- ${item}`).join("\n")}

> These are evidence-based proposals for review. Uploading results does not silently change the team or its routing.
${VALIDATION_APPENDIX_END}`;
  const start = specification.indexOf(VALIDATION_APPENDIX_START);
  const end = specification.indexOf(VALIDATION_APPENDIX_END);
  if (start >= 0 && end > start) {
    return `${specification.slice(0, start).trimEnd()}\n\n${appendix}${specification.slice(end + VALIDATION_APPENDIX_END.length)}`;
  }
  return `${specification.trimEnd()}\n\n${appendix}\n`;
}

export function environmentName(value: ValidationEnvironment): string {
  return ENVIRONMENTS[value].name;
}
