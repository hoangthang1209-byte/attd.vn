import { routeAutomationTask } from "@/features/agent-os/agent-router";
import type { CtoObservation } from "@/features/agent-os/cto-loop.types";
import { evaluateApproveBuildEligibility } from "@/features/automation/automation-approve-build.eligibility";
import type { AutomationTask } from "@/features/automation/automation-task.types";

export type BuildCtoObservationOptions = {
  /** When parent task exists, pass whether the parent is merged/ready. Defaults to true when no parent. */
  parentTaskReady?: boolean;
};

export function buildCtoObservationFromTask(
  task: AutomationTask,
  options: BuildCtoObservationOptions = {},
): CtoObservation {
  const parentTaskIssueNumber = task.parentTaskIssueNumber;
  const parentTaskReady =
    parentTaskIssueNumber == null ? true : (options.parentTaskReady ?? false);

  const agentRoute = routeAutomationTask({
    title: task.title,
    body: null,
    comments: task.recentStatusComments.map((comment) => ({ body: comment.body })),
    taskArea: task.taskArea,
    risk: task.risk,
  });

  const pr = task.linkedPullRequest;
  const headSha = pr?.mergeCommitSha ?? null;

  return {
    issueNumber: task.issueNumber,
    status: task.status,
    risk: task.risk,
    taskArea: task.taskArea,
    hasBuildApproved: task.hasBuildApproved,
    blockerReason: task.blockerReason,
    isOpen: task.isOpen,
    agentRoute,
    pullRequest: pr
      ? {
          number: pr.number,
          headShaFingerprint: headSha ? headSha.slice(0, 12) : null,
          verification: pr.verification,
          merged: pr.merged,
        }
      : null,
    productionLive: task.productionStatus.status === "live",
    dependencyReady: parentTaskReady,
    parentTaskIssueNumber,
    latestUpdateAt: task.latestUpdateAt,
    explicitPriority: task.taskPriority === "unknown" ? null : task.taskPriority,
    approveBuildEligible: evaluateApproveBuildEligibility(task).eligible,
  };
}
