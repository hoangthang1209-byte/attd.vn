import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectTaskAreaFilterOptions,
  matchesAutomationTaskFilters,
} from "@/features/automation/automation-dashboard.filters";
import type { AutomationTask } from "@/features/automation/automation-task.types";

function taskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  return {
    issueNumber: 83,
    title: "Automation dashboard task area",
    taskArea: "Automation Platform",
    status: "building",
    statusLabel: "status:building",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: "2026-09-21T00:00:00.000Z",
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: "https://github.com/hoangthang1209-byte/attd.vn/issues/83",
    labels: ["status:building", "risk:low"],
    recentStatusComments: [],
    hasBuildApproved: false,
    productionStatus: {
      status: "unknown",
      mergedCommitSha: null,
      reason: null,
      checkedAt: "2026-09-21T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("automation dashboard filters", () => {
  it("filters tasks by task area", () => {
    const leadTask = taskFixture({ issueNumber: 71, taskArea: "Lead & Sales" });
    const uiTask = taskFixture({ issueNumber: 74, taskArea: "Public Website UI" });

    assert.equal(
      matchesAutomationTaskFilters(leadTask, {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "Lead & Sales",
        searchQuery: "",
      }),
      true,
    );
    assert.equal(
      matchesAutomationTaskFilters(uiTask, {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "Lead & Sales",
        searchQuery: "",
      }),
      false,
    );
  });

  it("includes task area in search matching", () => {
    assert.equal(
      matchesAutomationTaskFilters(taskFixture(), {
        statusFilter: "all",
        riskFilter: "all",
        openFilter: "all",
        taskAreaFilter: "all",
        searchQuery: "automation platform",
      }),
      true,
    );
  });

  it("collects sorted unique task area filter options", () => {
    const options = collectTaskAreaFilterOptions([
      taskFixture({ taskArea: "Automation Platform" }),
      taskFixture({ issueNumber: 71, taskArea: "Lead & Sales" }),
      taskFixture({ issueNumber: 74, taskArea: "Public Website UI" }),
      taskFixture({ issueNumber: 75, taskArea: "Lead & Sales" }),
    ]);

    assert.deepEqual(options, [
      { value: "Automation Platform", label: "Automation Platform" },
      { value: "Lead & Sales", label: "Lead & Sales" },
      { value: "Public Website UI", label: "Public Website UI" },
    ]);
  });
});
