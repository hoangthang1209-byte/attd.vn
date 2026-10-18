import { isAttdReviewBlockedForDashboard } from "@/features/automation/automation-pr-review-severity";

export const REQUEST_INDEPENDENT_REVIEW_TOKEN = "REQUEST_INDEPENDENT_REVIEW";
export const REVIEW_ORCHESTRATOR_MARKER_PREFIX = "REVIEW_ORCHESTRATOR_IDEMPOTENCY:";
export const REVIEW_ORCHESTRATOR_STALLED_PREFIX = "REVIEW_ORCHESTRATOR_STALLED:";

export type PullReviewSnapshot = {
  commitId: string | null;
  body: string;
  state: string;
};

export function isAttdIndependentReviewBody(body: string): boolean {
  return body.includes("CURSOR_AUTOMATION_ID:") && body.includes("Independent ATTD PR Review");
}

export function findExactHeadIndependentReview(
  headSha: string,
  reviews: readonly PullReviewSnapshot[],
): PullReviewSnapshot | null {
  for (let index = reviews.length - 1; index >= 0; index -= 1) {
    const review = reviews[index];
    if (!review?.commitId || review.commitId !== headSha) continue;
    if (!isAttdIndependentReviewBody(review.body)) continue;
    return review;
  }
  return null;
}

export type ExactHeadReviewGateResult =
  | "approved"
  | "changes_requested"
  | "pending"
  | "stale"
  | "unknown";

export function resolveExactHeadReviewGate(input: {
  headSha: string;
  reviews: readonly PullReviewSnapshot[];
}): {
  reviewStatus: ExactHeadReviewGateResult;
  reviewedHeadSha: string | null;
} {
  const exactReview = findExactHeadIndependentReview(input.headSha, input.reviews);
  if (exactReview) {
    if (
      exactReview.state === "CHANGES_REQUESTED" ||
      isAttdReviewBlockedForDashboard(exactReview.body)
    ) {
      return { reviewStatus: "changes_requested", reviewedHeadSha: exactReview.commitId };
    }
    return { reviewStatus: "approved", reviewedHeadSha: exactReview.commitId };
  }

  const hasStaleIndependentReview = input.reviews.some(
    (review) =>
      review.commitId &&
      review.commitId !== input.headSha &&
      isAttdIndependentReviewBody(review.body),
  );

  if (hasStaleIndependentReview) {
    return { reviewStatus: "stale", reviewedHeadSha: null };
  }

  if (input.reviews.length > 0) {
    return { reviewStatus: "pending", reviewedHeadSha: null };
  }

  return { reviewStatus: "unknown", reviewedHeadSha: null };
}

export function detectReviewOrchestratorStalled(
  headSha: string,
  commentBodies: readonly string[],
): { reviewStalled: boolean; waitHuman: boolean; reason: string | null } {
  const stalledMarker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} stalled-pr-`;
  const headToken = `sha-${headSha}`;

  for (let index = commentBodies.length - 1; index >= 0; index -= 1) {
    const body = commentBodies[index]?.trim() ?? "";
    if (!body.includes(REVIEW_ORCHESTRATOR_STALLED_PREFIX)) continue;
    if (!body.includes(stalledMarker) || !body.includes(headToken)) continue;

    const reasonLine =
      body
        .split("\n")
        .find((line) => line.startsWith(REVIEW_ORCHESTRATOR_STALLED_PREFIX)) ?? body;

    return {
      reviewStalled: true,
      waitHuman: true,
      reason: reasonLine.trim(),
    };
  }

  return { reviewStalled: false, waitHuman: false, reason: null };
}

export function countReviewRequestMarkersForHead(
  pullNumber: number,
  headSha: string,
  commentBodies: readonly string[],
): number {
  const requestNeedle = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} request-pr-${pullNumber}-sha-${headSha}`;
  const retryNeedle = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} retry-pr-${pullNumber}-sha-${headSha}`;

  return commentBodies.filter(
    (body) => body.includes(requestNeedle) || body.includes(retryNeedle),
  ).length;
}
