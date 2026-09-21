import type {
  AutomationLinkedPullRequest,
  AutomationProductionStatus,
  ProductionDeploymentStatus,
} from "@/features/automation/automation-task.types";

export type GitHubCompareStatus = "identical" | "ahead" | "behind" | "diverged";

export type ProductionStatusResolution = {
  status: ProductionDeploymentStatus;
  reason: string | null;
};

/** Production commit from the deployed Vercel production app (not preview/local). */
export function getProductionCommitShaFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  const sha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  return sha || null;
}

export function createInitialProductionStatus(checkedAt: string): AutomationProductionStatus {
  return {
    status: "unknown",
    mergedCommitSha: null,
    reason: null,
    checkedAt,
  };
}

export function formatShortCommitSha(sha: string | null | undefined): string | null {
  if (!sha?.trim()) return null;
  return sha.trim().slice(0, 7);
}

export function shouldFetchLinkedPullRequestForProductionCheck(input: {
  status: string;
  linkedPullRequest: AutomationLinkedPullRequest | null;
}): boolean {
  if (input.linkedPullRequest) return false;
  return input.status === "merged";
}

export function resolveProductionDeploymentStatus(input: {
  productionCommitSha: string | null;
  linkedPullRequest: Pick<AutomationLinkedPullRequest, "merged" | "mergeCommitSha"> | null;
  compareStatus: GitHubCompareStatus | null;
}): ProductionStatusResolution {
  const linkedPullRequest = input.linkedPullRequest;

  if (!linkedPullRequest?.merged) {
    return {
      status: "not_live",
      reason: linkedPullRequest ? "PR chưa được merge." : "Chưa có PR merge.",
    };
  }

  const mergedCommitSha = linkedPullRequest.mergeCommitSha?.trim() || null;
  if (!mergedCommitSha) {
    return {
      status: "unknown",
      reason: "Không xác định được commit merge của PR.",
    };
  }

  const productionCommitSha = input.productionCommitSha?.trim() || null;
  if (!productionCommitSha) {
    return {
      status: "unknown",
      reason: "Không xác định được commit production hiện tại (chỉ có trên Vercel Production).",
    };
  }

  if (mergedCommitSha === productionCommitSha) {
    return { status: "live", reason: null };
  }

  if (!input.compareStatus) {
    return {
      status: "unknown",
      reason: "Không thể so sánh commit merge với production trên GitHub.",
    };
  }

  switch (input.compareStatus) {
    case "identical":
    case "ahead":
      return { status: "live", reason: null };
    case "behind":
      return {
        status: "deploying",
        reason: "PR đã merge nhưng production chưa chứa commit merge.",
      };
    case "diverged":
      return {
        status: "unknown",
        reason: "Lịch sử commit merge và production không đồng nhất.",
      };
    default:
      return {
        status: "unknown",
        reason: "Kết quả so sánh commit không hợp lệ.",
      };
  }
}
