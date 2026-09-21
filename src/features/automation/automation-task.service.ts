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
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  fetchAutomationIssues,
  fetchLinkedPullRequestSafe,
  getAutomationGitHubConfig,
} from "@/features/automation/automation-github.client";
import { getProductionCommitShaFromEnv } from "@/features/automation/automation-production";
import { enrichTasksWithProductionStatus } from "@/features/automation/automation-production.enrichment";
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
  productionCommitSha: string | null;
  productionCheckedAt: string;
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
    mergeCommitSha: linkedPullRequest.mergeCommitSha,
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

async function loadAutomationTasksUncached(): Promise<CachedAutomationPayload> {
  const {
    issues,
    openTasksTruncated,
    openTasksTotalCount,
    openTasksLoadedCount,
    closedHistoryUnavailable,
  } = await fetchAutomationIssues(AUTOMATION_STATUS_GITHUB_LABELS);

  const baseTasks = issues
    .map(mapIssueToTask)
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const tasksWithLinkedPullRequests = await mapWithConcurrency(
    baseTasks,
    AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
    enrichTaskWithLinkedPullRequest,
  );

  const productionCheckedAt = new Date().toISOString();
  const productionCommitSha = getProductionCommitShaFromEnv();
  const tasks = await enrichTasksWithProductionStatus(
    tasksWithLinkedPullRequests,
    productionCommitSha,
    productionCheckedAt,
  );

  return {
    tasks,
    dataCompleteness: {
      openTasksTruncated,
      openTasksTotalCount,
      openTasksLoadedCount,
      closedHistoryUnavailable,
    },
    productionCommitSha,
    productionCheckedAt,
  };
}

function getCachedAutomationTasks(repoSlug: string) {
  return unstable_cache(loadAutomationTasksUncached, ["admin-automation-tasks", repoSlug], {
    revalidate: CACHE_REVALIDATE_SECONDS,
  });
}

const EMPTY_SUMMARY = {
  totalOpen: { value: 0, isPartial: false },
  building: { value: 0, isPartial: false },
  stalledOrFailed: { value: 0, isPartial: false },
  needsFix: { value: 0, isPartial: false },
  readyToMerge: { value: 0, isPartial: false },
  mergedToday: { value: 0, isPartial: false },
} as const;

function emptyDashboard(configMessage: string | null): AutomationDashboardResponse {
  return {
    configured: false,
    configMessage,
    summary: EMPTY_SUMMARY,
    tasks: [],
    fetchedAt: new Date().toISOString(),
    productionCommitSha: null,
    productionCheckedAt: null,
  };
}

export async function getAutomationDashboard(): Promise<AutomationDashboardResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured) {
    return emptyDashboard(config.configMessage);
  }

  try {
    const { tasks, dataCompleteness, productionCommitSha, productionCheckedAt } =
      await getCachedAutomationTasks(config.repoSlug)();
    return {
      configured: true,
      configMessage: null,
      summary: buildSummary(tasks, dataCompleteness),
      tasks,
      fetchedAt: new Date().toISOString(),
      dataCompleteness,
      productionCommitSha,
      productionCheckedAt,
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
      summary: EMPTY_SUMMARY,
      tasks: [],
      fetchedAt: new Date().toISOString(),
      productionCommitSha: null,
      productionCheckedAt: null,
    };
  }
}
