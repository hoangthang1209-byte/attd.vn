/** Mirrors Prisma AgentRunStatus — kept in feature layer for pure state-machine tests. */
export const AGENT_RUN_STATUSES = [
  "QUEUED",
  "RUNNING",
  "WAITING_EXTERNAL",
  "WAITING_HUMAN",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const AGENT_EVENT_SOURCES = [
  "GITHUB_ISSUE_STATUS",
  "GITHUB_PR",
  "CI_RESULT",
  "REVIEWER_RESULT",
  "VERCEL_DEPLOYMENT",
  "MANUAL_OWNER",
] as const;

export type AgentEventSource = (typeof AGENT_EVENT_SOURCES)[number];

export const AGENT_DECISION_TYPES = [
  "ROUTE",
  "ESCALATE",
  "APPROVE_BUILD",
  "BLOCK",
  "RETRY",
  "COMPLETE",
  "OTHER",
] as const;

export type AgentDecisionType = (typeof AGENT_DECISION_TYPES)[number];

export const AGENT_OPERATIONAL_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "UNKNOWN",
] as const;

export type AgentOperationalRiskLevel = (typeof AGENT_OPERATIONAL_RISK_LEVELS)[number];

export type AgentRunSummaryJson = Record<string, string | number | boolean | null>;

export type AgentEventPayloadSummary = {
  kind: string;
  reference?: string;
  statusHint?: string;
  /** Never store secrets, tokens, or full webhook bodies. */
  notes?: string;
};

export type AgentDecisionEvidenceRef = {
  type: "github_issue" | "github_pr" | "github_comment" | "ci_check" | "manual";
  ref: string;
};

export type AgentRunListItem = {
  id: string;
  agentId: string;
  status: AgentRunStatus;
  attemptNumber: number;
  githubIssueNumber: number | null;
  blockerReason: string | null;
  nextAction: string | null;
  humanApprovalRequired: boolean;
  humanApprovalReceivedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  lastEvent: {
    source: AgentEventSource;
    appliedAt: string;
    payloadSummary: AgentEventPayloadSummary | null;
  } | null;
};

export type AgentRunHistoryResponse = {
  issueNumber: number;
  currentRun: AgentRunListItem | null;
  runs: AgentRunListItem[];
};
