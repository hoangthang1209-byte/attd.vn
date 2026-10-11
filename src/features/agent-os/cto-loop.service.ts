import "server-only";

import { Prisma } from "@prisma/client";
import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  executeCtoAllowedAction,
  resolveCtoActionExecutorDeps,
  type CtoActionExecutorDeps,
} from "@/features/agent-os/cto-action.executor";
import { isCtoExternalWriteAction } from "@/features/agent-os/cto-action.allowlist";
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
  createAgentRunAfterTerminal,
  createTaskRunForAgentRun,
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
  const merged = { ...parseOutputSummary(previous), ...patch };
  delete merged.g3PendingActionKey;
  return merged;
}

function isRetryableTxConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code === "P2010") {
    const message = error.message;
    return message.includes("40001") || message.includes("could not serialize");
  }
  return false;
}

function ctoRunIdempotencyKey(issueNumber: number, attemptNumber: number): string {
  return `cto-run:${issueNumber}:${attemptNumber}`;
}

async function findActiveCtoRun(issueNumber: number) {
  return prisma.agentRun.findFirst({
    where: {
      githubIssueNumber: issueNumber,
      agentId: "ATTD_CTO",
      status: { notIn: ["SUCCEEDED", "FAILED", "CANCELLED"] },
    },
    orderBy: [{ attemptNumber: "desc" }, { updatedAt: "desc" }],
  });
}

async function findLatestCtoRun(issueNumber: number) {
  return prisma.agentRun.findFirst({
    where: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" },
    orderBy: [{ attemptNumber: "desc" }, { updatedAt: "desc" }],
  });
}

async function createFirstCtoRun(issueNumber: number) {
  const correlationId = `cto-issue-${issueNumber}`;
  return createAgentRun({
    agentId: "ATTD_CTO",
    triggerSource: "GITHUB_ISSUE_STATUS",
    githubIssueNumber: issueNumber,
    correlationId,
    idempotencyKey: ctoRunIdempotencyKey(issueNumber, 1),
    attemptNumber: 1,
  });
}

type ResolveCtoRunResult =
  | { kind: "run"; run: Awaited<ReturnType<typeof createAgentRun>> }
  | { kind: "terminal_idle"; latestRunId: string };

/**
 * Never attach new loop ticks to terminal runs. Resume only with a new attempt when inbound work arrives.
 */
async function resolveCtoRunForTick(input: {
  issueNumber: number;
  inbound?: InboundAgentEvent | null;
}): Promise<ResolveCtoRunResult> {
  const active = await findActiveCtoRun(input.issueNumber);
  if (active) return { kind: "run", run: active };

  const latest = await findLatestCtoRun(input.issueNumber);
  if (!latest) {
    const run = await createFirstCtoRun(input.issueNumber);
    return { kind: "run", run };
  }

  if (isTerminalAgentRunStatus(latest.status)) {
    if (!input.inbound) {
      return { kind: "terminal_idle", latestRunId: latest.id };
    }
    const nextAttempt = latest.attemptNumber + 1;
    const run = await createAgentRunAfterTerminal({
      priorRunId: latest.id,
      triggerSource: input.inbound.source,
      idempotencyKey: ctoRunIdempotencyKey(input.issueNumber, nextAttempt),
    });
    return { kind: "run", run };
  }

  return { kind: "run", run: latest };
}

function evidenceIndicatesVerified(evidenceRefs: unknown): boolean {
  if (!Array.isArray(evidenceRefs)) return false;
  for (const ref of evidenceRefs) {
    if (
      ref &&
      typeof ref === "object" &&
      "type" in ref &&
      ref.type === "manual" &&
      "ref" in ref &&
      typeof ref.ref === "string" &&
      ref.ref.includes('"verified":"verified"')
    ) {
      return true;
    }
  }
  return false;
}

export async function countNoProgressAttempts(issueNumber: number): Promise<number> {
  const recent = await prisma.agentDecision.findMany({
    where: { agentRun: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { selectedAction: true, evidenceRefs: true },
  });

  let streak = 0;
  for (const row of recent) {
    const verified = evidenceIndicatesVerified(row.evidenceRefs);
    if (verified) break;

    const action = row.selectedAction;
    const countsAsNoProgress =
      action === "NOOP" ||
      action?.startsWith("ESCALATE") ||
      action === "POST_BUILD_APPROVED" ||
      action === "REQUEST_CI_RETRY";

    if (countsAsNoProgress) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

async function lockAgentRunRow(tx: Prisma.TransactionClient, agentRunId: string) {
  await tx.$queryRaw`SELECT id FROM "AgentRun" WHERE id = ${agentRunId} FOR UPDATE`;
}

async function tryClaimCtoActionSlot(input: {
  agentRunId: string;
  idempotencyKey: string;
}): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await lockAgentRunRow(tx, input.agentRunId);
          const run = await tx.agentRun.findUniqueOrThrow({ where: { id: input.agentRunId } });
          const summary = parseOutputSummary(run.outputSummary);
          const lastKey =
            typeof summary.g3LastActionKey === "string" ? summary.g3LastActionKey : null;
          const pendingKey =
            typeof summary.g3PendingActionKey === "string" ? summary.g3PendingActionKey : null;

          if (lastKey === input.idempotencyKey || pendingKey === input.idempotencyKey) {
            return false;
          }

          await tx.agentRun.update({
            where: { id: input.agentRunId },
            data: {
              outputSummary: {
                ...summary,
                g3PendingActionKey: input.idempotencyKey,
              } as Prisma.InputJsonValue,
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryableTxConflict(error) && attempt < 3) continue;
      throw error;
    }
  }
  return false;
}

type PersistCtoStepInput = {
  agentRunId: string;
  taskRunId: string;
  issueNumber: number;
  task: AutomationTask;
  plan: CtoLoopPlan;
  verification: CtoVerificationOutcome;
  executionSubmitted: boolean;
  refreshedRun: {
    status: string;
    outputSummary: unknown;
    startedAt: Date | null;
    finishedAt: Date | null;
  };
};

async function persistCtoLoopStep(input: PersistCtoStepInput): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          await lockAgentRunRow(tx, input.agentRunId);
          const run = await tx.agentRun.findUniqueOrThrow({ where: { id: input.agentRunId } });

          await tx.agentDecision.create({
            data: {
              agentRunId: input.agentRunId,
              decisionType: input.plan.decisionType,
              rationaleSummary: input.plan.rationale,
              riskLevel: riskLevelFromTask(input.task),
              humanApprovalRequired: input.plan.humanApprovalRequired,
              selectedAction: input.plan.selectedAction,
              evidenceRefs: [
                { type: "github_issue", ref: `#${input.issueNumber}` },
                {
                  type: "manual",
                  ref: JSON.stringify({
                    priority: input.plan.priority.reason,
                    verified: input.verification,
                    idempotencyKey: input.plan.idempotencyKey,
                  }),
                },
              ] as unknown as Prisma.InputJsonValue,
            },
          });

          let nextStatus = run.status as typeof run.status;
          if (nextStatus === "QUEUED") {
            nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "RUNNING" });
          }

          if (
            input.plan.selectedAction === "ESCALATE_HIGH_RISK" ||
            input.plan.selectedAction === "ESCALATE_NO_PROGRESS" ||
            input.plan.selectedAction === "WAIT_HUMAN"
          ) {
            nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "WAITING_HUMAN" });
          } else if (input.plan.selectedAction === "WAIT_EXTERNAL") {
            nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "WAITING_EXTERNAL" });
          } else if (
            input.plan.selectedAction === "ADVANCE_AFTER_VERIFIED_STATE" &&
            input.verification === "verified"
          ) {
            nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "SUCCEEDED" });
          } else if (
            input.plan.selectedAction === "POST_BUILD_APPROVED" &&
            input.executionSubmitted
          ) {
            nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "RUNNING" });
          }

          await tx.agentRun.update({
            where: { id: input.agentRunId },
            data: {
              agentId: "ATTD_CTO",
              status: nextStatus,
              blockerReason: input.plan.blockerReason,
              nextAction: input.plan.nextAction,
              humanApprovalRequired: input.plan.humanApprovalRequired,
              outputSummary: outputSummaryWithG3(run.outputSummary, {
                g3LastActionKey: input.plan.idempotencyKey,
                g3LastAction: input.plan.selectedAction,
                g3LastVerified: input.verification,
                g3PriorityReason: input.plan.priority.reason,
                g3PriorityTier: input.plan.priority.tier,
                g3AssignedAgent: input.plan.assignedAgentId,
              }) as Prisma.InputJsonValue,
              startedAt: run.startedAt ?? (nextStatus === "RUNNING" ? new Date() : null),
              finishedAt:
                nextStatus === "SUCCEEDED" || nextStatus === "FAILED" || nextStatus === "CANCELLED"
                  ? new Date()
                  : run.finishedAt,
            },
          });

          await tx.taskRun.update({
            where: { id: input.taskRunId },
            data: {
              status: nextStatus,
              blockerReason: input.plan.blockerReason,
              nextAction: input.plan.nextAction,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return;
    } catch (error) {
      if (isRetryableTxConflict(error) && attempt < 3) continue;
      throw error;
    }
  }
  throw new Error("CTO loop persistence retry limit exceeded");
}

function terminalIdleResult(input: {
  agentRunId: string;
  observation: CtoObservation;
}): ProcessCtoLoopResult {
  const plan = planCtoLoopStep({
    observation: input.observation,
    protection: {
      lastActionIdempotencyKey: null,
      attemptCountWithoutProgress: 0,
      hasActiveNonTerminalRun: false,
      duplicateSourceEvent: true,
      proposedActionIdempotencyKey: null,
    },
  });
  return {
    agentRunId: input.agentRunId,
    plan,
    execution: {
      action: "NOOP",
      idempotencyKey: plan.idempotencyKey,
      submitted: false,
      skippedReason: "terminal_run_idle",
    },
    verification: "skipped",
    observationBefore: input.observation,
    observationAfter: input.observation,
    skipped: true,
  };
}

export async function processCtoLoopForTask(input: ProcessCtoLoopInput): Promise<ProcessCtoLoopResult> {
  const issueNumber = input.task.issueNumber;
  const observationBefore = buildCtoObservationFromTask(input.task, input.observationOptions);

  const resolved = await resolveCtoRunForTick({
    issueNumber,
    inbound: input.inbound,
  });

  if (resolved.kind === "terminal_idle") {
    return terminalIdleResult({
      agentRunId: resolved.latestRunId,
      observation: observationBefore,
    });
  }

  const run = resolved.run;

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
      attemptNumber: run.attemptNumber,
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

  const executorDeps = resolveCtoActionExecutorDeps(input.deps);

  let execution: CtoActionExecutionResult;
  if (plan.selectedAction === "NOOP") {
    execution = {
      action: "NOOP",
      idempotencyKey: plan.idempotencyKey,
      submitted: false,
      skippedReason: plan.rationale,
    };
  } else if (isCtoExternalWriteAction(plan.selectedAction)) {
    const claimed = await tryClaimCtoActionSlot({
      agentRunId: run.id,
      idempotencyKey: plan.idempotencyKey,
    });
    if (!claimed) {
      execution = {
        action: plan.selectedAction,
        idempotencyKey: plan.idempotencyKey,
        submitted: false,
        skippedReason: "concurrent_or_duplicate_action",
      };
    } else {
      execution = await executeCtoAllowedAction({
        plan,
        observation: observationBefore,
        deps: executorDeps,
      });
    }
  } else {
    execution = await executeCtoAllowedAction({
      plan,
      observation: observationBefore,
      deps: executorDeps,
    });
  }

  const afterTask = input.taskAfterExecution ?? input.task;
  const observationAfter = buildCtoObservationFromTask(afterTask, input.observationOptions);

  const verification = evaluateCtoVerification({
    action: plan.selectedAction,
    expectation: plan.verification,
    before: observationBefore,
    after: observationAfter,
    executionSubmitted: execution.submitted,
  });

  if (
    plan.selectedAction !== "NOOP" &&
    execution.skippedReason !== "concurrent_or_duplicate_action"
  ) {
    await persistCtoLoopStep({
      agentRunId: run.id,
      taskRunId,
      issueNumber,
      task: input.task,
      plan,
      verification,
      executionSubmitted: execution.submitted,
      refreshedRun,
    });
  } else if (plan.selectedAction === "NOOP" && (input.duplicateSourceEvent ?? false)) {
    await persistCtoLoopStep({
      agentRunId: run.id,
      taskRunId,
      issueNumber,
      task: input.task,
      plan,
      verification,
      executionSubmitted: false,
      refreshedRun,
    });
  }

  return {
    agentRunId: run.id,
    plan,
    execution,
    verification,
    observationBefore,
    observationAfter,
    skipped: plan.selectedAction === "NOOP" || execution.skippedReason === "concurrent_or_duplicate_action",
  };
}
