import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateApproveBuildEligibility,
  evaluateApproveBuildEligibilityForIssue,
} from "@/features/automation/automation-approve-build.eligibility";
import type { AutomationTask } from "@/features/automation/automation-task.types";

function taskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  return {
    issueNumber: 116,
    title: "Automation approve build",
    taskArea: "Automation Platform",
    status: "backlog",
    statusLabel: null,
    risk: "unknown",
    riskLabel: null,
    linkedPullRequest: null,
    latestUpdateAt: "2026-09-23T00:00:00.000Z",
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: "https://github.com/hoangthang1209-byte/attd.vn/issues/116",
    labels: [],
    recentStatusComments: [],
    hasBuildApproved: false,
    productionStatus: {
      status: "unknown",
      mergedCommitSha: null,
      reason: null,
      checkedAt: "2026-09-23T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("approve build eligibility", () => {
  it("allows open backlog tasks in canonical lanes without BUILD_APPROVED", () => {
    const eligibility = evaluateApproveBuildEligibility(taskFixture());
    assert.equal(eligibility.eligible, true);
    assert.equal(eligibility.reason, null);
  });

  it("rejects tasks that already have BUILD_APPROVED", () => {
    const eligibility = evaluateApproveBuildEligibility(
      taskFixture({ hasBuildApproved: true }),
    );
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.reason, "already_approved");
  });

  it("rejects closed, building, and unclassified lane tasks", () => {
    assert.equal(
      evaluateApproveBuildEligibility(taskFixture({ isOpen: false })).reason,
      "closed",
    );
    assert.equal(
      evaluateApproveBuildEligibility(taskFixture({ status: "building" })).reason,
      "active_pipeline",
    );
    assert.equal(
      evaluateApproveBuildEligibility(taskFixture({ taskArea: "Chưa phân loại" })).reason,
      "unclassified_task_area",
    );
  });

  it("validates server issue payloads with recognition rules", () => {
    const eligible = evaluateApproveBuildEligibilityForIssue({
      state: "OPEN",
      labels: [{ name: "status:backlog" }],
      comments: [{ body: "TASK_AREA: Automation Platform" }],
    });
    assert.equal(eligible.eligible, true);

    const closed = evaluateApproveBuildEligibilityForIssue({
      state: "CLOSED",
      labels: [{ name: "status:backlog" }],
      comments: [{ body: "TASK_AREA: Automation Platform" }],
    });
    assert.equal(closed.reason, "closed");

    const unrecognized = evaluateApproveBuildEligibilityForIssue({
      state: "OPEN",
      labels: [],
      comments: [{ body: "random note" }],
    });
    assert.equal(unrecognized.reason, "unrecognized_task");
  });
});
