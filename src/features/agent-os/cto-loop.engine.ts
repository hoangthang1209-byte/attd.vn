import type { CtoAllowedAction } from "@/features/agent-os/cto-action.allowlist";
import { evaluateCtoTaskPriority } from "@/features/agent-os/cto-priority";
import {
  buildCtoActionIdempotencyKey,
  buildPostBuildApprovedDedupeKey,
  detectNoProgressLoop,
  shouldBlockConcurrentExecution,
  shouldSkipDuplicateAction,
  shouldSuppressDuplicateBuildApproved,
} from "@/features/agent-os/cto-loop.dedupe";
import type {
  CtoLoopPlan,
  CtoLoopProtectionContext,
  CtoObservation,
} from "@/features/agent-os/cto-loop.types";
import { buildVerificationExpectation } from "@/features/agent-os/cto-loop.verification";

function planNoop(priority: CtoLoopPlan["priority"], rationale: string): CtoLoopPlan {
  return {
    assignedAgentId: "ATTD_CTO",
    priority,
    selectedAction: "NOOP",
    idempotencyKey: buildCtoActionIdempotencyKey(["noop", rationale]),
    escalate: false,
    humanApprovalRequired: false,
    rationale,
    verification: buildVerificationExpectation("NOOP"),
    blockerReason: null,
    nextAction: null,
    decisionType: "OTHER",
  };
}

export function planCtoLoopStep(input: {
  observation: CtoObservation;
  protection: CtoLoopProtectionContext;
  nowMs?: number;
}): CtoLoopPlan {
  const priority = evaluateCtoTaskPriority(input.observation, input.nowMs);
  const route = input.observation.agentRoute;

  if (input.protection.duplicateSourceEvent) {
    return planNoop(priority, "duplicate_source_event");
  }

  if (detectNoProgressLoop(input.protection.attemptCountWithoutProgress)) {
    return {
      assignedAgentId: "ATTD_CTO",
      priority,
      selectedAction: "ESCALATE_NO_PROGRESS",
      idempotencyKey: buildCtoActionIdempotencyKey([
        "escalate-no-progress",
        String(input.observation.issueNumber),
        String(input.protection.attemptCountWithoutProgress),
      ]),
      escalate: true,
      humanApprovalRequired: true,
      rationale: "CTO loop detected repeated attempts without verified progress",
      verification: buildVerificationExpectation("ESCALATE_NO_PROGRESS"),
      blockerReason: "CTO loop không tiến triển sau nhiều lần thử",
      nextAction: "Owner xem xét và can thiệp thủ công",
      decisionType: "ESCALATE",
    };
  }

  if (
    route.requiresHumanEscalation ||
    route.reason === "high_risk_escalation" ||
    input.observation.risk === "high"
  ) {
    return {
      assignedAgentId: "ATTD_CTO",
      priority,
      selectedAction: "ESCALATE_HIGH_RISK",
      idempotencyKey: buildCtoActionIdempotencyKey([
        "escalate-high-risk",
        String(input.observation.issueNumber),
        route.reason,
      ]),
      escalate: true,
      humanApprovalRequired: true,
      rationale: "High-risk domain requires ATTD_CTO and human approval",
      verification: buildVerificationExpectation("ESCALATE_HIGH_RISK"),
      blockerReason: "Phạm vi high-risk — cần duyệt con người",
      nextAction: "Owner xác nhận HIGH_RISK_APPROVED trước khi triển khai",
      decisionType: "ESCALATE",
    };
  }

  if (!input.observation.dependencyReady) {
    return {
      assignedAgentId: "ATTD_CTO",
      priority,
      selectedAction: "WAIT_EXTERNAL",
      idempotencyKey: buildCtoActionIdempotencyKey([
        "wait-dependency",
        String(input.observation.issueNumber),
        String(input.observation.parentTaskIssueNumber ?? "none"),
      ]),
      escalate: false,
      humanApprovalRequired: false,
      rationale: "Parent/dependency task not ready",
      verification: buildVerificationExpectation("WAIT_EXTERNAL"),
      blockerReason: "Chờ task phụ thuộc hoàn tất",
      nextAction: "Theo dõi parent task trước khi gán Builder",
      decisionType: "BLOCK",
    };
  }

  let selectedAction: CtoAllowedAction = "ASSIGN_AGENT";
  let rationale = `Route to ${route.agentId} (${route.reason})`;
  let decisionType: CtoLoopPlan["decisionType"] = "ROUTE";
  let idempotencyKey = buildCtoActionIdempotencyKey([
    "assign",
    String(input.observation.issueNumber),
    route.agentId,
    input.observation.status,
  ]);
  let blockerReason: string | null = input.observation.blockerReason;
  let nextAction: string | null = null;
  let humanApprovalRequired = false;

  if (input.observation.approveBuildEligible) {
    selectedAction = "POST_BUILD_APPROVED";
    rationale = "Issue eligible for idempotent BUILD_APPROVED trigger";
    decisionType = "APPROVE_BUILD";
    idempotencyKey = buildPostBuildApprovedDedupeKey({
      issueNumber: input.observation.issueNumber,
      prNumber: input.observation.pullRequest?.number ?? null,
      prHeadSha: input.observation.pullRequest?.headShaFingerprint ?? null,
      reviewState: input.observation.pullRequest?.verification?.reviewStatus ?? null,
      ciStatus: input.observation.pullRequest?.verification?.ciStatus ?? null,
    });

    if (
      shouldSuppressDuplicateBuildApproved({
        hasBuildApproved: input.observation.hasBuildApproved,
        proposedKey: idempotencyKey,
        lastActionIdempotencyKey: input.protection.lastActionIdempotencyKey,
      })
    ) {
      return planNoop(priority, "duplicate_build_approved_guard");
    }
  } else if (
    input.observation.status === "ci_review" &&
    input.observation.pullRequest?.verification?.ciStatus === "failure"
  ) {
    selectedAction = "REQUEST_CI_RETRY";
    rationale = "CI failure detected — request safe orchestrator retry path";
    decisionType = "RETRY";
    idempotencyKey = buildCtoActionIdempotencyKey([
      "ci-retry",
      String(input.observation.issueNumber),
      String(input.observation.pullRequest?.number ?? "no-pr"),
      input.observation.pullRequest?.headShaFingerprint ?? "no-head",
    ]);
    nextAction = "Chờ CI/orchestrator cập nhật trạng thái";
  } else if (
    input.observation.status === "blocked" ||
    input.observation.status === "needs_fix" ||
    input.observation.status === "failed"
  ) {
    selectedAction = "WAIT_HUMAN";
    rationale = "Task blocked or needs human intervention";
    decisionType = "BLOCK";
    humanApprovalRequired = true;
    blockerReason = input.observation.blockerReason ?? "Task đang bị chặn";
    nextAction = "Owner/CTO xử lý blocker trước khi tiếp tục";
  } else if (
    input.observation.status === "building" ||
    input.observation.status === "approved" ||
    input.observation.status === "pr_open" ||
    input.observation.status === "ci_review" ||
    input.observation.status === "queued"
  ) {
    selectedAction = "WAIT_EXTERNAL";
    rationale = "Pipeline in progress — observe external state";
    decisionType = "OTHER";
    nextAction = "Theo dõi PR/CI/reviewer/deploy";
  } else if (input.observation.status === "merged" || input.observation.status === "ready_to_merge") {
    selectedAction = "ADVANCE_AFTER_VERIFIED_STATE";
    rationale = "Post-merge / ready state — verify deploy and close loop";
    decisionType = "COMPLETE";
    idempotencyKey = buildCtoActionIdempotencyKey([
      "advance",
      String(input.observation.issueNumber),
      input.observation.status,
      input.observation.productionLive ? "live" : "not-live",
    ]);
  }

  const protectionWithProposal: CtoLoopProtectionContext = {
    ...input.protection,
    proposedActionIdempotencyKey: idempotencyKey,
  };

  if (shouldSkipDuplicateAction(protectionWithProposal)) {
    return planNoop(priority, "duplicate_action_idempotency");
  }

  if (
    shouldBlockConcurrentExecution({
      hasActiveNonTerminalRun: input.protection.hasActiveNonTerminalRun,
      action: selectedAction,
    })
  ) {
    return planNoop(priority, "active_execution_attempt");
  }

  return {
    assignedAgentId: route.agentId,
    priority,
    selectedAction,
    idempotencyKey,
    escalate: false,
    humanApprovalRequired,
    rationale,
    verification: buildVerificationExpectation(selectedAction),
    blockerReason,
    nextAction,
    decisionType,
  };
}
