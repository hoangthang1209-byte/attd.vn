import "server-only";

import { unstable_cache } from "next/cache";
import {
  AUTOMATION_STATUS_GITHUB_LABELS,
  extractBlockerReason,
  filterRecentStatusComments,
  isMergedToday,
  isOpenAutomationTask,
  parseAutomationRisk,
  parseNormalizedStatus,
} from "@/features/automation/automation-status.parser";
import type {
  AutomationDashboardResponse,
  AutomationTask,
  AutomationTaskSummary,
} from "@/features/automation/automation-task.types";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  fetchIssuesByStatusLabel,
  fetchLinkedPullRequest,
  getAutomationGitHubConfig,
  type GitHubIssuePayload,
} from "@/features/automation/automation-github.client";

const CACHE_REVALIDATE_SECONDS = 60;

function mapIssueToTask(issue: GitHubIssuePayload): AutomationTask {
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
    blockerReason: extractBlockerReason(comments),
    isOpen: issue.state === "OPEN",
    githubIssueUrl: issue.url,
    labels: labelNames,
    recentStatusComments: filterRecentStatusComments(comments),
  };
}

function buildSummary(tasks: AutomationTask[]): AutomationTaskSummary {
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
      (task) => task.status === "merged" && isMergedToday(task.latestUpdateAt),
    ).length,
  };
}

async function loadAutomationTasksUncached(): Promise<AutomationTask[]> {
  const issueMap = new Map<number, GitHubIssuePayload>();

  await Promise.all(
    AUTOMATION_STATUS_GITHUB_LABELS.map(async (label) => {
      const issues = await fetchIssuesByStatusLabel(label);
      for (const issue of issues) {
        issueMap.set(issue.number, issue);
      }
    }),
  );

  const baseTasks = [...issueMap.values()]
    .map(mapIssueToTask)
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const tasksWithPullRequests = await Promise.all(
    baseTasks.map(async (task) => {
      const linkedPullRequest = await fetchLinkedPullRequest(task.issueNumber);
      if (!linkedPullRequest) return task;

      return {
        ...task,
        linkedPullRequest: {
          number: linkedPullRequest.number,
          url: linkedPullRequest.url,
          state: linkedPullRequest.state === "OPEN" ? "open" : "closed",
          merged: linkedPullRequest.merged,
          title: linkedPullRequest.title,
          updatedAt: linkedPullRequest.updatedAt,
        },
      } satisfies AutomationTask;
    }),
  );

  return tasksWithPullRequests;
}

const getCachedAutomationTasks = unstable_cache(
  loadAutomationTasksUncached,
  ["admin-automation-tasks"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);

function emptyDashboard(configMessage: string | null): AutomationDashboardResponse {
  return {
    configured: false,
    configMessage,
    summary: {
      totalOpen: 0,
      building: 0,
      stalledOrFailed: 0,
      needsFix: 0,
      readyToMerge: 0,
      mergedToday: 0,
    },
    tasks: [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function getAutomationDashboard(): Promise<AutomationDashboardResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured) {
    return emptyDashboard(config.configMessage);
  }

  try {
    const tasks = await getCachedAutomationTasks();
    return {
      configured: true,
      configMessage: null,
      summary: buildSummary(tasks),
      tasks,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AutomationGitHubConfigError) {
      return emptyDashboard(error.message);
    }

    const loadError =
      error instanceof AutomationGitHubRequestError
        ? `Không thể tải dữ liệu GitHub (${error.status}). Kiểm tra token read-only và quyền truy cập repo.`
        : "Không thể tải dashboard automation từ GitHub.";

    if (!(error instanceof AutomationGitHubRequestError)) {
      console.error("[getAutomationDashboard]", error);
    }

    return {
      configured: true,
      configMessage: loadError,
      summary: {
        totalOpen: 0,
        building: 0,
        stalledOrFailed: 0,
        needsFix: 0,
        readyToMerge: 0,
        mergedToday: 0,
      },
      tasks: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
