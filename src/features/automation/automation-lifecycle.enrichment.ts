import "server-only";

import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import {
  createInitialCiStatus,
  resolveCiStatusFromCheckRuns,
  type GitHubCheckRunSummary,
  type GitHubCommitStatusState,
} from "@/features/automation/automation-ci";
import { deriveNextAction } from "@/features/automation/automation-next-action";
import {
  compareCommitsSafe,
  fetchLinkedPullRequestSafe,
  fetchPullRequestCheckRunsSafe,
  fetchPullRequestReviewsSafe,
} from "@/features/automation/automation-github.client";
import type { GitHubPullRequestPayload } from "@/features/automation/automation-github.types";
import {
  resolveProductionDeploymentStatus,
  shouldFetchLinkedPullRequestForProductionCheck,
  type GitHubCompareStatus,
} from "@/features/automation/automation-production";
import {
  createInitialReviewerStatus,
  resolveReviewerStatusFromReviews,
} from "@/features/automation/automation-reviewer";
import { resolveMergeTimestamp } from "@/features/automation/automation-status.parser";
import { applyTaskRelationships } from "@/features/automation/automation-task.relationships";
import type {
  AutomationLinkedPullRequest,
  AutomationProductionStatus,
  AutomationTask,
} from "@/features/automation/automation-task.types";

const PRODUCTION_COMPARE_CONCURRENCY = 5;
const LIFECYCLE_ENRICH_CONCURRENCY = 5;

const comparePromiseCache = new Map<string, Promise<GitHubCompareStatus | null>>();

function toLinkedPullRequest(payload: GitHubPullRequestPayload): AutomationLinkedPullRequest {
  return {
    number: payload.number,
    url: payload.url,
    state: payload.state === "OPEN" ? "open" : "closed",
    merged: payload.merged,
    title: payload.title,
    updatedAt: payload.updatedAt,
    mergedAt: payload.mergedAt,
    mergeCommitSha: payload.mergeCommitSha,
  };
}

async function ensureLinkedPullRequestForProduction(task: AutomationTask): Promise<AutomationTask> {
  if (!shouldFetchLinkedPullRequestForProductionCheck(task)) {
    return task;
  }

  const linkedPullRequest = await fetchLinkedPullRequestSafe(task.issueNumber);
  if (!linkedPullRequest) return task;

  const linked = toLinkedPullRequest(linkedPullRequest);

  return {
    ...task,
    linkedPullRequest: linked,
    mergedAt: resolveMergeTimestamp({
      status: task.status,
      closedAt: task.closedAt,
      linkedPullRequestMergedAt: linked.mergedAt,
    }),
  };
}

async function getCompareStatusDeduped(
  mergedSha: string,
  productionCommitSha: string,
): Promise<GitHubCompareStatus | null> {
  const cacheKey = `${mergedSha}:${productionCommitSha}`;
  const existing = comparePromiseCache.get(cacheKey);
  if (existing) return existing;

  const promise = compareCommitsSafe(mergedSha, productionCommitSha);
  comparePromiseCache.set(cacheKey, promise);
  return promise;
}

async function enrichTaskProductionStatus(
  task: AutomationTask,
  productionCommitSha: string | null,
  checkedAt: string,
): Promise<AutomationTask> {
  const linkedPullRequest = task.linkedPullRequest;
  const mergedCommitSha = linkedPullRequest?.mergeCommitSha?.trim() || null;

  let compareStatus: GitHubCompareStatus | null = null;
  if (
    linkedPullRequest?.merged &&
    mergedCommitSha &&
    productionCommitSha &&
    mergedCommitSha !== productionCommitSha
  ) {
    compareStatus = await getCompareStatusDeduped(mergedCommitSha, productionCommitSha);
  }

  const resolution = resolveProductionDeploymentStatus({
    productionCommitSha,
    linkedPullRequest,
    compareStatus,
    taskStatus: task.status,
    prLookupFailed: task.status === "merged" && !linkedPullRequest,
  });

  const productionStatus: AutomationProductionStatus = {
    status: resolution.status,
    mergedCommitSha,
    reason: resolution.reason,
    checkedAt,
  };

  return {
    ...task,
    productionStatus,
  };
}

async function enrichTaskCiAndReviewer(task: AutomationTask): Promise<AutomationTask> {
  const pullNumber = task.linkedPullRequest?.number;
  if (!pullNumber) {
    return {
      ...task,
      ciStatus: createInitialCiStatus(),
      reviewerStatus: createInitialReviewerStatus(),
    };
  }

  const [checkRuns, reviews] = await Promise.all([
    fetchPullRequestCheckRunsSafe(pullNumber),
    fetchPullRequestReviewsSafe(pullNumber),
  ]);

  const ciStatus = resolveCiStatusFromCheckRuns({
    checkRuns: checkRuns.checkRuns as GitHubCheckRunSummary[],
    commitStatuses: checkRuns.statuses as GitHubCommitStatusState[],
    hasLinkedPullRequest: true,
  });

  const reviewerStatus = resolveReviewerStatusFromReviews(reviews);

  return {
    ...task,
    ciStatus,
    reviewerStatus,
  };
}

export async function enrichTasksWithLifecycle(
  tasks: AutomationTask[],
  productionCommitSha: string | null,
  checkedAt: string,
): Promise<AutomationTask[]> {
  const tasksWithPullRequests = await mapWithConcurrency(
    tasks,
    AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
    ensureLinkedPullRequestForProduction,
  );

  const withProduction = await mapWithConcurrency(
    tasksWithPullRequests,
    PRODUCTION_COMPARE_CONCURRENCY,
    (task) => enrichTaskProductionStatus(task, productionCommitSha, checkedAt),
  );

  const withCiReviewer = await mapWithConcurrency(
    withProduction,
    LIFECYCLE_ENRICH_CONCURRENCY,
    enrichTaskCiAndReviewer,
  );

  const withRelationships = applyTaskRelationships(
    withCiReviewer.map((task) => ({
      ...task,
      nextAction: deriveNextAction(task),
    })),
  );

  return withRelationships.map((task) => ({
    ...task,
    nextAction: deriveNextAction(task),
  }));
}