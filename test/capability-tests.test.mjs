import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG } from "../build/data/catalog.js";
import { BENCHMARK_PROTOCOLS, PROTOCOL_INDEX, TIER_RANK, normaliseToFive } from "../build/data/benchmarks.js";
import {
  CAPABILITY_TESTS,
  parseTestReports,
  resolveCapabilityTests,
  testCoverage,
} from "../build/data/capability-tests.js";

const reports = parseTestReports();

test("every published figure parses and carries full provenance", () => {
  assert.ok(reports.length > 40, `expected a substantial table, got ${reports.length}`);
  for (const report of reports) {
    assert.ok(PROTOCOL_INDEX.has(report.protocolId), `${report.modelId}: unknown protocol ${report.protocolId}`);
    assert.ok(report.sourceUrl.startsWith("https://"), `${report.modelId}: source is not an https URL`);
    assert.ok(report.sourceName.length > 3, `${report.modelId}: no source name`);
    assert.ok(report.note.length > 10, `${report.modelId}/${report.protocolId}: note is too thin to be useful`);
    assert.match(report.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(report.rawScore >= 0 && report.rawScore <= 100);
  }
});

test("every model in the results table exists in the catalogue", () => {
  // The resolver deliberately does not import the catalogue, to avoid a cycle.
  // This is where that invariant is actually enforced.
  const catalogIds = new Set(CATALOG.map((model) => model.id));
  for (const modelId of CAPABILITY_TESTS.modelIds) {
    assert.ok(catalogIds.has(modelId), `results reference "${modelId}", which is not in the catalogue`);
  }
});

test("the parser rejects malformed rows rather than shipping them", () => {
  assert.throws(() => parseTestReports("a|b|c"), /expected 9 columns/);
  assert.throws(
    () => parseTestReports("claude-opus-5|not-a-protocol|90|provider|2026-08-18|X|https://x.test|h|note here"),
    /unknown protocol/,
  );
  assert.throws(
    () => parseTestReports("claude-opus-5|mmlu-pro|90|gossip|2026-08-18|X|https://x.test|h|note here"),
    /unknown source tier/,
  );
  assert.throws(
    () => parseTestReports("claude-opus-5|mmlu-pro|900|provider|2026-08-18|X|https://x.test|h|note here"),
    /raw score out of range/,
  );
  assert.throws(
    () => parseTestReports("claude-opus-5|mmlu-pro|90|provider|18-08-2026|X|https://x.test|h|note here"),
    /bad date/,
  );
  assert.throws(
    () => parseTestReports("claude-opus-5|mmlu-pro|90|provider|2026-08-18|X|http://x.test|h|note here"),
    /https URL/,
  );
  assert.throws(
    () => parseTestReports("claude-opus-5|mmlu-pro|90|provider|2026-08-18|X|https://x.test|h|"),
    /must carry a note/,
  );
});

test("each protocol pins a benchmark, a version and its run conditions", () => {
  for (const protocol of BENCHMARK_PROTOCOLS) {
    assert.ok(protocol.benchmark.length > 2, `${protocol.id}: no benchmark name`);
    assert.ok(protocol.datasetVersion.length > 3, `${protocol.id}: no dataset version`);
    assert.ok(protocol.conditions.length > 10, `${protocol.id}: run conditions not stated`);
    assert.ok(protocol.caveat.length > 40, `${protocol.id}: no caveat explaining what it does not show`);
    assert.ok(protocol.url.startsWith("https://"));
    assert.ok(protocol.conflictTolerance > 0);
  }
});

test("tools-enabled and tools-disabled runs are separate protocols", () => {
  // The same models score 10-14 points higher on HLE with tools. Merging the two
  // would make methodology look like capability.
  const withTools = PROTOCOL_INDEX.get("hle-with-tools");
  const withoutTools = PROTOCOL_INDEX.get("hle-no-tools");
  assert.ok(withTools && withoutTools);
  assert.notEqual(withTools.capability, withoutTools.capability);
  assert.notDeepEqual(withTools.bands, withoutTools.bands);
});

test("protocol bands are ordered and cover the whole range", () => {
  for (const protocol of BENCHMARK_PROTOCOLS) {
    const thresholds = protocol.bands.map(([minimum]) => minimum);
    assert.deepEqual(thresholds, [...thresholds].sort((a, b) => b - a), `${protocol.id}: bands are not descending`);
    assert.equal(thresholds.at(-1), 0, `${protocol.id}: bands must have a floor at 0`);
    const scores = protocol.bands.map(([, score]) => score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a), `${protocol.id}: band scores are not descending`);
    for (const score of scores) assert.ok(score >= 1 && score <= 5, `${protocol.id}: band score out of range`);
  }
});

test("normalisation is monotonic and bounded for every protocol", () => {
  for (const protocol of BENCHMARK_PROTOCOLS) {
    let previous = 0;
    for (let raw = 0; raw <= 100; raw += 1) {
      const value = normaliseToFive(protocol, raw);
      assert.ok(value >= 1 && value <= 5, `${protocol.id}: ${raw} normalised to ${value}`);
      assert.ok(value >= previous, `${protocol.id}: normalisation decreased at ${raw}`);
      previous = value;
    }
  }
});

test("a saturated benchmark cannot separate the models that saturated it", () => {
  // GPQA Diamond: frontier models sit between 88 and 95. All must land on the same
  // band, so the tie-break sequence reports them level instead of inventing an
  // order out of the last decimal place.
  const gpqa = PROTOCOL_INDEX.get("gpqa-diamond-no-tools");
  assert.ok(gpqa.saturated);
  const frontier = [88.1, 90.8, 91.2, 92.3, 92.8, 93.2, 94.3, 94.9, 95.45];
  const bands = new Set(frontier.map((score) => normaliseToFive(gpqa, score)));
  assert.equal(bands.size, 1, `saturated protocol produced ${bands.size} different bands: ${[...bands]}`);
});

test("a discriminating benchmark does separate models", () => {
  const arc = PROTOCOL_INDEX.get("arc-agi-2-max-effort");
  assert.equal(arc.saturated, false);
  const observed = [59.5, 60.4, 61.4, 67.1, 77.1, 83.9, 89.2, 90.4, 92.5];
  const bands = new Set(observed.map((score) => normaliseToFive(arc, score)));
  assert.ok(bands.size >= 3, `expected real separation, got ${bands.size} bands`);
});

test("independent sources outrank provider self-reports", () => {
  assert.ok(TIER_RANK.benchmark > TIER_RANK.independent);
  assert.ok(TIER_RANK.independent > TIER_RANK.provider);
  assert.ok(TIER_RANK.provider > TIER_RANK.aggregator);
});

test("sources that agree corroborate; the higher tier represents them", () => {
  // Claude Opus 5 SWE-bench: 97.0 independent, 96.0 aggregator, 1 point apart.
  const coding = CATALOG.find((model) => model.id === "claude-opus-5").capabilityTests.coding;
  const swe = coding.sources.find((source) => source.protocolId === "swe-bench-verified");
  assert.equal(swe.rawScore, 97);
  assert.equal(swe.sourceTier, "independent");
  assert.ok(!swe.disagreements, "figures within tolerance should corroborate, not disagree");
});

test("sources that disagree beyond tolerance produce no test at all", () => {
  // DeepSeek V4 Pro SWE-bench: 96.4 independent vs 80.6 aggregator on the same
  // snapshot. Averaging to 88.5 would invent a number nobody reported.
  const contested = CAPABILITY_TESTS.contested.find(
    (entry) => entry.modelId === "deepseek-v4-pro" && entry.protocolId === "swe-bench-verified",
  );
  assert.ok(contested, "the DeepSeek SWE-bench disagreement should be recorded as contested");
  assert.ok(contested.spread > contested.tolerance);
  assert.equal(contested.reports.length, 2);

  const model = CATALOG.find((entry) => entry.id === "deepseek-v4-pro");
  assert.ok(!model.capabilityTests?.coding, "a contested result must not become a coding test");
});

test("an outlier is recorded rather than dropped or averaged in", () => {
  // Claude Fable 5 GPQA: two sources near 93, one at 55.56. The majority cluster
  // wins and the outlier stays visible.
  const reasoning = CATALOG.find((model) => model.id === "claude-fable-5").capabilityTests.reasoning;
  const gpqa = reasoning.sources.find((source) => source.protocolId === "gpqa-diamond-no-tools");
  assert.ok(gpqa.rawScore > 90, `majority cluster should win, got ${gpqa.rawScore}`);
  assert.ok(gpqa.disagreements?.some((entry) => entry.rawScore === 55.56), "the outlier must stay on the record");
});

test("resolution never invents a value no source reported", () => {
  const reported = new Set(reports.map((report) => `${report.modelId}::${report.protocolId}::${report.rawScore}`));
  for (const [modelId, tests] of CAPABILITY_TESTS.byModel) {
    for (const capabilityTest of Object.values(tests)) {
      for (const source of capabilityTest.sources) {
        assert.ok(
          reported.has(`${modelId}::${source.protocolId}::${source.rawScore}`),
          `${modelId}/${source.protocolId}: raw score ${source.rawScore} was never reported by any source`,
        );
      }
    }
  }
});

test("every attached test is in range and traceable", () => {
  for (const model of CATALOG) {
    if (!model.capabilityTests) continue;
    for (const [capability, capabilityTest] of Object.entries(model.capabilityTests)) {
      assert.ok(capabilityTest.score >= 1 && capabilityTest.score <= 5, `${model.id}/${capability} out of range`);
      assert.ok(capabilityTest.sources.length > 0, `${model.id}/${capability} has no sources`);
      assert.ok(capabilityTest.testedAt, `${model.id}/${capability} has no date`);
      assert.ok(capabilityTest.evaluator, `${model.id}/${capability} names no evaluator`);
      for (const source of capabilityTest.sources) {
        assert.equal(
          PROTOCOL_INDEX.get(source.protocolId).capability,
          capability,
          `${model.id}: ${source.protocolId} is not evidence for ${capability}`,
        );
      }
    }
  }
});

test("a capability whose only evidence is saturated is flagged as such", () => {
  const coverage = testCoverage();
  assert.ok(coverage.saturatedOnly > 0, "expected some saturated-only results in the current data");
  for (const tests of CAPABILITY_TESTS.byModel.values()) {
    for (const capabilityTest of Object.values(tests)) {
      const allSaturated = capabilityTest.sources.every((source) => source.saturated);
      assert.equal(capabilityTest.saturated, allSaturated, "the saturated flag must match the contributing protocols");
      if (allSaturated) {
        assert.match(capabilityTest.notes, /saturated/i, "a saturated result must say so in its notes");
      }
    }
  }
});

test("coverage is reported honestly and is far from complete", () => {
  const coverage = testCoverage();
  assert.ok(coverage.models > 0);
  assert.ok(coverage.models < CATALOG.length, "coverage must not silently claim the whole catalogue");
  assert.equal(coverage.reports, reports.length);
  assert.equal(coverage.protocols, BENCHMARK_PROTOCOLS.length);
});

test("resolution is deterministic", () => {
  const first = resolveCapabilityTests(reports);
  const second = resolveCapabilityTests(reports);
  assert.deepEqual([...first.byModel.keys()].sort(), [...second.byModel.keys()].sort());
  assert.deepEqual(first.contested, second.contested);
});

test("a single unanimous report resolves cleanly", () => {
  const single = resolveCapabilityTests([
    {
      modelId: "claude-opus-5",
      protocolId: "mmlu-pro",
      rawScore: 91.59,
      sourceTier: "aggregator",
      asOf: "2026-08-18",
      sourceName: "Test",
      sourceUrl: "https://example.test",
      harness: "n/a",
      note: "test fixture",
    },
  ]);
  assert.equal(single.contested.length, 0);
  assert.equal(single.byModel.get("claude-opus-5").knowledge.score, 5);
});

test("two irreconcilable reports resolve to contested, not to their midpoint", () => {
  const rows = ["benchmark", "aggregator"].map((tier, index) => ({
    modelId: "claude-opus-5",
    protocolId: "mmlu-pro",
    rawScore: index === 0 ? 95 : 60,
    sourceTier: tier,
    asOf: "2026-08-18",
    sourceName: `Source ${index}`,
    sourceUrl: "https://example.test",
    harness: "n/a",
    note: "test fixture",
  }));
  const resolved = resolveCapabilityTests(rows);
  assert.equal(resolved.byModel.size, 0, "no test should be produced from irreconcilable reports");
  assert.equal(resolved.contested.length, 1);
  assert.equal(resolved.contested[0].spread, 35);
});

test("a majority of agreeing sources outvotes a lone outlier", () => {
  const rows = [95, 94, 60].map((rawScore, index) => ({
    modelId: "claude-opus-5",
    protocolId: "mmlu-pro",
    rawScore,
    sourceTier: "aggregator",
    asOf: "2026-08-18",
    sourceName: `Source ${index}`,
    sourceUrl: "https://example.test",
    harness: "n/a",
    note: "test fixture",
  }));
  const resolved = resolveCapabilityTests(rows);
  assert.equal(resolved.contested.length, 0);
  const knowledge = resolved.byModel.get("claude-opus-5").knowledge;
  assert.ok(knowledge.sources[0].rawScore >= 94);
  assert.equal(knowledge.sources[0].disagreements.length, 1);
  assert.equal(knowledge.sources[0].disagreements[0].rawScore, 60);
});
