import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentSummaryCards } from "@/features/agent-os/agent-summary";
import type { AutomationTask } from "@/features/automation/automation-task.types";
import { createInitialProductionStatus } from "@/features/automation/automation-production";
import { withAutomationTaskAgentDefaults } from "@/features/automation/automation-task.test-fixture";

function taskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  const checkedAt = new Date().toISOString();
  return withAutomationTaskAgentDefaults({
    issueNumber: 1,
    title: "Task",
    taskArea: "Automation Platform",
    status: "building",
    statusLabel: "status:building",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: checkedAt,
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: "https://github.com/hoangthang1209-byte/attd.vn/issues/1",
    labels: [],
    recentStatusComments: [],
    hasBuildApproved: false,
    productionStatus: createInitialProductionStatus(checkedAt),
    agentAssignment: {
      agentId: "ATTD_CTO",
      agentDisplayName: "ATTD CTO",
      routingReason: "task_area",
      requiresHumanEscalation: false,
      agentOverrideAreaMismatch: false,
    },
    taskPriority: "P1",
    ...overrides,
  });
}

describe("buildAgentSummaryCards", () => {
  it("aggregates open task counts per agent", () => {
    const cards = buildAgentSummaryCards([
      taskFixture({ status: "building" }),
      taskFixture({
        issueNumber: 2,
        status: "queued",
        agentAssignment: {
          agentId: "CRM_AGENT",
          agentDisplayName: "CRM Agent",
          routingReason: "task_area",
          requiresHumanEscalation: false,
          agentOverrideAreaMismatch: false,
        },
      }),
      taskFixture({
        issueNumber: 3,
        status: "blocked",
        agentAssignment: {
          agentId: "CRM_AGENT",
          agentDisplayName: "CRM Agent",
          routingReason: "task_area",
          requiresHumanEscalation: false,
          agentOverrideAreaMismatch: false,
        },
      }),
      taskFixture({ issueNumber: 4, isOpen: false, status: "merged" }),
    ]);

    const cto = cards.find((card) => card.agentId === "ATTD_CTO");
    const crm = cards.find((card) => card.agentId === "CRM_AGENT");
    assert.equal(cto?.counts.active, 1);
    assert.equal(crm?.counts.queued, 1);
    assert.equal(crm?.counts.blocked, 1);
  });

  it("marks cards partial when open-task data is truncated", () => {
    const cards = buildAgentSummaryCards([taskFixture()], { isPartial: true });
    assert.equal(cards.every((card) => card.isPartial), true);
  });
});
