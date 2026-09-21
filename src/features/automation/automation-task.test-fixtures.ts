import { createDefaultLifecycleFields } from "@/features/automation/automation-task.defaults";
import type { AutomationTask } from "@/features/automation/automation-task.types";

export function automationTaskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  const checkedAt = "2026-09-21T00:00:00.000Z";
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
    ...createDefaultLifecycleFields(checkedAt),
    productionStatus: {
      status: "live",
      mergedCommitSha: "abc1234",
      reason: null,
      checkedAt,
    },
    ...overrides,
  };
}
