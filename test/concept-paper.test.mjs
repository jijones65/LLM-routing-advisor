import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import worker from "../build/server/index.js";
import { generateBlueprintSpecification } from "../build/server/blueprints/specification.js";
import { analyseConceptPaper } from "../build/server/concepts/analyse.js";
import { structuredTextFromDocxHtml } from "../build/server/concepts/parse.js";

const request = (path, init) => new Request(`https://advisor.test${path}`, init);

async function docxFile(text) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip
    .folder("_rels")
    .file(
      ".rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    );
  const paragraphs = text
    .split("\n")
    .map((line) => `<w:p><w:r><w:t>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</w:t></w:r></w:p>`)
    .join("");
  zip
    .folder("word")
    .file(
      "document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`,
    );
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new File([bytes], "supplier-review-concept.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function pdfFile(text) {
  const escaped = text.replace(/([\\()])/g, "\\$1");
  const stream = `BT /F1 11 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new File([body], "asset-tracking-concept.pdf", { type: "application/pdf" });
}

function specificationFor(analysis) {
  return generateBlueprintSpecification({
    name: "Import round-trip fixture",
    savedAt: "2026-08-22T00:00:00.000Z",
    lastEditedAt: "2026-08-22T00:00:00.000Z",
    brief: {
      customApplicationType: analysis.applicationType,
      archetype: analysis.suggestedArchetype,
      planStyle: "balanced",
      needs: analysis.suggestedNeeds,
      businessGoal: analysis.businessGoal,
      industry: analysis.industry,
      domain: analysis.domain,
      risk: analysis.risk,
      dataControl: analysis.dataControl,
      openPreferred: analysis.openPreferred,
      multiVendor: true,
    },
    features: [],
    routing: [],
    teamEvaluation: { trials: [], checks: [] },
    tools: [],
    conceptPaper: analysis,
    catalogVersion: "fixture",
    scoringVersion: "fixture",
    taxonomyVersion: "fixture",
  });
}

function normalizedWords(value) {
  return (
    value
      .replace(/\[\[(?:H[1-6]|P|LI|CODE|TR|TC|IMAGE|OL|UL|\/?LIST|\/?TABLE|BR)\]\]/g, " ")
      .toLowerCase()
      .match(/[\p{L}\p{N}_.:/-]+/gu) ?? []
  );
}

function orderedWordRetention(source, rendered) {
  const sourceWords = normalizedWords(source);
  const renderedWords = normalizedWords(rendered);
  let matched = 0;
  for (const word of renderedWords) {
    if (word === sourceWords[matched]) matched += 1;
    if (matched === sourceWords.length) break;
  }
  return sourceWords.length ? matched / sourceWords.length : 1;
}

test("an arbitrary concept paper becomes a reviewable brief", () => {
  const analysis = analyseConceptPaper(
    `School Supplier Review Assistant
Objective
Build a decision-support tool that compares current supplier evidence and explains trade-offs to the procurement team.
Users and stakeholders
School procurement staff and an accountable human approver.
Inputs
Read contracts, spreadsheet price tables, policy requirements and current external sources.
Outputs
A cited comparison report and ranked shortlist.
Constraints
Personal data is confidential. Apply policy compliance rules and keep a human approval step.
Evaluation criteria
At least 95% of cited facts must match their source and the complete workflow must stay within budget.
Edge cases
Conflicting supplier claims, missing prices and an unavailable source.
Verification
Run ten representative supplier comparisons and simulate a provider failure.`,
    { fileName: "school-supplier-concept.pdf", fileType: "pdf", pageCount: 2 },
  );
  assert.equal(analysis.applicationType, "School Supplier Review Assistant");
  assert.ok(analysis.objective.includes("decision-support"));
  assert.ok(analysis.inputs.includes("contracts"));
  assert.ok(analysis.outputs.includes("comparison report"));
  assert.ok(analysis.suggestedNeeds.includes("current-research"));
  assert.ok(analysis.suggestedNeeds.includes("apply-policies"));
  assert.ok(analysis.suggestedNeeds.includes("human-review"));
  assert.equal(analysis.industry, "education");
  assert.equal(analysis.dataControl, true);
  assert.equal(analysis.pageCount, 2);
});

test("Word headings, paragraphs, lists, code and tables survive extraction", () => {
  const text = structuredTextFromDocxHtml(
    "<h1>Example specification</h1><p><strong>Audience.</strong> Operations staff.</p><h2>Integration check</h2><p>Run ten representative cases.</p><ul><li>First check<ol><li>Nested numbered check</li></ol></li><li>Second check</li></ul><pre>const result = verify();</pre><table><tr><th>Case</th><th>Expected</th></tr><tr><td>Valid</td><td>Pass</td></tr></table>",
  );
  assert.match(text, /\[\[H1\]\]Example specification/);
  assert.match(text, /\[\[H2\]\]Integration check/);
  assert.match(text, /Audience\. Operations staff/);
  assert.match(text, /\[\[LI\]\]First check/);
  assert.match(text, /\[\[CODE\]\]const result = verify\(\);/);
  assert.match(text, /\[\[TR\]\]Case\[\[TC\]\]Expected/);

  const analysis = analyseConceptPaper(text, { fileName: "structured.docx", fileType: "docx" });
  assert.equal(analysis.sourceDocument.coverage.headingCount, 2);
  assert.equal(analysis.sourceDocument.coverage.listItemCount, 3);
  assert.equal(analysis.sourceDocument.coverage.codeBlockCount, 1);
  assert.equal(analysis.sourceDocument.coverage.tableRowCount, 2);
  assert.equal(analysis.sourceDocument.coverage.retainedTextPercent, 100);

  const specification = specificationFor(analysis);
  assert.match(specification, /Imported source document — complete extracted text/);
  assert.match(specification, /### Example specification/);
  assert.match(specification, /- First check/);
  assert.match(specification, /  1\. Nested numbered check/);
  assert.match(specification, /- Second check/);
  assert.match(specification, /~~~text\nconst result = verify\(\);\n~~~/);
  assert.match(specification, /\| Case \| Expected \|\n\| --- \| --- \|\n\| Valid \| Pass \|/);
  assert.doesNotMatch(specification, /bounded excerpt/i);
  assert.ok(orderedWordRetention(text, specification.split("### Source content")[1]) >= 0.95);
});

test("a long implementation specification is indexed but only bounded evidence drives suggestions", () => {
  const filler = "Routine implementation detail that is not an application objective. ".repeat(2_300);
  const analysis = analyseConceptPaper(
    `[[H1]]AIBusinessHealthWorkforce.md
Build specification for the AI Business Intelligence Engine — agent workforce on OpenClaw.
Audience. Another AI agent executes the build; a human operator owns consequential decisions.
Model. Use a cloud reasoning model for agentic decisions. Do not use a local small model for the source-grounded review flow.
Architecture note (READ THIS FIRST). Implement two persistent agents and nineteen temporary specialist roles.
[[H2]]1. Current state of the host
Extend the working KPI service without rebuilding or breaking its existing path.
[[H2]]2. Architecture summary
The main agent hands a variance review to the finance director.
[[H3]]2.1 Two top-level triggers
The KPI route returns a dashboard. The variance-review route returns a cited PDF and JSON report after approval.
[[H3]]2.2 The two persistent agents plus nineteen temporary roles
Main and director persist. Four managers and fifteen experts are spawned only for their assigned work.
[[H3]]2.3 The call tree
Main calls director; director calls managers; managers call experts and aggregate evidence-backed findings.
[[H3]]2.4 Model-per-role
Use efficient models for lookup, a balanced model for judgement and a premium model for director synthesis.
[[H2]]3. Build order
${filler}
[[H2]]13. Approval gate and delivery
Save a draft PDF and JSON report. Deliver only after the responsible human replies YES.
[[H2]]14. Cite-or-fail rule
Every finding must contain evidence. Missing evidence must be reported rather than invented.
[[H2]]15. What is NOT in scope
Do not replace the approved cloud model with a self-hosted model and do not create a multi-tenant service.
[[H2]]17. Integration check
Confirm twenty role files, the complete hand-off path, the approval gate and both regression routes.`,
    { fileName: "AI_Business_Intelligence_Engine.docx", fileType: "docx" },
  );

  assert.ok(analysis.extractedCharacters > 120_000);
  assert.equal(analysis.analysisTruncated, false);
  assert.equal(analysis.indexedCharacters, analysis.extractedCharacters);
  assert.ok(analysis.analysedCharacters < analysis.indexedCharacters);
  assert.ok(analysis.analysedCharacters <= 50_000);
  assert.equal(analysis.analysisStrategy, "structure-first-v2");
  assert.equal(analysis.evidenceIsSampled, true);
  assert.equal(analysis.documentKind, "implementation-specification");
  assert.equal(analysis.applicationType, "AI Business Intelligence Engine");
  assert.equal(analysis.objective, "");
  assert.ok(analysis.reviewRequired.some((item) => /Objective was not found/i.test(item)));
  assert.match(analysis.users, /human operator owns consequential decisions/i);
  assert.match(analysis.outOfScope, /self-hosted model/i);
  assert.match(analysis.verificationSteps, /twenty role files/i);
  assert.match(analysis.existingArchitecture, /nineteen temporary (?:specialist )?roles/i);
  assert.match(analysis.existingModelGuidance, /premium model for director synthesis/i);
  const buildOrder = analysis.sourceDocument.sections.find((section) => /Build order/i.test(section.heading));
  assert.ok(buildOrder);
  assert.ok(buildOrder.blocks.reduce((length, block) => length + block.text.length, 0) > 100_000);
  assert.equal(analysis.sourceDocument.coverage.retainedTextPercent, 100);
  assert.equal(analysis.sourceDocument.coverage.sourceIndexTruncated, false);
  assert.equal(analysis.additionalSourceSectionsOmitted, 0);
  assert.equal(analysis.sourceMappings.verificationSteps.source, "17. Integration check");
  assert.ok(["data-insight", "finance-insight"].includes(analysis.suggestedArchetype));
  assert.equal(analysis.openPreferred, false);
  assert.notEqual(analysis.inferenceConfidence.openPreferred, "none");

  const specification = specificationFor(analysis);
  assert.match(specification, /## 12\. Imported source document — complete extracted text/);
  assert.match(specification, new RegExp(filler.slice(-200).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(specification, /bounded excerpt/i);
  assert.ok(
    orderedWordRetention(
      analysis.sourceDocument.sections
        .flatMap((section) => [section.heading, ...section.blocks.map((block) => block.text)])
        .join("\n"),
      specification.split("### Source content")[1],
    ) >= 0.95,
  );
});

test("an unfamiliar requirements document maps generic headings without inventing architecture", () => {
  const analysis = analyseConceptPaper(
    `[[H1]]Coastal Wildlife Observation Service
[[H2]]Problem statement
Rangers cannot review every remote camera image quickly enough to protect nesting areas.
[[H2]]People
Park rangers, wildlife researchers and an accountable conservation manager.
[[H2]]Data inputs
Remote camera images, acoustic recordings, weather observations and geospatial coordinates.
[[H2]]Required results
Species detections, confidence scores, a map layer and a review queue for uncertain findings.
[[H2]]Functional requirements
The service must detect animals in images, classify calls in audio and place detections on a map.
[[H2]]Non-functional requirements
Sensitive habitat coordinates must stay in a controlled environment and field stations have limited connectivity.
[[H2]]Operational assumptions
Rangers will review the queue twice each day, and field devices may reconnect only once per shift.
[[H2]]Acceptance criteria
On a labelled field set, recall must exceed 90 percent and every low-confidence result must reach human review.
[[H2]]Test plan
Test daylight, night, poor weather, missing coordinates and an unavailable field station.`,
    { fileName: "wildlife-observation-requirements.docx", fileType: "docx" },
  );

  assert.equal(analysis.documentKind, "requirements-document");
  assert.equal(analysis.applicationType, "Coastal Wildlife Observation Service");
  assert.match(analysis.inputs, /camera images/i);
  assert.match(analysis.outputs, /species detections/i);
  assert.match(analysis.verificationSteps, /daylight/i);
  assert.equal(analysis.existingArchitecture, "");
  assert.equal(analysis.existingModelGuidance, "");
  assert.ok(analysis.sourceDocument.sections.some((section) => section.heading === "Operational assumptions"));
  assert.match(
    analysis.sourceDocument.sections
      .find((section) => section.heading === "Operational assumptions")
      .blocks.map((block) => block.text)
      .join(" "),
    /twice each day/i,
  );
  assert.ok(analysis.suggestedNeeds.includes("computer-vision"));
  assert.ok(analysis.suggestedNeeds.includes("geospatial"));
  assert.equal(analysis.dataControl, true);
});

test("an unrelated prose upload stays low confidence and does not fabricate plan fields", () => {
  const analysis = analyseConceptPaper(
    `Meeting notes from the garden club. Members discussed the spring picnic, flower colours, volunteer availability and the date of the next meeting. No software project, model choice, application requirements, data sources, outputs or success measures were agreed.`,
    { fileName: "garden-club-meeting-notes.pdf", fileType: "pdf" },
  );

  assert.equal(analysis.applicationType, "garden club meeting notes");
  assert.equal(analysis.inferenceConfidence.applicationType, "low");
  assert.equal(analysis.inferenceConfidence.suggestedNeeds, "none");
  assert.deepEqual(analysis.suggestedNeeds, []);
  assert.equal(analysis.objective, "");
  assert.equal(analysis.inputs, "");
  assert.equal(analysis.outputs, "");
  assert.equal(analysis.existingArchitecture, "");
  assert.equal(analysis.existingModelGuidance, "");
  assert.deepEqual(analysis.additionalSourceMaterial, []);
  assert.ok(analysis.reviewRequired.length >= 8);
});

test("the downloadable template follows the eight-part specification structure", async () => {
  const response = await worker.fetch(request("/api/concept-paper-template"), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/markdown/);
  assert.match(response.headers.get("content-disposition"), /ai-application-concept-paper-template\.md/);
  const template = await response.text();
  for (const section of [
    "Objective",
    "Context",
    "Inputs",
    "Output format",
    "Constraints",
    "Evaluation criteria",
    "Edge cases and failure modes",
    "Verification steps",
  ]) {
    assert.match(template, new RegExp(section));
  }
  assert.match(template, /kdnuggets\.com\/specification-engineering/);
});

test("a DOCX upload is read transiently and returns plan suggestions", async () => {
  const file = await docxFile(`Maintenance Planning Copilot
Objective
Improve equipment maintenance by reviewing sensor telemetry and recent service reports.
Users
Field technicians and maintenance planners.
Inputs
Sensor telemetry, equipment readings, reports and inventory records.
Outputs
Prioritised maintenance actions and an exception report.
Constraints
The tool must work at remote sites with limited connectivity.
Evaluation criteria
Detect at least nine of ten known equipment faults in a representative pilot.
Verification
Test normal operation, missing sensor data and an unavailable provider.`);
  const form = new FormData();
  form.append("file", file);
  const response = await worker.fetch(request("/api/concept-paper", { method: "POST", body: form }), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.analysis.fileType, "docx");
  assert.equal(body.analysis.fileName, "supplier-review-concept.docx");
  assert.ok(body.analysis.suggestedNeeds.includes("sensor-streams"));
  assert.ok(body.analysis.suggestedNeeds.includes("field-mobile"));
  assert.ok(body.analysis.objective.includes("maintenance"));
  assert.ok(body.analysis.notes.some((note) => /complete source appendix/i.test(note)));
  assert.equal(body.analysis.sourceDocument.coverage.retainedTextPercent, 100);
});

test("a text PDF is read into an application brief", async () => {
  const form = new FormData();
  form.append(
    "file",
    pdfFile(
      "Real-time Asset Tracking Objective Build an application that uses camera evidence, sensor telemetry and location data to alert warehouse staff about missing assets. Outputs include reviewed alerts and exception reports. Verification uses ten representative tests.",
    ),
  );
  const response = await worker.fetch(request("/api/concept-paper", { method: "POST", body: form }), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.analysis.fileType, "pdf");
  assert.equal(body.analysis.pageCount, 1);
  assert.equal(body.analysis.suggestedArchetype, "real-time-asset-tracking");
  assert.ok(body.analysis.suggestedNeeds.includes("sensor-streams"));
  assert.ok(body.analysis.notes.some((note) => /text layer/i.test(note)));
});

test("concept-paper upload rejects unsupported and empty files", async () => {
  const unsupported = new FormData();
  unsupported.append("file", new File(["plain text"], "concept.txt", { type: "text/plain" }));
  assert.equal(
    (await worker.fetch(request("/api/concept-paper", { method: "POST", body: unsupported }), {})).status,
    415,
  );

  const empty = new FormData();
  empty.append("file", new File([], "empty.pdf", { type: "application/pdf" }));
  assert.equal((await worker.fetch(request("/api/concept-paper", { method: "POST", body: empty }), {})).status, 400);
});
