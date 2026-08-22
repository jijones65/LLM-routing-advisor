import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildApplicationRubric,
  ValidationDocumentError,
  evaluateValidationResults,
  generateValidationProtocol,
  parseValidationResults,
} from "../build/server/blueprints/validation.js";

const payload = {
  name: "Balanced team · document intelligence",
  brief: {
    customApplicationType: "Document intelligence",
    needs: ["documents", "structured-data", "current-research", "validate"],
    businessGoal: "operations",
    industry: "financial",
    domain: "business",
    risk: "high",
  },
  conceptPaper: {
    objective: "Extract and verify current supplier obligations from contracts and approved external sources.",
    users: "Procurement analysts and the accountable contract owner.",
    inputs: "Contracts, supplier records, tables and current official notices.",
    outputs: "A structured obligation register with exact evidence, conflicts, confidence and review status.",
    edgeCases: "Scanned pages, missing schedules, conflicting dates and unavailable external sources.",
  },
  routing: [
    {
      role: "primary",
      roleLabel: "Primary model",
      modelName: "Model A",
      provider: "Provider A",
      skillFit: { skills: [{ name: "Read text and documents" }, { name: "Work with tables and structured data" }] },
    },
    {
      role: "researcher",
      roleLabel: "Research specialist",
      modelName: "Model R",
      provider: "Provider R",
      skillFit: { skills: [{ name: "Search current sources" }] },
    },
    { role: "private", roleLabel: "Private or local model", modelName: "Model P", provider: "Provider P" },
    { role: "validator", roleLabel: "Quality and safety checker", modelName: "Model B", provider: "Provider B" },
  ],
  teamEvaluation: {
    trials: [
      {
        id: "representative-task",
        label: "Representative result",
        task: "Run ten representative documents.",
        success: "Nine meet the agreed rubric.",
      },
      {
        id: "handoff",
        label: "Routing and hand-offs",
        task: "Exercise primary-to-checker hand-offs.",
        success: "Nine preserve the required context.",
      },
    ],
  },
  catalogVersion: "catalog-test",
  scoringVersion: "scoring-test",
  taxonomyVersion: "taxonomy-test",
};

function completedProtocol(environment = "macos") {
  return generateValidationProtocol(payload, "plan-123", environment, "2026-08-22T00:00:00.000Z")
    .replace("| Shared test set ID | |", "| Shared test set ID | frozen-set-1 |")
    .replace("| Tester or team | |", "| Tester or team | Evaluation group |")
    .replace("| Started UTC | |", "| Started UTC | 2026-08-22T01:00:00Z |")
    .replace("| Completed UTC | |", "| Completed UTC | 2026-08-22T02:00:00Z |")
    .replace(
      "| representative-task | not-run |  |  |  |  |  |  |  |  |  | |",
      "| representative-task | pass | 10 | 9 | 91 | 1.25 | 800 | 1200 | 0 | 0 | 1 | One correction |",
    )
    .replace(
      "| handoff | not-run |  |  |  |  |  |  |  |  |  | |",
      "| handoff | partial | 10 | 8 | 84 | 0.75 | 900 | 1500 | 0 | 2 | 2 | Two wrong routes |",
    );
}

test("validation protocols adapt to every supported compute environment", () => {
  const expected = {
    macos: /Apple silicon or Intel/,
    windows11: /PowerShell 7/,
    ubuntu: /Ubuntu release and kernel/,
    "cloud-gpu": /instance and GPU model/,
  };
  for (const [environment, text] of Object.entries(expected)) {
    const markdown = generateValidationProtocol(payload, "plan-123", environment);
    assert.match(markdown, text);
    assert.match(markdown, /advisor-validation-meta/);
    assert.match(markdown, /Quality \(0-100\)/);
    assert.match(markdown, /Safety failures/);
    assert.match(markdown, /Routing failures/);
    assert.match(markdown, /Human corrections/);
    assert.match(markdown, /Application-specific workflow and job trials/);
    assert.match(markdown, /Primary model — Model A/);
    assert.match(markdown, /Research specialist — Model R/);
    assert.match(markdown, /Private or local model — Model P/);
    assert.match(markdown, /Application-specific 0–100 quality rubric/);
    assert.match(markdown, /\*\*Total\*\* \| \*\*100\*\*/);
    assert.match(markdown, /Detailed comparison contract/);
    assert.match(markdown, /Draft prompts for writing job-specific trials/);
    assert.match(markdown, /Produce 12 cases/);
    assert.match(markdown, /advisor_trial_runner\.py --trial representative-task/);
  }
  const mac = generateValidationProtocol(payload, "plan-123", "macos");
  assert.match(mac, /Terminal with Python 3\.11 or later/);
  assert.match(mac, /python3 --version/);
});

test("application rubrics are plan-specific and always total 100 points", () => {
  const rubric = buildApplicationRubric(payload);
  assert.equal(
    rubric.reduce((total, criterion) => total + criterion.weight, 0),
    100,
  );
  assert.equal(rubric.length, 8);
  assert.ok(rubric.find((criterion) => criterion.id === "safety")?.rationale.includes("High"));
  const simpler = buildApplicationRubric({
    brief: { customApplicationType: "Writing helper", needs: ["write-explain"] },
  });
  assert.equal(
    simpler.reduce((total, criterion) => total + criterion.weight, 0),
    100,
  );
  assert.notDeepEqual(
    rubric.map((criterion) => criterion.weight),
    simpler.map((criterion) => criterion.weight),
  );
});

test("partial validation evidence is parsed and produces actionable, separate results", () => {
  const parsed = parseValidationResults(completedProtocol(), "plan-123");
  assert.equal(parsed.sharedTestSetId, "frozen-set-1");
  assert.equal(parsed.rows.length, 5);
  assert.equal(parsed.rows[0].quality, 91);
  const evaluation = evaluateValidationResults(parsed, payload);
  assert.equal(evaluation.status, "review-required");
  assert.equal(evaluation.completionPercent, 40);
  assert.equal(evaluation.successRate, 85);
  assert.equal(evaluation.qualityScore, 87.5);
  assert.equal(evaluation.totalCostUsd, 2);
  assert.equal(evaluation.p95Ms, 1500);
  assert.equal(evaluation.routingFailures, 2);
  assert.ok(evaluation.recommendations.some((item) => /routing and hand-off rules/i.test(item)));
});

test("validation uploads reject another plan and invalid numeric claims", () => {
  assert.throws(() => parseValidationResults(completedProtocol(), "another-plan"), ValidationDocumentError);
  assert.throws(
    () => parseValidationResults(completedProtocol().replace("| 91 |", "| 120 |"), "plan-123"),
    /cannot be greater than 100/,
  );
});
