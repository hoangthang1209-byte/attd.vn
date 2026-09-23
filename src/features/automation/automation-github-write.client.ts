import "server-only";

import { BUILD_APPROVED_COMMENT } from "@/features/automation/automation-build-approved";
import { getAutomationGitHubConfig } from "@/features/automation/automation-github.client";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
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
    githubWriteRequest<GitHubIssueCommentsResponse>(
      config,
      `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=100`,
    ),
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
