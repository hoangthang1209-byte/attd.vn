import type { AutomationReviewerStatus } from "@/features/automation/automation-task.types";

export type ReviewSeverityCounts = {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
};

export type GitHubPullReviewSummary = {
  author: string;
  body: string;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  submittedAt: string;
};

export function createInitialReviewerStatus(): AutomationReviewerStatus {
  return {
    status: "unknown",
    reason: null,
    counts: null,
  };
}

export function isAttdPrReviewerReview(body: string): boolean {
  return body.includes("CURSOR_AUTOMATION_ID:") && body.includes("Independent ATTD PR Review");
}

function countFindingsInSection(body: string, severity: "P0" | "P1" | "P2" | "P3"): number {
  const lines = body.split("\n");
  let inSection = false;
  let count = 0;

  for (const line of lines) {
    if (/^####\s+/.test(line)) {
      if (new RegExp(`^####\\s*${severity}([^0-9]|$)`).test(line)) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }
    if (inSection && /^\*\*[0-9]+\./.test(line)) {
      count += 1;
    }
  }

  if (count > 0) return count;

  const fallback = body.match(new RegExp(`^\\s*-\\s*${severity}:\\s*(\\d+)`, "im"));
  return fallback?.[1] ? Number.parseInt(fallback[1], 10) : 0;
}

export function parseReviewSeverityCounts(body: string): ReviewSeverityCounts {
  if (/No\s+P0\/P1\s+findings/i.test(body)) {
    return {
      p0: 0,
      p1: 0,
      p2: countFindingsInSection(body, "P2"),
      p3: countFindingsInSection(body, "P3"),
    };
  }

  return {
    p0: countFindingsInSection(body, "P0"),
    p1: countFindingsInSection(body, "P1"),
    p2: countFindingsInSection(body, "P2"),
    p3: countFindingsInSection(body, "P3"),
  };
}

export function resolveReviewerStatusFromReviews(
  reviews: GitHubPullReviewSummary[],
): AutomationReviewerStatus {
  const attdReviews = reviews
    .filter((review) => isAttdPrReviewerReview(review.body))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));

  if (attdReviews.length === 0) {
    const pendingReview = reviews.some((review) => review.state === "PENDING");
    if (pendingReview) {
      return { status: "in_review", reason: null, counts: null };
    }
    if (reviews.length === 0) {
      return {
        status: "waiting",
        reason: "Chưa có review trên PR.",
        counts: null,
      };
    }
    return {
      status: "waiting",
      reason: "Chưa có kết quả ATTD PR Reviewer.",
      counts: null,
    };
  }

  const latest = attdReviews[0]!;
  const counts = parseReviewSeverityCounts(latest.body);

  if (counts.p0 > 0 || counts.p1 > 0) {
    return {
      status: "needs_fix",
      reason: `P0=${counts.p0}, P1=${counts.p1}`,
      counts,
    };
  }

  if (counts.p2 > 0) {
    return {
      status: "needs_fix",
      reason: `Còn ${counts.p2} P2 cần xử lý.`,
      counts,
    };
  }

  return {
    status: "passed",
    reason: null,
    counts,
  };
}
