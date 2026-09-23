import { evaluateApproveBuildEligibility } from "@/features/automation/automation-approve-build.eligibility";
import {
  AUTOMATION_CANONICAL_LANES,
  getCanonicalLaneById,
  resolveCanonicalLaneId,
  type AutomationCanonicalLaneId,
} from "@/features/automation/automation-lane.constants";
import type { AutomationTask, NormalizedTaskStatus } from "@/features/automation/automation-task.types";

export type AutomationLaneOverallState =
  | "dang_build"
  | "dang_kiem_tra"
  | "can_sua"
  | "san_sang_merge"
  | "dang_deploy"
  | "production"
  | "blocked"
  | "chua_co_task";

export const AUTOMATION_LANE_OVERALL_STATE_LABELS: Record<AutomationLaneOverallState, string> = {
  dang_build: "Đang build",
  dang_kiem_tra: "Đang kiểm tra",
  can_sua: "Cần sửa",
  san_sang_merge: "Sẵn sàng merge",
  dang_deploy: "Đang deploy",
  production: "Production",
  blocked: "Blocked",
  chua_co_task: "Chưa có task",
};

export type AutomationLaneBoardEntry = {
  laneId: AutomationCanonicalLaneId;
  laneLabel: string;
  task: AutomationTask | null;
  /** Eligible task for Duyệt & chạy; may differ from representative when a repair issue awaits approval. */
  approvalTask: AutomationTask | null;
  overallState: AutomationLaneOverallState;
  overallStateLabel: string;
  ciReviewDisplay: string;
  nextAction: string;
  lastUpdateAt: string | null;
  blockerReason: string | null;
};

export type AutomationLaneBoardSummary = {
  totalLanes: number;
  runningCount: number;
  blockedOrNeedsFixCount: number;
  productionCount: number;
};

const OPEN_TASK_SELECTION_PRIORITY: Record<NormalizedTaskStatus, number> = {
  failed: 1,
  stalled: 1,
  blocked: 1,
  needs_fix: 2,
  building: 3,
  pr_open: 3,
  ci_review: 3,
  queued: 3,
  ready_to_merge: 3,
  backlog: 4,
  approved: 4,
  unknown: 4,
  merged: 99,
  superseded: 99,
};

const CI_REVIEW_IN_PROGRESS_STATUSES = new Set<NormalizedTaskStatus>([
  "pr_open",
  "ci_review",
  "queued",
  "approved",
  "backlog",
]);

function compareTasksByOperationalPriority(left: AutomationTask, right: AutomationTask): number {
  const leftPriority = OPEN_TASK_SELECTION_PRIORITY[left.status] ?? 5;
  const rightPriority = OPEN_TASK_SELECTION_PRIORITY[right.status] ?? 5;
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  return Date.parse(right.latestUpdateAt) - Date.parse(left.latestUpdateAt);
}

function isCompletedRepresentativeTask(task: AutomationTask): boolean {
  if (task.status === "merged") return true;
  if (!task.isOpen && (task.mergedAt || task.status === "superseded" || task.status === "failed")) {
    return true;
  }
  return false;
}

function hasOrchestratorRepairLabel(labels: string[]): boolean {
  return labels.some((label) => label.startsWith("orchestrator:"));
}

/** Statuses where another Builder/CI pipeline is already active in the lane. */
const LANE_ACTIVE_PIPELINE_STATUSES = new Set<NormalizedTaskStatus>([
  "building",
  "approved",
  "pr_open",
  "ci_review",
  "queued",
]);

function laneHasActivePipelineTask(tasksInLane: AutomationTask[]): boolean {
  return tasksInLane.some(
    (task) => task.isOpen && LANE_ACTIVE_PIPELINE_STATUSES.has(task.status),
  );
}

/**
 * Select the task eligible for Duyệt & chạy.
 * When another task in the lane is already in an active pipeline, only orchestrator repair
 * issues may be surfaced so the lane cannot start multiple Builder implementations.
 */
export function selectLaneApprovalTask(tasksInLane: AutomationTask[]): AutomationTask | null {
  const eligibleTasks = tasksInLane.filter(
    (task) => task.isOpen && evaluateApproveBuildEligibility(task).eligible,
  );
  if (eligibleTasks.length === 0) return null;

  const repairEligible = eligibleTasks.filter((task) => hasOrchestratorRepairLabel(task.labels));
  const hasActivePipeline = laneHasActivePipelineTask(tasksInLane);

  if (hasActivePipeline) {
    if (repairEligible.length === 0) return null;
    return [...repairEligible].sort(
      (left, right) => Date.parse(right.latestUpdateAt) - Date.parse(left.latestUpdateAt),
    )[0] ?? null;
  }

  const pool = repairEligible.length > 0 ? repairEligible : eligibleTasks;

  return [...pool].sort(
    (left, right) => Date.parse(right.latestUpdateAt) - Date.parse(left.latestUpdateAt),
  )[0] ?? null;
}

/** Select the canonical representative task for one lane bucket. */
export function selectLaneRepresentativeTask(tasksInLane: AutomationTask[]): AutomationTask | null {
  if (tasksInLane.length === 0) return null;

  const openTasks = tasksInLane.filter((task) => task.isOpen && task.status !== "superseded");
  if (openTasks.length > 0) {
    return [...openTasks].sort(compareTasksByOperationalPriority)[0] ?? null;
  }

  const completedTasks = tasksInLane
    .filter(isCompletedRepresentativeTask)
    .sort((left, right) => Date.parse(right.latestUpdateAt) - Date.parse(left.latestUpdateAt));

  return completedTasks[0] ?? null;
}

export function mapLaneOverallState(task: AutomationTask | null): AutomationLaneOverallState {
  if (!task) return "chua_co_task";

  if (task.status === "stalled" || task.status === "failed" || task.status === "blocked") {
    return "blocked";
  }

  if (task.status === "needs_fix") return "can_sua";
  if (task.status === "building") return "dang_build";

  if (CI_REVIEW_IN_PROGRESS_STATUSES.has(task.status)) return "dang_kiem_tra";
  if (task.status === "ready_to_merge") return "san_sang_merge";

  if (task.status === "merged") {
    if (task.productionStatus.status === "live") return "production";
    if (task.productionStatus.status === "deploying") return "dang_deploy";
    if (task.productionStatus.status === "not_live") return "dang_deploy";
    return "dang_deploy";
  }

  if (!task.isOpen) {
    if (task.productionStatus.status === "live") return "production";
    return "chua_co_task";
  }

  return "dang_kiem_tra";
}

export function deriveLaneNextAction(
  task: AutomationTask | null,
  overallState: AutomationLaneOverallState,
): string {
  if (!task || overallState === "chua_co_task") return "—";

  switch (overallState) {
    case "blocked": {
      const reason = task.blockerReason?.trim();
      if (reason && reason.length <= 48) return reason;
      return "Xử lý blocker";
    }
    case "can_sua":
      return "Sửa blocker";
    case "dang_build":
      return "Chờ Builder";
    case "dang_kiem_tra":
      return "Chờ kiểm tra";
    case "san_sang_merge":
      return "Merge";
    case "dang_deploy":
      return "Chờ production";
    case "production":
      return "Task kế tiếp";
    default:
      return "—";
  }
}

export function formatLaneCiReview(task: AutomationTask | null): string {
  if (!task) return "—";

  if (task.status === "needs_fix") return "CI ❌ · cần sửa";
  if (task.status === "failed" || task.status === "stalled") return "CI ❌ · cần sửa";
  if (task.status === "blocked") return "Đang kiểm tra";

  if (task.status === "ready_to_merge" || task.status === "merged") {
    return "CI ✅ · Review ✅";
  }

  if (task.status === "building") return "Đang build";

  if (CI_REVIEW_IN_PROGRESS_STATUSES.has(task.status)) {
    return task.statusLabel ? `Đang kiểm tra · ${task.statusLabel}` : "Đang kiểm tra";
  }

  return task.statusLabel ?? "—";
}

function groupTasksByLane(tasks: AutomationTask[]): Map<AutomationCanonicalLaneId, AutomationTask[]> {
  const grouped = new Map<AutomationCanonicalLaneId, AutomationTask[]>();

  for (const lane of AUTOMATION_CANONICAL_LANES) {
    grouped.set(lane.id, []);
  }

  for (const task of tasks) {
    const laneId = resolveCanonicalLaneId(task.taskArea);
    if (!laneId) continue;
    grouped.get(laneId)?.push(task);
  }

  return grouped;
}

export function buildLaneBoardEntry(
  laneId: AutomationCanonicalLaneId,
  tasksInLane: AutomationTask[],
): AutomationLaneBoardEntry {
  const lane = getCanonicalLaneById(laneId);
  const task = selectLaneRepresentativeTask(tasksInLane);
  const approvalTask = selectLaneApprovalTask(tasksInLane);
  const overallState = mapLaneOverallState(task);

  return {
    laneId,
    laneLabel: lane.label,
    task,
    approvalTask,
    overallState,
    overallStateLabel: AUTOMATION_LANE_OVERALL_STATE_LABELS[overallState],
    ciReviewDisplay: formatLaneCiReview(task),
    nextAction: deriveLaneNextAction(task, overallState),
    lastUpdateAt: task?.latestUpdateAt ?? null,
    blockerReason: task?.blockerReason ?? null,
  };
}

/** Build all seven lane rows from the full task list. */
export function buildLaneBoard(tasks: AutomationTask[]): AutomationLaneBoardEntry[] {
  const grouped = groupTasksByLane(tasks);
  return AUTOMATION_CANONICAL_LANES.map((lane) => buildLaneBoardEntry(lane.id, grouped.get(lane.id) ?? []));
}

const RUNNING_LANE_STATES = new Set<AutomationLaneOverallState>([
  "dang_build",
  "dang_kiem_tra",
  "san_sang_merge",
  "dang_deploy",
]);

const BLOCKED_OR_NEEDS_FIX_STATES = new Set<AutomationLaneOverallState>(["blocked", "can_sua"]);

export function buildLaneBoardSummary(entries: AutomationLaneBoardEntry[]): AutomationLaneBoardSummary {
  return {
    totalLanes: entries.length,
    runningCount: entries.filter((entry) => RUNNING_LANE_STATES.has(entry.overallState)).length,
    blockedOrNeedsFixCount: entries.filter((entry) =>
      BLOCKED_OR_NEEDS_FIX_STATES.has(entry.overallState),
    ).length,
    productionCount: entries.filter((entry) => entry.overallState === "production").length,
  };
}
