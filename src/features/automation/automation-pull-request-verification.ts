import type {
  AutomationLinkedPullRequest,
  NormalizedTaskStatus,
  PullRequestVerification,
  PullRequestVerificationCiStatus,
  PullRequestVerificationReviewStatus,
} from "@/features/automation/automation-task.types";

function formatCiStatusLabel(status: PullRequestVerificationCiStatus): string {
  switch (status) {
    case "success":
      return "CI ✅";
    case "failure":
      return "CI ❌";
    case "pending":
      return "CI ⏳";
    default:
      return "CI ?";
  }
}

function formatReviewStatusLabel(status: PullRequestVerificationReviewStatus): string {
  switch (status) {
    case "approved":
      return "Review ✅";
    case "changes_requested":
      return "Review ❌";
    case "pending":
      return "Review ⏳";
    default:
      return "Review ?";
  }
}

export function formatPullRequestVerificationDisplay(
  verification: PullRequestVerification | null | undefined,
): string | null {
  if (!verification) return null;
  return `${formatCiStatusLabel(verification.ciStatus)} · ${formatReviewStatusLabel(verification.reviewStatus)}`;
}

export function derivePullRequestVerificationDisplay(
  task: {
    status: NormalizedTaskStatus;
    linkedPullRequest: AutomationLinkedPullRequest | null;
  },
): string | null {
  const linkedPullRequest = task.linkedPullRequest;
  if (!linkedPullRequest) return null;

  const verificationDisplay = formatPullRequestVerificationDisplay(linkedPullRequest.verification);
  if (verificationDisplay) return verificationDisplay;

  if (linkedPullRequest.merged || linkedPullRequest.state === "closed") {
    return "CI ✅ · Review ✅";
  }

  if (task.status === "ready_to_merge") {
    return "CI ✅ · Review ✅";
  }

  if (task.status === "needs_fix") {
    return "CI ❌ · cần sửa";
  }

  if (task.status === "ci_review" || task.status === "queued") {
    return "CI ⏳ · Review ⏳";
  }

  if (task.status === "pr_open") {
    return "CI ⏳ · Review ⏳";
  }

  return null;
}
