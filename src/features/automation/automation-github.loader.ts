import type { AutomationDashboardView } from "@/features/automation/automation-task.types";
import {
  buildAutomationSearchQueries,
  hasAnyAutomationStatusLabel,
  HISTORICAL_AUTOMATION_STATUS_LABELS,
} from "@/features/automation/automation-github.queries";
import {
  hasDevelopmentTaskLabel,
  hasRecognizedAutomationStatusLabel,
  isRecognizedDevelopmentTask,
} from "@/features/automation/automation-task.recognition";
import {
  AUTOMATION_COMMENT_FETCH_CONCURRENCY,
  AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
  isRecoverableGitHubLookupError,
  mapWithConcurrency,
} from "@/features/automation/automation-async-utils";
import {
  dedupeLinkedPullRequestCandidates,
  extractIssueClosedByCommitId,
  selectCanonicalLinkedPullRequestCandidate,
  type LinkedPullRequestCandidate,
} from "@/features/automation/automation-linked-pr.resolver";
import {
  ISSUE_COMMENTS_MAX_PAGES,
  ISSUE_COMMENTS_PAGE_SIZE,
  shouldFetchNextCommentPage,
} from "@/features/automation/automation-issue-comments.pagination";
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
export const MAX_UNLABELED_OPEN_COMMENT_CHECKS = 50;
/** Bound TASK_AREA comment lookups on historical REST listing paths. */
export const MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS = 100;

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
  commit_id?: string | null;
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
  body: string | null;
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

export type TaskRecognitionCompleteness = {
  taskAreaRecognitionTruncated: boolean;
  unlabeledCommentChecksSkipped: number;
  unlabeledCommentChecksPerformed: number;
  commentLookupFailedCount: number;
  recognitionDegraded: boolean;
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
  taskAreaRecognitionTruncated?: boolean;
  unlabeledCommentChecksSkipped?: number;
  unlabeledCommentChecksPerformed?: number;
  commentLookupFailedCount?: number;
  recognitionDegraded?: boolean;
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

/** Paginate issue comments until BUILD_APPROVED is found or pages are exhausted (read path). */
async function fetchIssueComments(issueNumber: number): Promise<GitHubIssueCommentsResponse> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    throw new AutomationGitHubConfigError(
      config.configMessage ?? "GitHub automation chưa được cấu hình.",
    );
  }

  const comments: GitHubIssueCommentsResponse = [];

  for (let page = 1; page <= ISSUE_COMMENTS_MAX_PAGES; page += 1) {
    const pageComments = await githubRequest<GitHubIssueCommentsResponse>(
      `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments?per_page=${ISSUE_COMMENTS_PAGE_SIZE}&page=${page}`,
    );

    comments.push(...pageComments);

    if (
      !shouldFetchNextCommentPage(
        pageComments.map((comment) => ({ body: comment.body })),
        comments.map((comment) => ({ body: comment.body })),
        page,
      )
    ) {
      return comments;
    }
  }

  return comments;
}

type SafeCommentLookupResult = {
  comments: GitHubIssueCommentsResponse;
  failed: boolean;
};

async function fetchIssueCommentsSafe(issueNumber: number): Promise<SafeCommentLookupResult> {
  try {
    return { comments: await fetchIssueComments(issueNumber), failed: false };
  } catch (error) {
    if (isRecoverableGitHubLookupError(error)) {
      console.warn(
        `[fetchAutomationIssues] comment lookup failed for issue #${issueNumber}; continuing with partial data`,
      );
      return { comments: [], failed: true };
    }
    throw error;
  }
}

function mergeRecognitionCompleteness(
  left: TaskRecognitionCompleteness,
  right: TaskRecognitionCompleteness,
): TaskRecognitionCompleteness {
  const taskAreaRecognitionTruncated =
    left.taskAreaRecognitionTruncated || right.taskAreaRecognitionTruncated;
  const commentLookupFailedCount =
    left.commentLookupFailedCount + right.commentLookupFailedCount;
  return {
    taskAreaRecognitionTruncated,
    unlabeledCommentChecksSkipped:
      left.unlabeledCommentChecksSkipped + right.unlabeledCommentChecksSkipped,
    unlabeledCommentChecksPerformed:
      left.unlabeledCommentChecksPerformed + right.unlabeledCommentChecksPerformed,
    commentLookupFailedCount,
    recognitionDegraded:
      taskAreaRecognitionTruncated || commentLookupFailedCount > 0,
  };
}

function recognitionFieldsFromCompleteness(
  completeness: TaskRecognitionCompleteness,
): Pick<
  FetchAutomationIssuesResult,
  | "taskAreaRecognitionTruncated"
  | "unlabeledCommentChecksSkipped"
  | "unlabeledCommentChecksPerformed"
  | "commentLookupFailedCount"
  | "recognitionDegraded"
> {
  return {
    taskAreaRecognitionTruncated: completeness.taskAreaRecognitionTruncated,
    unlabeledCommentChecksSkipped: completeness.unlabeledCommentChecksSkipped,
    unlabeledCommentChecksPerformed: completeness.unlabeledCommentChecksPerformed,
    commentLookupFailedCount: completeness.commentLookupFailedCount,
    recognitionDegraded: completeness.recognitionDegraded,
  };
}

type IssueListItem = GitHubSearchIssuesResponse["items"][number] | GitHubRestIssueItem;

function getIssueUpdatedAt(item: IssueListItem): string {
  return item.updated_at;
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
    page += 1;
  }

  if (page > MAX_ISSUES_PAGES) {
    truncated = true;
  }

  return {
    items: collected,
    truncated,
    loadedCount: collected.length,
  };
}

type BuildRecognizedIssuesResult = {
  issues: GitHubIssuePayload[];
  recognition: TaskRecognitionCompleteness;
};

async function buildRecognizedIssuesFromItems(
  items: IssueListItem[],
  toPayload: (item: IssueListItem, comments: GitHubIssueCommentsResponse) => GitHubIssuePayload,
  options?: { maxUnlabeledCommentChecks?: number },
): Promise<BuildRecognizedIssuesResult> {
  const statusLabeledItems = items.filter((item) => hasRecognizedAutomationStatusLabel(item.labels));
  const developmentTaskOnlyItems = items.filter(
    (item) =>
      !hasRecognizedAutomationStatusLabel(item.labels) && hasDevelopmentTaskLabel(item.labels),
  );
  const unlabeledCandidates = items
    .filter(
      (item) =>
        !hasRecognizedAutomationStatusLabel(item.labels) && !hasDevelopmentTaskLabel(item.labels),
    )
    .sort((left, right) => getIssueUpdatedAt(right).localeCompare(getIssueUpdatedAt(left)));

  const maxChecks = options?.maxUnlabeledCommentChecks ?? Number.POSITIVE_INFINITY;
  const unlabeledToCheck =
    maxChecks === Number.POSITIVE_INFINITY
      ? unlabeledCandidates
      : unlabeledCandidates.slice(0, maxChecks);
  const unlabeledCommentChecksSkipped = Math.max(
    0,
    unlabeledCandidates.length - unlabeledToCheck.length,
  );

  let commentLookupFailedCount = 0;

  const developmentTaskIssues = developmentTaskOnlyItems.map((item) => toPayload(item, []));

  const labeledIssues = await mapWithConcurrency(
    statusLabeledItems,
    AUTOMATION_COMMENT_FETCH_CONCURRENCY,
    async (item) => {
      const lookup = await fetchIssueCommentsSafe(item.number);
      if (lookup.failed) commentLookupFailedCount += 1;
      return toPayload(item, lookup.comments);
    },
  );

  const unlabeledRecognized = await mapWithConcurrency(
    unlabeledToCheck,
    AUTOMATION_COMMENT_FETCH_CONCURRENCY,
    async (item) => {
      const lookup = await fetchIssueCommentsSafe(item.number);
      if (lookup.failed) commentLookupFailedCount += 1;
      if (!isRecognizedDevelopmentTask({ labels: item.labels, comments: lookup.comments })) {
        return null;
      }
      return toPayload(item, lookup.comments);
    },
  );

  const issueMap = new Map<number, GitHubIssuePayload>();
  for (const issue of [...developmentTaskIssues, ...labeledIssues, ...unlabeledRecognized]) {
    if (!issue) continue;
    issueMap.set(issue.number, issue);
  }

  const taskAreaRecognitionTruncated = unlabeledCommentChecksSkipped > 0;

  return {
    issues: [...issueMap.values()],
    recognition: {
      taskAreaRecognitionTruncated,
      unlabeledCommentChecksSkipped,
      unlabeledCommentChecksPerformed: unlabeledToCheck.length,
      commentLookupFailedCount,
      recognitionDegraded: taskAreaRecognitionTruncated || commentLookupFailedCount > 0,
    },
  };
}

async function fetchAutomationIssuesFromRepoList(
  state: "open" | "closed" | "all",
): Promise<FetchAutomationIssuesResult> {
  const listing = await listRepoIssuesPaginated(state);
  const { issues, recognition } = await buildRecognizedIssuesFromItems(
    listing.items,
    restIssueToIssuePayload,
    { maxUnlabeledCommentChecks: MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS },
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
    ...recognitionFieldsFromCompleteness(recognition),
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
    }),
    buildRecognizedIssuesFromItems(closedItems, searchItemToIssuePayload, {
      maxUnlabeledCommentChecks: MAX_UNLABELED_HISTORICAL_COMMENT_CHECKS,
    }),
  ]);

  const recognition = mergeRecognitionCompleteness(
    openResult.recognition,
    closedResult.recognition,
  );

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
    ...recognitionFieldsFromCompleteness(recognition),
  };
}

function timelineEventToPullCandidate(
  event: GitHubTimelineEvent,
): LinkedPullRequestCandidate | null {
  const sourceIssue = event.source?.issue;
  if (!sourceIssue?.pull_request) return null;
  if (event.event !== "cross-referenced" && event.event !== "connected") return null;

  return {
    number: sourceIssue.number,
    title: sourceIssue.title,
    url: sourceIssue.html_url,
    state: sourceIssue.state === "open" ? "OPEN" : "CLOSED",
    updatedAt: sourceIssue.updated_at,
    eventType: event.event,
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

async function fetchPullRequestDetailForLinkedResolution(
  candidate: LinkedPullRequestCandidate,
): Promise<LinkedPullRequestCandidate> {
  const config = getAutomationGitHubConfig();
  if (!config.configured || !config.owner || !config.repo) {
    return candidate;
  }

  try {
    const detail = await githubRequest<GitHubPullDetailResponse>(
      `/repos/${config.owner}/${config.repo}/pulls/${candidate.number}`,
    );

    return {
      ...candidate,
      title: detail.title,
      body: detail.body,
      state: detail.state === "open" ? "OPEN" : "CLOSED",
      merged: Boolean(detail.merged_at),
      mergeCommitSha: detail.merge_commit_sha ?? detail.head.sha ?? null,
    };
  } catch {
    return candidate;
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

  const issueClosedByCommitId = extractIssueClosedByCommitId(timeline);

  const rawCandidates = timeline
    .map(timelineEventToPullCandidate)
    .filter((candidate): candidate is LinkedPullRequestCandidate => candidate !== null);

  const uniqueCandidates = dedupeLinkedPullRequestCandidates(rawCandidates);
  if (uniqueCandidates.length === 0) return null;

  const detailedCandidates = await mapWithConcurrency(
    uniqueCandidates,
    AUTOMATION_LINKED_PR_FETCH_CONCURRENCY,
    fetchPullRequestDetailForLinkedResolution,
  );

  const preferred = selectCanonicalLinkedPullRequestCandidate(
    detailedCandidates,
    issueNumber,
    issueClosedByCommitId,
  );
  if (!preferred) return null;

  return enrichPullRequestWithMergeTimeOrCandidate({
    number: preferred.number,
    title: preferred.title,
    url: preferred.url,
    state: preferred.state,
    merged: preferred.merged ?? false,
    mergedAt: null,
    updatedAt: preferred.updatedAt,
    mergeCommitSha: preferred.mergeCommitSha ?? null,
  });
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
