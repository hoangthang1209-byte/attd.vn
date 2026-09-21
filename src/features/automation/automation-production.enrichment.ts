import "server-only";

import {
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import { compareCommitsSafe, fetchLinkedPullRequestSafe } from "@/features/automation/automation-github.client";
import type { GitHubPullRequestPayload } from "@/features/automation/automation-github.types";
import {
  resolveProductionDeploymentStatus,
  shouldFetchLinkedPullRequestForProductionCheck,
  type GitHubCompareStatus,
} from "@/features/automation/automation-production";
import { resolveMergeTimestamp } from "@/features/automation/automation-status.parser";
import type {
  AutomationLinkedPullRequest,
  AutomationProductionStatus,
  AutomationTask,
} from "@/features/automation/automation-task.types";

const PRODUCTION_COMPARE_CONCURRENCY = 5;

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

export async function enrichTasksWithProductionStatus(
  tasks: AutomationTask[],
  productionCommitSha: string | null,
  checkedAt: string,
): Promise<AutomationTask[]> {
  const tasksWithPullRequests = await mapWithConcurrency(
    tasks,
    AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
    ensureLinkedPullRequestForProduction,
  );

  const compareCache = new Map<string, GitHubCompareStatus | null>();

  async function getCompareStatus(mergedSha: string): Promise<GitHubCompareStatus | null> {
    const cached = compareCache.get(mergedSha);
    if (cached !== undefined) return cached;

    const result = await compareCommitsSafe(mergedSha, productionCommitSha!);
    compareCache.set(mergedSha, result);
    return result;
  }

  return mapWithConcurrency(
    tasksWithPullRequests,
    PRODUCTION_COMPARE_CONCURRENCY,
    async (task) => {
      const linkedPullRequest = task.linkedPullRequest;
      const mergedCommitSha = linkedPullRequest?.mergeCommitSha?.trim() || null;

      let compareStatus: GitHubCompareStatus | null = null;
      if (
        linkedPullRequest?.merged &&
        mergedCommitSha &&
        productionCommitSha &&
        mergedCommitSha !== productionCommitSha
      ) {
        compareStatus = await getCompareStatus(mergedCommitSha);
      }

      const resolution = resolveProductionDeploymentStatus({
        productionCommitSha,
        linkedPullRequest,
        compareStatus,
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
    },
  );
}
