import { CAPABILITY_LABELS } from "../../data/catalog.js";
import { STRATEGIES } from "../../data/strategies.js";
import { ARCHETYPES, BUSINESS_GOALS, DOMAINS, INDUSTRIES, NEED_INDEX, RISK_LEVELS } from "../../data/taxonomy.js";

export const SPECIFICATION_GUIDE_URL =
  "https://www.kdnuggets.com/specification-engineering-the-new-skill-after-prompt-engineering";

type AnyRecord = Record<string, unknown>;

function record(value: unknown): AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function records(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.map(record) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function text(value: unknown, fallback = "Not recorded"): string {
  const result =
    typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  return result || fallback;
}

function oneLine(value: unknown, fallback = "Not recorded"): string {
  return text(value, fallback).replace(/\s+/g, " ").replaceAll("|", "\\|");
}

function optionName(options: readonly { id: string; name: string }[], id: unknown, fallback: string): string {
  return options.find((option) => option.id === id)?.name ?? text(id, fallback);
}

function checkbox(done: boolean): string {
  return done ? "[x]" : "[ ]";
}

function outcomeLabel(value: unknown): string {
  if (value === "pass") return "Pass";
  if (value === "partial") return "Needs work";
  if (value === "fail") return "Fail";
  return "Not tested";
}

/**
 * Create a useful first draft without pretending that catalogue facts answer
 * application-design questions. Known plan data is filled in; decisions only
 * the application owner can make remain explicit fill-in fields.
 */
export function generateBlueprintSpecification(payload: AnyRecord): string {
  const brief = record(payload.brief);
  const archetype = ARCHETYPES.find((item) => item.id === brief.archetype) ?? ARCHETYPES[0];
  const applicationType = text(brief.customApplicationType, archetype.name);
  const strategy = STRATEGIES[text(brief.planStyle, "balanced")] ?? STRATEGIES.balanced;
  const needs = strings(brief.needs).map((id) => NEED_INDEX[id]?.name ?? id);
  const capabilities = strings(payload.features).map(
    (id) => CAPABILITY_LABELS[id as keyof typeof CAPABILITY_LABELS] ?? id,
  );
  const routing = records(payload.routing);
  const evaluation = record(payload.teamEvaluation);
  const trials = records(evaluation.trials);
  const checks = records(evaluation.checks);
  const created = text(payload.savedAt, new Date().toISOString());

  const modelTable = routing.length
    ? routing
        .map((entry) => {
          const readings = record(entry.readings);
          const measured = record(readings.measuredPerformance);
          const decision = record(entry.decision);
          return `| ${oneLine(entry.roleLabel, oneLine(entry.role))} | ${oneLine(entry.modelName)} | ${oneLine(entry.provider)} | #${oneLine(entry.rank, "—")} | ${oneLine(entry.fit, "—")}% | ${oneLine(measured.evidenceLevel, "estimated")} | ${oneLine(decision.state, "not recorded")} |`;
        })
        .join("\n")
    : "| [Fill in: team job] | [Fill in: model] | [Fill in: provider] | — | — | — | — |";

  const trialLines = trials.length
    ? trials
        .map(
          (trial) =>
            `- ${checkbox(trial.outcome === "pass")} **${oneLine(trial.label)} — ${outcomeLabel(trial.outcome)}.** ${oneLine(trial.task)} Pass when: ${oneLine(trial.success)}`,
        )
        .join("\n")
    : "- [ ] [Fill in: representative tasks and a measurable pass condition]";

  const checkLines = checks.length
    ? checks
        .map((check) => `- **${oneLine(check.label)} — ${oneLine(check.status)}.** ${oneLine(check.summary)}`)
        .join("\n")
    : "- [Fill in: structural team checks]";

  const closeCalls = routing
    .map((entry) => ({ entry, decision: record(entry.decision) }))
    .filter(
      ({ decision }) =>
        decision.state === "too-close" ||
        decision.state === "tie-break-choice" ||
        decision.state === "policy-choice" ||
        decision.state === "user-choice",
    )
    .map(
      ({ entry, decision }) =>
        `- **${oneLine(entry.roleLabel, oneLine(entry.role))}:** ${oneLine(decision.reason)} Test: ${oneLine(decision.recommendedTest)}`,
    );

  return `# Draft Application Specification — ${oneLine(applicationType)}

> **Status:** Draft. Complete every \`[Fill in: …]\` field before implementation or procurement.
>
> **Plan:** ${oneLine(payload.name)}  
> **Created:** ${oneLine(created)}  
> **Specification approach:** This draft follows the specification-engineering structure described in [KDnuggets](${SPECIFICATION_GUIDE_URL}): objective, context, inputs, output format, constraints, evaluation criteria, edge cases, and verification steps.

## 1. Objective

**Starting application type:** ${oneLine(applicationType)}  
**Business-goal category:** ${oneLine(optionName(BUSINESS_GOALS, brief.businessGoal, "Not selected"))}

**Objective statement**  
[Fill in: In one or two sentences, state the user problem, the intended outcome, and why an AI-supported application is appropriate.]

**Success for users**  
[Fill in: Describe the observable improvement for the people who will use or be affected by the application.]

**Out of scope**  
[Fill in: List work this application must not attempt.]

## 2. Context

- **Industry:** ${oneLine(optionName(INDUSTRIES, brief.industry, "No specific industry"))}
- **Knowledge area:** ${oneLine(optionName(DOMAINS, brief.domain, "General knowledge"))}
- **Risk level:** ${oneLine(optionName(RISK_LEVELS, brief.risk, "Not selected"))}
- **Selected plan style:** ${oneLine(strategy.name)} — ${oneLine(strategy.description)}
- **People and operating setting:** [Fill in: users, decision owners, locations, languages, accessibility needs, and existing workflow.]
- **Important domain rules:** [Fill in: laws, policies, professional standards, or internal rules that apply.]

## 3. Inputs

### Known work the application must support

${needs.length ? needs.map((need) => `- ${oneLine(need)}`).join("\n") : "- [Fill in: required work]"}

### Model capabilities implied by the current brief

${capabilities.length ? capabilities.map((capability) => `- ${oneLine(capability)}`).join("\n") : "- [Fill in: required capabilities]"}

### Input contract to complete

- **Input sources:** [Fill in: documents, databases, APIs, messages, images, audio, sensors, or user entries.]
- **Required fields or schema:** [Fill in: names, types, required/optional fields, units, and identifiers.]
- **Volume and frequency:** [Fill in: typical and peak items, users, requests, and batch sizes.]
- **Data quality:** [Fill in: missing, duplicated, conflicting, outdated, or low-confidence input handling.]
- **Sensitive data:** ${brief.dataControl ? "Controlled or private handling is preferred by the current brief." : "[Fill in: personal, confidential, regulated, or commercially sensitive data.]"}
- **Allowed external access:** [Fill in: which providers, tools, websites, or networks may receive which data.]

## 4. Output format

- **User-facing outputs:** [Fill in: answer, report, recommendation, generated file, alert, action, or conversation.]
- **Machine-readable contract:** [Fill in: JSON schema, database fields, API response, event, or file format.]
- **Evidence and citations:** [Fill in: which claims require a source and how the source must be shown.]
- **Uncertainty:** [Fill in: confidence wording, refusal rules, and when to say that evidence is insufficient.]
- **Accessibility and language:** [Fill in: reading level, supported languages, alt text, captions, or other requirements.]
- **Record keeping:** [Fill in: what is logged, retained, versioned, or deliberately not stored.]

## 5. Candidate model team

> These are candidates selected by the advisor's current rules. They are not proven winners. Test the complete team on the same representative application tasks before making a final choice.

| Team job | Candidate model | Provider | Job rank | Relative fit | Performance evidence | Decision state |
|---|---|---|---:|---:|---|---|
${modelTable}

### Close calls, tie-break choices and policy choices

${closeCalls.length ? closeCalls.join("\n") : "- No close-call, catalogue tie-break or provider-policy decision was recorded when this draft was saved."}

### Team responsibilities to complete

- **Routing rule:** [Fill in: which job receives each request and how ambiguous requests are handled.]
- **Shared context:** [Fill in: what every member receives, what stays isolated, and how context is summarised.]
- **Tool permissions:** [Fill in: which member can call which tool and under what approval rule.]
- **Fallback order:** [Fill in: timeouts, retry limits, fallback models, and when to stop.]
- **Human responsibility:** [Fill in: who approves high-impact results and who owns incidents.]

## 6. Constraints

- **Data control:** ${brief.dataControl ? "Prefer a controlled, private, or local setup." : "No special deployment preference was selected; confirm the real data-handling requirement."}
- **Downloadable-model preference:** ${brief.openPreferred ? "Preferred." : "Not selected."}
- **Provider diversity:** ${brief.multiVendor ? "Use different providers where a close fit is available." : "Not selected in the saved brief."}
- **Budget:** [Fill in: maximum cost per request, user, month, and peak period.]
- **Response time:** [Fill in: target and maximum response time for each workflow step.]
- **Availability:** [Fill in: service hours, uptime target, recovery-time target, and recovery-point target.]
- **Deployment:** [Fill in: approved regions, cloud/on-premise/edge requirements, and network restrictions.]
- **Security:** [Fill in: identity, access, encryption, secrets, isolation, and audit requirements.]
- **Legal and ethical limits:** [Fill in: prohibited uses, consent, intellectual-property, fairness, and appeal requirements.]

## 7. Evaluation criteria

### Structural checks produced by the advisor

${checkLines}

### Acceptance measures to complete

- **Task completion:** [Fill in: target percentage and scoring rubric for representative tasks.]
- **Correction rate:** [Fill in: maximum factual, reasoning, formatting, or policy corrections.]
- **Evidence quality:** [Fill in: citation accuracy, coverage, and source-quality thresholds.]
- **Safety:** [Fill in: harmful-output, privacy, refusal, escalation, and false-positive thresholds.]
- **Cost:** [Fill in: maximum measured total cost for the complete workflow, including retries and tools.]
- **Speed:** [Fill in: median and 95th-percentile end-to-end response-time targets.]
- **Reliability:** [Fill in: completion rate under expected load and allowed fallback frequency.]
- **Comparison rule:** Use the same tasks, inputs, settings, scoring rubric, and reviewers for every candidate team.

## 8. Edge cases and failure handling

- [Fill in: empty, malformed, oversized, contradictory, adversarial, and unsupported inputs.]
- [Fill in: stale or missing knowledge, unavailable tools, expired credentials, and provider outages.]
- [Fill in: routing loops, duplicate work, incompatible outputs, and context lost between members.]
- [Fill in: a primary model, specialist, checker, or whole provider becoming unavailable.]
- [Fill in: high-risk uncertainty, disputed results, user correction, escalation, and appeal.]
- [Fill in: rollback, safe degraded mode, and the point at which the application must stop.]

## 9. Verification steps

${trialLines}

- [ ] Confirm every output contract with valid and invalid examples.
- [ ] Test every important edge case and failure route listed above.
- [ ] Confirm a checker is genuinely independent where independent review is required.
- [ ] Measure the whole workflow, not only individual model calls.
- [ ] Obtain human approval for high-impact use before release.
- [ ] Record the catalogue, scoring, taxonomy, prompts, tools, data, and evaluation versions used.

## 10. Open decisions and ownership

| Decision | Owner | Due date | Status |
|---|---|---|---|
| [Fill in: first unresolved decision] | [Fill in] | [Fill in] | Open |
| [Fill in: second unresolved decision] | [Fill in] | [Fill in] | Open |

## 11. Version record

- **Catalogue:** ${oneLine(payload.catalogVersion)}
- **Scoring:** ${oneLine(payload.scoringVersion)}
- **Application categories:** ${oneLine(payload.taxonomyVersion)}
- **Draft specification format:** 1.0
- **Last edited:** ${oneLine(payload.lastEditedAt, created)}
`;
}

export function specificationFilename(payload: AnyRecord): string {
  const brief = record(payload.brief);
  const archetype = ARCHETYPES.find((item) => item.id === brief.archetype) ?? ARCHETYPES[0];
  const label = text(brief.customApplicationType, archetype.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `${label || "application"}-draft-specification.md`;
}
