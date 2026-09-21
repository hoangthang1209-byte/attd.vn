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

export type AutomationCiStatusValue = "not_run" | "running" | "passed" | "failed" | "unknown";

export type AutomationCiStatus = {
  status: AutomationCiStatusValue;
  reason: string | null;
};

export type AutomationReviewerStatusValue =
  | "waiting"
  | "in_review"
  | "passed"
  | "needs_fix"
  | "unknown";

export type AutomationReviewerStatus = {
  status: AutomationReviewerStatusValue;
  reason: string | null;
  counts: {
    p0: number;
    p1: number;
    p2: number;
    p3: number;
  } | null;
};

export type AutomationNextActionCode =
  | "wait_builder"
  | "wait_ci"
  | "fix_ci"
  | "wait_reviewer"
  | "fix_review"
  | "ready_merge"
  | "wait_production"
  | "verify_production"
  | "complete"
  | "handle_blocker"
  | "superseded"
  | "unknown";

export type AutomationNextAction = {
  action: AutomationNextActionCode;
  label: string;
};

export type AutomationTaskRelationship = {
  supersedesIssueNumbers: number[];
  supersededByIssueNumber: number | null;
  repairForIssueNumber: number | null;
  isSupersededInActiveView: boolean;
  groupKey: string | null;
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
  ciStatus: AutomationCiStatus;
  reviewerStatus: AutomationReviewerStatus;
  nextAction: AutomationNextAction;
  relationship: AutomationTaskRelationship;
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
  /** Full-history REST listing hit the configured page cap. */
  historyTruncated?: boolean;
  historyLoadedCount?: number | null;
  historyTotalCount?: number | null;
  /** Raw issues scanned before recognition filtering. */
  issuesScanned?: number | null;
  /** Recognized tasks returned after filtering. */
  tasksRecognized?: number | null;
  /** Comment lookups skipped due to caps on historical views. */
  commentCandidatesSkipped?: number | null;
  /** Comment lookups that failed with 403/429. */
  commentLookupFailures?: number | null;
  /** Active view TASK_AREA comment checks capped. */
  activeCommentChecksCapped?: boolean;
};

export type AutomationDashboardView = "active" | "all" | "completed";

export type AutomationDashboardResponse = {
  configured: boolean;
  configMessage: string | null;
  summary: AutomationTaskSummary;
  tasks: AutomationTask[];
  fetchedAt: string;
  view: AutomationDashboardView;
  dataCompleteness?: AutomationDataCompleteness;
  productionCommitSha: string | null;
  productionCheckedAt: string | null;
};
