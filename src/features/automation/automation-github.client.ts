import "server-only";

type GitHubIssueLabel = {
  name: string;
};

type GitHubIssueComment = {
  author: { login: string } | null;
  body: string;
  createdAt: string;
};

export type GitHubIssuePayload = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  url: string;
  updatedAt: string;
  closedAt: string | null;
  labels: GitHubIssueLabel[];
  comments: GitHubIssueComment[];
};

export type GitHubPullRequestPayload = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  merged: boolean;
  updatedAt: string;
};

export class AutomationGitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationGitHubConfigError";
  }
}

export class AutomationGitHubRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AutomationGitHubRequestError";
    this.status = status;
  }
}

const DEFAULT_REPO = "hoangthang1209-byte/attd.vn";

function getAutomationRepo(): string {
  return process.env.GITHUB_AUTOMATION_REPO?.trim() || DEFAULT_REPO;
}

function getAutomationToken(): string | null {
  const token = process.env.GITHUB_AUTOMATION_READ_TOKEN?.trim();
  return token || null;
}

export function getAutomationGitHubConfig() {
  const token = getAutomationToken();
  const repo = getAutomationRepo();
  const [owner, name] = repo.split("/");

  if (!owner || !name) {
    return {
      configured: false,
      configMessage: "GITHUB_AUTOMATION_REPO phải có dạng owner/repo.",
      token: null,
      owner: null,
      repo: null,
    } as const;
  }

  if (!token) {
    return {
      configured: false,
      configMessage:
        "Thiếu GITHUB_AUTOMATION_READ_TOKEN. Cấu hình token read-only trên Vercel để tải task automation từ GitHub.",
      token: null,
      owner,
      repo: name,
    } as const;
  }

  return {
    configured: true,
    configMessage: null,
    token,
    owner,
    repo: name,
  } as const;
}

async function githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.token || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${config.token}`,
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 60 },
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

type GitHubSearchIssuesResponse = {
  items: Array<{
    number: number;
    title: string;
    state: "open" | "closed";
    html_url: string;
    updated_at: string;
    closed_at: string | null;
    labels: Array<{ name: string }>;
    pull_request?: { url: string };
  }>;
};

type GitHubIssueDetailResponse = {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
};

type GitHubIssueCommentsResponse = Array<{
  user: { login: string } | null;
  body: string;
  created_at: string;
}>;

type GitHubSearchPullRequestsResponse = {
  items: Array<{
    number: number;
    title: string;
    html_url: string;
    state: "open" | "closed";
    merged_at: string | null;
    updated_at: string;
  }>;
};

function toGraphqlIssue(issue: GitHubIssueDetailResponse, comments: GitHubIssueCommentsResponse): GitHubIssuePayload {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state === "open" ? "OPEN" : "CLOSED",
    url: issue.html_url,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at,
    labels: issue.labels.map((label) => ({ name: label.name })),
    comments: comments.map((comment) => ({
      author: comment.user ? { login: comment.user.login } : null,
      body: comment.body,
      createdAt: comment.created_at,
    })),
  };
}

export async function fetchIssuesByStatusLabel(label: string): Promise<GitHubIssuePayload[]> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const query = encodeURIComponent(
    `repo:${config.owner}/${config.repo} is:issue label:"${label}"`,
  );
  const search = await githubRequest<GitHubSearchIssuesResponse>(
    `/search/issues?q=${query}&sort=updated&order=desc&per_page=100`,
  );

  const issues = search.items.filter((item) => !item.pull_request);
  const detailed = await Promise.all(
    issues.map(async (item) => {
      const [issue, comments] = await Promise.all([
        githubRequest<GitHubIssueDetailResponse>(
          `/repos/${config.owner}/${config.repo}/issues/${item.number}`,
        ),
        githubRequest<GitHubIssueCommentsResponse>(
          `/repos/${config.owner}/${config.repo}/issues/${item.number}/comments?per_page=100`,
        ),
      ]);
      return toGraphqlIssue(issue, comments);
    }),
  );

  return detailed;
}

export async function fetchLinkedPullRequest(
  issueNumber: number,
): Promise<GitHubPullRequestPayload | null> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    return null;
  }

  const query = encodeURIComponent(
    `repo:${config.owner}/${config.repo} is:pr linked:issue-${issueNumber} sort:updated-desc`,
  );
  const search = await githubRequest<GitHubSearchPullRequestsResponse>(
    `/search/issues?q=${query}&per_page=1`,
  );
  const pullRequest = search.items[0];
  if (!pullRequest) return null;

  return {
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.html_url,
    state: pullRequest.state === "open" ? "OPEN" : "CLOSED",
    merged: Boolean(pullRequest.merged_at),
    updatedAt: pullRequest.updated_at,
  };
}
