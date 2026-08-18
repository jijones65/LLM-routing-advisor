import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG, RETIRED, deriveCostClass, formatContext, parseCatalog } from "../build/data/catalog.js";
import { PROVIDER_SOURCES } from "../build/data/providers.js";

test("catalogue parses and every entry is well formed", () => {
  assert.ok(CATALOG.length > 100, `expected a substantial catalogue, got ${CATALOG.length}`);
  for (const model of CATALOG) {
    assert.match(model.id, /^[a-z0-9][a-z0-9-]*$/, `bad id: ${model.id}`);
    assert.ok(model.name.length > 0, `${model.id} has no name`);
    assert.ok(PROVIDER_SOURCES[model.provider], `${model.id} has an unknown provider`);
    assert.ok(model.cases.length > 0, `${model.id} has no capabilities`);
    assert.ok(model.roles.length > 0, `${model.id} has no roles`);
    assert.ok(model.deployments.length > 0, `${model.id} has no deployments`);
    assert.ok(model.modalities.includes("text"), `${model.id} is not a language model`);
    assert.ok(model.costClass >= 1 && model.costClass <= 5, `${model.id} has a bad cost class`);
    assert.ok(model.summary.length > 10, `${model.id} has no usable summary`);
    assert.ok(model.sourceUrl.startsWith("https://"), `${model.id} has no https source`);
  }
});

test("model ids are unique", () => {
  const ids = CATALOG.map((model) => model.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a drifted entry must explain the drift", () => {
  for (const model of CATALOG) {
    if (model.verification === "drifted") assert.ok(model.driftNote, `${model.id} is drifted with no note`);
  }
});

test("retired ids do not reappear in the live catalogue", () => {
  const live = new Set(CATALOG.map((model) => model.id));
  for (const retired of RETIRED) {
    assert.ok(!live.has(retired.id), `${retired.id} is both retired and live`);
    assert.ok(retired.reason.length > 10, `${retired.id} has no removal reason`);
  }
});

test("cost class is derived from published pricing, not guessed", () => {
  // The specific case the prototype got wrong: Claude Opus 5 at $5/$25 was
  // scored as one of the cheapest models in the catalogue.
  const opus = CATALOG.find((model) => model.id === "claude-opus-5");
  assert.ok(opus, "claude-opus-5 is missing");
  assert.equal(opus.pricing.input, 5);
  assert.equal(opus.pricing.output, 25);
  assert.ok(opus.costClass >= 4, `expected Opus 5 to be expensive, got class ${opus.costClass}`);

  const luna = CATALOG.find((model) => model.id === "gpt-5-6-luna");
  assert.equal(luna.costClass, 1, "GPT-5.6 Luna at $0.20/$1.20 should be the cheapest class");
});

test("deriveCostClass is monotonic in blended price", () => {
  const classes = [
    deriveCostClass({ input: 0.1, output: 0.3 }),
    deriveCostClass({ input: 1, output: 4 }),
    deriveCostClass({ input: 3, output: 12 }),
    deriveCostClass({ input: 8, output: 30 }),
    deriveCostClass({ input: 20, output: 90 }),
  ];
  for (let index = 1; index < classes.length; index += 1) {
    assert.ok(classes[index] >= classes[index - 1], `cost class went down: ${classes.join(",")}`);
  }
});

test("unpriced models get a note explaining why", () => {
  for (const model of CATALOG) {
    if (model.pricing.input === null) assert.ok(model.pricing.note, `${model.id} has no pricing note`);
  }
});

test("context windows format the way a person would say them", () => {
  assert.equal(formatContext(1_000_000), "1M");
  assert.equal(formatContext(1_050_000), "1.05M");
  assert.equal(formatContext(200_000), "200K");
  assert.equal(formatContext(128_000), "128K");
});

test("the parser rejects malformed rows rather than shipping them", () => {
  assert.throws(() => parseCatalog("bad-row|Only|Three"), /expected 14 columns/);
  assert.throws(
    () => parseCatalog("x|X|OpenAI|Frontier|9|2|1000|~2|k|primary|h|t|c|Summary here"),
    /quality must be 1-5/,
  );
  assert.throws(
    () => parseCatalog("x|X|NotAProvider|Frontier|4|2|1000|~2|k|primary|h|t|c|Summary here"),
    /has no entry in PROVIDER_SOURCES/,
  );
  assert.throws(
    () => parseCatalog("x|X|OpenAI|Frontier|4|2|1000|~2|zz|primary|h|t|c|Summary here"),
    /unknown capability code/,
  );
  assert.throws(() => parseCatalog("x|X|OpenAI|Frontier|4|2|1000|~2|k|nonsense|h|t|c|Summary here"), /unknown role/);
  assert.throws(
    () => parseCatalog("x|X|OpenAI|Frontier|4|2|1000|~2|k|primary|h|t|d|Summary here"),
    /must carry a drift note/,
  );
});

test("Cohere Command models are not marked as downloadable", () => {
  // Cohere's docs list the Command family as proprietary. The prototype flagged
  // them open-weight, which let Command A+ win the cost and breadth plan styles
  // on a capability it does not have.
  for (const id of ["command-a-plus", "command-a", "command-a-reasoning"]) {
    const model = CATALOG.find((entry) => entry.id === id);
    assert.ok(model, `${id} is missing`);
    assert.ok(!model.deployments.includes("open-weight"), `${id} should not be open-weight`);
  }
});
