import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planCtoLoopStep } from "@/features/agent-os/cto-loop.engine";
import type { CtoLoopProtectionContext, CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { AgentRouteResult } from "@/features/agent-os/agent.types";

function route(partial: Partial<AgentRouteResult> = {}): AgentRouteResult {
  return {
    agentId: "QA_AGENT",
    displayName: "QA",
    reason: "task_area",
    requiresHumanEscalation: false,
    agentOverrideAreaMismatch: false,
    metadata: {
      agentOverride: null,
      agentOverrideValid: false,
      taskAreaOverride: null,
      priority: null,
      parentTaskIssueNumber: null,
    },
    effectiveTaskArea: "automation-platform",
    effectivePriority: "P2",
    ...partial,
  };
}

function observation(partial: Partial<CtoObservation> = {}): CtoObservation {
  return {
    issueNumber: 100,
    status: "backlog",
    risk: "low",
    taskArea: "Automation Platform",
    hasBuildApproved: false,
    blockerReason: null,
    isOpen: true,
    agentRoute: route(),
    pullRequest: null,
    productionLive: false,
    dependencyReady: true,
    parentTaskIssueNumber: null,
    latestUpdateAt: "2026-01-01T00:00:00.000Z",
    explicitPriority: null,
    approveBuildEligible: false,
    ...partial,
  };
}

const baseProtection: CtoLoopProtectionContext = {
  lastActionIdempotencyKey: null,
  attemptCountWithoutProgress: 0,
  hasActiveNonTerminalRun: false,
  duplicateSourceEvent: false,
  proposedActionIdempotencyKey: null,
};

describe("planCtoLoopStep", () => {
  it("escalates high-risk tasks to ATTD_CTO with human approval", () => {
    const plan = planCtoLoopStep({
      observation: observation({
        risk: "high",
        agentRoute: route({
          agentId: "ATTD_CTO",
          reason: "high_risk_escalation",
          requiresHumanEscalation: true,
        }),
      }),
      protection: baseProtection,
    });
    assert.equal(plan.selectedAction, "ESCALATE_HIGH_RISK");
    assert.equal(plan.humanApprovalRequired, true);
  });

  it("selects POST_BUILD_APPROVED only when eligible and not deduped", () => {
    const plan = planCtoLoopStep({
      observation: observation({ approveBuildEligible: true }),
      protection: baseProtection,
    });
    assert.equal(plan.selectedAction, "POST_BUILD_APPROVED");
  });

  it("returns NOOP for duplicate source events", () => {
    const plan = planCtoLoopStep({
      observation: observation(),
      protection: { ...baseProtection, duplicateSourceEvent: true },
    });
    assert.equal(plan.selectedAction, "NOOP");
  });

  it("escalates when no-progress threshold exceeded", () => {
    const plan = planCtoLoopStep({
      observation: observation(),
      protection: { ...baseProtection, attemptCountWithoutProgress: 3 },
    });
    assert.equal(plan.selectedAction, "ESCALATE_NO_PROGRESS");
  });
});
