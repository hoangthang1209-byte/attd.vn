import "server-only";

import { Prisma } from "@prisma/client";
import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  executeCtoAllowedAction,
  resolveCtoActionExecutorDeps,
  type CtoActionExecutorDeps,
} from "@/features/agent-os/cto-action.executor";
import {
  assertCtoAllowedAction,
  isCtoAllowedAction,
  isCtoExternalWriteAction,
  type CtoAllowedAction,
} from "@/features/agent-os/cto-action.allowlist";
import {
  CTO_MAX_ORPHAN_UNCONFIRMED_ATTEMPTS,
  derivePendingActionFromIdempotencyKey,
  isOrphanedPendingActionSlot,
} from "@/features/agent-os/cto-loop.dedupe";
import {
  observationConfirmsPendingExternalAction,
  readCiRetryBaselineCiStatus,
  G3_CI_RETRY_BASELINE_CI_STATUS_KEY,
} from "@/features/agent-os/cto-loop.orphan-attribution";
import { planCtoLoopStep } from "@/features/agent-os/cto-loop.engine";
import { evaluateCtoTaskPriority } from "@/features/agent-os/cto-priority";
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
import {
  buildVerificationExpectation,
  evaluateCtoVerification,
} from "@/features/agent-os/cto-loop.verification";
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
  /** Test hook: replace default audit persistence (throws on first call to simulate DB failure). */
  persistStepOverride?: CtoLoopPersistStepFn | null;
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
  delete merged.g3PendingAction;
  delete merged[G3_CI_RETRY_BASELINE_CI_STATUS_KEY];
  return merged;
}

function parsePendingAction(summary: AgentRunSummaryJson): CtoAllowedAction | null {
  const raw = summary.g3PendingAction;
  if (typeof raw !== "string" || !isCtoAllowedAction(raw)) return null;
  return raw;
}

function ciRetryBaselineForOrphanAttribution(
  summary: AgentRunSummaryJson,
): ReturnType<typeof readCiRetryBaselineCiStatus> {
  return readCiRetryBaselineCiStatus(summary);
}

function resolveOrphanPendingAction(input: {
  pendingActionKey: string;
  summary: AgentRunSummaryJson;
}): CtoAllowedAction | null {
  const derived = derivePendingActionFromIdempotencyKey({
    pendingActionKey: input.pendingActionKey,
    storedPendingAction: parsePendingAction(input.summary),
  });
  if (derived.kind === "ambiguous") return null;
  return derived.action;
}

function buildAmbiguousOrphanEscalationPlan(input: {
  pendingActionKey: string;
  observation: CtoObservation;
}): CtoLoopPlan {
  const priority = evaluateCtoTaskPriority(input.observation);
  return {
    assignedAgentId: "ATTD_CTO",
    priority,
    selectedAction: "WAIT_HUMAN",
    idempotencyKey: `cto-g3:orphan-ambiguous:${input.pendingActionKey}`,
    escalate: true,
    humanApprovalRequired: true,
    rationale: "Orphaned pending slot with ambiguous idempotency key — manual recovery required",
    verification: buildVerificationExpectation("WAIT_HUMAN"),
    blockerReason: "Không thể suy luận action từ g3PendingActionKey — cần can thiệp thủ công",
    nextAction: "Owner xác minh trạng thái GitHub và reset pending slot nếu cần",
    decisionType: "ESCALATE",
  };
}

function buildOrphanUnconfirmedEscalationPlan(input: {
  pendingActionKey: string;
  observation: CtoObservation;
  attemptCount: number;
}): CtoLoopPlan {
  const priority = evaluateCtoTaskPriority(input.observation);
  return {
    assignedAgentId: "ATTD_CTO",
    priority,
    selectedAction: "ESCALATE_NO_PROGRESS",
    idempotencyKey: `cto-g3:orphan-unconfirmed-escalate:${input.pendingActionKey}:${input.attemptCount}`,
    escalate: true,
    humanApprovalRequired: true,
    rationale: "Orphaned pending action could not be attributed after bounded recovery attempts",
    verification: buildVerificationExpectation("ESCALATE_NO_PROGRESS"),
    blockerReason: "Không xác nhận được tác dụng ngoài sau crash recovery",
    nextAction: "Owner xem xét và can thiệp thủ công",
    decisionType: "ESCALATE",
  };
}

function buildOrphanRecoveryPlan(input: {
  action: CtoAllowedAction;
  idempotencyKey: string;
  observation: CtoObservation;
}): CtoLoopPlan {
  const priority = evaluateCtoTaskPriority(input.observation);
  const action = assertCtoAllowedAction(input.action);
  let decisionType: CtoLoopPlan["decisionType"] = "OTHER";
  if (action === "POST_BUILD_APPROVED") decisionType = "APPROVE_BUILD";
  else if (action === "REQUEST_CI_RETRY") decisionType = "RETRY";
  else if (action.startsWith("ESCALATE")) decisionType = "ESCALATE";
  else if (action === "ADVANCE_AFTER_VERIFIED_STATE") decisionType = "COMPLETE";
  else if (action === "WAIT_HUMAN") decisionType = "BLOCK";

  return {
    assignedAgentId: "ATTD_CTO",
    priority,
    selectedAction: action,
    idempotencyKey: input.idempotencyKey,
    escalate: action.startsWith("ESCALATE"),
    humanApprovalRequired: action.startsWith("ESCALATE") || action === "WAIT_HUMAN",
    rationale: `Recovered orphaned pending ${action} without re-execution`,
    verification: buildVerificationExpectation(action),
    blockerReason: input.observation.blockerReason,
    nextAction: null,
    decisionType,
  };
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

function evidenceRecoveryMarker(evidenceRefs: unknown): string | null {
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
        const parsed = JSON.parse(ref.ref) as { recovery?: string };
        if (typeof parsed.recovery === "string") return parsed.recovery;
      } catch {
        continue;
      }
    }
  }
  return null;
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

    const recovery = evidenceRecoveryMarker(row.evidenceRefs);
    if (recovery === "orphaned_pending_recovered") {
      break;
    }
    const action = row.selectedAction;
    const countsAsNoProgress =
      recovery === "orphaned_pending_unconfirmed" ||
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

export async function countOrphanUnconfirmedAttempts(issueNumber: number): Promise<number> {
  const recent = await prisma.agentDecision.findMany({
    where: { agentRun: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { evidenceRefs: true },
  });

  let streak = 0;
  for (const row of recent) {
    if (evidenceRecoveryMarker(row.evidenceRefs) === "orphaned_pending_unconfirmed") {
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

async function releaseCtoPendingActionKey(agentRunId: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          await lockAgentRunRow(tx, agentRunId);
          const run = await tx.agentRun.findUniqueOrThrow({ where: { id: agentRunId } });
          const summary = parseOutputSummary(run.outputSummary);
          if (typeof summary.g3PendingActionKey !== "string") return;
          await tx.agentRun.update({
            where: { id: agentRunId },
            data: {
              outputSummary: outputSummaryWithG3(run.outputSummary, {}) as Prisma.InputJsonValue,
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
}

async function tryClaimCtoActionSlot(input: {
  agentRunId: string;
  idempotencyKey: string;
  selectedAction: CtoAllowedAction;
  ciRetryBaselineCiStatus?: string | null;
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

          const pendingPatch: AgentRunSummaryJson = {
            ...summary,
            g3PendingActionKey: input.idempotencyKey,
            g3PendingAction: input.selectedAction,
          };
          if (input.selectedAction === "REQUEST_CI_RETRY" && input.ciRetryBaselineCiStatus) {
            pendingPatch[G3_CI_RETRY_BASELINE_CI_STATUS_KEY] = input.ciRetryBaselineCiStatus;
          }

          await tx.agentRun.update({
            where: { id: input.agentRunId },
            data: {
              outputSummary: pendingPatch as Prisma.InputJsonValue,
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
  executionRecoveryMarker?: string | null;
  retainPendingActionSlot?: boolean;
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
                    ...(input.executionRecoveryMarker
                      ? { recovery: input.executionRecoveryMarker }
                      : {}),
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
              outputSummary: (input.retainPendingActionSlot
                ? {
                    ...parseOutputSummary(run.outputSummary),
                    g3LastVerified: input.verification,
                    g3PriorityReason: input.plan.priority.reason,
                    g3PriorityTier: input.plan.priority.tier,
                    g3AssignedAgent: input.plan.assignedAgentId,
                  }
                : outputSummaryWithG3(run.outputSummary, {
                    g3LastActionKey: input.plan.idempotencyKey,
                    g3LastAction: input.plan.selectedAction,
                    g3LastVerified: input.verification,
                    g3PriorityReason: input.plan.priority.reason,
                    g3PriorityTier: input.plan.priority.tier,
                    g3AssignedAgent: input.plan.assignedAgentId,
                  })) as Prisma.InputJsonValue,
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

const CTO_PERSIST_MANDATORY_MAX_ATTEMPTS = 8;

async function persistCtoLoopStepMandatory(
  input: PersistCtoStepInput,
  persistStep: CtoLoopPersistStepFn,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CTO_PERSIST_MANDATORY_MAX_ATTEMPTS; attempt += 1) {
    try {
      await persistStep(input);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableTxConflict(error) && attempt >= 3) break;
    }
  }

  if (!input.executionSubmitted) {
    throw lastError ?? new Error("CTO loop persistence retry limit exceeded");
  }

  await persistStep({
    ...input,
    verification: "pending",
    plan: {
      ...input.plan,
      rationale: `${input.plan.rationale} (audit recovery after external submit)`,
    },
  });
}

export type CtoLoopPersistStepFn = typeof persistCtoLoopStep;

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
  const pendingActionKey =
    typeof outputSummary.g3PendingActionKey === "string" ? outputSummary.g3PendingActionKey : null;
  const pendingAction = parsePendingAction(outputSummary);

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

  const persistStep = input.persistStepOverride ?? persistCtoLoopStep;

  let execution: CtoActionExecutionResult;
  let actionSlotClaimed = false;
  let planForPersist = plan;

  const orphanedPendingSlot =
    pendingActionKey &&
    isOrphanedPendingActionSlot({
      pendingActionKey,
      lastActionKey,
      proposedKey: pendingActionKey,
    });

  const resolvedOrphanAction =
    pendingActionKey && orphanedPendingSlot
      ? resolveOrphanPendingAction({ pendingActionKey, summary: outputSummary })
      : null;

  let executionRecoveryMarker: string | null = null;
  let retainPendingActionSlot = false;

  if (orphanedPendingSlot && !resolvedOrphanAction) {
    planForPersist = buildAmbiguousOrphanEscalationPlan({
      pendingActionKey,
      observation: observationBefore,
    });
    execution = {
      action: "WAIT_HUMAN",
      idempotencyKey: planForPersist.idempotencyKey,
      submitted: false,
      skippedReason: "orphaned_pending_ambiguous",
    };
    executionRecoveryMarker = "orphaned_pending_ambiguous";
  } else if (orphanedPendingSlot && resolvedOrphanAction) {
    const unconfirmedStreak = await countOrphanUnconfirmedAttempts(issueNumber);
    if (unconfirmedStreak >= CTO_MAX_ORPHAN_UNCONFIRMED_ATTEMPTS) {
      await releaseCtoPendingActionKey(run.id);
      planForPersist = buildOrphanUnconfirmedEscalationPlan({
        pendingActionKey,
        observation: observationBefore,
        attemptCount: unconfirmedStreak,
      });
      execution = {
        action: "ESCALATE_NO_PROGRESS",
        idempotencyKey: planForPersist.idempotencyKey,
        submitted: true,
        skippedReason: "orphan_unconfirmed_escalated",
      };
    } else {
      const submitted = observationConfirmsPendingExternalAction({
        action: resolvedOrphanAction,
        pendingIdempotencyKey: pendingActionKey,
        observation: observationBefore,
        ciRetryBaselineCiStatus: ciRetryBaselineForOrphanAttribution(outputSummary),
      });
      planForPersist =
        plan.selectedAction === resolvedOrphanAction && plan.idempotencyKey === pendingActionKey
          ? plan
          : buildOrphanRecoveryPlan({
              action: resolvedOrphanAction,
              idempotencyKey: pendingActionKey,
              observation: observationBefore,
            });
      execution = {
        action: resolvedOrphanAction,
        idempotencyKey: pendingActionKey,
        submitted,
        skippedReason: submitted ? "orphaned_pending_recovered" : "orphaned_pending_unconfirmed",
      };
      if (!submitted) {
        executionRecoveryMarker = "orphaned_pending_unconfirmed";
        retainPendingActionSlot = true;
      }
    }
  } else if (plan.selectedAction === "NOOP") {
    execution = {
      action: "NOOP",
      idempotencyKey: plan.idempotencyKey,
      submitted: false,
      skippedReason: plan.rationale,
    };
  } else {
    actionSlotClaimed = await tryClaimCtoActionSlot({
      agentRunId: run.id,
      idempotencyKey: plan.idempotencyKey,
      selectedAction: plan.selectedAction,
      ciRetryBaselineCiStatus:
        plan.selectedAction === "REQUEST_CI_RETRY"
          ? (observationBefore.pullRequest?.verification?.ciStatus ?? "unknown")
          : null,
    });
    if (!actionSlotClaimed) {
      const effectivePendingAction =
        pendingActionKey != null
          ? resolveOrphanPendingAction({ pendingActionKey, summary: outputSummary })
          : pendingAction;
      const orphanFromClaim =
        isOrphanedPendingActionSlot({
          pendingActionKey,
          lastActionKey,
          proposedKey: plan.idempotencyKey,
        }) && effectivePendingAction === plan.selectedAction;
      if (orphanFromClaim) {
        const submitted = observationConfirmsPendingExternalAction({
          action: plan.selectedAction,
          pendingIdempotencyKey: plan.idempotencyKey,
          observation: observationBefore,
          ciRetryBaselineCiStatus: ciRetryBaselineForOrphanAttribution(outputSummary),
        });
        planForPersist = plan;
        execution = {
          action: plan.selectedAction,
          idempotencyKey: plan.idempotencyKey,
          submitted,
          skippedReason: submitted ? "orphaned_pending_recovered" : "orphaned_pending_unconfirmed",
        };
        if (!submitted) {
          executionRecoveryMarker = "orphaned_pending_unconfirmed";
          retainPendingActionSlot = true;
        }
      } else {
        execution = {
          action: plan.selectedAction,
          idempotencyKey: plan.idempotencyKey,
          submitted: false,
          skippedReason: "concurrent_or_duplicate_action",
        };
      }
    } else {
      try {
        execution = await executeCtoAllowedAction({
          plan,
          observation: observationBefore,
          deps: executorDeps,
        });
      } catch (error) {
        await releaseCtoPendingActionKey(run.id);
        throw error;
      }
    }
  }

  const afterTask = input.taskAfterExecution ?? input.task;
  const observationAfter = buildCtoObservationFromTask(afterTask, input.observationOptions);

  const orphanRecovered = execution.skippedReason === "orphaned_pending_recovered";
  const orphanAmbiguous = execution.skippedReason === "orphaned_pending_ambiguous";
  const orphanEscalated = execution.skippedReason === "orphan_unconfirmed_escalated";

  let verification = evaluateCtoVerification({
    action: planForPersist.selectedAction,
    expectation: planForPersist.verification,
    before: observationBefore,
    after: observationAfter,
    executionSubmitted: execution.submitted,
  });

  if (orphanRecovered && execution.submitted) {
    verification = "verified";
  }

  const persistInput: PersistCtoStepInput = {
    agentRunId: run.id,
    taskRunId,
    issueNumber,
    task: input.task,
    plan: planForPersist,
    verification,
    executionSubmitted: execution.submitted,
    executionRecoveryMarker,
    retainPendingActionSlot,
    refreshedRun,
  };

  const shouldPersistDecision =
    planForPersist.selectedAction !== "NOOP" &&
    (orphanRecovered ||
      orphanAmbiguous ||
      orphanEscalated ||
      execution.skippedReason !== "concurrent_or_duplicate_action");
  const shouldPersistDuplicateNoop =
    plan.selectedAction === "NOOP" && (input.duplicateSourceEvent ?? false);

  if (shouldPersistDecision || shouldPersistDuplicateNoop) {
    try {
      if (
        execution.submitted &&
        isCtoExternalWriteAction(planForPersist.selectedAction)
      ) {
        await persistCtoLoopStepMandatory(persistInput, persistStep);
      } else {
        await persistStep(persistInput);
      }
      if (orphanAmbiguous) {
        await releaseCtoPendingActionKey(run.id).catch(() => undefined);
      }
    } catch (error) {
      if (actionSlotClaimed) {
        await releaseCtoPendingActionKey(run.id).catch(() => undefined);
      }
      throw error;
    }
  }

  return {
    agentRunId: run.id,
    plan: planForPersist,
    execution,
    verification,
    observationBefore,
    observationAfter,
    skipped:
      plan.selectedAction === "NOOP" ||
      execution.skippedReason === "concurrent_or_duplicate_action" ||
      execution.skippedReason === "orphaned_pending_unconfirmed" ||
      execution.skippedReason === "orphaned_pending_ambiguous",
  };
}

/** @internal Used by integration tests to delegate to the real persistence implementation. */
export { persistCtoLoopStep as persistCtoLoopStepForIntegrationTests };
