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
  AutomationDataCompleteness,
  AutomationSummaryMetric,
  AutomationTask,
  AutomationTaskSummary,
} from "@/features/automation/automation-task.types";
import type { GitHubIssuePayload } from "@/features/automation/automation-github.types";

export function mapIssueToTask(issue: GitHubIssuePayload): AutomationTask {
  const labelNames = issue.labels.map((label) => label.name);
  const { status, statusLabel } = parseNormalizedStatus(labelNames);
  const { risk, riskLabel } = parseAutomationRisk(labelNames);
  const comments = issue.comments.map((comment) => ({
    author: comment.author?.login ?? "không xác định",
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

function partialMetric(value: number, isPartial: boolean): AutomationSummaryMetric {
  return { value, isPartial };
}

export function buildSummary(
  tasks: AutomationTask[],
  dataCompleteness?: AutomationDataCompleteness,
): AutomationTaskSummary {
  const openTasksTruncated = dataCompleteness?.openTasksTruncated ?? false;
  const loadedOpenCount = tasks.filter((task) =>
    isOpenAutomationTask(task.status, task.isOpen),
  ).length;
  const authoritativeOpenTotal = loadedOpenCount;
  const totalOpenIsPartial = openTasksTruncated;

  return {
    totalOpen: partialMetric(authoritativeOpenTotal, totalOpenIsPartial),
    building: partialMetric(
      tasks.filter((task) => task.isOpen && task.status === "building").length,
      openTasksTruncated,
    ),
    stalledOrFailed: partialMetric(
      tasks.filter(
        (task) =>
          task.isOpen &&
          (task.status === "stalled" || task.status === "failed" || task.status === "blocked"),
      ).length,
      openTasksTruncated,
    ),
    needsFix: partialMetric(
      tasks.filter((task) => task.isOpen && task.status === "needs_fix").length,
      openTasksTruncated,
    ),
    readyToMerge: partialMetric(
      tasks.filter((task) => task.isOpen && task.status === "ready_to_merge").length,
      openTasksTruncated,
    ),
    mergedToday: partialMetric(
      tasks.filter(
        (task) => task.status === "merged" && task.mergedAt && isMergedToday(task.mergedAt),
      ).length,
      dataCompleteness?.closedHistoryUnavailable ?? false,
    ),
  };
}
