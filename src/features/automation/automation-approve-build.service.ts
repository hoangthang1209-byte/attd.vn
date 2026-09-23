import { evaluateApproveBuildEligibilityForIssue } from "@/features/automation/automation-approve-build.eligibility";
import { hasBuildApprovedComment } from "@/features/automation/automation-build-approved";
import type {
  AutomationGitHubWriteConfig,
  GitHubIssueApprovalPayload,
} from "@/features/automation/automation-github-write.client";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
} from "@/features/automation/automation-github.types";

export type ApproveBuildResultCode =
  | "approved_now"
  | "already_approved"
  | "ineligible"
  | "not_configured"
  | "upstream_error";

export type ApproveBuildResponse = {
  result: ApproveBuildResultCode;
  issueNumber: number;
  message: string;
  ineligibilityReason?: string;
};

export type ApproveBuildDependencies = {
  getWriteConfig: () => AutomationGitHubWriteConfig;
  validateOwnerIdentity: (
    config: Extract<AutomationGitHubWriteConfig, { configured: true }>,
  ) => Promise<{ valid: boolean; message: string | null }>;
  fetchIssue: (issueNumber: number) => Promise<GitHubIssueApprovalPayload>;
  postApproval: (issueNumber: number) => Promise<{ commentId: number }>;
};

const inFlightApprovals = new Map<number, Promise<ApproveBuildResponse>>();

async function resolveDefaultDependencies(): Promise<ApproveBuildDependencies> {
  const writeClient = await import("@/features/automation/automation-github-write.client");
  return {
    getWriteConfig: writeClient.getAutomationGitHubWriteConfig,
    validateOwnerIdentity: writeClient.validateWriteTokenOwnerIdentity,
    fetchIssue: writeClient.fetchIssueForApproval,
    postApproval: writeClient.postBuildApprovedComment,
  };
}

function parseIssueNumber(raw: string): number | null {
  const issueNumber = Number.parseInt(raw, 10);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) return null;
  return issueNumber;
}

async function approveBuildForIssueInternal(
  issueNumberInput: string,
  deps: ApproveBuildDependencies,
): Promise<ApproveBuildResponse> {
  const issueNumber = parseIssueNumber(issueNumberInput);
  if (!issueNumber) {
    return {
      result: "ineligible",
      issueNumber: 0,
      message: "Số issue không hợp lệ.",
      ineligibilityReason: "invalid_issue_number",
    };
  }

  const writeConfig = deps.getWriteConfig();
  if (!writeConfig.configured) {
    return {
      result: "not_configured",
      issueNumber,
      message: writeConfig.configMessage,
    };
  }

  const ownerIdentity = await deps.validateOwnerIdentity(writeConfig);
  if (!ownerIdentity.valid) {
    return {
      result: "not_configured",
      issueNumber,
      message:
        ownerIdentity.message ??
        "GITHUB_AUTOMATION_WRITE_TOKEN phải thuộc repository owner để Builder nhận BUILD_APPROVED.",
    };
  }

  let issue: GitHubIssueApprovalPayload;
  try {
    issue = await deps.fetchIssue(issueNumber);
  } catch (error) {
    if (error instanceof AutomationGitHubConfigError) {
      return {
        result: "not_configured",
        issueNumber,
        message: error.message,
      };
    }

    if (error instanceof AutomationGitHubRequestError && error.status === 404) {
      return {
        result: "ineligible",
        issueNumber,
        message: "Issue không tồn tại trong repo đã cấu hình.",
        ineligibilityReason: "not_found",
      };
    }

    console.error(`[approveBuildForIssue] upstream error for issue #${issueNumber}`, error);
    return {
      result: "upstream_error",
      issueNumber,
      message: "Không thể xác minh issue trên GitHub. Thử lại sau.",
    };
  }

  if (hasBuildApprovedComment(issue.comments)) {
    return {
      result: "already_approved",
      issueNumber,
      message: "Issue đã có BUILD_APPROVED.",
    };
  }

  const eligibility = evaluateApproveBuildEligibilityForIssue(issue);
  if (!eligibility.eligible) {
    return {
      result: "ineligible",
      issueNumber,
      message: "Issue hiện không đủ điều kiện để duyệt & chạy.",
      ineligibilityReason: eligibility.reason ?? undefined,
    };
  }

  // TOCTOU guard: re-fetch comments immediately before posting under the mutex.
  try {
    const refreshedIssue = await deps.fetchIssue(issueNumber);
    if (hasBuildApprovedComment(refreshedIssue.comments)) {
      return {
        result: "already_approved",
        issueNumber,
        message: "Issue đã có BUILD_APPROVED.",
      };
    }
  } catch (error) {
    console.error(`[approveBuildForIssue] pre-post refresh failed for issue #${issueNumber}`, error);
    return {
      result: "upstream_error",
      issueNumber,
      message: "Không thể xác minh issue trên GitHub trước khi duyệt. Thử lại sau.",
    };
  }

  try {
    await deps.postApproval(issueNumber);
    return {
      result: "approved_now",
      issueNumber,
      message: "Đã duyệt · chờ Builder",
    };
  } catch (error) {
    if (error instanceof AutomationGitHubRequestError) {
      console.error(
        `[approveBuildForIssue] GitHub write failed for issue #${issueNumber} (${error.status})`,
      );
    } else {
      console.error(`[approveBuildForIssue] write failed for issue #${issueNumber}`, error);
    }

    // Race loser: another request may have posted BUILD_APPROVED between refresh and post.
    try {
      const postFailureIssue = await deps.fetchIssue(issueNumber);
      if (hasBuildApprovedComment(postFailureIssue.comments)) {
        return {
          result: "already_approved",
          issueNumber,
          message: "Issue đã có BUILD_APPROVED.",
        };
      }
    } catch {
      // Fall through to generic upstream_error.
    }

    return {
      result: "upstream_error",
      issueNumber,
      message: "Không thể gửi BUILD_APPROVED lên GitHub. Thử lại sau.",
    };
  }
}

export async function approveBuildForIssue(
  issueNumberInput: string,
  dependencies?: ApproveBuildDependencies,
): Promise<ApproveBuildResponse> {
  const deps = dependencies ?? (await resolveDefaultDependencies());
  const issueNumber = parseIssueNumber(issueNumberInput);
  if (!issueNumber) {
    return approveBuildForIssueInternal(issueNumberInput, deps);
  }

  const existing = inFlightApprovals.get(issueNumber);
  if (existing) {
    return existing;
  }

  const approvalPromise = approveBuildForIssueInternal(issueNumberInput, deps).finally(() => {
    inFlightApprovals.delete(issueNumber);
  });

  inFlightApprovals.set(issueNumber, approvalPromise);
  return approvalPromise;
}

/** Test helper: clear in-flight approval mutex. */
export function resetApproveBuildInFlightForTests(): void {
  inFlightApprovals.clear();
}
