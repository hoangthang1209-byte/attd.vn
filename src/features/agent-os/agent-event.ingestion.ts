import type {
  AgentEventPayloadSummary,
  AgentEventSource,
  AgentRunStatus,
} from "@/features/agent-os/agent-run.types";

/** Normalized inbound event before persistence (no secrets). */
export type InboundAgentEvent = {
  source: AgentEventSource;
  idempotencyKey: string;
  payloadSummary: AgentEventPayloadSummary;
  suggestedStatus?: AgentRunStatus;
  blockerReason?: string | null;
  nextAction?: string | null;
  humanApprovalRequired?: boolean;
  humanApprovalReceived?: boolean;
};

export type GitHubIssueStatusInbound = {
  issueNumber: number;
  normalizedStatus: string;
  commentAuthor?: string;
  occurredAt?: string;
  eventId?: string;
};

export type GitHubPrInbound = {
  issueNumber: number;
  pullNumber: number;
  state: "open" | "closed";
  merged: boolean;
  ciStatus?: "success" | "failure" | "pending" | "unknown";
  occurredAt?: string;
  eventId?: string;
};

export type CiResultInbound = {
  issueNumber?: number;
  pullNumber?: number;
  checkName: string;
  conclusion: "success" | "failure" | "cancelled" | "skipped" | "unknown";
  occurredAt?: string;
  eventId?: string;
};

export type ReviewerResultInbound = {
  issueNumber?: number;
  pullNumber: number;
  reviewState: "approved" | "changes_requested" | "commented" | "dismissed" | "unknown";
  occurredAt?: string;
  eventId?: string;
};

export type VercelDeploymentInbound = {
  issueNumber?: number;
  environment: "production" | "preview" | "unknown";
  deploymentState: "ready" | "error" | "building" | "cancelled" | "unknown";
  commitSha?: string;
  occurredAt?: string;
  eventId?: string;
};

export type ManualOwnerDecisionInbound = {
  issueNumber: number;
  decision: "approve_build" | "block" | "retry" | "cancel" | "other";
  actorLogin?: string;
  occurredAt?: string;
  eventId?: string;
};

function buildIdempotencyKey(parts: readonly string[]): string {
  return parts.filter(Boolean).join(":");
}

function requireEventIdentity(input: { eventId?: string; occurredAt?: string }): string {
  const identity = input.eventId?.trim() || input.occurredAt?.trim();
  if (!identity) {
    throw new Error("Agent event requires eventId or occurredAt for safe idempotency");
  }
  return identity;
}

export function ingestGitHubIssueStatusEvent(input: GitHubIssueStatusInbound): InboundAgentEvent {
  const key = buildIdempotencyKey([
    "github_issue_status",
    String(input.issueNumber),
    input.normalizedStatus,
    requireEventIdentity(input),
  ]);

  let suggestedStatus: AgentRunStatus | undefined;
  if (input.normalizedStatus === "building") suggestedStatus = "RUNNING";
  if (input.normalizedStatus === "blocked" || input.normalizedStatus === "needs_fix") {
    suggestedStatus = "WAITING_HUMAN";
  }

  return {
    source: "GITHUB_ISSUE_STATUS",
    idempotencyKey: key,
    payloadSummary: {
      kind: "github_issue_status",
      reference: `#${input.issueNumber}`,
      statusHint: input.normalizedStatus,
    },
    suggestedStatus,
  };
}

export function ingestGitHubPrEvent(input: GitHubPrInbound): InboundAgentEvent {
  const key = buildIdempotencyKey([
    "github_pr",
    String(input.pullNumber),
    input.state,
    input.merged ? "merged" : "open",
    requireEventIdentity(input),
  ]);

  let suggestedStatus: AgentRunStatus | undefined = "RUNNING";
  if (input.merged) suggestedStatus = "WAITING_EXTERNAL";
  if (input.state === "closed" && !input.merged) suggestedStatus = "FAILED";

  return {
    source: "GITHUB_PR",
    idempotencyKey: key,
    payloadSummary: {
      kind: "github_pr",
      reference: `PR #${input.pullNumber}`,
      statusHint: input.merged ? "merged" : input.state,
      notes: input.ciStatus ? `ci=${input.ciStatus}` : undefined,
    },
    suggestedStatus,
  };
}

export function ingestCiResultEvent(input: CiResultInbound): InboundAgentEvent {
  const ref = input.pullNumber ? `PR #${input.pullNumber}` : input.issueNumber ? `#${input.issueNumber}` : "unknown";
  const key = buildIdempotencyKey([
    "ci_result",
    ref,
    input.checkName,
    input.conclusion,
    requireEventIdentity(input),
  ]);

  const failed = input.conclusion === "failure" || input.conclusion === "cancelled";
  return {
    source: "CI_RESULT",
    idempotencyKey: key,
    payloadSummary: {
      kind: "ci_result",
      reference: ref,
      statusHint: input.conclusion,
      notes: input.checkName,
    },
    suggestedStatus: failed ? "WAITING_HUMAN" : "RUNNING",
    blockerReason: failed ? `CI ${input.checkName}: ${input.conclusion}` : null,
    nextAction: failed ? "Sửa CI và đẩy commit mới" : null,
  };
}

export function ingestReviewerResultEvent(input: ReviewerResultInbound): InboundAgentEvent {
  const key = buildIdempotencyKey([
    "reviewer_result",
    String(input.pullNumber),
    input.reviewState,
    requireEventIdentity(input),
  ]);

  const needsChanges = input.reviewState === "changes_requested";
  return {
    source: "REVIEWER_RESULT",
    idempotencyKey: key,
    payloadSummary: {
      kind: "reviewer_result",
      reference: `PR #${input.pullNumber}`,
      statusHint: input.reviewState,
    },
    suggestedStatus: needsChanges ? "WAITING_HUMAN" : "RUNNING",
    blockerReason: needsChanges ? "Reviewer yêu cầu chỉnh sửa" : null,
  };
}

export function ingestVercelDeploymentEvent(input: VercelDeploymentInbound): InboundAgentEvent {
  const key = buildIdempotencyKey([
    "vercel_deployment",
    input.environment,
    input.deploymentState,
    input.commitSha ?? "",
    requireEventIdentity(input),
  ]);

  let suggestedStatus: AgentRunStatus | undefined = "WAITING_EXTERNAL";
  if (input.deploymentState === "ready" && input.environment === "production") {
    suggestedStatus = "SUCCEEDED";
  }
  if (input.deploymentState === "error") suggestedStatus = "FAILED";

  return {
    source: "VERCEL_DEPLOYMENT",
    idempotencyKey: key,
    payloadSummary: {
      kind: "vercel_deployment",
      reference: input.commitSha ? input.commitSha.slice(0, 7) : input.environment,
      statusHint: `${input.environment}:${input.deploymentState}`,
    },
    suggestedStatus,
  };
}

export function ingestManualOwnerDecisionEvent(input: ManualOwnerDecisionInbound): InboundAgentEvent {
  const key = buildIdempotencyKey([
    "manual_owner",
    String(input.issueNumber),
    input.decision,
    input.actorLogin ?? "",
    requireEventIdentity(input),
  ]);

  const approvalReceived = input.decision === "approve_build";
  let suggestedStatus: AgentRunStatus | undefined = "RUNNING";
  if (input.decision === "block") suggestedStatus = "WAITING_HUMAN";
  if (input.decision === "cancel") suggestedStatus = "CANCELLED";
  if (input.decision === "retry") suggestedStatus = "QUEUED";

  return {
    source: "MANUAL_OWNER",
    idempotencyKey: key,
    payloadSummary: {
      kind: "manual_owner",
      reference: `#${input.issueNumber}`,
      statusHint: input.decision,
      notes: input.actorLogin ? `by ${input.actorLogin}` : undefined,
    },
    suggestedStatus,
    humanApprovalRequired: input.decision === "approve_build" ? false : undefined,
    humanApprovalReceived: approvalReceived,
  };
}
