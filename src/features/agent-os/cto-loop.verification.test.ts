import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCtoVerification } from "@/features/agent-os/cto-loop.verification";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { AgentRouteResult } from "@/features/agent-os/agent.types";

function observation(partial: Partial<CtoObservation>): CtoObservation {
  const agentRoute: AgentRouteResult = {
    agentId: "ATTD_CTO",
    displayName: "CTO",
    reason: "default_cto",
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
    issueNumber: 5,
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
    ...partial,
  };
}

describe("evaluateCtoVerification", () => {
  it("verifies BUILD_APPROVED when approval appears after execution", () => {
    const before = observation({ hasBuildApproved: false });
    const after = observation({ hasBuildApproved: true, status: "approved" });
    const outcome = evaluateCtoVerification({
      action: "POST_BUILD_APPROVED",
      expectation: { kind: "build_approved", requiresChange: true },
      before,
      after,
      executionSubmitted: true,
    });
    assert.equal(outcome, "verified");
  });

  it("does not infer success when execution was not submitted", () => {
    const before = observation({});
    const after = observation({ status: "building" });
    const outcome = evaluateCtoVerification({
      action: "POST_BUILD_APPROVED",
      expectation: { kind: "build_approved", requiresChange: true },
      before,
      after,
      executionSubmitted: false,
    });
    assert.equal(outcome, "failed");
  });
});
