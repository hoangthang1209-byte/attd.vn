import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentSummaryCards } from "@/features/agent-os/agent-summary";
import { isActiveAutomationTask } from "@/features/automation/automation-dashboard.views";
import { createInitialProductionStatus } from "@/features/automation/automation-production";
import { withAutomationTaskAgentDefaults } from "@/features/automation/automation-task.test-fixture";
import type { AutomationTask } from "@/features/automation/automation-task.types";

function openTaskFixture(
  overrides: Partial<AutomationTask> & Pick<AutomationTask, "issueNumber" | "status">,
): AutomationTask {
  const checkedAt = new Date().toISOString();
  return withAutomationTaskAgentDefaults({
    title: "Task",
    taskArea: "Automation Platform",
    statusLabel: "status:building",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: checkedAt,
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: `https://github.com/hoangthang1209-byte/attd.vn/issues/${overrides.issueNumber}`,
    labels: [],
    recentStatusComments: [],
    hasBuildApproved: false,
    productionStatus: createInitialProductionStatus(checkedAt),
    ...overrides,
  });
}

describe("agent summary vs active dashboard view", () => {
  it("counts only open active tasks (excludes merged/superseded status while issue open)", () => {
    const activeViewTasks = [
      openTaskFixture({ issueNumber: 1, status: "building" }),
      openTaskFixture({ issueNumber: 2, status: "superseded" }),
      openTaskFixture({ issueNumber: 3, status: "merged" }),
    ].filter(isActiveAutomationTask);

    const cards = buildAgentSummaryCards(activeViewTasks);
    const totalActive = cards.reduce((sum, card) => sum + card.counts.active, 0);
    assert.equal(activeViewTasks.length, 1);
    assert.equal(totalActive, 1);
  });
});
