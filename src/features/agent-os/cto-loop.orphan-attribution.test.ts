import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPostBuildApprovedDedupeKey } from "@/features/agent-os/cto-loop.dedupe";
import { observationConfirmsPendingExternalAction } from "@/features/agent-os/cto-loop.orphan-attribution";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";
import type { AgentRouteResult } from "@/features/agent-os/agent.types";

function routeFixture(): AgentRouteResult {
  return {
    agentId: "ATTD_CTO",
    displayName: "CTO",
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
}

function observationFixture(overrides: Partial<CtoObservation> = {}): CtoObservation {
  return {
    issueNumber: 42,
    status: "backlog",
    risk: "low",
    taskArea: "Automation Platform",
    hasBuildApproved: false,
    blockerReason: null,
    isOpen: true,
    agentRoute: routeFixture(),
    pullRequest: null,
    productionLive: false,
    dependencyReady: true,
    parentTaskIssueNumber: null,
    latestUpdateAt: "2026-01-01T00:00:00.000Z",
    explicitPriority: null,
    approveBuildEligible: true,
    ...overrides,
  };
}

describe("observationConfirmsPendingExternalAction", () => {
  it("does not confirm BUILD_APPROVED when issue has approval but PR snapshot differs", () => {
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: 42,
      prNumber: 7,
      prHeadSha: "abc123456789",
      reviewState: "approved",
      ciStatus: "success",
    });

    const observation = observationFixture({
      hasBuildApproved: true,
      pullRequest: {
        number: 7,
        headShaFingerprint: "deadbeef0000",
        verification: { reviewStatus: "approved", ciStatus: "success" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "POST_BUILD_APPROVED",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });

  it("confirms BUILD_APPROVED when pending key matches current PR snapshot", () => {
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: 42,
      prNumber: 7,
      prHeadSha: "abc123456789",
      reviewState: "approved",
      ciStatus: "success",
    });

    const observation = observationFixture({
      hasBuildApproved: true,
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "approved", ciStatus: "success" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "POST_BUILD_APPROVED",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      true,
    );
  });
});
