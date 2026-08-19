import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG } from "../build/data/catalog.js";
import { STRATEGIES, PRIMARY_STRATEGY_IDS, OTHER_STRATEGY_IDS } from "../build/data/strategies.js";
import { withSignals, capabilityRange } from "../build/engine/signals.js";
import {
  applicationSpecialisation,
  USER_CHOICE_SCORE_GAP,
  completeBrief,
  deriveCases,
  deriveRoles,
  planFor,
  recommendedTools,
} from "../build/engine/planning.js";
import {
  fitPercent,
  ineligibleReason,
  jobOperatingPolicy,
  jobRequirements,
  qualityForJob,
  rankForRole,
  scoreModel,
} from "../build/engine/scoring.js";
import { explainEntry, explainPlan, skillFitSummary, tradeOffs } from "../build/engine/explain.js";
import { evaluateTeam } from "../build/engine/team-evaluation.js";

const catalog = withSignals(CATALOG);

const baseBrief = {
  archetype: "knowledge-assistant",
  needs: ["internal-knowledge", "write-explain", "validate"],
  businessGoal: "service",
  industry: "general",
  domain: "general",
  risk: "medium",
  planStyle: "balanced",
  dataControl: false,
  openPreferred: false,
  multiVendor: true,
};

const brief = (overrides = {}) => completeBrief({ ...baseBrief, ...overrides });

test("capabilities are derived from needs, goal and risk", () => {
  const cases = deriveCases(baseBrief);
  assert.ok(cases.includes("knowledge"));
  assert.ok(cases.includes("rag"));
  assert.ok(cases.includes("safety"), "the validate need implies safety");

  assert.ok(deriveCases({ ...baseBrief, risk: "high" }).includes("safety"));
  assert.ok(deriveCases({ ...baseBrief, dataControl: true }).includes("private"));
  assert.ok(deriveCases({ ...baseBrief, businessGoal: "innovation" }).includes("research"));
});

test("a custom application label keeps the starter needs and builds a team", () => {
  const custom = brief({ customApplicationType: "Supplier comparison for a school" });
  assert.equal(custom.customApplicationType, "Supplier comparison for a school");
  assert.ok(custom.cases.includes("knowledge"));
  assert.ok(planFor(catalog, custom, "balanced").entries.length >= 2);
});

test("a model recommendation traces relevant Skills to stated and tested evidence", () => {
  const application = brief({
    archetype: "software-agent",
    needs: ["code-build", "system-integration", "service-monitoring", "validate"],
  });
  const plan = planFor(catalog, application, "balanced");
  const coding = plan.entries.find((entry) => entry.role.id === "coder") ?? plan.entries[0];
  const rationale = skillFitSummary(coding, application);

  assert.ok(rationale.skills.length > 0);
  assert.ok(rationale.skills.some((skill) => skill.id === "code-build"));
  assert.ok(rationale.skills.every((skill) => ["stated-match", "partial-match", "gap"].includes(skill.state)));
  assert.ok(rationale.skills.every((skill) => skill.reason.includes("record")));
  assert.doesNotMatch(rationale.summary, /proven winner|demonstrably better/i);
  assert.match(rationale.summary, /testable rationale, not proof/i);
});

test("every plan style produces a complete team", () => {
  for (const styleId of [...PRIMARY_STRATEGY_IDS, ...OTHER_STRATEGY_IDS]) {
    const plan = planFor(catalog, brief({ planStyle: styleId }), styleId);
    assert.ok(plan.entries.length >= 2, `${styleId} produced ${plan.entries.length} jobs`);
    assert.equal(plan.entries[0].role.id, "primary", `${styleId} did not lead with a primary model`);
    assert.ok(
      plan.entries.some((entry) => entry.role.id === "validator"),
      `${styleId} has no checker`,
    );
    assert.equal(plan.unfilled.length, 0, `${styleId} left a job unfilled`);
    for (const entry of plan.entries) {
      const attainable = rankForRole(
        catalog,
        entry.role.role,
        brief({ planStyle: styleId }),
        STRATEGIES[styleId],
      ).ranked.some((candidate) => candidate.readings.measuredPerformance.score >= entry.operatingPolicy.qualityTarget);
      if (attainable) {
        assert.ok(
          entry.readings.measuredPerformance.score >= entry.operatingPolicy.qualityTarget,
          `${styleId}/${entry.role.id} did not meet an attainable planning quality target`,
        );
      }
    }
  }
});

test("a team limit cuts specialists, never the checker", () => {
  const plan = planFor(
    catalog,
    brief({ planStyle: "small", needs: ["code-build", "current-research", "computer-vision", "validate"] }),
    "small",
  );
  assert.ok(plan.entries.length <= 3, `expected at most 3 jobs, got ${plan.entries.length}`);
  assert.ok(plan.entries.some((entry) => entry.role.id === "validator"));
});

test("fit is always between 0 and 100", () => {
  for (const styleId of [...PRIMARY_STRATEGY_IDS, ...OTHER_STRATEGY_IDS]) {
    const plan = planFor(catalog, brief({ planStyle: styleId }), styleId);
    for (const entry of plan.entries) {
      assert.ok(entry.fit >= 0 && entry.fit <= 100, `${styleId}/${entry.role.id} fit was ${entry.fit}`);
      for (const alternative of entry.alternatives) {
        assert.ok(alternative.fit >= 0 && alternative.fit <= 100, `alternative fit was ${alternative.fit}`);
      }
    }
  }
});

test("fit stays in range when every score is negative", () => {
  // The prototype divided by the top score, so a set of negative scores produced
  // figures above 100% or below zero. Cost-first weights make this routine.
  const ranked = [{ score: -1 }, { score: -5 }, { score: -12 }];
  assert.equal(fitPercent(-1, ranked), 100);
  assert.equal(fitPercent(-12, ranked), 0);
  const middle = fitPercent(-5, ranked);
  assert.ok(middle > 0 && middle < 100, `middle fit was ${middle}`);
});

test("fit handles a set where every score is identical", () => {
  assert.equal(fitPercent(4, [{ score: 4 }, { score: 4 }]), 100);
  assert.equal(fitPercent(0, []), 0);
});

test("ranks are ordered and consistent with fit", () => {
  const plan = planFor(catalog, brief(), "balanced");
  for (const entry of plan.entries) {
    const ranks = entry.alternatives.map((alternative) => alternative.rank);
    assert.deepEqual(
      ranks,
      [...ranks].sort((a, b) => a - b),
      "alternatives are not rank-ordered",
    );
  }
});

test("data control is a strong preference, not a hidden exclusion", () => {
  const controlledBrief = brief({ dataControl: true });
  const { ranked, excluded } = rankForRole(catalog, "primary", controlledBrief, STRATEGIES.quality);
  const hostedOnly = catalog.find(
    (model) =>
      model.deployments.includes("hosted") &&
      !model.deployments.some((item) => ["open-weight", "private cloud", "edge"].includes(item)),
  );
  assert.ok(hostedOnly, "no hosted-only test subject found");
  assert.ok(
    ranked.some((entry) => entry.model.id === hostedOnly.id),
    "hosted-only model was hidden",
  );
  assert.equal(excluded.length, 0, "a current model was excluded by a preference");
  const scored = scoreModel(hostedOnly, "primary", controlledBrief, STRATEGIES.quality);
  assert.ok(scored.terms.some((term) => term.label === "Controlled deployment" && term.value < 0));
});

test("a downloadable preference keeps hosted-only models visible with a penalty", () => {
  const downloadableBrief = brief({ planStyle: "downloadable" });
  const { ranked, excluded } = rankForRole(catalog, "primary", downloadableBrief, STRATEGIES.downloadable);
  const hostedOnly = ranked.find((entry) => !entry.model.deployments.includes("open-weight"));
  assert.ok(hostedOnly, "no hosted-only model remained in the ranking");
  assert.equal(excluded.length, 0);
  assert.ok(hostedOnly.terms.some((term) => term.label === "Downloadable weights" && term.value < 0));
});

test("job strengths lead while models with missing capabilities stay inspectable", () => {
  const voicePlan = planFor(catalog, brief({ needs: ["listen-speak", "internal-knowledge"] }), "balanced");
  const voiceEntry = voicePlan.entries.find((entry) => entry.role.role === "voice");
  assert.ok(voiceEntry, "no voice specialist was assigned");
  assert.ok(voiceEntry.model.cases.includes("voice"), `${voiceEntry.model.name} cannot do voice`);

  const codePlan = planFor(catalog, brief({ needs: ["code-build", "validate"] }), "balanced");
  const coder = codePlan.entries.find((entry) => entry.role.role === "coder");
  assert.ok(coder.model.cases.includes("coding"), `${coder.model.name} cannot code`);

  const ranking = rankForRole(catalog, "voice", brief({ needs: ["listen-speak"] }), STRATEGIES.balanced).ranked;
  const missing = ranking.find((entry) => !entry.model.cases.includes("voice"));
  assert.ok(missing, "models without voice capability were hidden");
  assert.ok(Number.isFinite(missing.score));
  assert.ok(missing.readings.modelFit.missing.includes("voice"));
});

test("a provider job label adds evidence but does not gate a model out", () => {
  // The catalogue's stated design: any variant can rank first for a job when its
  // capabilities fit, even if the provider does not advertise it for that role.
  const withoutLabel = catalog.find((model) => !model.roles.includes("primary") && model.cases.includes("knowledge"));
  assert.ok(withoutLabel, "no test subject found");
  const reason = ineligibleReason(
    withoutLabel,
    "primary",
    { dataControl: false, openPreferred: false, multiVendor: true, highAssurance: false },
    STRATEGIES.balanced,
  );
  assert.equal(reason, null, "a missing role label should not disqualify a model");
  const labelled = catalog.find((model) => model.roles.includes("primary"));
  const roleTerm = scoreModel(labelled, "primary", brief(), STRATEGIES.balanced).terms.find(
    (term) => term.label === "Provider job label",
  );
  assert.equal(roleTerm.value, 2, "a provider role label must remain smaller than one capability match");
});

test("an untested quality estimate receives the reduced evidence factor", () => {
  const model = catalog.find((candidate) => !candidate.capabilityTests);
  const application = brief();
  const policy = jobOperatingPolicy("primary", application, STRATEGIES.quality);
  const term = scoreModel(model, "primary", application, STRATEGIES.quality).terms.find(
    (candidate) => candidate.label === "Expected quality",
  );
  assert.equal(term.value, model.quality * policy.qualityWeight * 0.6);
  assert.match(term.detail, /evidence factor 0.6/);
});

test("job operating policies keep quality critical work separate from throughput work", () => {
  const application = brief({ planStyle: "cost" });
  const primary = jobOperatingPolicy("primary", application, STRATEGIES.cost);
  const worker = jobOperatingPolicy("worker", application, STRATEGIES.cost);
  const checker = jobOperatingPolicy("validator", application, STRATEGIES.cost);

  assert.equal(worker.mode, "high-throughput");
  assert.equal(checker.mode, "assurance");
  assert.ok(worker.costWeight > primary.costWeight);
  assert.ok(primary.qualityTarget > worker.qualityTarget);
  assert.ok(checker.qualityWeight > worker.qualityWeight);
  assert.match(worker.escalationRule, /Escalate/i);
  assert.match(worker.successMeasure, /Successful tasks/i);
});

test("a cost-optimised team still meets every attainable job quality target", () => {
  const application = brief({ planStyle: "cost" });
  const plan = planFor(catalog, application, "cost");
  for (const entry of plan.entries) {
    const attainable = rankForRole(catalog, entry.role.role, application, STRATEGIES.cost).ranked.some(
      (candidate) => candidate.readings.measuredPerformance.score >= entry.operatingPolicy.qualityTarget,
    );
    if (attainable) {
      assert.ok(
        entry.readings.measuredPerformance.score >= entry.operatingPolicy.qualityTarget,
        `${entry.role.id} chose ${entry.model.name} at ${entry.readings.measuredPerformance.score} below ${entry.operatingPolicy.qualityTarget}`,
      );
    }
  }
});

test("the quality target is a visible policy adjustment, not a hidden exclusion", () => {
  const application = brief({ planStyle: "cost" });
  const worker = planFor(catalog, application, "cost").entries.find((entry) => entry.role.id === "worker");
  assert.ok(worker);
  assert.ok(worker.policyAdjusted);
  assert.match(worker.policyReason, /planning quality target/i);
  assert.equal(worker.decision.state, "policy-choice");
  assert.match(worker.decision.reason, /Team rule:/);
  assert.ok(worker.decision.closeCandidates.some((candidate) => candidate.model.id === worker.advisorChoice.model.id));
});

test("current variants receive a finite score for every job", () => {
  const demanding = brief({ dataControl: true, needs: ["listen-speak", "sensitive-data", "code-build"] });
  for (const role of [
    "primary",
    "planner",
    "worker",
    "validator",
    "researcher",
    "coder",
    "vision",
    "voice",
    "private",
  ]) {
    const { ranked, excluded } = rankForRole(catalog, role, demanding, STRATEGIES.private);
    assert.equal(ranked.length, catalog.length, `${role} did not keep the full current catalogue visible`);
    assert.equal(excluded.length, 0);
    assert.ok(ranked.every((entry) => Number.isFinite(entry.score)));
  }
});

test("specialists use only the selected requirements relevant to their job", () => {
  const software = brief({ needs: ["code-build", "current-research", "listen-speak", "validate"] });
  assert.deepEqual(jobRequirements("coder", software).sort(), ["agents", "coding", "reasoning", "safety"].sort());
  assert.ok(!jobRequirements("coder", software).includes("voice"));
  assert.ok(jobRequirements("primary", software).includes("voice"));
});

test("partial capability tests are combined with estimates for the untested requirements", () => {
  const base = catalog.find((model) => model.cases.includes("coding"));
  assert.ok(base);
  const tested = {
    ...base,
    quality: 2,
    capabilityTests: {
      coding: {
        score: 4.7,
        evaluationId: "software-eval-v1",
        datasetVersion: "2026-08-18",
        testedAt: "2026-08-18",
        sampleSize: 50,
      },
    },
  };
  const evidence = qualityForJob(tested, "coder", brief({ needs: ["code-build"] }));
  assert.equal(evidence.value, 3.35);
  assert.equal(evidence.tested, 1);
  assert.equal(evidence.total, 2);
  assert.match(evidence.basis, /1\/2 capability-specific tests/);
});

test("the four recommendation readings remain separate", () => {
  const entry = planFor(catalog, brief(), "balanced").entries[0];
  assert.ok(entry.readings.modelFit.total > 0);
  assert.match(entry.readings.sourceConfidence, /confirmed|unconfirmed|drifted/);
  assert.ok(entry.readings.ecosystemVisibility >= 0 && entry.readings.ecosystemVisibility <= 100);
  assert.equal(typeof entry.readings.measuredPerformance.measured, "boolean");
  assert.match(entry.readings.measuredPerformance.evidenceLevel, /estimated|partly-tested|tested/);
});

test("small numerical differences use visible tie-break readings without changing the raw scores", () => {
  const comparison = brief({
    archetype: "product-comparison",
    needs: ["documents", "current-research", "complex-decisions", "write-explain", "validate"],
    planStyle: "quality",
  });
  const primary = planFor(catalog, comparison, "quality").entries[0];
  assert.equal(primary.decision.state, "tie-break-choice");
  assert.ok(primary.decision.closeCandidates.length >= 2);
  assert.ok(primary.decision.scoreGap < primary.decision.closeCallThreshold);
  assert.equal(primary.decision.tieBreakBasis, "ecosystem-reach");
  assert.ok(primary.decision.closeCandidates.every((candidate) => candidate.tieBreak));
  assert.match(primary.decision.reason, /raw scores less than 1 point apart/i);
  assert.match(primary.decision.reason, /raw scores were not rewritten/i);
  assert.match(primary.decision.recommendedTest, /same 10 representative/i);
});

test("application specialisation is checked before ecosystem reach in a close call", () => {
  const sales = brief({
    archetype: "sales-proposals",
    needs: ["internal-knowledge", "current-research", "write-explain", "software-tools", "validate"],
    planStyle: "quality",
  });
  const primary = planFor(catalog, sales, "quality").entries[0];
  assert.equal(primary.decision.state, "tie-break-choice");
  assert.equal(primary.decision.tieBreakBasis, "application-specialisation");
  const selected = primary.decision.closeCandidates.find((candidate) => candidate.model.id === primary.model.id);
  assert.equal(
    selected.tieBreak.applicationSpecialisation,
    applicationSpecialisation(primary.model, primary.role, sales),
  );
  assert.ok(
    selected.tieBreak.applicationSpecialisation >
      Math.max(
        ...primary.decision.closeCandidates
          .filter((candidate) => candidate.model.id !== primary.model.id)
          .map((candidate) => candidate.tieBreak.applicationSpecialisation),
      ),
  );
});

test("a provider name alone never changes a model score", () => {
  const model = catalog.find((candidate) => candidate.roles.includes("primary"));
  assert.ok(model);
  const comparison = brief();
  const original = scoreModel(model, "primary", comparison, STRATEGIES.balanced);
  const renamed = scoreModel(
    { ...model, id: `${model.id}-provider-check`, name: `${model.name} provider check`, provider: "Example provider" },
    "primary",
    comparison,
    STRATEGIES.balanced,
  );
  assert.equal(renamed.score, original.score);
});

test("a user can choose any model inside the three-point band without rewriting the advisor choice", () => {
  const comparison = brief({
    archetype: "product-comparison",
    needs: ["documents", "current-research", "complex-decisions", "write-explain", "validate"],
    planStyle: "quality",
  });
  const automatic = planFor(catalog, comparison, "quality").entries[0];
  assert.ok(automatic.choiceCandidates.length > 1);
  assert.ok(
    automatic.choiceCandidates.every(
      (candidate) => automatic.choiceCandidates[0].score - candidate.score < USER_CHOICE_SCORE_GAP,
    ),
  );
  const requested = automatic.choiceCandidates.find((candidate) => candidate.model.id !== automatic.model.id);
  assert.ok(requested);

  const overridden = planFor(catalog, comparison, "quality", { primary: requested.model.id }).entries[0];
  assert.equal(overridden.model.id, requested.model.id);
  assert.equal(overridden.userSelected, true);
  assert.equal(overridden.decision.state, "user-choice");
  assert.equal(overridden.advisorChoice.model.id, automatic.model.id);
  assert.match(overridden.decision.reason, /selected by the user/i);

  const outsideBand = catalog.find(
    (model) => !automatic.choiceCandidates.some((candidate) => candidate.model.id === model.id),
  );
  assert.ok(outsideBand);
  const rejected = planFor(catalog, comparison, "quality", { primary: outsideBand.id }).entries[0];
  assert.equal(rejected.model.id, automatic.model.id);
  assert.equal(rejected.userSelected, false);
});

test("team evaluation separates structural checks from trials that must be run", () => {
  const application = brief({
    archetype: "software-agent",
    needs: ["code-build", "coordinate-work", "current-research", "validate"],
  });
  const plan = planFor(catalog, application, "balanced");
  const evaluation = evaluateTeam(plan.entries, application);
  assert.equal(evaluation.totalCapabilities, application.cases.length);
  assert.equal(evaluation.trials.length, 5);
  assert.ok(evaluation.checks.some((check) => check.id === "coverage"));
  assert.ok(evaluation.checks.some((check) => check.id === "quality-targets"));
  assert.ok(evaluation.checks.some((check) => check.id === "quality-cost-routing"));
  assert.ok(evaluation.checks.some((check) => check.id === "coordination" && check.status === "trial-required"));
  assert.ok(evaluation.trials.some((trial) => trial.id === "failure-recovery"));
  assert.ok(evaluation.trials.some((trial) => trial.id === "load-cost-latency"));
  assert.match(
    evaluation.trials.find((trial) => trial.id === "load-cost-latency").success,
    /successful tasks per total dollar/i,
  );
});

test("reusing one model across jobs is not described as independent validation", () => {
  const application = brief({ needs: ["internal-knowledge", "validate"] });
  const plan = planFor(catalog, application, "balanced");
  const primary = plan.entries[0];
  const repeated = plan.entries.map((entry) => ({ ...entry, model: primary.model }));
  const evaluation = evaluateTeam(repeated, application);
  assert.equal(evaluation.checks.find((check) => check.id === "redundancy").status, "caution");
  assert.equal(evaluation.checks.find((check) => check.id === "independent-check").status, "caution");
});

test("software ecosystem ranking rewards complete fit before visibility", () => {
  const software = brief({
    archetype: "software-agent",
    needs: ["code-build", "coordinate-work", "current-research", "validate"],
    planStyle: "proven",
  });
  const ranked = rankForRole(catalog, "primary", software, STRATEGIES.proven).ranked;
  const fable = ranked.findIndex((entry) => entry.model.id === "claude-fable-5");
  const glm = ranked.findIndex((entry) => entry.model.id === "glm-5-2");
  assert.ok(fable >= 0 && glm >= 0);
  assert.ok(fable < glm, `Claude Fable 5 ranked #${fable + 1}; GLM-5.2 ranked #${glm + 1}`);
});

test("plan styles genuinely differ", () => {
  const plans = PRIMARY_STRATEGY_IDS.map((styleId) => planFor(catalog, brief({ planStyle: styleId }), styleId));
  const primaries = new Set(plans.map((plan) => plan.entries[0].model.id));
  const teams = new Set(
    plans.map((plan) => plan.entries.map((entry) => `${entry.role.id}:${entry.model.id}`).join("|")),
  );
  assert.ok(primaries.size >= 2, `all plan styles selected the same primary`);
  assert.ok(teams.size >= 4, `six plan styles collapsed to ${teams.size} distinct teams`);
});

test("cost-first picks a cheaper team than quality-first", () => {
  const cheap = planFor(catalog, brief({ planStyle: "cost" }), "cost").entries;
  const good = planFor(catalog, brief({ planStyle: "quality" }), "quality").entries;
  const meanCost = (entries) => entries.reduce((total, entry) => total + entry.model.costClass, 0) / entries.length;
  const meanQuality = (entries) => entries.reduce((total, entry) => total + entry.model.quality, 0) / entries.length;
  assert.ok(meanCost(cheap) < meanCost(good), `cost ${meanCost(cheap)} vs quality ${meanCost(good)}`);
  assert.ok(meanQuality(good) >= meanQuality(cheap));
});

test("a one-provider plan style keeps the team together", () => {
  const plan = planFor(catalog, brief({ planStyle: "simple" }), "simple");
  const providers = new Set(plan.entries.map((entry) => entry.model.provider));
  assert.ok(providers.size <= 2, `expected one provider where possible, got ${[...providers].join(", ")}`);
});

test("a policy override always explains itself", () => {
  for (const styleId of PRIMARY_STRATEGY_IDS) {
    for (const entry of planFor(catalog, brief({ planStyle: styleId }), styleId).entries) {
      if (entry.policyAdjusted) assert.ok(entry.policyReason, `${styleId}/${entry.role.id} overrode #1 with no reason`);
    }
  }
});

test("scoring produces a breakdown that sums to the total", () => {
  for (const model of catalog.slice(0, 25)) {
    const scored = scoreModel(model, "primary", brief(), STRATEGIES.balanced);
    const sum = scored.terms.reduce((total, term) => total + term.value, 0);
    assert.ok(Math.abs(sum - scored.score) < 0.02, `${model.id}: terms sum to ${sum}, score is ${scored.score}`);
    assert.ok(scored.terms.length >= 4, `${model.id} produced only ${scored.terms.length} terms`);
    for (const term of scored.terms) {
      assert.ok(term.label.length > 0 && term.detail.length > 0, `${model.id} has an unlabelled term`);
    }
  }
});

test("breadth and focus do not overwhelm the other terms", () => {
  // The prototype's un-normalised range term could reach 43 points against a
  // 10-point quality term, which is how a role-play specialist became a general
  // routine worker.
  for (const styleId of ["broad", "focused"]) {
    for (const model of catalog.slice(0, 30)) {
      const scored = scoreModel(model, "primary", brief({ planStyle: styleId }), STRATEGIES[styleId]);
      const rangeTerm = scored.terms.find(
        (term) => term.label === "Capability breadth" || term.label === "Narrow focus",
      );
      if (!rangeTerm) continue;
      // The comparison is against the largest value term quality can reach under
      // this plan style (5/5 × weight), not this model's own quality, so a
      // mid-quality model does not make the assertion vacuous.
      const maxQuality = 5 * STRATEGIES[styleId].quality;
      assert.ok(
        Math.abs(rangeTerm.value) <= maxQuality * 1.2,
        `${styleId}/${model.id}: range ${rangeTerm.value} against a quality ceiling of ${maxQuality}`,
      );
    }
  }
});

test("an estimated price counts for less than a published one", () => {
  // Uncertainty shrinks the term toward neutral in both directions: an unpriced
  // model gets less credit for looking cheap, and less blame for looking dear,
  // because in neither case did anyone publish the number.
  const costOf = (model) =>
    scoreModel(model, "primary", brief({ planStyle: "cost" }), STRATEGIES.cost).terms.find(
      (term) => term.label === "Operating cost",
    )?.value ?? 0;

  const cheapPriced = catalog.find((model) => model.pricing.input !== null && model.costClass === 1);
  const cheapEstimated = catalog.find((model) => model.pricing.input === null && model.costClass === 1);
  assert.ok(cheapPriced && cheapEstimated, "needed a priced and an estimated model at cost class 1");
  assert.ok(
    costOf(cheapPriced) > costOf(cheapEstimated),
    `published ${costOf(cheapPriced)} should beat estimated ${costOf(cheapEstimated)} at the same class`,
  );

  const dearPriced = catalog.find((model) => model.pricing.input !== null && model.costClass === 5);
  const dearEstimated = catalog.find((model) => model.pricing.input === null && model.costClass === 5);
  if (dearPriced && dearEstimated) {
    assert.ok(
      costOf(dearPriced) < costOf(dearEstimated),
      "a published high price should be penalised more than an estimated one",
    );
  }
});

test("ranking is stable across repeated calls", () => {
  const once = rankForRole(catalog, "primary", brief(), STRATEGIES.balanced).ranked.map((entry) => entry.model.id);
  const twice = rankForRole(catalog, "primary", brief(), STRATEGIES.balanced).ranked.map((entry) => entry.model.id);
  assert.deepEqual(once, twice);
});

test("explanations name real factors and stay readable", () => {
  const plan = planFor(catalog, brief(), "balanced");
  const text = explainEntry(plan.entries[0]);
  assert.match(text, /Ranked #\d+/);
  assert.ok(text.length > 80 && text.length < 900, `explanation was ${text.length} characters`);

  const summary = explainPlan(plan.entries, "balanced", true, false);
  assert.match(summary, /primary (candidate|selected)/);
  assert.match(summary, /Test the complete team/, "the summary must not drop the caveat");
});

test("a quality-first team shows cost as a trade-off, not a benefit", () => {
  // The point of centring the cost term: choosing a frontier model under
  // quality-first weights should read as "expensive, chosen anyway", which is
  // what a reader needs to know.
  const plan = planFor(catalog, brief({ planStyle: "quality" }), "quality");
  const expensive = plan.entries.filter((entry) => entry.model.costClass >= 4);
  assert.ok(expensive.length > 0, "quality-first picked nothing expensive, which is implausible");
  for (const entry of expensive) {
    const cost = entry.terms.find((term) => term.label === "Operating cost");
    assert.ok(cost, `${entry.model.name} has no cost term`);
    assert.ok(
      cost.value < 0,
      `${entry.model.name} is cost class ${entry.model.costClass} but cost scored ${cost.value}`,
    );
    assert.ok(
      tradeOffs(entry).some((term) => term.label === "Operating cost"),
      `${entry.model.name} does not list cost as a trade-off`,
    );
  }
});

test("a cheap model shows cost as a benefit", () => {
  const plan = planFor(catalog, brief({ planStyle: "cost" }), "cost");
  const cheap = plan.entries.filter((entry) => entry.model.costClass <= 2);
  assert.ok(cheap.length > 0);
  for (const entry of cheap) {
    const cost = entry.terms.find((term) => term.label === "Operating cost");
    assert.ok(
      cost.value > 0,
      `${entry.model.name} is cost class ${entry.model.costClass} but cost scored ${cost.value}`,
    );
  }
});

test("centring the cost term does not change the ranking", () => {
  // Centring shifts every model in a ranking by the same constant, so the order
  // must be identical to ordering by the uncentred equivalent.
  const ranked = rankForRole(catalog, "primary", brief({ planStyle: "cost" }), STRATEGIES.cost).ranked;
  const shifted = [...ranked]
    .map((entry) => ({
      id: entry.model.id,
      score: entry.score + 3 * STRATEGIES.cost.cost * 0.75,
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  assert.deepEqual(ranked.map((entry) => entry.model.id).slice(0, 20), shifted.map((entry) => entry.id).slice(0, 20));
});

test("high risk adds an independent evidence checker", () => {
  const roles = deriveRoles(brief({ risk: "high" }), STRATEGIES.balanced);
  assert.ok(
    roles.some((role) => role.id === "evidence"),
    "high risk should add an evidence checker",
  );
});

test("tools outside the model team are recommended from the brief", () => {
  const tools = recommendedTools(brief({ needs: ["geospatial", "current-research", "sensitive-data"] }));
  const ids = tools.map((tool) => tool.id);
  assert.ok(ids.includes("gis"));
  assert.ok(ids.includes("search"));
  assert.ok(ids.includes("privacy"));
  assert.ok(tools.length <= 7);
});

test("capability range is bounded", () => {
  for (const model of catalog) {
    const range = capabilityRange(model);
    assert.ok(range > 0 && range <= 24, `${model.id} range was ${range}`);
  }
});
