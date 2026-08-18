import assert from "node:assert/strict";
import worker from "../worker/index.js";

const response = await worker.fetch(new Request("https://example.test/api/catalog"), {});
const {models} = await response.json();
const cases = ["knowledge", "rag", "safety", "reasoning"];
const styles = {
  quality:{quality:8,cost:.25,latency:.25,adoption:.03},
  balanced:{quality:3,cost:3,latency:2,adoption:.12},
  cost:{quality:1,cost:8,latency:1,adoption:.02},
  proven:{quality:2,cost:1,latency:1,adoption:.42},
  broad:{quality:2,cost:2,latency:2,adoption:.04,breadth:1.6},
  focused:{quality:2,cost:2,latency:2,adoption:.02,focus:1.8},
};

function capabilityRange(x) {
  return Math.min(24, new Set(x.cases).size + Math.min(5,new Set(x.roles).size) + Math.min(4,new Set(x.modalities).size) + Math.min(3,new Set(x.deployments).size));
}
function adoptionScore(x) {
  return Math.round(((x.signals?.ecosystemMaturity || 0) + (x.signals?.realWorldExposure || 0)) / 2);
}
function score(x, role, style) {
  const capabilityFit = cases.reduce((total, capability) => total + (x.cases.includes(capability) ? 3.5 : -.8), 0);
  const roleEvidence = x.roles.includes(role) ? 7 : 0;
  const range = capabilityRange(x);
  const focused = Math.max(0, 20-range) + (x.tier === "Specialist" ? 4 : 0);
  return capabilityFit + roleEvidence + x.quality*style.quality + (6-x.cost)*style.cost*.75 + x.speed*style.latency*.65 + adoptionScore(x)*(style.adoption || 0) + range*(style.breadth || 0) + focused*(style.focus || 0) + (x.status === "active" ? 2 : x.status === "preview" ? -1 : -2);
}

assert.equal(models.length, 107);
assert.ok(models.every(model => model.signals && Number.isFinite(model.signals.ecosystemMaturity) && Number.isFinite(model.signals.realWorldExposure)));

const rankings = {};
for (const [id, style] of Object.entries(styles)) {
  rankings[id] = models.map(model => ({model, score: score(model, "primary", style)})).sort((a,b) => b.score-a.score);
  assert.equal(rankings[id].length, 107, `${id} should score every model variant`);
  assert.ok(rankings[id].every(entry => Number.isFinite(entry.score)), `${id} should produce finite scores`);
}

const commonWinners = ["quality", "balanced", "cost"].map(id => rankings[id][0].model.id);
assert.equal(new Set(commonWinners).size, 3, "quality, balanced and cost should show distinct starting choices for the default brief");
assert.ok(new Set(Object.values(rankings).map(entries => entries[0].model.id)).size >= 4, "top-level styles should produce meaningfully different choices");
assert.ok(capabilityRange(rankings.broad[0].model) > capabilityRange(rankings.focused[0].model), "broad and focused styles should differ in capability range");
assert.ok(models.some(model => !model.roles.includes("primary") && Number.isFinite(score(model,"primary",styles.balanced))), "a job label must not gate a model out of the ranking");

console.log(JSON.stringify({
  status:"recommendation-behaviour-valid",
  scoredModelVariants:models.length,
  commonWinners:Object.fromEntries(["quality","balanced","cost"].map(id => [id,rankings[id][0].model.name])),
  topLevelWinners:Object.fromEntries(Object.keys(styles).map(id => [id,rankings[id][0].model.name])),
}));
