import { NEED_INDEX } from "../data/taxonomy.js";
import type { Brief, Capability, PlanEntry } from "../shared/types.js";
import { jobRequirements } from "./scoring.js";

export type TeamCheckStatus = "pass" | "caution" | "trial-required";

export interface TeamCheck {
  readonly id: string;
  readonly label: string;
  readonly status: TeamCheckStatus;
  readonly summary: string;
}

export interface TeamTrial {
  readonly id: string;
  readonly label: string;
  readonly task: string;
  readonly success: string;
}

export interface TeamEvaluation {
  readonly checks: readonly TeamCheck[];
  readonly trials: readonly TeamTrial[];
  readonly coveredCapabilities: number;
  readonly totalCapabilities: number;
}

function capabilityNames(brief: Brief): string {
  const names = brief.needs.map((need) => NEED_INDEX[need]?.name).filter((name): name is string => Boolean(name));
  return names.slice(0, 3).join(", ").toLowerCase() || "the application's main work";
}

/**
 * Checks what can be established from the proposed roster without pretending
 * the models have already run together. Behavioural questions become explicit
 * trials; structural facts are reported immediately.
 */
export function evaluateTeam(entries: readonly PlanEntry[], brief: Brief): TeamEvaluation {
  const required = new Set<Capability>(brief.cases);
  const covered = new Set<Capability>();
  for (const entry of entries) {
    for (const capability of entry.model.cases) if (required.has(capability)) covered.add(capability);
  }

  const primary = entries.find((entry) => entry.role.id === "primary");
  const checker = entries.find((entry) => entry.role.id === "validator");
  const distinctModels = new Set(entries.map((entry) => entry.model.id));
  const providers = new Set(entries.map((entry) => entry.model.provider));

  const contributionCounts = new Map<Capability, number>();
  for (const capability of required) {
    contributionCounts.set(capability, entries.filter((entry) => entry.model.cases.includes(capability)).length);
  }
  const uniqueContributors = entries.filter((entry) =>
    entry.model.cases.some((capability) => required.has(capability) && contributionCounts.get(capability) === 1),
  );
  const assignedFit = entries.filter((entry) => {
    const requirements = jobRequirements(entry.role.role, brief);
    return requirements.some((capability) => entry.model.cases.includes(capability));
  }).length;
  const independentChecker =
    Boolean(primary && checker) &&
    primary?.model.id !== checker?.model.id &&
    primary?.model.provider !== checker?.model.provider;
  const fallbackReady = entries.filter((entry) =>
    entry.alternatives.some((alternative) => alternative.model.provider !== entry.model.provider),
  ).length;

  const checks: TeamCheck[] = [
    {
      id: "coverage",
      label: "Requirement coverage",
      status: covered.size === required.size ? "pass" : "caution",
      summary:
        covered.size === required.size
          ? `The roster states coverage for all ${required.size} required capabilities.`
          : `${required.size - covered.size} of ${required.size} required capabilities are not stated for any team member.`,
    },
    {
      id: "job-fit",
      label: "Members fit their assigned jobs",
      status: assignedFit === entries.length ? "pass" : "caution",
      summary: `${assignedFit} of ${entries.length} members state at least one capability needed for their assigned job.`,
    },
    {
      id: "complementarity",
      label: "Complementary rather than decorative",
      status: uniqueContributors.length > 0 ? "pass" : "caution",
      summary:
        uniqueContributors.length > 0
          ? `${uniqueContributors.length} member${uniqueContributors.length === 1 ? "" : "s"} add at least one required capability no other member covers.`
          : "Every required capability is duplicated. The extra members may still help, but the roster does not show a unique contribution for any one of them.",
    },
    {
      id: "redundancy",
      label: "Role separation",
      status: distinctModels.size === entries.length ? "pass" : "caution",
      summary:
        distinctModels.size === entries.length
          ? `All ${entries.length} jobs use distinct model variants.`
          : `${entries.length - distinctModels.size} job${entries.length - distinctModels.size === 1 ? "" : "s"} reuse a model; this simplifies operations but is not an independent check.`,
    },
    {
      id: "independent-check",
      label: "Independent checking",
      status: independentChecker ? "pass" : "caution",
      summary: independentChecker
        ? "The quality checker uses a different model and provider from the primary."
        : "The checker is not independent of the primary model and provider.",
    },
    {
      id: "routing-complexity",
      label: "Routing complexity",
      status: entries.length <= 4 && providers.size <= 4 ? "pass" : "caution",
      summary: `${entries.length} jobs across ${providers.size} provider${providers.size === 1 ? "" : "s"}; every additional hand-off needs an explicit routing rule and timeout.`,
    },
    {
      id: "fallbacks",
      label: "Fallback independence",
      status: fallbackReady === entries.length ? "pass" : "caution",
      summary: `${fallbackReady} of ${entries.length} jobs have a listed fallback from another provider.`,
    },
    {
      id: "coordination",
      label: "Members work well together",
      status: "trial-required",
      summary:
        "Catalogue facts cannot establish hand-off quality, shared context, tool compatibility or recovery behaviour. Run the coordination trial below.",
    },
    {
      id: "operating-result",
      label: "End-to-end cost, speed and reliability",
      status: "trial-required",
      summary: "Per-model estimates do not add up to a team result. Measure the complete route on the same tasks.",
    },
  ];

  const work = capabilityNames(brief);
  const trials: TeamTrial[] = [
    {
      id: "representative-task",
      label: "Representative result",
      task: `Run 10 real examples covering ${work}. Use the same inputs and success criteria for every proposed team.`,
      success: "At least 9 complete successfully, with material errors and human corrections recorded.",
    },
    {
      id: "handoff",
      label: "Routing and hand-offs",
      task: "Use tasks that require the primary, a specialist and the checker. Record wrong routes, lost instructions, duplicated work and unsupported answers.",
      success: "At least 9 of 10 take the intended route and preserve the necessary context through every hand-off.",
    },
    {
      id: "conflict",
      label: "Conflicting or uncertain evidence",
      task: "Give the team incomplete, ambiguous or contradictory information and one request that should be refused or escalated.",
      success: "The checker catches conflicts, the team states uncertainty and high-impact cases reach human review.",
    },
    {
      id: "failure-recovery",
      label: "Member and provider failure",
      task: "Simulate a timeout, malformed response and unavailable provider for one member, then repeat with the primary unavailable.",
      success: "The route uses an independent fallback, avoids loops and reports what could not be completed.",
    },
    {
      id: "load-cost-latency",
      label: "Cost, latency and load",
      task: "Run the same representative batch at expected peak volume and record total tokens, tool calls, retries, elapsed time and provider charges.",
      success:
        "The complete team meets the application's agreed budget and response-time limits without a higher failure rate.",
    },
  ];

  return { checks, trials, coveredCapabilities: covered.size, totalCapabilities: required.size };
}
