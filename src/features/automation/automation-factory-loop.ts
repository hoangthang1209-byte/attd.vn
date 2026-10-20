import type { AutomationStatusComment, NormalizedTaskStatus } from "@/features/automation/automation-task.types";

export const CONTINUOUS_ORCHESTRATOR_MARKER_PREFIX = "CONTINUOUS_ORCHESTRATOR_IDEMPOTENCY:";
export const CONTINUOUS_ORCHESTRATOR_STALLED_PREFIX = "CONTINUOUS_ORCHESTRATOR_STALLED:";

export type AutomationFactoryLoopStage =
  | "QUEUE"
  | "BUILDING"
  | "CI_REVIEW"
  | "REPAIR"
  | "MERGING"
  | "DEPLOYING"
  | "VERIFYING"
  | "COMPLETED"
  | "WAIT_HUMAN";

export type AutomationFactoryLoopSnapshot = {
  stage: AutomationFactoryLoopStage;
  exactHeadSha: string | null;
  productionVerificationSha: string | null;
  lastTransitionAt: string | null;
  nextAction: string | null;
  retryCount: number;
  waitHuman: boolean;
  waitHumanReason: string | null;
};

const STAGE_LABEL: Record<AutomationFactoryLoopStage, string> = {
  QUEUE: "Hàng đợi",
  BUILDING: "Đang build",
  CI_REVIEW: "CI / Review (exact head)",
  REPAIR: "Sửa lỗi",
  MERGING: "Auto-merge",
  DEPLOYING: "Triển khai production",
  VERIFYING: "Xác minh production (exact SHA)",
  COMPLETED: "Hoàn tất",
  WAIT_HUMAN: "Chờ con người",
};

export function formatFactoryLoopStageLabel(stage: AutomationFactoryLoopStage): string {
  return STAGE_LABEL[stage];
}

function findLatestCommentMatching(
  comments: readonly AutomationStatusComment[],
  predicate: (body: string) => boolean,
): AutomationStatusComment | null {
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index];
    if (comment && predicate(comment.body)) return comment;
  }
  return null;
}

function extractShaFromComment(body: string): string | null {
  const match = body.match(/`([0-9a-f]{7,40})`/i);
  return match?.[1] ?? null;
}

function countReviewRequestMarkers(comments: readonly AutomationStatusComment[]): number {
  return comments.filter((comment) =>
    comment.body.includes("REVIEW_ORCHESTRATOR_IDEMPOTENCY:"),
  ).length;
}

export function resolveAutomationFactoryLoopSnapshot(input: {
  status: NormalizedTaskStatus;
  comments: readonly AutomationStatusComment[];
  linkedHeadSha?: string | null;
  linkedMergeCommitSha?: string | null;
  reviewWaitHuman?: boolean;
  reviewStalledReason?: string | null;
}): AutomationFactoryLoopSnapshot {
  const waitHumanComment =
    findLatestCommentMatching(input.comments, (body) =>
      body.includes(CONTINUOUS_ORCHESTRATOR_STALLED_PREFIX),
    ) ??
    findLatestCommentMatching(input.comments, (body) =>
      body.includes("REVIEW_ORCHESTRATOR_STALLED:"),
    );

  if (input.reviewWaitHuman || waitHumanComment) {
    return {
      stage: "WAIT_HUMAN",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: waitHumanComment?.createdAt ?? null,
      nextAction: "Owner xử lý blocker và tiếp tục loop",
      retryCount: countReviewRequestMarkers(input.comments),
      waitHuman: true,
      waitHumanReason:
        input.reviewStalledReason ??
        waitHumanComment?.body.split("\n")[0]?.trim() ??
        "WAIT_HUMAN",
    };
  }

  if (input.status === "completed") {
    const completed = findLatestCommentMatching(input.comments, (body) =>
      body.includes("CONTINUOUS_ORCHESTRATOR_COMPLETED:"),
    );
    const verified = findLatestCommentMatching(input.comments, (body) =>
      body.includes("CONTINUOUS_ORCHESTRATOR_PRODUCTION_VERIFIED:"),
    );
    return {
      stage: "COMPLETED",
      exactHeadSha: input.linkedHeadSha ?? extractShaFromComment(completed?.body ?? ""),
      productionVerificationSha:
        extractShaFromComment(verified?.body ?? "") ?? input.linkedMergeCommitSha ?? null,
      lastTransitionAt: completed?.createdAt ?? null,
      nextAction: "Claim task tiếp theo (nếu queue trống)",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "verifying") {
    return {
      stage: "VERIFYING",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: input.linkedMergeCommitSha ?? null,
      lastTransitionAt: null,
      nextAction: "Chờ production exact-SHA READY + smoke",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "merging") {
    return {
      stage: "MERGING",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Auto-merge với expected_head_sha",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "merged") {
    return {
      stage: "DEPLOYING",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: input.linkedMergeCommitSha ?? null,
      lastTransitionAt: null,
      nextAction: "Chờ Vercel Production deployment",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "ready_to_merge") {
    return {
      stage: "MERGING",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Kiểm tra merge gate (exact-head review + CI)",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "needs_fix") {
    return {
      stage: "REPAIR",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Repair → CI → exact-head review",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "ci_review" || input.status === "queued") {
    return {
      stage: "CI_REVIEW",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Chờ CI xanh + Independent ATTD PR Review exact head",
      retryCount: countReviewRequestMarkers(input.comments),
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "pr_open" || input.status === "building") {
    return {
      stage: "BUILDING",
      exactHeadSha: input.linkedHeadSha ?? null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Builder / PR / CI",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  if (input.status === "approved" || input.status === "backlog") {
    return {
      stage: "QUEUE",
      exactHeadSha: null,
      productionVerificationSha: null,
      lastTransitionAt: null,
      nextAction: "Chờ BUILD_APPROVED / claim queue",
      retryCount: 0,
      waitHuman: false,
      waitHumanReason: null,
    };
  }

  return {
    stage: "WAIT_HUMAN",
    exactHeadSha: input.linkedHeadSha ?? null,
    productionVerificationSha: null,
    lastTransitionAt: null,
    nextAction: "Trạng thái không thuộc factory loop",
    retryCount: 0,
    waitHuman: input.status === "blocked" || input.status === "stalled",
    waitHumanReason: input.status === "blocked" ? "Task bị chặn" : null,
  };
}
