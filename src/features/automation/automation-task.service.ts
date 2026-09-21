import "server-only";

import { unstable_cache } from "next/cache";
import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import {
  AUTOMATION_STATUS_GITHUB_LABELS,
  resolveMergeTimestamp,
  shouldFetchLinkedPullRequest,
} from "@/features/automation/automation-status.parser";
import { matchesAutomationView } from "@/features/automation/automation-dashboard.views";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  fetchAutomationIssuesForView,
  fetchLinkedPullRequestSafe,
  getAutomationGitHubConfig,
} from "@/features/automation/automation-github.client";
import { buildSummary, mapIssueToTask } from "@/features/automation/automation-task.aggregation";
import type {
  AutomationDashboardResponse,
  AutomationDashboardView,
  AutomationDataCompleteness,
  AutomationTask,
} from "@/features/automation/automation-task.types";

const CACHE_REVALIDATE_SECONDS = 60;

type CachedAutomationPayload = {
  tasks: AutomationTask[];
  dataCompleteness: AutomationDataCompleteness;
};

async function enrichTaskWithLinkedPullRequest(task: AutomationTask): Promise<AutomationTask> {
  if (!shouldFetchLinkedPullRequest(task.status, task.isOpen)) {
    return task;
  }

  const linkedPullRequest = await fetchLinkedPullRequestSafe(task.issueNumber);
  if (!linkedPullRequest) return task;

  const linked = {
    number: linkedPullRequest.number,
    url: linkedPullRequest.url,
    state: linkedPullRequest.state === "OPEN" ? "open" : "closed",
    merged: linkedPullRequest.merged,
    title: linkedPullRequest.title,
    updatedAt: linkedPullRequest.updatedAt,
    mergedAt: linkedPullRequest.mergedAt,
  } as const;

  return {
    ...task,
    linkedPullRequest: linked,
    mergedAt: resolveMergeTimestamp({
      status: task.status,
      closedAt: task.closedAt,
      linkedPullRequestMergedAt: linkedPullRequest.mergedAt,
    }),
  } satisfies AutomationTask;
}

async function loadAutomationTasksUncached(view: AutomationDashboardView): Promise<CachedAutomationPayload> {
  const {
    issues,
    openTasksTruncated,
    openTasksTotalCount,
    openTasksLoadedCount,
    closedHistoryUnavailable,
    historyTruncated,
    historyLoadedCount,
    historyTotalCount,
  } = await fetchAutomationIssuesForView(view, AUTOMATION_STATUS_GITHUB_LABELS);

  const baseTasks = issues
    .map(mapIssueToTask)
    .filter((task) => matchesAutomationView(task, view))
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const tasks =
    view === "active"
      ? await mapWithConcurrency(
          baseTasks,
          AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
          enrichTaskWithLinkedPullRequest,
        )
      : baseTasks;

  return {
    tasks,
    dataCompleteness: {
      openTasksTruncated,
      openTasksTotalCount,
      openTasksLoadedCount,
      closedHistoryUnavailable,
      historyTruncated,
      historyLoadedCount,
      historyTotalCount,
    },
  };
}

function getCachedAutomationTasks(repoSlug: string, view: AutomationDashboardView) {
  return unstable_cache(
    () => loadAutomationTasksUncached(view),
    ["admin-automation-tasks", repoSlug, view],
    {
      revalidate: CACHE_REVALIDATE_SECONDS,
    },
  );
}

const EMPTY_SUMMARY = {
  totalOpen: { value: 0, isPartial: false },
  building: { value: 0, isPartial: false },
  stalledOrFailed: { value: 0, isPartial: false },
  needsFix: { value: 0, isPartial: false },
  readyToMerge: { value: 0, isPartial: false },
  mergedToday: { value: 0, isPartial: false },
} as const;

function emptyDashboard(
  configMessage: string | null,
  view: AutomationDashboardView = "active",
): AutomationDashboardResponse {
  return {
    configured: false,
    configMessage,
    summary: EMPTY_SUMMARY,
    tasks: [],
    fetchedAt: new Date().toISOString(),
    view,
  };
}

export function parseAutomationDashboardView(
  raw: string | null | undefined,
): AutomationDashboardView {
  if (raw === "all" || raw === "completed") return raw;
  return "active";
}

export async function getAutomationDashboard(
  view: AutomationDashboardView = "active",
): Promise<AutomationDashboardResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured) {
    return emptyDashboard(config.configMessage, view);
  }

  try {
    const { tasks, dataCompleteness } = await getCachedAutomationTasks(config.repoSlug, view)();
    return {
      configured: true,
      configMessage: null,
      summary: buildSummary(tasks, dataCompleteness, view),
      tasks,
      fetchedAt: new Date().toISOString(),
      view,
      dataCompleteness,
    };
  } catch (error) {
    if (error instanceof AutomationGitHubConfigError) {
      return emptyDashboard(error.message, view);
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
      summary: EMPTY_SUMMARY,
      tasks: [],
      fetchedAt: new Date().toISOString(),
      view,
    };
  }
}
