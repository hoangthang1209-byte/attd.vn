import "server-only";

import { unstable_cache } from "next/cache";
import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  isRecoverableGitHubLookupError,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import {
  AUTOMATION_STATUS_GITHUB_LABELS,
  resolveMergeTimestamp,
  shouldFetchLinkedPullRequest,
} from "@/features/automation/automation-status.parser";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  fetchAutomationIssues,
  fetchLinkedPullRequest,
  getAutomationGitHubConfig,
} from "@/features/automation/automation-github.client";
import { buildSummary, mapIssueToTask } from "@/features/automation/automation-task.aggregation";
import type {
  AutomationDashboardResponse,
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

  try {
    const linkedPullRequest = await fetchLinkedPullRequest(task.issueNumber);
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
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[getAutomationDashboard] linked PR lookup failed for issue #${task.issueNumber}; continuing with partial data`,
      );
      return task;
    }
    throw error;
  }
}

async function loadAutomationTasksUncached(): Promise<CachedAutomationPayload> {
  const { issues, openTasksTruncated, openTasksTotalCount, openTasksLoadedCount } =
    await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);

  const baseTasks = issues
    .map(mapIssueToTask)
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const tasks = await mapWithConcurrency(
    baseTasks,
    AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
    enrichTaskWithLinkedPullRequest,
  );

  return {
    tasks,
    dataCompleteness: {
      openTasksTruncated,
      openTasksTotalCount,
      openTasksLoadedCount,
    },
  };
}

function getCachedAutomationTasks(repoSlug: string) {
  return unstable_cache(loadAutomationTasksUncached, ["admin-automation-tasks", repoSlug], {
    revalidate: CACHE_REVALIDATE_SECONDS,
  });
}

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
    const { tasks, dataCompleteness } = await getCachedAutomationTasks(config.repoSlug)();
    return {
      configured: true,
      configMessage: null,
      summary: buildSummary(tasks),
      tasks,
      fetchedAt: new Date().toISOString(),
      dataCompleteness,
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
