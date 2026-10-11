import "server-only";

import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import { executeCtoAllowedAction, type CtoActionExecutorDeps } from "@/features/agent-os/cto-action.executor";
import { planCtoLoopStep } from "@/features/agent-os/cto-loop.engine";
import {
  buildCtoObservationFromTask,
  type BuildCtoObservationOptions,
} from "@/features/agent-os/cto-loop.observe";
import type {
  CtoActionExecutionResult,
  CtoLoopPlan,
  CtoObservation,
  CtoVerificationOutcome,
} from "@/features/agent-os/cto-loop.types";
import { evaluateCtoVerification } from "@/features/agent-os/cto-loop.verification";
import {
  applyInboundAgentEvent,
  createAgentRun,
  createTaskRunForAgentRun,
  recordAgentDecision,
} from "@/features/agent-os/agent-run.service";
import {
  isTerminalAgentRunStatus,
  nextStatusAfterEvent,
} from "@/features/agent-os/agent-run.state-machine";
import type { AgentOperationalRiskLevel, AgentRunSummaryJson } from "@/features/agent-os/agent-run.types";
import type { AutomationTask } from "@/features/automation/automation-task.types";
import { prisma } from "@/lib/prisma";

export type ProcessCtoLoopInput = {
  task: AutomationTask;
  inbound?: InboundAgentEvent | null;
  observationOptions?: BuildCtoObservationOptions;
  duplicateSourceEvent?: boolean;
  deps?: CtoActionExecutorDeps;
  /** Optional refreshed task snapshot after execution for verification. Falls back to `task`. */
  taskAfterExecution?: AutomationTask | null;
};

export type ProcessCtoLoopResult = {
  agentRunId: string;
  plan: CtoLoopPlan;
  execution: CtoActionExecutionResult;
  verification: CtoVerificationOutcome;
  observationBefore: CtoObservation;
  observationAfter: CtoObservation;
  skipped: boolean;
};

function riskLevelFromTask(task: AutomationTask): AgentOperationalRiskLevel {
  if (task.risk === "high") return "HIGH";
  if (task.risk === "medium") return "MEDIUM";
  if (task.risk === "low") return "LOW";
  return "UNKNOWN";
}

function parseOutputSummary(raw: unknown): AgentRunSummaryJson {
  if (!raw || typeof raw !== "object") return {};
  return raw as AgentRunSummaryJson;
}

function outputSummaryWithG3(
  previous: unknown,
  patch: AgentRunSummaryJson,
): AgentRunSummaryJson {
  return { ...parseOutputSummary(previous), ...patch };
}

async function findOrCreateCtoRun(issueNumber: number) {
  const active = await prisma.agentRun.findFirst({
    where: {
      githubIssueNumber: issueNumber,
      agentId: "ATTD_CTO",
      status: { notIn: ["SUCCEEDED", "FAILED", "CANCELLED"] },
    },
    orderBy: [{ attemptNumber: "desc" }, { updatedAt: "desc" }],
  });
  if (active) return active;

  const correlationId = `cto-issue-${issueNumber}`;
  return createAgentRun({
    agentId: "ATTD_CTO",
    triggerSource: "GITHUB_ISSUE_STATUS",
    githubIssueNumber: issueNumber,
    correlationId,
    idempotencyKey: `cto-run:${issueNumber}:active`,
  });
}

async function countNoProgressAttempts(issueNumber: number): Promise<number> {
  const recent = await prisma.agentDecision.findMany({
    where: { agentRun: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { selectedAction: true, evidenceRefs: true },
  });

  let streak = 0;
  for (const row of recent) {
    const refs = row.evidenceRefs;
    let verified = false;
    if (Array.isArray(refs)) {
      for (const ref of refs) {
        if (
          ref &&
          typeof ref === "object" &&
          "type" in ref &&
          ref.type === "manual" &&
          "ref" in ref &&
          typeof ref.ref === "string" &&
          ref.ref.includes('"verified":"verified"')
        ) {
          verified = true;
        }
      }
    }
    if (verified) break;
    if (row.selectedAction === "NOOP" || row.selectedAction?.startsWith("ESCALATE")) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export async function processCtoLoopForTask(input: ProcessCtoLoopInput): Promise<ProcessCtoLoopResult> {
  const issueNumber = input.task.issueNumber;
  const run = await findOrCreateCtoRun(issueNumber);

  let taskRunId: string | null = null;
  const existingTaskRun = await prisma.taskRun.findFirst({
    where: { agentRunId: run.id },
    orderBy: { createdAt: "desc" },
  });
  if (existingTaskRun) {
    taskRunId = existingTaskRun.id;
  } else {
    const created = await createTaskRunForAgentRun({
      agentRunId: run.id,
      githubIssueNumber: issueNumber,
      taskArea: input.task.taskArea,
    });
    taskRunId = created.id;
  }

  if (input.inbound) {
    await applyInboundAgentEvent({
      agentRunId: run.id,
      taskRunId,
      inbound: input.inbound,
    });
  }

  const refreshedRun = await prisma.agentRun.findUniqueOrThrow({ where: { id: run.id } });
  const outputSummary = parseOutputSummary(refreshedRun.outputSummary);
  const lastActionKey =
    typeof outputSummary.g3LastActionKey === "string" ? outputSummary.g3LastActionKey : null;

  const observationBefore = buildCtoObservationFromTask(input.task, input.observationOptions);

  const plan = planCtoLoopStep({
    observation: observationBefore,
    protection: {
      lastActionIdempotencyKey: lastActionKey,
      attemptCountWithoutProgress: await countNoProgressAttempts(issueNumber),
      hasActiveNonTerminalRun:
        !isTerminalAgentRunStatus(refreshedRun.status) && refreshedRun.status === "RUNNING",
      duplicateSourceEvent: input.duplicateSourceEvent ?? false,
      proposedActionIdempotencyKey: null,
    },
  });

  const execution = await executeCtoAllowedAction({
    plan,
    observation: observationBefore,
    deps: input.deps,
  });

  const afterTask = input.taskAfterExecution ?? input.task;
  const observationAfter = buildCtoObservationFromTask(afterTask, input.observationOptions);

  const verification = evaluateCtoVerification({
    action: plan.selectedAction,
    expectation: plan.verification,
    before: observationBefore,
    after: observationAfter,
    executionSubmitted: execution.submitted,
  });

  await recordAgentDecision({
    agentRunId: run.id,
    decisionType: plan.decisionType,
    rationaleSummary: plan.rationale,
    riskLevel: riskLevelFromTask(input.task),
    humanApprovalRequired: plan.humanApprovalRequired,
    selectedAction: plan.selectedAction,
    evidenceRefs: [
      { type: "github_issue", ref: `#${issueNumber}` },
      {
        type: "manual",
        ref: JSON.stringify({
          priority: plan.priority.reason,
          verified: verification,
          idempotencyKey: plan.idempotencyKey,
        }),
      },
    ],
  });

  let nextStatus = refreshedRun.status as typeof refreshedRun.status;
  if (nextStatus === "QUEUED") {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "RUNNING" });
  }

  if (
    plan.selectedAction === "ESCALATE_HIGH_RISK" ||
    plan.selectedAction === "ESCALATE_NO_PROGRESS" ||
    plan.selectedAction === "WAIT_HUMAN"
  ) {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "WAITING_HUMAN" });
  } else if (plan.selectedAction === "WAIT_EXTERNAL") {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "WAITING_EXTERNAL" });
  } else if (plan.selectedAction === "ADVANCE_AFTER_VERIFIED_STATE" && verification === "verified") {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "SUCCEEDED" });
  } else if (plan.selectedAction === "POST_BUILD_APPROVED" && execution.submitted) {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "RUNNING" });
  }

  await prisma.agentRun.update({
    where: { id: run.id },
    data: {
      agentId: "ATTD_CTO",
      status: nextStatus,
      blockerReason: plan.blockerReason,
      nextAction: plan.nextAction,
      humanApprovalRequired: plan.humanApprovalRequired,
      outputSummary: outputSummaryWithG3(refreshedRun.outputSummary, {
        g3LastActionKey: plan.idempotencyKey,
        g3LastAction: plan.selectedAction,
        g3LastVerified: verification,
        g3PriorityReason: plan.priority.reason,
        g3PriorityTier: plan.priority.tier,
        g3AssignedAgent: plan.assignedAgentId,
      }),
      startedAt: refreshedRun.startedAt ?? (nextStatus === "RUNNING" ? new Date() : null),
      finishedAt:
        nextStatus === "SUCCEEDED" || nextStatus === "FAILED" || nextStatus === "CANCELLED"
          ? new Date()
          : refreshedRun.finishedAt,
    },
  });

  await prisma.taskRun.update({
    where: { id: taskRunId },
    data: {
      status: nextStatus,
      blockerReason: plan.blockerReason,
      nextAction: plan.nextAction,
    },
  });

  return {
    agentRunId: run.id,
    plan,
    execution,
    verification,
    observationBefore,
    observationAfter,
    skipped: plan.selectedAction === "NOOP",
  };
}
