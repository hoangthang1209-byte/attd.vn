import type { AutomationDashboardView } from "@/features/automation/automation-task.types";
import {
  buildAutomationSearchQueries,
  hasAnyAutomationStatusLabel,
  HISTORICAL_AUTOMATION_STATUS_LABELS,
} from "@/features/automation/automation-github.queries";
import {
  hasRecognizedAutomationStatusLabel,
  isRecognizedDevelopmentTask,
} from "@/features/automation/automation-task.recognition";
import {
  AUTOMATION_COMMENT_FETCH_CONCURRENCY,
  isRecoverableGitHubLookupError,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import {
  AutomationGitHubConfigError,
  AutomationGitHubRequestError,
  type AutomationGitHubConfig,
  type GitHubIssuePayload,
  type GitHubPullRequestPayload,
} from "@/features/automation/automation-github.types";

const DEFAULT_REPO = "hoangthang1209-byte/attd.vn";
const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 10;
const ISSUES_PAGE_SIZE = 100;
/** Hard cap for full-history REST listing (100 pages × 100 items). */
const MAX_ISSUES_PAGES = 100;
/** Bound TASK_AREA comment lookups on the active open-search path. */
const MAX_UNLABELED_OPEN_COMMENT_CHECKS = 50;
/** Bound comment lookups on All/Completed historical views. */
const MAX_HISTORICAL_UNLABELED_COMMENT_CHECKS = 200;

export type BuildRecognizedIssuesMetadata = {
  issuesScanned: number;
  tasksRecognized: number;
  commentCandidatesSkipped: number;
  commentLookupFailures: number;
  activeCommentChecksCapped: boolean;
};

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
  merge_commit_sha: string | null;
  head: { sha: string };
};

type GitHubCompareResponse = {
  status: "identical" | "ahead" | "behind" | "diverged";
};

export type SearchIssuesPaginatedResult = {
  items: GitHubSearchIssuesResponse["items"];
  totalCount: number;
  truncated: boolean;
};

export type FetchAutomationIssuesResult = {
  issues: GitHubIssuePayload[];
  openTasksTruncated: boolean;
  openTasksTotalCount: number | null;
  openTasksLoadedCount: number | null;
  closedHistoryUnavailable: boolean;
  historyTruncated?: boolean;
  historyLoadedCount?: number | null;
  historyTotalCount?: number | null;
  issuesScanned?: number | null;
  tasksRecognized?: number | null;
  commentCandidatesSkipped?: number | null;
  commentLookupFailures?: number | null;
  activeCommentChecksCapped?: boolean;
};

type GitHubRestIssueItem = {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name: string }>;
  pull_request?: { url: string };
};

export type ListRepoIssuesPaginatedResult = {
  items: GitHubRestIssueItem[];
  truncated: boolean;
  loadedCount: number;
};

function restIssueToIssuePayload(
  item: GitHubRestIssueItem,
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

export async function searchIssuesPaginated(query: string): Promise<SearchIssuesPaginatedResult> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const collected: GitHubSearchIssuesResponse["items"] = [];
  let totalCount = 0;
  let page = 1;

  while (page <= MAX_SEARCH_PAGES) {
    const encodedQuery = encodeURIComponent(query);
    const search = await githubRequest<GitHubSearchIssuesResponse>(
      `/search/issues?q=${encodedQuery}&sort=updated&order=desc&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
    );
    totalCount = search.total_count;
    collected.push(...search.items.filter((item) => !item.pull_request));
    if (search.items.length < SEARCH_PAGE_SIZE) break;
    page += 1;
  }

  const truncated = totalCount > collected.length;

  return {
    items: collected,
    totalCount,
    truncated,
  };
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

async function fetchIssueCommentsSafe(
  issueNumber: number,
  onLookupFailure?: () => void,
): Promise<GitHubIssueCommentsResponse> {
  try {
    return await fetchIssueComments(issueNumber);
  } catch (error) {
    if (error instanceof AutomationGitHubRequestError && (error.status === 403 || error.status === 429)) {
      onLookupFailure?.();
    }
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[fetchAutomationIssues] comment lookup failed for issue #${issueNumber}; continuing with partial data`,
      );
      return [];
    }
    throw error;
  }
}

export async function listRepoIssuesPaginated(
  state: "open" | "closed" | "all",
): Promise<ListRepoIssuesPaginatedResult> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const collected: GitHubRestIssueItem[] = [];
  let page = 1;
  let truncated = false;

  while (page <= MAX_ISSUES_PAGES) {
    const issues = await githubRequest<GitHubRestIssueItem[]>(
      `/repos/${config.owner}/${config.repo}/issues?state=${state}&sort=updated&direction=desc&per_page=${ISSUES_PAGE_SIZE}&page=${page}`,
    );
    const issueOnly = issues.filter((item) => !item.pull_request);
    collected.push(...issueOnly);
    if (issues.length < ISSUES_PAGE_SIZE) break;
    if (page === MAX_ISSUES_PAGES && issues.length === ISSUES_PAGE_SIZE) {
      truncated = true;
    }
    page += 1;
  }

  return {
    items: collected,
    truncated,
    loadedCount: collected.length,
  };
}

async function buildRecognizedIssuesFromItems(
  items: Array<GitHubSearchIssuesResponse["items"][number] | GitHubRestIssueItem>,
  toPayload: (
    item: GitHubSearchIssuesResponse["items"][number] | GitHubRestIssueItem,
    comments: GitHubIssueCommentsResponse,
  ) => GitHubIssuePayload,
  options?: {
    maxUnlabeledCommentChecks?: number;
    prioritizeRecentUnlabeled?: boolean;
  },
): Promise<{ issues: GitHubIssuePayload[]; metadata: BuildRecognizedIssuesMetadata }> {
  const metadata: BuildRecognizedIssuesMetadata = {
    issuesScanned: items.length,
    tasksRecognized: 0,
    commentCandidatesSkipped: 0,
    commentLookupFailures: 0,
    activeCommentChecksCapped: false,
  };

  const labeledItems = items.filter((item) => hasRecognizedAutomationStatusLabel(item.labels));
  let unlabeledItems = items.filter((item) => !hasRecognizedAutomationStatusLabel(item.labels));

  if (options?.prioritizeRecentUnlabeled) {
    unlabeledItems = [...unlabeledItems].sort((left, right) =>
      right.updated_at.localeCompare(left.updated_at),
    );
  }

  const maxChecks = options?.maxUnlabeledCommentChecks ?? Number.POSITIVE_INFINITY;
  if (unlabeledItems.length > maxChecks) {
    metadata.commentCandidatesSkipped = unlabeledItems.length - maxChecks;
    metadata.activeCommentChecksCapped = maxChecks === MAX_UNLABELED_OPEN_COMMENT_CHECKS;
    unlabeledItems = unlabeledItems.slice(0, maxChecks);
  }

  const labeledIssues = await mapWithConcurrency(
    labeledItems,
    AUTOMATION_COMMENT_FETCH_CONCURRENCY,
    async (item) => {
      const comments = await fetchIssueCommentsSafe(item.number, () => {
        metadata.commentLookupFailures += 1;
      });
      return toPayload(item, comments);
    },
  );

  const unlabeledCandidates = await mapWithConcurrency(
    unlabeledItems,
    AUTOMATION_COMMENT_FETCH_CONCURRENCY,
    async (item) => {
      const comments = await fetchIssueCommentsSafe(item.number, () => {
        metadata.commentLookupFailures += 1;
      });
      if (!isRecognizedDevelopmentTask({ labels: item.labels, comments })) return null;
      return toPayload(item, comments);
    },
  );

  const issueMap = new Map<number, GitHubIssuePayload>();
  for (const issue of [...labeledIssues, ...unlabeledCandidates]) {
    if (!issue) continue;
    issueMap.set(issue.number, issue);
  }

  const issues = [...issueMap.values()];
  metadata.tasksRecognized = issues.length;

  return { issues, metadata };
}

async function fetchAutomationIssuesFromRepoList(
  state: "open" | "closed" | "all",
): Promise<FetchAutomationIssuesResult> {
  const listing = await listRepoIssuesPaginated(state);
  const { issues, metadata } = await buildRecognizedIssuesFromItems(
    listing.items,
    restIssueToIssuePayload,
    { maxUnlabeledCommentChecks: MAX_HISTORICAL_UNLABELED_COMMENT_CHECKS },
  );

  return {
    issues,
    openTasksTruncated: false,
    openTasksTotalCount: null,
    openTasksLoadedCount: null,
    closedHistoryUnavailable: false,
    historyTruncated: listing.truncated,
    historyLoadedCount: listing.loadedCount,
    historyTotalCount: listing.truncated ? null : listing.loadedCount,
    issuesScanned: metadata.issuesScanned,
    tasksRecognized: metadata.tasksRecognized,
    commentCandidatesSkipped: metadata.commentCandidatesSkipped,
    commentLookupFailures: metadata.commentLookupFailures,
    activeCommentChecksCapped: metadata.activeCommentChecksCapped,
  };
}

export async function fetchAutomationIssuesForView(
  view: AutomationDashboardView,
  statusLabels: readonly string[],
): Promise<FetchAutomationIssuesResult> {
  if (view === "all") {
    return fetchAutomationIssuesFromRepoList("all");
  }
  if (view === "completed") {
    return fetchAutomationIssuesFromRepoList("closed");
  }
  return fetchAutomationIssues(statusLabels);
}

export async function fetchAutomationIssues(
  statusLabels: readonly string[],
): Promise<FetchAutomationIssuesResult> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const queries = buildAutomationSearchQueries(config.owner, config.repo, statusLabels);
  const [openQuery, closedHistoryQuery] = queries;

  const openSearchResult = await searchIssuesPaginated(openQuery);
  const openTasksTruncated = openSearchResult.truncated;
  const openTasksTotalCount = openSearchResult.totalCount;
  const openTasksLoadedCount = openSearchResult.items.length;

  const openIssueItems = new Map<number, GitHubSearchIssuesResponse["items"][number]>();
  for (const item of openSearchResult.items) {
    openIssueItems.set(item.number, item);
  }

  let closedHistoryUnavailable = false;
  let closedHistoryResult: SearchIssuesPaginatedResult = {
    items: [],
    totalCount: 0,
    truncated: false,
  };

  try {
    closedHistoryResult = await searchIssuesPaginated(closedHistoryQuery);
  } catch (error) {
    if (error instanceof AutomationGitHubRequestError) {
      console.warn(
        "[fetchAutomationIssues] closed history search failed; continuing with open operational data only",
        error.status,
      );
      closedHistoryUnavailable = true;
    } else {
      throw error;
    }
  }

  const issueMap = new Map<number, GitHubSearchIssuesResponse["items"][number]>();
  for (const item of openIssueItems.values()) {
    issueMap.set(item.number, item);
  }
  for (const item of closedHistoryResult.items) {
    if (!hasAnyAutomationStatusLabel(item, HISTORICAL_AUTOMATION_STATUS_LABELS)) continue;
    issueMap.set(item.number, item);
  }

  const issueItems = [...issueMap.values()];
  const openItems = issueItems.filter((item) => item.state === "open");
  const closedItems = issueItems.filter((item) => item.state === "closed");

  const [openResult, closedResult] = await Promise.all([
    buildRecognizedIssuesFromItems(openItems, searchItemToIssuePayload, {
      maxUnlabeledCommentChecks: MAX_UNLABELED_OPEN_COMMENT_CHECKS,
      prioritizeRecentUnlabeled: true,
    }),
    buildRecognizedIssuesFromItems(closedItems, searchItemToIssuePayload, {
      maxUnlabeledCommentChecks: MAX_HISTORICAL_UNLABELED_COMMENT_CHECKS,
    }),
  ]);

  const issuesMap = new Map<number, GitHubIssuePayload>();
  for (const issue of [...openResult.issues, ...closedResult.issues]) {
    issuesMap.set(issue.number, issue);
  }
  const issues = [...issuesMap.values()];

  return {
    issues,
    openTasksTruncated,
    openTasksTotalCount,
    openTasksLoadedCount,
    closedHistoryUnavailable,
    issuesScanned: openResult.metadata.issuesScanned + closedResult.metadata.issuesScanned,
    tasksRecognized: issues.length,
    commentCandidatesSkipped:
      openResult.metadata.commentCandidatesSkipped + closedResult.metadata.commentCandidatesSkipped,
    commentLookupFailures:
      openResult.metadata.commentLookupFailures + closedResult.metadata.commentLookupFailures,
    activeCommentChecksCapped: openResult.metadata.activeCommentChecksCapped,
  };
}

function timelineEventToPullCandidate(event: GitHubTimelineEvent): GitHubPullRequestPayload | null {
  const sourceIssue = event.source?.issue;
  if (!sourceIssue?.pull_request) return null;

  return {
    number: sourceIssue.number,
    title: sourceIssue.title,
    url: sourceIssue.html_url,
    state: sourceIssue.state === "open" ? "OPEN" : "CLOSED",
    merged: false,
    mergedAt: null,
    updatedAt: sourceIssue.updated_at,
    mergeCommitSha: null,
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
    mergeCommitSha: pull.merge_commit_sha ?? pull.head.sha ?? null,
  };
}

async function enrichPullRequestWithMergeTimeOrCandidate(
  candidate: GitHubPullRequestPayload,
): Promise<GitHubPullRequestPayload> {
  try {
    return await enrichPullRequestWithMergeTime(candidate);
  } catch {
    console.warn(
      `[fetchLinkedPullRequest] pull detail enrichment failed for PR #${candidate.number}; returning timeline candidate without merge metadata`,
    );
    return {
      ...candidate,
      merged: false,
      mergedAt: null,
      mergeCommitSha: null,
    };
  }
}

export async function compareCommitsSafe(
  baseSha: string,
  headSha: string,
): Promise<GitHubCompareResponse["status"] | null> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) return null;

  try {
    const compare = await githubRequest<GitHubCompareResponse>(
      `/repos/${config.owner}/${config.repo}/compare/${baseSha}...${headSha}`,
    );
    return compare.status;
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[compareCommitsSafe] compare failed for ${baseSha.slice(0, 7)}...${headSha.slice(0, 7)}; continuing with partial data`,
      );
      return null;
    }
    throw error;
  }
}

async function fetchLinkedPullRequest(
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

  return enrichPullRequestWithMergeTimeOrCandidate(preferred);
}

export async function fetchLinkedPullRequestSafe(
  issueNumber: number,
): Promise<GitHubPullRequestPayload | null> {
  try {
    return await fetchLinkedPullRequest(issueNumber);
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[fetchLinkedPullRequestSafe] linked PR lookup failed for issue #${issueNumber}; continuing with partial data`,
      );
      return null;
    }
    throw error;
  }
}

type GitHubCheckRunsResponse = {
  check_runs: Array<{
    name: string;
    status: "queued" | "in_progress" | "completed";
    conclusion:
      | "success"
      | "failure"
      | "neutral"
      | "cancelled"
      | "skipped"
      | "timed_out"
      | "action_required"
      | null;
  }>;
};

type GitHubCombinedStatusResponse = {
  statuses: Array<{ state: "error" | "failure" | "pending" | "success" }>;
};

type GitHubPullReviewsResponse = Array<{
  user: { login: string } | null;
  body: string;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
  submitted_at: string;
}>;

export async function fetchPullRequestCheckRunsSafe(pullNumber: number): Promise<{
  checkRuns: Array<{ name: string; status: string | null; conclusion: string | null }>;
  statuses: Array<"error" | "failure" | "pending" | "success" | null>;
}> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    return { checkRuns: [], statuses: [] };
  }

  try {
    const pull = await githubRequest<GitHubPullDetailResponse>(
      `/repos/${config.owner}/${config.repo}/pulls/${pullNumber}`,
    );
    const headSha = pull.head.sha;

    const [checkRunsResponse, statusResponse] = await Promise.all([
      githubRequest<GitHubCheckRunsResponse>(
        `/repos/${config.owner}/${config.repo}/commits/${headSha}/check-runs?per_page=100`,
      ),
      githubRequest<GitHubCombinedStatusResponse>(
        `/repos/${config.owner}/${config.repo}/commits/${headSha}/status?per_page=100`,
      ),
    ]);

    return {
      checkRuns: checkRunsResponse.check_runs.map((run) => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
      })),
      statuses: statusResponse.statuses.map((status) => status.state),
    };
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[fetchPullRequestCheckRunsSafe] check lookup failed for PR #${pullNumber}; continuing with partial data`,
      );
      return { checkRuns: [], statuses: [] };
    }
    throw error;
  }
}

export async function fetchPullRequestReviewsSafe(
  pullNumber: number,
): Promise<
  Array<{
    author: string;
    body: string;
    state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "DISMISSED" | "PENDING";
    submittedAt: string;
  }>
> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    return [];
  }

  try {
    const reviews = await githubRequest<GitHubPullReviewsResponse>(
      `/repos/${config.owner}/${config.repo}/pulls/${pullNumber}/reviews?per_page=100`,
    );

    return reviews.map((review) => ({
      author: review.user?.login ?? "không xác định",
      body: review.body,
      state: review.state,
      submittedAt: review.submitted_at,
    }));
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[fetchPullRequestReviewsSafe] review lookup failed for PR #${pullNumber}; continuing with partial data`,
      );
      return [];
    }
    throw error;
  }
}
