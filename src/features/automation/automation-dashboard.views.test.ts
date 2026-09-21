import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isActiveAutomationTask,
  isCompletedAutomationTask,
  matchesAutomationView,
  parseAutomationDashboardView,
  shouldShowTaskInCompletedDefaultList,
} from "@/features/automation/automation-dashboard.views";
import { createInitialProductionStatus } from "@/features/automation/automation-production";
import type { AutomationTask } from "@/features/automation/automation-task.types";

function taskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  return {
    issueNumber: 57,
    title: "Historical merged task",
    taskArea: "Automation Platform",
    status: "merged",
    statusLabel: "status:merged",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: "2026-08-01T00:00:00.000Z",
    closedAt: "2026-08-01T00:00:00.000Z",
    mergedAt: "2026-08-01T00:00:00.000Z",
    blockerReason: null,
    isOpen: false,
    githubIssueUrl: "https://github.com/hoangthang1209-byte/attd.vn/issues/57",
    labels: ["status:merged"],
    recentStatusComments: [],
    productionStatus: createInitialProductionStatus("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("parseAutomationDashboardView", () => {
  it("defaults to active and accepts all and completed", () => {
    assert.equal(parseAutomationDashboardView(undefined), "active");
    assert.equal(parseAutomationDashboardView(null), "active");
    assert.equal(parseAutomationDashboardView(""), "active");
    assert.equal(parseAutomationDashboardView("active"), "active");
    assert.equal(parseAutomationDashboardView("all"), "all");
    assert.equal(parseAutomationDashboardView("completed"), "completed");
    assert.equal(parseAutomationDashboardView("invalid"), "active");
  });
});

describe("automation dashboard views", () => {
  it("active excludes merged, superseded, and closed tasks", () => {
    const building = taskFixture({
      issueNumber: 87,
      status: "building",
      statusLabel: "status:building",
      isOpen: true,
      closedAt: null,
      mergedAt: null,
    });

    assert.equal(isActiveAutomationTask(building), true);
    assert.equal(isActiveAutomationTask(taskFixture()), false);
    assert.equal(
      isActiveAutomationTask(taskFixture({ status: "superseded", isOpen: true })),
      false,
    );
    assert.equal(matchesAutomationView(building, "active"), true);
    assert.equal(matchesAutomationView(taskFixture(), "active"), false);
  });

  it("all includes active, backlog, and old merged tasks", () => {
    const oldMerged = taskFixture({
      latestUpdateAt: "2026-01-01T00:00:00.000Z",
      closedAt: "2026-01-01T00:00:00.000Z",
      mergedAt: "2026-01-01T00:00:00.000Z",
    });
    const backlog = taskFixture({
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

  it("completed includes historical merged tasks beyond the recent window", () => {
    const oldMerged = taskFixture({
      latestUpdateAt: "2026-01-01T00:00:00.000Z",
      closedAt: "2026-01-01T00:00:00.000Z",
      mergedAt: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(isCompletedAutomationTask(oldMerged), true);
    assert.equal(matchesAutomationView(oldMerged, "completed"), true);
  });

  it("hides superseded tasks from completed default list unless explicitly filtered", () => {
    const superseded = taskFixture({
      status: "superseded",
      statusLabel: "status:superseded",
      mergedAt: null,
    });

    assert.equal(shouldShowTaskInCompletedDefaultList(superseded, "all"), false);
    assert.equal(shouldShowTaskInCompletedDefaultList(superseded, "superseded"), true);
    assert.equal(shouldShowTaskInCompletedDefaultList(taskFixture(), "all"), true);
  });
});
