import "server-only";

import { Prisma } from "@prisma/client";
import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  executeCtoAllowedAction,
  resolveCtoActionExecutorDeps,
  type CtoActionExecutorDeps,
} from "@/features/agent-os/cto-action.executor";
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
  createFollowUpAgentRunAttempt,
  createTaskRunForAgentRun,
} from "@/features/agent-os/agent-run.service";
import {
  isTerminalAgentRunStatus,
  nextStatusAfterEvent,
} from "@/features/agent-os/agent-run.state-machine";
import type {
  AgentOperationalRiskLevel,
  AgentRunStatus,
  AgentRunSummaryJson,
} from "@/features/agent-os/agent-run.types";
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

const NO_PROGRESS_EXTERNAL_ACTIONS = new Set(["POST_BUILD_APPROVED", "REQUEST_CI_RETRY"]);

const CONCURRENCY_CLAIM_ACTIONS = new Set(["POST_BUILD_APPROVED", "REQUEST_CI_RETRY"]);

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

function buildCtoRunIdempotencyKey(issueNumber: number, attemptNumber: number): string {
  return `cto-run:${issueNumber}:attempt:${attemptNumber}`;
}

function hasActiveExecutionAttempt(status: AgentRunStatus): boolean {
  return status === "RUNNING" || status === "QUEUED";
}

function isWriteConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function parseDecisionVerification(
  evidenceRefs: unknown,
): CtoVerificationOutcome | null {
  if (!Array.isArray(evidenceRefs)) return null;
  for (const ref of evidenceRefs) {
    if (
      ref &&
      typeof ref === "object" &&
      "type" in ref &&
      ref.type === "manual" &&
      "ref" in ref &&
      typeof ref.ref === "string"
    ) {
      try {
        const parsed = JSON.parse(ref.ref) as { verified?: CtoVerificationOutcome };
        if (
          parsed.verified === "verified" ||
          parsed.verified === "pending" ||
          parsed.verified === "failed"
        ) {
          return parsed.verified;
        }
      } catch {
        if (ref.ref.includes('"verified":"verified"')) return "verified";
      }
    }
  }
  return null;
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

  const latest = await prisma.agentRun.findFirst({
    where: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" },
    orderBy: [{ attemptNumber: "desc" }, { updatedAt: "desc" }],
  });

  const correlationId = latest?.correlationId ?? `cto-issue-${issueNumber}`;

  if (!latest) {
    return createAgentRun({
      agentId: "ATTD_CTO",
      triggerSource: "GITHUB_ISSUE_STATUS",
      githubIssueNumber: issueNumber,
      correlationId,
      idempotencyKey: buildCtoRunIdempotencyKey(issueNumber, 1),
      attemptNumber: 1,
    });
  }

  if (!isTerminalAgentRunStatus(latest.status)) {
    return latest;
  }

  const nextAttempt = latest.attemptNumber + 1;
  return createFollowUpAgentRunAttempt({
    previousRunId: latest.id,
    triggerSource: "GITHUB_ISSUE_STATUS",
    idempotencyKey: buildCtoRunIdempotencyKey(issueNumber, nextAttempt),
  });
}

async function hasConcurrentNonTerminalCtoRun(
  issueNumber: number,
  excludeRunId: string,
): Promise<boolean> {
  const other = await prisma.agentRun.findFirst({
    where: {
      githubIssueNumber: issueNumber,
      agentId: "ATTD_CTO",
      id: { not: excludeRunId },
      status: { notIn: ["SUCCEEDED", "FAILED", "CANCELLED"] },
    },
  });
  return other != null;
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
    const verification = parseDecisionVerification(row.evidenceRefs);
    if (verification === "verified") break;

    const externalWrite =
      row.selectedAction != null && NO_PROGRESS_EXTERNAL_ACTIONS.has(row.selectedAction);
    const countsAsStall =
      row.selectedAction === "NOOP" ||
      row.selectedAction?.startsWith("ESCALATE") ||
      externalWrite;

    if (countsAsStall) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function computeNextRunStatus(input: {
  current: AgentRunStatus;
  plan: CtoLoopPlan;
  verification: CtoVerificationOutcome;
  executionSubmitted: boolean;
}): AgentRunStatus {
  let nextStatus = input.current;
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
  } else if (input.plan.selectedAction === "POST_BUILD_APPROVED" && input.executionSubmitted) {
    nextStatus = nextStatusAfterEvent({ current: nextStatus, suggested: "RUNNING" });
  }

  return nextStatus;
}

async function planAndClaimCtoTick(input: {
  runId: string;
  issueNumber: number;
  observation: CtoObservation;
  duplicateSourceEvent: boolean;
  concurrentCtoRun: boolean;
}): Promise<{ plan: CtoLoopPlan; claimedActionKey: string | null }> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const run = await tx.agentRun.findUniqueOrThrow({ where: { id: input.runId } });
          if (isTerminalAgentRunStatus(run.status)) {
            throw new Error(`CTO run ${run.id} is terminal; create a new attempt before ticking`);
          }

          const outputSummary = parseOutputSummary(run.outputSummary);
          const lastActionKey =
            typeof outputSummary.g3LastActionKey === "string"
              ? outputSummary.g3LastActionKey
              : null;

          const plan = planCtoLoopStep({
            observation: input.observation,
            protection: {
              lastActionIdempotencyKey: lastActionKey,
              attemptCountWithoutProgress: await countNoProgressAttempts(input.issueNumber),
              hasActiveNonTerminalRun:
                hasActiveExecutionAttempt(run.status) || input.concurrentCtoRun,
              duplicateSourceEvent: input.duplicateSourceEvent,
              proposedActionIdempotencyKey: null,
            },
          });

          let claimedActionKey: string | null = null;
          if (CONCURRENCY_CLAIM_ACTIONS.has(plan.selectedAction)) {
            claimedActionKey = plan.idempotencyKey;
            await tx.agentRun.update({
              where: { id: run.id },
              data: {
                outputSummary: outputSummaryWithG3(run.outputSummary, {
                  g3LastActionKey: plan.idempotencyKey,
                }) as Prisma.InputJsonValue,
              },
            });
          }

          return { plan, claimedActionKey };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isWriteConflict(error) && attempt < 3) continue;
      throw error;
    }
  }

  throw new Error("CTO plan/claim transaction retry limit exceeded");
}

async function persistCtoTickResult(input: {
  runId: string;
  taskRunId: string;
  issueNumber: number;
  task: AutomationTask;
  plan: CtoLoopPlan;
  verification: CtoVerificationOutcome;
  executionSubmitted: boolean;
  claimedActionKey: string | null;
}): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const run = await tx.agentRun.findUniqueOrThrow({ where: { id: input.runId } });
          if (isTerminalAgentRunStatus(run.status)) {
            throw new Error(`CTO run ${run.id} is terminal; refusing to mutate`);
          }

          await tx.agentDecision.create({
            data: {
              agentRunId: run.id,
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
              ] as Prisma.InputJsonValue,
            },
          });

          const nextStatus = computeNextRunStatus({
            current: run.status,
            plan: input.plan,
            verification: input.verification,
            executionSubmitted: input.executionSubmitted,
          });

          const summaryPatch: AgentRunSummaryJson = {
            g3LastAction: input.plan.selectedAction,
            g3LastVerified: input.verification,
            g3PriorityReason: input.plan.priority.reason,
            g3PriorityTier: input.plan.priority.tier,
            g3AssignedAgent: input.plan.assignedAgentId,
          };
          if (input.claimedActionKey) {
            summaryPatch.g3LastActionKey = input.claimedActionKey;
          } else if (input.plan.selectedAction !== "NOOP") {
            summaryPatch.g3LastActionKey = input.plan.idempotencyKey;
          }

          await tx.agentRun.update({
            where: { id: run.id },
            data: {
              agentId: "ATTD_CTO",
              status: nextStatus,
              blockerReason: input.plan.blockerReason,
              nextAction: input.plan.nextAction,
              humanApprovalRequired: input.plan.humanApprovalRequired,
              outputSummary: outputSummaryWithG3(run.outputSummary, summaryPatch) as Prisma.InputJsonValue,
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
      if (isWriteConflict(error) && attempt < 3) continue;
      throw error;
    }
  }

  throw new Error("CTO persist transaction retry limit exceeded");
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

  const observationBefore = buildCtoObservationFromTask(input.task, input.observationOptions);

  const concurrentCtoRun = await hasConcurrentNonTerminalCtoRun(issueNumber, run.id);

  const { plan, claimedActionKey } = await planAndClaimCtoTick({
    runId: run.id,
    issueNumber,
    observation: observationBefore,
    duplicateSourceEvent: input.duplicateSourceEvent ?? false,
    concurrentCtoRun,
  });

  const executorDeps = await resolveCtoActionExecutorDeps(input.deps);

  const execution = await executeCtoAllowedAction({
    plan,
    observation: observationBefore,
    deps: executorDeps,
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

  await persistCtoTickResult({
    runId: run.id,
    taskRunId,
    issueNumber,
    task: input.task,
    plan,
    verification,
    executionSubmitted: execution.submitted,
    claimedActionKey,
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
