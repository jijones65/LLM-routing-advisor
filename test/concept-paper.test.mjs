import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";
import worker from "../build/server/index.js";
import { analyseConceptPaper } from "../build/server/concepts/analyse.js";

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
  assert.ok(body.analysis.notes.some((note) => /not retained/i.test(note)));
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
