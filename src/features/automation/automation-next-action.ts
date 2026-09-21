import type {
  AutomationCiStatus,
  AutomationNextAction,
  AutomationProductionStatus,
  AutomationReviewerStatus,
  AutomationTask,
} from "@/features/automation/automation-task.types";

export function deriveNextAction(task: AutomationTask): AutomationNextAction {
  if (task.blockerReason) {
    return { action: "handle_blocker", label: "Xử lý blocker" };
  }

  if (task.relationship?.isSupersededInActiveView) {
    return { action: "superseded", label: "Đã được thay thế" };
  }

  switch (task.status) {
    case "backlog":
    case "approved":
      return { action: "wait_builder", label: "Chờ Builder tạo PR" };
    case "building":
      return { action: "wait_builder", label: "Chờ Builder tạo PR" };
    case "stalled":
      return { action: "handle_blocker", label: "Xử lý blocker" };
    case "blocked":
    case "failed":
      return { action: "handle_blocker", label: "Xử lý blocker" };
    case "queued":
      return { action: "wait_builder", label: "Chờ Builder trong hàng đợi" };
    case "pr_open":
      return deriveNextForCiReviewer(task.ciStatus, task.reviewerStatus);
    case "ci_review":
      return deriveNextForCiReviewer(task.ciStatus, task.reviewerStatus);
    case "needs_fix":
      return deriveNextForNeedsFix(task.reviewerStatus);
    case "ready_to_merge":
      return { action: "ready_merge", label: "Sẵn sàng merge" };
    case "merged":
      return deriveNextForMerged(task.productionStatus);
    case "superseded":
      return { action: "complete", label: "Hoàn tất" };
    default:
      return { action: "unknown", label: "Không xác định" };
  }
}

function deriveNextForCiReviewer(
  ciStatus: AutomationCiStatus,
  reviewerStatus: AutomationReviewerStatus,
): AutomationNextAction {
  if (ciStatus.status === "running" || ciStatus.status === "not_run") {
    return { action: "wait_ci", label: "Chờ CI" };
  }
  if (ciStatus.status === "failed") {
    return { action: "fix_ci", label: "Sửa lỗi CI" };
  }
  if (reviewerStatus.status === "waiting" || reviewerStatus.status === "in_review") {
    return { action: "wait_reviewer", label: "Chờ reviewer" };
  }
  if (reviewerStatus.status === "needs_fix") {
    return { action: "fix_review", label: "Sửa P1/P2 đang chặn" };
  }
  if (reviewerStatus.status === "passed" && ciStatus.status === "passed") {
    return { action: "ready_merge", label: "Sẵn sàng merge" };
  }
  return { action: "unknown", label: "Không xác định" };
}

function deriveNextForNeedsFix(reviewerStatus: AutomationReviewerStatus): AutomationNextAction {
  if (reviewerStatus.status === "needs_fix") {
    return { action: "fix_review", label: "Sửa P1/P2 đang chặn" };
  }
  if (reviewerStatus.status === "passed") {
    return { action: "ready_merge", label: "Sẵn sàng merge" };
  }
  return { action: "wait_reviewer", label: "Chờ reviewer" };
}

function deriveNextForMerged(productionStatus: AutomationProductionStatus): AutomationNextAction {
  switch (productionStatus.status) {
    case "live":
      return { action: "complete", label: "Hoàn tất" };
    case "deploying":
      return { action: "wait_production", label: "Chờ Vercel production" };
    case "not_live":
      return { action: "verify_production", label: "Xác minh production" };
    default:
      return { action: "verify_production", label: "Xác minh production" };
  }
}
