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

function sourceCell(value: unknown): string {
  return text(value, "").replace(/\r?\n/g, "<br>").replaceAll("|", "\\|");
}

function renderSourceBlocks(value: unknown): string {
  const blocks = records(value);
  const output: string[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const kind = text(block.kind, "paragraph");
    if (kind === "table-row") {
      const rows: string[][] = [];
      while (index < blocks.length && text(blocks[index].kind, "") === "table-row") {
        rows.push(strings(blocks[index].cells).map(sourceCell));
        index += 1;
      }
      index -= 1;
      const columns = Math.max(1, ...rows.map((row) => row.length));
      const normalized = rows.map((row) => [...row, ...Array(Math.max(0, columns - row.length)).fill("")]);
      if (normalized.length) {
        output.push(
          [
            `| ${normalized[0].join(" | ")} |`,
            `| ${Array.from({ length: columns }, () => "---").join(" | ")} |`,
            ...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`),
          ].join("\n"),
        );
      }
      continue;
    }
    const content = text(block.text, "");
    if (!content) continue;
    if (kind === "list-item") {
      const rawLevel = Number(block.level);
      const level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(6, rawLevel)) : 0;
      output.push(`${"  ".repeat(level)}${block.ordered === true ? "1." : "-"} ${content}`);
    } else if (kind === "code") {
      output.push(`~~~text\n${content}\n~~~`);
    } else if (kind === "image") {
      output.push(`> **Source image or diagram:** ${content}. Review the original file for visual content.`);
    } else {
      output.push(content);
    }
  }
  return output.join("\n\n");
}

function renderSourceAppendix(concept: AnyRecord): string {
  const source = record(concept.sourceDocument);
  const opening = renderSourceBlocks(source.openingBlocks);
  const sections = records(source.sections);
  if (!opening && !sections.length) return "";
  const coverage = record(source.coverage);
  const sourceContent = [
    opening,
    ...sections.map((section) => {
      const originalLevel = Number(section.sourceLevel);
      const level = Number.isFinite(originalLevel) ? Math.min(6, Math.max(3, originalLevel + 2)) : 4;
      const id = oneLine(section.id, "source-section").replace(/[^a-z0-9-]/gi, "-");
      return `<a id="${id}"></a>\n\n${"#".repeat(level)} ${text(section.heading, "Untitled source section")}\n\n${renderSourceBlocks(section.blocks)}`;
    }),
  ]
    .filter(Boolean)
    .join("\n\n");
  const visualWarning =
    coverage.visualReviewRequired === true
      ? "\n> **Visual review required:** Images, diagrams, scanned material or page layout may contain information that text extraction cannot reproduce. Keep the original file as the authority for those elements.\n"
      : "";
  const indexWarning =
    coverage.sourceIndexTruncated === true
      ? "\n> **Incomplete source index:** The document exceeded the import ceiling. Re-export a shorter document or split it before treating this appendix as complete.\n"
      : "";
  return `## 12. Imported source document — complete extracted text

> This appendix preserves the uploaded document's extracted text in its original order. Mapping a section into the specification above does not remove it here. Coverage is measured against extractable text, not visual fidelity.

- **Extracted text retained:** ${oneLine(coverage.retainedTextPercent, "not recorded")}% (${oneLine(coverage.retainedTextCharacters, "not recorded")} of ${oneLine(coverage.extractedTextCharacters, "not recorded")} normalized characters)
- **Source structure:** ${oneLine(coverage.headingCount, "0")} headings · ${oneLine(coverage.paragraphCount, "0")} paragraphs · ${oneLine(coverage.listItemCount, "0")} list items · ${oneLine(coverage.codeBlockCount, "0")} code blocks · ${oneLine(coverage.tableRowCount, "0")} table rows
- **Recommendation evidence:** ${oneLine(coverage.evidenceCharacters, "not recorded")} characters (${oneLine(coverage.evidencePercent, "not recorded")}% of retained text). This bounded subset influenced Skills and team suggestions; it did not limit this appendix.
${visualWarning}${indexWarning}
### Source content

${sourceContent}`;
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
  const tools = records(payload.tools);
  const created = text(payload.savedAt, new Date().toISOString());
  const concept = record(payload.conceptPaper);
  const conceptFile = typeof concept.fileName === "string" ? concept.fileName.trim() : "";
  const sourceMappings = record(concept.sourceMappings);
  const conceptValue = (field: string, fallback: string): string =>
    typeof concept[field] === "string" && String(concept[field]).trim() ? oneLine(concept[field]) : fallback;
  const documentKind = oneLine(concept.documentKind, "application document").replaceAll("-", " ");
  const inferenceConfidence = record(concept.inferenceConfidence);
  const reviewRequired = strings(concept.reviewRequired);
  const additionalSourceSections = records(concept.additionalSourceMaterial);
  const additionalSourceSectionsOmitted =
    typeof concept.additionalSourceSectionsOmitted === "number" ? concept.additionalSourceSectionsOmitted : 0;
  const selectedEvidence =
    typeof concept.analysedCharacters === "number" ? concept.analysedCharacters.toLocaleString() : "not recorded";
  const sourceDocument = record(concept.sourceDocument);
  const sourceCoverage = record(sourceDocument.coverage);
  const sourceAppendix = renderSourceAppendix(concept);

  const sourceMapLabels: readonly [string, string][] = [
    ["applicationType", "Application name"],
    ["objective", "Objective"],
    ["context", "Context"],
    ["users", "People and users"],
    ["inputs", "Inputs"],
    ["outputs", "Outputs"],
    ["constraints", "Constraints"],
    ["outOfScope", "Out of scope"],
    ["evaluationCriteria", "Evaluation criteria"],
    ["edgeCases", "Edge cases"],
    ["verificationSteps", "Verification"],
    ["existingArchitecture", "Existing architecture"],
    ["existingModelGuidance", "Existing model guidance"],
  ];
  const sourceMapRows = sourceMapLabels
    .map(([field, label]) => ({ label, mapping: record(sourceMappings[field]) }))
    .filter(({ mapping }) => typeof mapping.source === "string" && mapping.source.trim())
    .map(({ label, mapping }) => {
      const sourceIds = strings(mapping.sourceIds);
      const source = oneLine(mapping.source);
      const linkedSource = sourceIds[0]
        ? `[${source}](#${oneLine(sourceIds[0]).replace(/[^a-z0-9-]/gi, "-")})`
        : source;
      return `| ${oneLine(label)} | ${linkedSource} | ${oneLine(mapping.confidence, "review")} |`;
    })
    .join("\n");
  const additionalSourceMarkdown =
    !sourceAppendix && additionalSourceSections.length
      ? `### Additional material from the uploaded document

These named source sections did not map directly into the standard specification fields. They are retained for review rather than discarded or silently forced into an unrelated field.

${additionalSourceSections
  .map((section) => {
    const shortened = section.truncated === true ? " · bounded excerpt" : "";
    return `#### ${oneLine(section.heading)}

_Original heading level ${oneLine(section.sourceLevel, "not recorded")}${shortened}_

${oneLine(section.content)}`;
  })
  .join("\n\n")}

${
  additionalSourceSectionsOmitted
    ? `> ${additionalSourceSectionsOmitted} further useful source ${additionalSourceSectionsOmitted === 1 ? "section was" : "sections were"} not retained because the bounded additional-material limit was reached.`
    : ""
}
`
      : "";

  const existingArchitecture = conceptValue("existingArchitecture", "");
  const existingModelGuidance = conceptValue("existingModelGuidance", "");
  const sourceArchitecture =
    existingArchitecture || existingModelGuidance
      ? `### Architecture already described in the uploaded document

${existingArchitecture || "[The document contains model guidance but no clearly mapped team structure.]"}

${existingModelGuidance ? `### Model guidance already stated in the document\n\n${existingModelGuidance}\n` : ""}
> The advisor candidates below are a comparison and refinement layer. They do not silently replace the source document's stated team, roles or model policy.

### Advisor candidate team
`
      : "";

  const modelTable = routing.length
    ? routing
        .map((entry) => {
          const readings = record(entry.readings);
          const measured = record(readings.measuredPerformance);
          const decision = record(entry.decision);
          const policy = record(entry.operatingPolicy);
          return `| ${oneLine(entry.roleLabel, oneLine(entry.role))} | ${oneLine(entry.modelName)} | ${oneLine(entry.provider)} | ${oneLine(policy.label, "Not recorded")} | ${oneLine(policy.qualityTarget, "—")}/5 | #${oneLine(entry.rank, "—")} | ${oneLine(entry.fit, "—")}% | ${oneLine(measured.evidenceLevel, "estimated")} | ${oneLine(decision.state, "not recorded")} |`;
        })
        .join("\n")
    : "| [Fill in: team job] | [Fill in: model] | [Fill in: provider] | [Fill in: operating mode] | — | — | — | — | — |";

  const operatingPolicies = routing.length
    ? routing
        .map((entry) => {
          const policy = record(entry.operatingPolicy);
          return `- **${oneLine(entry.roleLabel, oneLine(entry.role))}:** Route — ${oneLine(policy.routingRule)} Escalate — ${oneLine(policy.escalationRule)} Measure — ${oneLine(policy.successMeasure)}`;
        })
        .join("\n")
    : "- [Fill in: route, escalation and useful-work measure for every team job]";

  const skillFitRationales = routing.length
    ? routing
        .map((entry) => {
          const fit = record(entry.skillFit);
          const skills = records(fit.skills);
          const skillLines = skills.length
            ? skills
                .map(
                  (skill) =>
                    `  - **${oneLine(skill.name)} — ${oneLine(skill.state, "not recorded")}.** ${oneLine(skill.reason)}`,
                )
                .join("\n")
            : "  - [Fill in: skill-by-skill fit rationale]";
          return `- **${oneLine(entry.roleLabel, oneLine(entry.role))} — ${oneLine(entry.modelName)}.** ${oneLine(fit.summary)}\n${skillLines}`;
        })
        .join("\n")
    : "- [Fill in: why each candidate model is a reasonable match for the Skills assigned to its job]";

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

  const toolLines = tools.length
    ? tools
        .map((tool) => {
          const links = records(tool.links)
            .map((link) => `[${oneLine(link.name)}](${text(link.url)})`)
            .join(" · ");
          return `- **${oneLine(tool.name)}.** ${oneLine(tool.reason)}${links ? ` Sources: ${links}` : ""}`;
        })
        .join("\n")
    : "- [Fill in: search, data, sensor, runtime, workflow, calculation and review components the application needs outside its language models]";

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
${conceptFile ? `> **Imported document:** ${oneLine(conceptFile)} · imported ${oneLine(concept.importedAt, "date not recorded")}  \n` : ""}> **Specification approach:** This draft follows the specification-engineering structure described in [KDnuggets](${SPECIFICATION_GUIDE_URL}): objective, context, inputs, output format, constraints, evaluation criteria, edge cases, and verification steps.
${
  conceptFile
    ? sourceAppendix
      ? `> **Suggested document type:** ${documentKind} · ${oneLine(inferenceConfidence.documentKind, "unrated")} confidence  \n> **Import method:** Structure-first mapping 1.2 · ${oneLine(sourceCoverage.retainedTextPercent, "not recorded")}% of extracted text retained · ${selectedEvidence} characters used for suggestions · ${reviewRequired.length} review items  \n`
      : `> **Suggested document type:** ${documentKind} · ${oneLine(inferenceConfidence.documentKind, "unrated")} confidence  \n> **Import method:** Legacy structure-first mapping · ${selectedEvidence} characters analysed · ${reviewRequired.length} review items  \n`
    : ""
}

## 1. Objective

**Starting application type:** ${oneLine(applicationType)}  
**Business-goal category:** ${oneLine(optionName(BUSINESS_GOALS, brief.businessGoal, "Not selected"))}

**Objective statement**  
${conceptValue("objective", "[Fill in: In one or two sentences, state the user problem, the intended outcome, and why an AI-supported application is appropriate.]")}

**Success for users**  
${conceptValue("evaluationCriteria", "[Fill in: Describe the observable improvement for the people who will use or be affected by the application.]")}

**Out of scope**  
${conceptValue("outOfScope", "[Fill in: List work this application must not attempt.]")}

## 2. Context

- **Industry:** ${oneLine(optionName(INDUSTRIES, brief.industry, "No specific industry"))}
- **Knowledge area:** ${oneLine(optionName(DOMAINS, brief.domain, "General knowledge"))}
- **Risk level:** ${oneLine(optionName(RISK_LEVELS, brief.risk, "Not selected"))}
- **Selected plan style:** ${oneLine(strategy.name)} — ${oneLine(strategy.description)}
- **Concept-paper context:** ${conceptValue("context", "[Fill in: background, current state, rationale and operating environment.]")}
- **People and operating setting:** ${conceptValue("users", "[Fill in: users, decision owners, locations, languages, accessibility needs, and existing workflow.]")}
- **Important domain rules:** [Fill in: laws, policies, professional standards, or internal rules that apply.]

${
  sourceMapRows
    ? `### How the uploaded document was mapped

| Draft area | Source section or label | Mapping confidence |
|---|---|---|
${sourceMapRows}

Blank draft fields were left for review rather than filled from a weak phrase match.

${
  reviewRequired.length
    ? `### Import review checklist

${reviewRequired.map((item) => `- [ ] ${oneLine(item)}`).join("\n")}
`
    : ""
}
`
    : ""
}

${additionalSourceMarkdown}

## 3. Inputs

### Known work the application must support

${needs.length ? needs.map((need) => `- ${oneLine(need)}`).join("\n") : "- [Fill in: required work]"}

### Model capabilities implied by the current brief

${capabilities.length ? capabilities.map((capability) => `- ${oneLine(capability)}`).join("\n") : "- [Fill in: required capabilities]"}

### Input contract to complete

- **Input sources:** ${conceptValue("inputs", "[Fill in: documents, databases, APIs, messages, images, audio, sensors, or user entries.]")}
- **Required fields or schema:** [Fill in: names, types, required/optional fields, units, and identifiers.]
- **Volume and frequency:** [Fill in: typical and peak items, users, requests, and batch sizes.]
- **Data quality:** [Fill in: missing, duplicated, conflicting, outdated, or low-confidence input handling.]
- **Sensitive data:** ${brief.dataControl ? "Controlled or private handling is preferred by the current brief." : "[Fill in: personal, confidential, regulated, or commercially sensitive data.]"}
- **Allowed external access:** [Fill in: which providers, tools, websites, or networks may receive which data.]

## 4. Output format

- **User-facing outputs:** ${conceptValue("outputs", "[Fill in: answer, report, recommendation, generated file, alert, action, or conversation.]")}
- **Machine-readable contract:** [Fill in: JSON schema, database fields, API response, event, or file format.]
- **Evidence and citations:** [Fill in: which claims require a source and how the source must be shown.]
- **Uncertainty:** [Fill in: confidence wording, refusal rules, and when to say that evidence is insufficient.]
- **Accessibility and language:** [Fill in: reading level, supported languages, alt text, captions, or other requirements.]
- **Record keeping:** [Fill in: what is logged, retained, versioned, or deliberately not stored.]

## 5. Existing architecture and candidate model team

${sourceArchitecture}

> These are candidates selected by the advisor's current rules. They are not proven winners. Test the complete team on the same representative application tasks before making a final choice.

| Team job | Candidate model | Provider | Operating mode | Quality target | Job rank | Relative fit | Performance evidence | Decision state |
|---|---|---|---|---:|---:|---:|---|---|
${modelTable}

### Quality, cost and routing policy

> High-quality output remains a requirement for every job. Cost is optimised by routing defined, repeatable work to efficient models and escalating uncertain, failed or high-impact work. The planning targets are not proof of measured quality.

${operatingPolicies}

- **Useful-work efficiency:** Measure successful tasks that meet the output rubric per total dollar and elapsed minute. Include model calls, tools, retries, fallbacks and human corrections. Do not use token volume alone as a quality or productivity measure.
- **Quality target ownership:** [Fill in: who approves the task-specific quality rubric and the minimum acceptable result for each job.]
- **Escalation budget:** [Fill in: how often a routine route may escalate before the cost or architecture must be reviewed.]

### Why these models fit the selected Skills

> Each rationale traces a plain-language Skill to the capability building blocks stated for the model and any recorded capability-specific tests. A stated match is not measured proof for this application.

${skillFitRationales}

### Required non-model components

> A complete application may need sensor, positioning, perception, runtime, data, workflow and review components. They are recorded separately so a detector, tracker or device runtime is not misrepresented as a language-model team member.

${toolLines}

### Close calls, tie-break choices and policy choices

${closeCalls.length ? closeCalls.join("\n") : "- No close-call, catalogue tie-break or provider-policy decision was recorded when this draft was saved."}

### Team responsibilities to complete

- **Routing rule:** [Fill in: which job receives each request and how ambiguous requests are handled.]
- **Shared context:** [Fill in: what every member receives, what stays isolated, and how context is summarised.]
- **Tool permissions:** [Fill in: which member can call which tool and under what approval rule.]
- **Fallback order:** [Fill in: timeouts, retry limits, fallback models, and when to stop.]
- **Human responsibility:** [Fill in: who approves high-impact results and who owns incidents.]

## 6. Constraints

${conceptFile ? `- **Requirements inferred from the concept paper:** ${conceptValue("constraints", "No explicit constraints were found; complete the fields below.")}` : ""}
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

${conceptFile ? `- **Concept-paper success criteria:** ${conceptValue("evaluationCriteria", "No explicit success criteria were found; define measurable acceptance targets below.")}` : ""}
- **Task completion:** [Fill in: target percentage and scoring rubric for representative tasks.]
- **Correction rate:** [Fill in: maximum factual, reasoning, formatting, or policy corrections.]
- **Evidence quality:** [Fill in: citation accuracy, coverage, and source-quality thresholds.]
- **Safety:** [Fill in: harmful-output, privacy, refusal, escalation, and false-positive thresholds.]
- **Cost:** [Fill in: maximum measured total cost for the complete workflow, including retries and tools.]
- **Speed:** [Fill in: median and 95th-percentile end-to-end response-time targets.]
- **Reliability:** [Fill in: completion rate under expected load and allowed fallback frequency.]
- **Comparison rule:** Use the same tasks, inputs, settings, scoring rubric, and reviewers for every candidate team.

## 8. Edge cases and failure handling

${conceptFile ? `- **From the concept paper:** ${conceptValue("edgeCases", "No explicit edge cases or failure modes were found.")}` : ""}
- [Fill in: empty, malformed, oversized, contradictory, adversarial, and unsupported inputs.]
- [Fill in: stale or missing knowledge, unavailable tools, expired credentials, and provider outages.]
- [Fill in: routing loops, duplicate work, incompatible outputs, and context lost between members.]
- [Fill in: a primary model, specialist, checker, or whole provider becoming unavailable.]
- [Fill in: high-risk uncertainty, disputed results, user correction, escalation, and appeal.]
- [Fill in: rollback, safe degraded mode, and the point at which the application must stop.]

## 9. Verification steps

${conceptFile ? `- [ ] **Concept-paper verification:** ${conceptValue("verificationSteps", "No explicit verification steps were found; define representative tests below.")}` : ""}
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
- **Draft specification format:** 1.2
- **Last edited:** ${oneLine(payload.lastEditedAt, created)}
${sourceAppendix ? `\n${sourceAppendix}\n` : ""}
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
