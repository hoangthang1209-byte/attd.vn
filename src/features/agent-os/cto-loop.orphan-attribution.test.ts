import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCtoActionIdempotencyKey,
  buildPostBuildApprovedDedupeKey,
} from "@/features/agent-os/cto-loop.dedupe";
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
  it("does not confirm BUILD_APPROVED when issue has approval but PR head differs", () => {
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

  it("confirms BUILD_APPROVED on stable issue/pr/head identity when review/CI drift", () => {
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
        verification: { reviewStatus: "pending", ciStatus: "pending" },
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

  it("does not confirm CI retry when CI is still failure", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      status: "ci_review",
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "pending", ciStatus: "failure" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });

  it("does not confirm CI retry when CI status is unknown", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "pending", ciStatus: "unknown" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });

  it("confirms CI retry when CI is pending after a recorded failure baseline", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      status: "ci_review",
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "pending", ciStatus: "pending" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
        ciRetryBaselineCiStatus: "failure",
      }),
      true,
    );
  });

  it("does not confirm CI retry when CI was already pending before claim (no baseline)", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "pending", ciStatus: "pending" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });

  it("does not confirm CI retry when CI is pending but baseline was already success", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "pending", ciStatus: "pending" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
        ciRetryBaselineCiStatus: "success",
      }),
      false,
    );
  });

  it("confirms CI retry when CI succeeds after a recorded failure baseline", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      status: "ci_review",
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "approved", ciStatus: "success" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
        ciRetryBaselineCiStatus: "failure",
      }),
      true,
    );
  });

  it("does not confirm CI retry when CI was already green before claim (no baseline)", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      status: "ci_review",
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "approved", ciStatus: "success" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });

  it("does not confirm CI retry when baseline shows CI was already success", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      pullRequest: {
        number: 7,
        headShaFingerprint: "abc123456789",
        verification: { reviewStatus: "approved", ciStatus: "success" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
        ciRetryBaselineCiStatus: "success",
      }),
      false,
    );
  });

  it("does not confirm CI retry when PR head mismatches pending key", () => {
    const pendingKey = buildCtoActionIdempotencyKey(["ci-retry", "42", "pr-7", "abc123456789"]);
    const observation = observationFixture({
      pullRequest: {
        number: 7,
        headShaFingerprint: "deadbeef0000",
        verification: { reviewStatus: "pending", ciStatus: "pending" },
        merged: false,
      },
    });

    assert.equal(
      observationConfirmsPendingExternalAction({
        action: "REQUEST_CI_RETRY",
        pendingIdempotencyKey: pendingKey,
        observation,
      }),
      false,
    );
  });
});
