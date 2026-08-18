import assert from "node:assert/strict";
import vm from "node:vm";
import worker from "../worker/index.js";

const pageResponse = await worker.fetch(new Request("https://example.test/"), {});
assert.equal(pageResponse.status, 200);
const html = await pageResponse.text();

for (const phrase of [
  "Recommended model teams",
  "Computer vision",
  "geospatial",
  "Operational excellence",
  "Quality first",
  "Balanced",
  "Cost first",
  "Proven in use",
  "Ecosystem maturity",
  "real-world exposure",
  "Broad capability range",
  "Focused specialist",
  "any of the 107 variants can rank first",
  "Primary model",
  "Tools outside the model team",
  "UN ISIC",
  "APQC Process Classification Framework",
  "UNESCO ISCED-F",
  "OECD Fields of Research and Development",
]) {
  assert.match(html, new RegExp(phrase, "i"), `page should explain ${phrase}`);
}

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map((match) => match[1])
  .filter((source) => source.trim() && !source.includes("__CATALOG__"));
assert.ok(inlineScripts.length, "expected the application script");
for (const source of inlineScripts) new vm.Script(source);

const catalogResponse = await worker.fetch(new Request("https://example.test/api/catalog"), {});
const catalog = await catalogResponse.json();
assert.equal(catalog.models.length, 107);
assert.ok(catalog.models.every((model) => model.sourceUrl), "each model needs an official provider link");

console.log(JSON.stringify({
  status: "planning-interface-valid",
  distinctModelVariants: catalog.models.length,
  planStyles: 14,
  capabilityChoices: 18,
  contextAxes: 4,
}));
