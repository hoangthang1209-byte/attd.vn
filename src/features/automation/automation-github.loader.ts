import { buildAutomationSearchQueries } from "@/features/automation/automation-github.queries";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  type AutomationGitHubConfig,
  type GitHubIssuePayload,
  type GitHubPullRequestPayload,
} from "@/features/automation/automation-github.types";

const DEFAULT_REPO = "hoangthang1209-byte/attd.vn";

function getAutomationRepo(): string {
  return process.env.GITHUB_AUTOMATION_REPO?.trim() || DEFAULT_REPO;
}

function getAutomationToken(): string | null {
  const token = process.env.GITHUB_AUTOMATION_READ_TOKEN?.trim();
  return token || null;
}

export function getAutomationGitHubConfig(): AutomationGitHubConfig {
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
      repoSlug: repo,
    };
  }

  if (!token) {
    return {
      configured: false,
      configMessage:
        "Thiếu GITHUB_AUTOMATION_READ_TOKEN. Cấu hình token read-only trên Vercel để tải task automation từ GitHub.",
      token: null,
      owner,
      repo: name,
      repoSlug: `${owner}/${name}`,
    };
  }

  return {
    configured: true,
    configMessage: null,
    token,
    owner,
    repo: name,
    repoSlug: `${owner}/${name}`,
  };
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
  total_count: number;
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

type GitHubIssueCommentsResponse = Array<{
  user: { login: string } | null;
  body: string;
  created_at: string;
}>;

type GitHubTimelineEvent = {
  event: string;
  source?: {
    issue?: {
      number: number;
      title: string;
      html_url: string;
      state: "open" | "closed";
      updated_at: string;
      pull_request?: { url: string };
    };
  };
};

type GitHubPullDetailResponse = {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  merged_at: string | null;
  updated_at: string;
};

function searchItemToIssuePayload(
  item: GitHubSearchIssuesResponse["items"][number],
  comments: GitHubIssueCommentsResponse,
): GitHubIssuePayload {
  return {
    number: item.number,
    title: item.title,
    state: item.state === "open" ? "OPEN" : "CLOSED",
    url: item.html_url,
    updatedAt: item.updated_at,
    closedAt: item.closed_at,
    labels: item.labels.map((label) => ({ name: label.name })),
    comments: comments.map((comment) => ({
      author: comment.user ? { login: comment.user.login } : null,
      body: comment.body,
      createdAt: comment.created_at,
    })),
  };
}

async function searchIssuesPaginated(query: string): Promise<GitHubSearchIssuesResponse["items"]> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const collected: GitHubSearchIssuesResponse["items"] = [];
  let page = 1;

  while (page <= 10) {
    const encodedQuery = encodeURIComponent(query);
    const search = await githubRequest<GitHubSearchIssuesResponse>(
      `/search/issues?q=${encodedQuery}&sort=updated&order=desc&per_page=100&page=${page}`,
    );
    collected.push(...search.items.filter((item) => !item.pull_request));
    if (search.items.length < 100) break;
    page += 1;
  }

  return collected;
}

async function fetchIssueComments(issueNumber: number): Promise<GitHubIssueCommentsResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  return githubRequest<GitHubIssueCommentsResponse>(
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=100`,
  );
}

export async function fetchAutomationIssues(
  statusLabels: readonly string[],
): Promise<GitHubIssuePayload[]> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const queries = buildAutomationSearchQueries(config.owner, config.repo, statusLabels);
  const searchResults = await Promise.all(queries.map((query) => searchIssuesPaginated(query)));

  const issueMap = new Map<number, GitHubSearchIssuesResponse["items"][number]>();
  for (const items of searchResults) {
    for (const item of items) {
      issueMap.set(item.number, item);
    }
  }

  return Promise.all(
    [...issueMap.values()].map(async (item) => {
      const comments = await fetchIssueComments(item.number);
      return searchItemToIssuePayload(item, comments);
    }),
  );
}

function timelineEventToPullCandidate(event: GitHubTimelineEvent): GitHubPullRequestPayload | null {
  const sourceIssue = event.source?.issue;
  if (!sourceIssue?.pull_request) return null;

  return {
    number: sourceIssue.number,
    title: sourceIssue.title,
    url: sourceIssue.html_url,
    state: sourceIssue.state === "open" ? "OPEN" : "CLOSED",
    merged: sourceIssue.state === "closed",
    mergedAt: null,
    updatedAt: sourceIssue.updated_at,
  };
}

async function enrichPullRequestWithMergeTime(
  candidate: GitHubPullRequestPayload,
): Promise<GitHubPullRequestPayload> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) return candidate;

  const pull = await githubRequest<GitHubPullDetailResponse>(
    `/repos/${config.owner}/${config.repo}/pulls/${candidate.number}`,
  );

  return {
    number: pull.number,
    title: pull.title,
    url: pull.html_url,
    state: pull.state === "open" ? "OPEN" : "CLOSED",
    merged: Boolean(pull.merged_at),
    mergedAt: pull.merged_at,
    updatedAt: pull.updated_at,
  };
}

export async function fetchLinkedPullRequest(
  issueNumber: number,
): Promise<GitHubPullRequestPayload | null> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    return null;
  }

  const timeline = await githubRequest<GitHubTimelineEvent[]>(
    `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/timeline?per_page=100`,
  );

  const candidates = timeline
    .filter((event) => event.event === "cross-referenced" || event.event === "connected")
    .map(timelineEventToPullCandidate)
    .filter((candidate): candidate is GitHubPullRequestPayload => candidate !== null)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const preferred =
    candidates.find((candidate) => candidate.state === "OPEN") ?? candidates[0] ?? null;
  if (!preferred) return null;

  return enrichPullRequestWithMergeTime(preferred);
}
