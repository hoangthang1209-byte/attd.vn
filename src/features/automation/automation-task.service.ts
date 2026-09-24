import "server-only";

import { unstable_cache } from "next/cache";
import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import { prepareLaneBoardTasks } from "@/features/automation/automation-lane-board";
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
  fetchPullRequestVerificationSafe,
  getAutomationGitHubConfig,
} from "@/features/automation/automation-github.client";
import {
  getAutomationGitHubWriteConfig,
  validateWriteTokenOwnerIdentity,
} from "@/features/automation/automation-github-write.client";
import { getProductionCommitShaFromEnv } from "@/features/automation/automation-production";
import { enrichTasksWithProductionStatus } from "@/features/automation/automation-production.enrichment";
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
  laneBoardTasks: AutomationTask[] | null;
  dataCompleteness: AutomationDataCompleteness;
  productionCommitSha: string | null;
  productionCheckedAt: string;
};

type LinkedPullRequestEnrichmentOptions = {
  fetchVerification?: boolean;
};

async function enrichTaskWithLinkedPullRequest(
  task: AutomationTask,
  options: LinkedPullRequestEnrichmentOptions = {},
): Promise<AutomationTask> {
  if (!shouldFetchLinkedPullRequest(task.status, task.isOpen)) {
    return task;
  }

  const linkedPullRequest = await fetchLinkedPullRequestSafe(task.issueNumber);
  if (!linkedPullRequest) return task;

  const verification =
    options.fetchVerification &&
    linkedPullRequest.state === "OPEN" &&
    !linkedPullRequest.merged
      ? await fetchPullRequestVerificationSafe(linkedPullRequest.number)
      : null;

  const linked = {
    number: linkedPullRequest.number,
    url: linkedPullRequest.url,
    state: linkedPullRequest.state === "OPEN" ? "open" : "closed",
    merged: linkedPullRequest.merged,
    title: linkedPullRequest.title,
    updatedAt: linkedPullRequest.updatedAt,
    mergedAt: linkedPullRequest.mergedAt,
    mergeCommitSha: linkedPullRequest.mergeCommitSha,
    verification,
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
    taskAreaRecognitionTruncated,
    unlabeledCommentChecksSkipped,
    unlabeledCommentChecksPerformed,
    commentLookupFailedCount,
    recognitionDegraded,
  } = await fetchAutomationIssuesForView(view, AUTOMATION_STATUS_GITHUB_LABELS);

  const allMappedTasks = issues
    .map(mapIssueToTask)
    .sort((left, right) => right.latestUpdateAt.localeCompare(left.latestUpdateAt));

  const baseTasks = allMappedTasks.filter((task) => matchesAutomationView(task, view));

  const tasksWithLinkedPullRequests =
    view === "active"
      ? await mapWithConcurrency(
          baseTasks,
          AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
          (task) => enrichTaskWithLinkedPullRequest(task),
        )
      : baseTasks;

  const productionCheckedAt = new Date().toISOString();
  const productionCommitSha = getProductionCommitShaFromEnv();
  const tasks = await enrichTasksWithProductionStatus(
    tasksWithLinkedPullRequests,
    productionCommitSha,
    productionCheckedAt,
  );

  let laneBoardTasks: AutomationTask[] | null = null;
  if (view === "active") {
    const laneBoardCandidates = prepareLaneBoardTasks(allMappedTasks);
    const enrichedLaneBoardCandidates = await mapWithConcurrency(
      laneBoardCandidates,
      AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
      (task) => enrichTaskWithLinkedPullRequest(task, { fetchVerification: true }),
    );
    laneBoardTasks = await enrichTasksWithProductionStatus(
      enrichedLaneBoardCandidates,
      productionCommitSha,
      productionCheckedAt,
    );
  }

  return {
    tasks,
    laneBoardTasks,
    dataCompleteness: {
      openTasksTruncated,
      openTasksTotalCount,
      openTasksLoadedCount,
      closedHistoryUnavailable,
      historyTruncated,
      historyLoadedCount,
      historyTotalCount,
      taskAreaRecognitionTruncated,
      unlabeledCommentChecksSkipped,
      unlabeledCommentChecksPerformed,
      commentLookupFailedCount,
      recognitionDegraded,
    },
    productionCommitSha,
    productionCheckedAt,
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

async function resolveWriteActionState() {
  const writeConfig = getAutomationGitHubWriteConfig();
  if (!writeConfig.configured) {
    return {
      writeActionConfigured: false,
      writeActionConfigMessage: writeConfig.configMessage,
    };
  }

  const ownerIdentity = await validateWriteTokenOwnerIdentity(writeConfig);
  if (!ownerIdentity.valid) {
    return {
      writeActionConfigured: false,
      writeActionConfigMessage:
        ownerIdentity.message ??
        "GITHUB_AUTOMATION_WRITE_TOKEN phải thuộc repository owner để Builder nhận BUILD_APPROVED.",
    };
  }

  return {
    writeActionConfigured: true,
    writeActionConfigMessage: null,
  };
}

async function emptyDashboard(
  configMessage: string | null,
  view: AutomationDashboardView = "active",
): Promise<AutomationDashboardResponse> {
  const writeAction = await resolveWriteActionState();
  return {
    configured: false,
    configMessage,
    ...writeAction,
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
    const { tasks, laneBoardTasks, dataCompleteness, productionCommitSha, productionCheckedAt } =
      await getCachedAutomationTasks(config.repoSlug, view)();
    const writeAction = await resolveWriteActionState();
    return {
      configured: true,
      configMessage: null,
      ...writeAction,
      summary: buildSummary(tasks, dataCompleteness, view),
      tasks,
      laneBoardTasks: laneBoardTasks ?? undefined,
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

    const writeAction = await resolveWriteActionState();
    return {
      configured: true,
      configMessage: loadError,
      ...writeAction,
      summary: EMPTY_SUMMARY,
      tasks: [],
      fetchedAt: new Date().toISOString(),
      view,
      productionCommitSha: null,
      productionCheckedAt: null,
    };
  }
}
