import "server-only";

import { unstable_cache } from "next/cache";
import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import { parseAutomationDashboardView } from "@/features/automation/automation-dashboard-view-parser";
import {
  filterActiveViewTasks,
  matchesAutomationView,
} from "@/features/automation/automation-dashboard.views";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  fetchAutomationIssuesForView,
  fetchLinkedPullRequestSafe,
  getAutomationGitHubConfig,
} from "@/features/automation/automation-github.client";
import { enrichTasksWithLifecycle } from "@/features/automation/automation-lifecycle.enrichment";
import { getProductionCommitShaFromEnv } from "@/features/automation/automation-production";
import {
  AUTOMATION_STATUS_GITHUB_LABELS,
  resolveMergeTimestamp,
  shouldFetchLinkedPullRequest,
} from "@/features/automation/automation-status.parser";
import { buildSummary, mapIssueToTask } from "@/features/automation/automation-task.aggregation";
import type {
  AutomationDashboardResponse,
  AutomationDashboardView,
  AutomationDataCompleteness,
  AutomationTask,
} from "@/features/automation/automation-task.types";

export { parseAutomationDashboardView };

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

async function loadAutomationTasksUncached(view: AutomationDashboardView): Promise<CachedAutomationPayload> {
  const fetchResult = await fetchAutomationIssuesForView(view, AUTOMATION_STATUS_GITHUB_LABELS);

  const baseTasks = fetchResult.issues
    .map(mapIssueToTask)
    .filter((task) => matchesAutomationView(task, view))
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const tasksWithLinkedPr =
    view === "active"
      ? await mapWithConcurrency(
          baseTasks,
          AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
          enrichTaskWithLinkedPullRequest,
        )
      : baseTasks;

  const dataCompleteness: AutomationDataCompleteness = {
    openTasksTruncated: fetchResult.openTasksTruncated,
    openTasksTotalCount: fetchResult.openTasksTotalCount,
    openTasksLoadedCount: fetchResult.openTasksLoadedCount,
    closedHistoryUnavailable: fetchResult.closedHistoryUnavailable,
    historyTruncated: fetchResult.historyTruncated,
    historyLoadedCount: fetchResult.historyLoadedCount,
    historyTotalCount: fetchResult.historyTotalCount,
    issuesScanned: fetchResult.issuesScanned ?? null,
    tasksRecognized: fetchResult.tasksRecognized ?? tasksWithLinkedPr.length,
    commentCandidatesSkipped: fetchResult.commentCandidatesSkipped ?? null,
    commentLookupFailures: fetchResult.commentLookupFailures ?? null,
    activeCommentChecksCapped: fetchResult.activeCommentChecksCapped ?? false,
  };

  return {
    tasks: tasksWithLinkedPr,
    dataCompleteness,
  };
}

function getCachedAutomationTasks(repoSlug: string, view: AutomationDashboardView) {
  return unstable_cache(
    () => loadAutomationTasksUncached(view),
    ["admin-automation-tasks-v2", repoSlug, view],
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
    productionCommitSha: null,
    productionCheckedAt: null,
  };
}

export async function getAutomationDashboard(
  view: AutomationDashboardView = "active",
): Promise<AutomationDashboardResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured) {
    return emptyDashboard(config.configMessage, view);
  }

  try {
    const { tasks: cachedTasks, dataCompleteness } = await getCachedAutomationTasks(
      config.repoSlug,
      view,
    )();

    const productionCheckedAt = new Date().toISOString();
    const productionCommitSha = getProductionCommitShaFromEnv();
    const enrichedTasks = await enrichTasksWithLifecycle(
      cachedTasks,
      productionCommitSha,
      productionCheckedAt,
    );

    const viewTasks =
      view === "active" ? filterActiveViewTasks(enrichedTasks) : enrichedTasks;

    return {
      configured: true,
      configMessage: null,
      summary: buildSummary(viewTasks, dataCompleteness, view),
      tasks: viewTasks,
      fetchedAt: new Date().toISOString(),
      view,
      dataCompleteness,
      productionCommitSha,
      productionCheckedAt,
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
      productionCommitSha: null,
      productionCheckedAt: null,
    };
  }
}
