import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import type { AgentId, AgentRouteResult, AgentTaskPriority } from "@/features/agent-os/agent.types";
import type {
  AutomationTaskRisk,
  NormalizedTaskStatus,
  PullRequestVerification,
} from "@/features/automation/automation-task.types";

export type CtoObservation = {
  issueNumber: number;
  status: NormalizedTaskStatus;
  risk: AutomationTaskRisk;
  taskArea: string;
  hasBuildApproved: boolean;
  blockerReason: string | null;
  isOpen: boolean;
  agentRoute: AgentRouteResult;
  pullRequest: {
    number: number;
    headShaFingerprint: string | null;
    verification: PullRequestVerification | null | undefined;
    merged: boolean;
  } | null;
  productionLive: boolean;
  dependencyReady: boolean;
  parentTaskIssueNumber: number | null;
  latestUpdateAt: string;
  explicitPriority: AgentTaskPriority | null;
  approveBuildEligible: boolean;
};

export type CtoPriorityEvaluation = {
  score: number;
  reason: string;
  tier: AgentTaskPriority;
};

export type CtoLoopProtectionContext = {
  lastActionIdempotencyKey: string | null;
  attemptCountWithoutProgress: number;
  hasActiveNonTerminalRun: boolean;
  duplicateSourceEvent: boolean;
  proposedActionIdempotencyKey: string | null;
};

export type CtoVerificationKind =
  | "pr_head"
  | "ci_status"
  | "review_status"
  | "deploy_status"
  | "run_status"
  | "build_approved"
  | "none";

export type CtoVerificationExpectation = {
  kind: CtoVerificationKind;
  /** When true, verification passes only if the observed signal changed. */
  requiresChange: boolean;
};

export type CtoVerificationOutcome = "verified" | "pending" | "failed" | "skipped";

export type CtoLoopPlan = {
  assignedAgentId: AgentId;
  priority: CtoPriorityEvaluation;
  selectedAction: CtoAllowedAction;
  idempotencyKey: string;
  escalate: boolean;
  humanApprovalRequired: boolean;
  rationale: string;
  verification: CtoVerificationExpectation;
  blockerReason: string | null;
  nextAction: string | null;
  decisionType: "ROUTE" | "ESCALATE" | "APPROVE_BUILD" | "BLOCK" | "RETRY" | "COMPLETE" | "OTHER";
};

export type CtoLoopVisibility = {
  issueNumber: number;
  assignedAgentId: string | null;
  selectedAction: string | null;
  priorityReason: string | null;
  priorityTier: AgentTaskPriority | null;
  lastVerifiedResult: CtoVerificationOutcome | null;
  blockerReason: string | null;
  nextAction: string | null;
  humanApprovalRequired: boolean;
  humanApprovalReceivedAt: string | null;
  attemptNumber: number | null;
  correlationId: string | null;
  lastDecisionAt: string | null;
  runStatus: string | null;
  updatedAt: string | null;
};

export type CtoActionExecutionResult = {
  action: CtoAllowedAction;
  idempotencyKey: string;
  submitted: boolean;
  skippedReason?: string;
  externalReference?: string;
};
