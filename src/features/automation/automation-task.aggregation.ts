import {
  extractBlockerReason,
  filterRecentStatusComments,
  isMergedToday,
  isOpenAutomationTask,
  parseAutomationRisk,
  parseNormalizedStatus,
  resolveMergeTimestamp,
} from "@/features/automation/automation-status.parser";
import type {
  AutomationTask,
  AutomationTaskSummary,
} from "@/features/automation/automation-task.types";
import type { GitHubIssuePayload } from "@/features/automation/automation-github.types";

export function mapIssueToTask(issue: GitHubIssuePayload): AutomationTask {
  const labelNames = issue.labels.map((label) => label.name);
  const { status, statusLabel } = parseNormalizedStatus(labelNames);
  const { risk, riskLabel } = parseAutomationRisk(labelNames);
  const comments = issue.comments.map((comment) => ({
    author: comment.author?.login ?? "unknown",
    body: comment.body,
    createdAt: comment.createdAt,
  }));

  return {
    issueNumber: issue.number,
    title: issue.title,
    status,
    statusLabel,
    risk,
    riskLabel,
    linkedPullRequest: null,
    latestUpdateAt: issue.updatedAt,
    closedAt: issue.closedAt,
    mergedAt: resolveMergeTimestamp({
      status,
      closedAt: issue.closedAt,
      linkedPullRequestMergedAt: null,
    }),
    blockerReason: extractBlockerReason(comments),
    isOpen: issue.state === "OPEN",
    githubIssueUrl: issue.url,
    labels: labelNames,
    recentStatusComments: filterRecentStatusComments(comments),
  };
}

export function buildSummary(tasks: AutomationTask[]): AutomationTaskSummary {
  return {
    totalOpen: tasks.filter((task) => isOpenAutomationTask(task.status, task.isOpen)).length,
    building: tasks.filter((task) => task.isOpen && task.status === "building").length,
    stalledOrFailed: tasks.filter(
      (task) =>
        task.isOpen &&
        (task.status === "stalled" || task.status === "failed" || task.status === "blocked"),
    ).length,
    needsFix: tasks.filter((task) => task.isOpen && task.status === "needs_fix").length,
    readyToMerge: tasks.filter((task) => task.isOpen && task.status === "ready_to_merge").length,
    mergedToday: tasks.filter(
      (task) => task.status === "merged" && task.mergedAt && isMergedToday(task.mergedAt),
    ).length,
  };
}
