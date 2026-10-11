import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeCtoAllowedAction } from "@/features/agent-os/cto-action.executor";
import type { CtoLoopPlan, CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { AgentRouteResult } from "@/features/agent-os/agent.types";

function observation(): CtoObservation {
  const agentRoute: AgentRouteResult = {
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
  };
  return {
    issueNumber: 42,
    status: "backlog",
    risk: "low",
    taskArea: "Automation Platform",
    hasBuildApproved: false,
    blockerReason: null,
    isOpen: true,
    agentRoute,
    pullRequest: null,
    productionLive: false,
    dependencyReady: true,
    parentTaskIssueNumber: null,
    latestUpdateAt: "2026-01-01T00:00:00.000Z",
    explicitPriority: null,
    approveBuildEligible: true,
  };
}

function plan(action: CtoLoopPlan["selectedAction"]): CtoLoopPlan {
  return {
    assignedAgentId: "QA_AGENT",
    priority: { score: 100, reason: "test", tier: "P2" },
    selectedAction: action,
    idempotencyKey: "test-key",
    escalate: false,
    humanApprovalRequired: false,
    rationale: "test",
    verification: { kind: "none", requiresChange: false },
    blockerReason: null,
    nextAction: null,
    decisionType: "OTHER",
  };
}

describe("executeCtoAllowedAction", () => {
  it("does not call GitHub when deps missing for POST_BUILD_APPROVED", async () => {
    const result = await executeCtoAllowedAction({
      plan: plan("POST_BUILD_APPROVED"),
      observation: observation(),
    });
    assert.equal(result.submitted, false);
    assert.equal(result.skippedReason, "executor_deps_missing");
  });

  it("delegates POST_BUILD_APPROVED to factory approve service", async () => {
    let called = false;
    const result = await executeCtoAllowedAction({
      plan: plan("POST_BUILD_APPROVED"),
      observation: observation(),
      deps: {
        postBuildApproved: async (issueNumber) => {
          called = true;
          assert.equal(issueNumber, 42);
          return { result: "approved_now", issueNumber, message: "ok" };
        },
      },
    });
    assert.equal(called, true);
    assert.equal(result.submitted, true);
  });
});
