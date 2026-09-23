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
  fetchIssue: (issueNumber: number) => Promise<GitHubIssueApprovalPayload>;
  postApproval: (issueNumber: number) => Promise<{ commentId: number }>;
};

async function resolveDefaultDependencies(): Promise<ApproveBuildDependencies> {
  const writeClient = await import("@/features/automation/automation-github-write.client");
  return {
    getWriteConfig: writeClient.getAutomationGitHubWriteConfig,
    fetchIssue: writeClient.fetchIssueForApproval,
    postApproval: writeClient.postBuildApprovedComment,
  };
}

function parseIssueNumber(raw: string): number | null {
  const issueNumber = Number.parseInt(raw, 10);
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) return null;
  return issueNumber;
}

export async function approveBuildForIssue(
  issueNumberInput: string,
  dependencies?: ApproveBuildDependencies,
): Promise<ApproveBuildResponse> {
  const deps = dependencies ?? (await resolveDefaultDependencies());
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

    return {
      result: "upstream_error",
      issueNumber,
      message: "Không thể gửi BUILD_APPROVED lên GitHub. Thử lại sau.",
    };
  }
}
