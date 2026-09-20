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
  | "stalled"
  | "superseded"
  | "unknown";

export type AutomationTaskRisk = "low" | "medium" | "high" | "unknown";

export type AutomationLinkedPullRequest = {
  number: number;
  url: string;
  state: "open" | "closed";
  merged: boolean;
  title: string;
  updatedAt: string;
};

export type AutomationStatusComment = {
  author: string;
  body: string;
  createdAt: string;
};

export type AutomationTask = {
  issueNumber: number;
  title: string;
  status: NormalizedTaskStatus;
  statusLabel: string | null;
  risk: AutomationTaskRisk;
  riskLabel: string | null;
  linkedPullRequest: AutomationLinkedPullRequest | null;
  latestUpdateAt: string;
  blockerReason: string | null;
  isOpen: boolean;
  githubIssueUrl: string;
  labels: string[];
  recentStatusComments: AutomationStatusComment[];
};

export type AutomationTaskSummary = {
  totalOpen: number;
  building: number;
  stalledOrFailed: number;
  needsFix: number;
  readyToMerge: number;
  mergedToday: number;
};

export type AutomationDashboardResponse = {
  configured: boolean;
  configMessage: string | null;
  summary: AutomationTaskSummary;
  tasks: AutomationTask[];
  fetchedAt: string;
};
