import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isActiveAutomationTask,
  isCompletedAutomationTask,
  matchesAutomationView,
  shouldShowTaskInCompletedDefaultList,
} from "@/features/automation/automation-dashboard.views";
import { automationTaskFixture } from "@/features/automation/automation-task.test-fixtures";

describe("automation dashboard views", () => {
  it("active excludes merged, superseded, and closed tasks", () => {
    const building = automationTaskFixture({
      issueNumber: 87,
      status: "building",
      statusLabel: "status:building",
      isOpen: true,
      closedAt: null,
      mergedAt: null,
    });

    assert.equal(isActiveAutomationTask(building), true);
    assert.equal(isActiveAutomationTask(automationTaskFixture()), false);
    assert.equal(
      isActiveAutomationTask(automationTaskFixture({ status: "superseded", isOpen: true })),
      false,
    );
    assert.equal(matchesAutomationView(building, "active"), true);
    assert.equal(matchesAutomationView(automationTaskFixture(), "active"), false);
  });

  it("all includes active, backlog, and old merged tasks", () => {
    const oldMerged = automationTaskFixture({
      latestUpdateAt: "2026-01-01T00:00:00.000Z",
      closedAt: "2026-01-01T00:00:00.000Z",
      mergedAt: "2026-01-01T00:00:00.000Z",
    });
    const backlog = automationTaskFixture({
      issueNumber: 90,
      status: "backlog",
      statusLabel: null,
      isOpen: true,
      closedAt: null,
      mergedAt: null,
    });

    assert.equal(matchesAutomationView(oldMerged, "all"), true);
    assert.equal(matchesAutomationView(backlog, "all"), true);
  });

  it("completed requires merged tasks to be production verified", () => {
    const productionVerified = automationTaskFixture({
      latestUpdateAt: "2026-01-01T00:00:00.000Z",
      closedAt: "2026-01-01T00:00:00.000Z",
      mergedAt: "2026-01-01T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc1234",
        reason: null,
        checkedAt: "2026-09-21T00:00:00.000Z",
      },
    });
    const mergedNotLive = automationTaskFixture({
      productionStatus: {
        status: "deploying",
        mergedCommitSha: "abc1234",
        reason: "waiting",
        checkedAt: "2026-09-21T00:00:00.000Z",
      },
    });

    assert.equal(isCompletedAutomationTask(productionVerified), true);
    assert.equal(isCompletedAutomationTask(mergedNotLive), false);
    assert.equal(matchesAutomationView(productionVerified, "completed"), true);
    assert.equal(matchesAutomationView(mergedNotLive, "completed"), false);
  });

  it("hides superseded tasks from completed default list unless explicitly filtered", () => {
    const superseded = automationTaskFixture({
      status: "superseded",
      statusLabel: "status:superseded",
      mergedAt: null,
      productionStatus: {
        status: "unknown",
        mergedCommitSha: null,
        reason: null,
        checkedAt: "2026-09-21T00:00:00.000Z",
      },
    });

    assert.equal(shouldShowTaskInCompletedDefaultList(superseded, "all"), false);
    assert.equal(shouldShowTaskInCompletedDefaultList(superseded, "superseded"), true);
    assert.equal(shouldShowTaskInCompletedDefaultList(automationTaskFixture(), "all"), true);
  });
});
