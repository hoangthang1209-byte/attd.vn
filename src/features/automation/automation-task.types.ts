export type NormalizedTaskStatus =
  | "backlog"
  | "approved"
  | "building"
  | "pr_open"
  | "ci_review"
  | "needs_fix"
  | "ready_to_merge"
  | "merged"
  | "failed"
  | "blocked"
  | "queued"
  | "stalled"
  | "superseded"
  | "unknown";

export type AutomationTaskRisk = "low" | "medium" | "high" | "unknown";

export type ProductionDeploymentStatus = "live" | "deploying" | "not_live" | "unknown";

export type AutomationProductionStatus = {
  status: ProductionDeploymentStatus;
  mergedCommitSha: string | null;
  reason: string | null;
  checkedAt: string;
};

export type AutomationLinkedPullRequest = {
  number: number;
  url: string;
  state: "open" | "closed";
  merged: boolean;
  title: string;
  updatedAt: string;
  mergedAt: string | null;
  mergeCommitSha: string | null;
};

export type AutomationStatusComment = {
  author: string;
  body: string;
  createdAt: string;
};

export type AutomationTask = {
  issueNumber: number;
  title: string;
  /** Parsed from latest TASK_AREA issue comment, or Chưa phân loại when absent. */
  taskArea: string;
  status: NormalizedTaskStatus;
  statusLabel: string | null;
  risk: AutomationTaskRisk;
  riskLabel: string | null;
  linkedPullRequest: AutomationLinkedPullRequest | null;
  latestUpdateAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  blockerReason: string | null;
  isOpen: boolean;
  githubIssueUrl: string;
  labels: string[];
  recentStatusComments: AutomationStatusComment[];
  productionStatus: AutomationProductionStatus;
};

export type AutomationSummaryMetric = {
  value: number;
  /** True when the displayed count is from a loaded subset, not an authoritative total. */
  isPartial: boolean;
};

export type AutomationTaskSummary = {
  totalOpen: AutomationSummaryMetric;
  building: AutomationSummaryMetric;
  stalledOrFailed: AutomationSummaryMetric;
  needsFix: AutomationSummaryMetric;
  readyToMerge: AutomationSummaryMetric;
  mergedToday: AutomationSummaryMetric;
};

export type AutomationDataCompleteness = {
  openTasksTruncated: boolean;
  openTasksTotalCount: number | null;
  openTasksLoadedCount: number | null;
  /** Closed merged/superseded history search failed; open operational data may still be present. */
  closedHistoryUnavailable?: boolean;
};

export type AutomationDashboardResponse = {
  configured: boolean;
  configMessage: string | null;
  summary: AutomationTaskSummary;
  tasks: AutomationTask[];
  fetchedAt: string;
  dataCompleteness?: AutomationDataCompleteness;
  productionCommitSha: string | null;
  productionCheckedAt: string | null;
};
