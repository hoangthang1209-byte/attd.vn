import { hasBuildApprovedComment } from "@/features/automation/automation-build-approved";
import { resolveCanonicalLaneId } from "@/features/automation/automation-lane.constants";
import {
  parseNormalizedStatus,
  parseTaskArea,
  TASK_AREA_UNCLASSIFIED,
} from "@/features/automation/automation-status.parser";
import { isRecognizedDevelopmentTask } from "@/features/automation/automation-task.recognition";
import type { AutomationTask, NormalizedTaskStatus } from "@/features/automation/automation-task.types";

const TERMINAL_OR_ACTIVE_PIPELINE_STATUSES = new Set<NormalizedTaskStatus>([
  "merged",
  "superseded",
  "building",
  "approved",
  "pr_open",
  "ci_review",
  "queued",
  "needs_fix",
  "ready_to_merge",
  "blocked",
  "failed",
  "stalled",
]);

const AWAITING_APPROVAL_STATUSES = new Set<NormalizedTaskStatus>(["backlog", "unknown"]);

export type ApproveBuildIneligibilityReason =
  | "no_task"
  | "closed"
  | "unrecognized_task"
  | "unclassified_task_area"
  | "already_approved"
  | "active_pipeline"
  | "unsafe_status";

export type ApproveBuildEligibility = {
  eligible: boolean;
  reason: ApproveBuildIneligibilityReason | null;
};

type IssueApprovalInput = {
  state: "OPEN" | "CLOSED";
  labels: Array<{ name: string }> | string[];
  comments: ReadonlyArray<{ body: string }>;
};

function normalizeLabelNames(labels: IssueApprovalInput["labels"]): string[] {
  if (labels.length === 0) return [];
  if (typeof labels[0] === "string") return labels as string[];
  return (labels as Array<{ name: string }>).map((label) => label.name);
}

/** Shared eligibility rules for UI hints and server-side validation. */
export function evaluateApproveBuildEligibility(
  task: AutomationTask | null,
): ApproveBuildEligibility {
  if (!task) {
    return { eligible: false, reason: "no_task" };
  }

  if (!task.isOpen) {
    return { eligible: false, reason: "closed" };
  }

  if (task.taskArea === TASK_AREA_UNCLASSIFIED || !resolveCanonicalLaneId(task.taskArea)) {
    return { eligible: false, reason: "unclassified_task_area" };
  }

  if (task.hasBuildApproved) {
    return { eligible: false, reason: "already_approved" };
  }

  if (TERMINAL_OR_ACTIVE_PIPELINE_STATUSES.has(task.status)) {
    return { eligible: false, reason: "active_pipeline" };
  }

  if (!AWAITING_APPROVAL_STATUSES.has(task.status)) {
    return { eligible: false, reason: "unsafe_status" };
  }

  return { eligible: true, reason: null };
}

/** Server-side validation against a freshly loaded GitHub issue payload. */
export function evaluateApproveBuildEligibilityForIssue(issue: IssueApprovalInput): ApproveBuildEligibility {
  const labelNames = normalizeLabelNames(issue.labels);
  const comments = issue.comments.map((comment) => ({
    author: "server",
    body: comment.body,
    createdAt: new Date(0).toISOString(),
  }));
  const { status } = parseNormalizedStatus(labelNames);

  if (issue.state !== "OPEN") {
    return { eligible: false, reason: "closed" };
  }

  if (
    !isRecognizedDevelopmentTask({
      labels: labelNames,
      comments: issue.comments,
    })
  ) {
    return { eligible: false, reason: "unrecognized_task" };
  }

  const taskArea = parseTaskArea(comments);
  if (taskArea === TASK_AREA_UNCLASSIFIED || !resolveCanonicalLaneId(taskArea)) {
    return { eligible: false, reason: "unclassified_task_area" };
  }

  if (hasBuildApprovedComment(issue.comments)) {
    return { eligible: false, reason: "already_approved" };
  }

  if (TERMINAL_OR_ACTIVE_PIPELINE_STATUSES.has(status)) {
    return { eligible: false, reason: "active_pipeline" };
  }

  if (!AWAITING_APPROVAL_STATUSES.has(status)) {
    return { eligible: false, reason: "unsafe_status" };
  }

  return { eligible: true, reason: null };
}
