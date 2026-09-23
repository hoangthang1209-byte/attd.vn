import "server-only";

import {
  BUILD_APPROVED_COMMENT,
  hasBuildApprovedComment,
} from "@/features/automation/automation-build-approved";
import {
  ISSUE_COMMENTS_MAX_PAGES,
  ISSUE_COMMENTS_PAGE_SIZE,
  shouldFetchNextCommentPage,
} from "@/features/automation/automation-issue-comments.pagination";
import { getAutomationGitHubConfig } from "@/features/automation/automation-github.client";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  BuildApprovedAlreadyExistsError,
} from "@/features/automation/automation-github.types";

export type AutomationGitHubWriteConfig =
  | {
      configured: false;
      configMessage: string;
      owner: string | null;
      repo: string | null;
      repoSlug: string;
    }
  | {
      configured: true;
      configMessage: null;
      token: string;
      owner: string;
      repo: string;
      repoSlug: string;
    };

export type GitHubIssueApprovalPayload = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: Array<{ name: string }>;
  comments: Array<{ body: string }>;
};

export type WriteTokenOwnerIdentity = {
  valid: boolean;
  authenticatedLogin: string | null;
  message: string | null;
};

type GitHubIssueDetailResponse = {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: Array<{ name: string }>;
};

type GitHubIssueCommentsResponse = Array<{ body: string }>;

type GitHubIssueCommentResponse = {
  id: number;
  body: string;
};

type GitHubAuthenticatedUserResponse = {
  login: string;
};

const OWNER_IDENTITY_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedOwnerIdentity: (WriteTokenOwnerIdentity & { checkedAtMs: number; owner: string }) | null =
  null;

function getAutomationWriteToken(): string | null {
  const token = process.env.GITHUB_AUTOMATION_WRITE_TOKEN?.trim();
  return token || null;
}

export function getAutomationGitHubWriteConfig(): AutomationGitHubWriteConfig {
  const readConfig = getAutomationGitHubConfig();
  const writeToken = getAutomationWriteToken();

  if (!readConfig.owner || !readConfig.repo) {
    return {
      configured: false,
      configMessage: readConfig.configMessage ?? "GITHUB_AUTOMATION_REPO phải có dạng owner/repo.",
      owner: readConfig.owner,
      repo: readConfig.repo,
      repoSlug: readConfig.repoSlug,
    };
  }

  if (!writeToken) {
    return {
      configured: false,
      configMessage:
        "Thiếu GITHUB_AUTOMATION_WRITE_TOKEN. Cấu hình token write-only (Issues Read/Write) trên Vercel để dùng Duyệt & chạy.",
      owner: readConfig.owner,
      repo: readConfig.repo,
      repoSlug: readConfig.repoSlug,
    };
  }

  return {
    configured: true,
    configMessage: null,
    token: writeToken,
    owner: readConfig.owner,
    repo: readConfig.repo,
    repoSlug: readConfig.repoSlug,
  };
}

async function githubWriteRequest<T>(
  config: Extract<AutomationGitHubWriteConfig, { configured: true }>,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${config.token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AutomationGitHubRequestError(
      `GitHub API ${response.status}: ${body.slice(0, 240)}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Fail-closed: write token must authenticate as the configured repository owner. */
export async function validateWriteTokenOwnerIdentity(
  config: Extract<AutomationGitHubWriteConfig, { configured: true }>,
): Promise<WriteTokenOwnerIdentity> {
  const now = Date.now();
  if (
    cachedOwnerIdentity &&
    cachedOwnerIdentity.owner === config.owner &&
    now - cachedOwnerIdentity.checkedAtMs < OWNER_IDENTITY_CACHE_TTL_MS
  ) {
    return {
      valid: cachedOwnerIdentity.valid,
      authenticatedLogin: cachedOwnerIdentity.authenticatedLogin,
      message: cachedOwnerIdentity.message,
    };
  }

  let authenticatedLogin: string;
  try {
    const user = await githubWriteRequest<GitHubAuthenticatedUserResponse>(config, "/user");
    authenticatedLogin = user.login;
  } catch (error) {
    const message =
      error instanceof AutomationGitHubRequestError
        ? `Không thể xác minh GITHUB_AUTOMATION_WRITE_TOKEN (${error.status}). Token phải thuộc owner ${config.owner}.`
        : "Không thể xác minh GITHUB_AUTOMATION_WRITE_TOKEN. Token phải thuộc repository owner.";

    cachedOwnerIdentity = {
      checkedAtMs: now,
      owner: config.owner,
      valid: false,
      authenticatedLogin: null,
      message,
    };
    return {
      valid: false,
      authenticatedLogin: null,
      message,
    };
  }

  const valid = authenticatedLogin.toLowerCase() === config.owner.toLowerCase();
  const message = valid
    ? null
    : `GITHUB_AUTOMATION_WRITE_TOKEN phải thuộc tài khoản owner "${config.owner}" (hiện tại: "${authenticatedLogin}"). Builder orchestrator chỉ chấp nhận BUILD_APPROVED từ repository owner — xem docs/github-task-status.md.`;

  cachedOwnerIdentity = {
    checkedAtMs: now,
    owner: config.owner,
    valid,
    authenticatedLogin,
    message,
  };

  return { valid, authenticatedLogin, message };
}

/** Paginate issue comments until BUILD_APPROVED is found or pages are exhausted. */
export async function fetchAllIssueCommentsForApproval(
  config: Extract<AutomationGitHubWriteConfig, { configured: true }>,
  issueNumber: number,
): Promise<Array<{ body: string }>> {
  const comments: Array<{ body: string }> = [];

  for (let page = 1; page <= ISSUE_COMMENTS_MAX_PAGES; page += 1) {
    const pageComments = await githubWriteRequest<GitHubIssueCommentsResponse>(
      config,
      `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=${ISSUE_COMMENTS_PAGE_SIZE}&page=${page}`,
    );

    comments.push(...pageComments);

    if (
      !shouldFetchNextCommentPage(pageComments, comments, page)
    ) {
      return comments;
    }
  }

  return comments;
}

export async function fetchIssueForApproval(
  issueNumber: number,
  configOverride?: AutomationGitHubWriteConfig,
): Promise<GitHubIssueApprovalPayload> {
  const config = configOverride ?? getAutomationGitHubWriteConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation write chưa được cấu hình.",
    );
  }

  const [issue, comments] = await Promise.all([
    githubWriteRequest<GitHubIssueDetailResponse>(
      config,
      `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`,
    ),
    fetchAllIssueCommentsForApproval(config, issueNumber),
  ]);

  return {
    number: issue.number,
    title: issue.title,
    state: issue.state === "open" ? "OPEN" : "CLOSED",
    labels: issue.labels,
    comments,
  };
}

export async function postBuildApprovedComment(
  issueNumber: number,
  configOverride?: AutomationGitHubWriteConfig,
): Promise<{ commentId: number }> {
  const config = configOverride ?? getAutomationGitHubWriteConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation write chưa được cấu hình.",
    );
  }

  // Immediate re-check immediately before post to minimize the TOCTOU window.
  const existingComments = await fetchAllIssueCommentsForApproval(config, issueNumber);
  if (hasBuildApprovedComment(existingComments)) {
    throw new BuildApprovedAlreadyExistsError();
  }

  const comment = await githubWriteRequest<GitHubIssueCommentResponse>(
    config,
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: BUILD_APPROVED_COMMENT }),
    },
  );

  return { commentId: comment.id };
}

/** Test helper: reset cached owner identity validation. */
export function resetWriteTokenOwnerIdentityCacheForTests(): void {
  cachedOwnerIdentity = null;
}
