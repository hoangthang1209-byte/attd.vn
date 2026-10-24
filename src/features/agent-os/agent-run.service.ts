import "server-only";

import { Prisma } from "@prisma/client";
import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  applyInboundEventToRunFields,
  initialRunFields,
  type AgentRunMutableFields,
} from "@/features/agent-os/agent-run.apply";
import { isTerminalAgentRunStatus } from "@/features/agent-os/agent-run.state-machine";
import type {
  AgentDecisionEvidenceRef,
  AgentDecisionType,
  AgentEventSource,
  AgentOperationalRiskLevel,
  AgentRunStatus,
  AgentRunSummaryJson,
} from "@/features/agent-os/agent-run.types";
import { prisma } from "@/lib/prisma";

export type CreateAgentRunInput = {
  agentId: string;
  triggerSource: AgentEventSource;
  githubIssueNumber?: number | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  inputSummary?: AgentRunSummaryJson | null;
  humanApprovalRequired?: boolean;
  attemptNumber?: number;
  parentRunId?: string | null;
};

export type RecordAgentDecisionInput = {
  agentRunId: string;
  decisionType: AgentDecisionType;
  rationaleSummary: string;
  riskLevel?: AgentOperationalRiskLevel;
  humanApprovalRequired?: boolean;
  humanApprovalReceivedAt?: Date | null;
  selectedAction?: string | null;
  evidenceRefs?: AgentDecisionEvidenceRef[] | null;
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isWriteConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function toJsonValue(value: AgentRunSummaryJson | null | undefined): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

function fieldsToUpdateData(fields: AgentRunMutableFields): Prisma.AgentRunUpdateInput {
  return {
    status: fields.status,
    blockerReason: fields.blockerReason,
    nextAction: fields.nextAction,
    humanApprovalRequired: fields.humanApprovalRequired,
    humanApprovalReceivedAt: fields.humanApprovalReceivedAt,
    startedAt: fields.startedAt,
    finishedAt: fields.finishedAt,
  };
}

function runToMutableFields(run: {
  status: AgentRunStatus;
  blockerReason: string | null;
  nextAction: string | null;
  humanApprovalRequired: boolean;
  humanApprovalReceivedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}): AgentRunMutableFields {
  return {
    status: run.status,
    blockerReason: run.blockerReason,
    nextAction: run.nextAction,
    humanApprovalRequired: run.humanApprovalRequired,
    humanApprovalReceivedAt: run.humanApprovalReceivedAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}

export async function createAgentRun(input: CreateAgentRunInput) {
  if (input.idempotencyKey) {
    const existing = await prisma.agentRun.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;
  }

  try {
    return await prisma.agentRun.create({
      data: {
        agentId: input.agentId,
        triggerSource: input.triggerSource,
        githubIssueNumber: input.githubIssueNumber ?? null,
        correlationId: input.correlationId ?? null,
        parentRunId: input.parentRunId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        inputSummary: toJsonValue(input.inputSummary),
        humanApprovalRequired: input.humanApprovalRequired ?? false,
        attemptNumber: input.attemptNumber ?? 1,
        status: "QUEUED",
      },
    });
  } catch (error) {
    if (input.idempotencyKey && isUniqueViolation(error)) {
      const existing = await prisma.agentRun.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function createTaskRunForAgentRun(input: {
  agentRunId: string;
  githubIssueNumber?: number | null;
  taskArea?: string | null;
  attemptNumber?: number;
  inputSummary?: AgentRunSummaryJson | null;
}) {
  return prisma.taskRun.create({
    data: {
      agentRunId: input.agentRunId,
      githubIssueNumber: input.githubIssueNumber ?? null,
      taskArea: input.taskArea ?? null,
      attemptNumber: input.attemptNumber ?? 1,
      inputSummary: toJsonValue(input.inputSummary),
      status: "QUEUED",
    },
  });
}

export type ApplyInboundEventResult = {
  applied: boolean;
  agentRunId: string;
  eventId: string;
  duplicate: boolean;
  /** Event stored but run state left unchanged because run already terminal. */
  skippedDueToTerminal?: boolean;
};

export async function applyInboundAgentEvent(input: {
  agentRunId: string;
  taskRunId?: string | null;
  inbound: InboundAgentEvent;
}): Promise<ApplyInboundEventResult> {
  const where = {
    agentRunId_idempotencyKey: {
      agentRunId: input.agentRunId,
      idempotencyKey: input.inbound.idempotencyKey,
    },
  } as const;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingEvent = await tx.agentEvent.findUnique({ where });
          if (existingEvent) {
            return {
              applied: false,
              agentRunId: existingEvent.agentRunId,
              eventId: existingEvent.id,
              duplicate: true,
            };
          }

          const run = await tx.agentRun.findUniqueOrThrow({
            where: { id: input.agentRunId },
          });

          if (isTerminalAgentRunStatus(run.status)) {
            const event = await tx.agentEvent.create({
              data: {
                agentRunId: run.id,
                taskRunId: input.taskRunId ?? null,
                source: input.inbound.source,
                idempotencyKey: input.inbound.idempotencyKey,
                payloadSummary: input.inbound.payloadSummary as Prisma.InputJsonValue,
              },
            });
            return {
              applied: false,
              agentRunId: run.id,
              eventId: event.id,
              duplicate: false,
              skippedDueToTerminal: true,
            };
          }

          const nextFields = applyInboundEventToRunFields(
            runToMutableFields(run),
            input.inbound,
          );

          const event = await tx.agentEvent.create({
            data: {
              agentRunId: run.id,
              taskRunId: input.taskRunId ?? null,
              source: input.inbound.source,
              idempotencyKey: input.inbound.idempotencyKey,
              payloadSummary: input.inbound.payloadSummary as Prisma.InputJsonValue,
            },
          });

          await tx.agentRun.update({
            where: { id: run.id },
            data: fieldsToUpdateData(nextFields),
          });

          if (input.taskRunId) {
            await tx.taskRun.update({
              where: { id: input.taskRunId },
              data: {
                status: nextFields.status,
                blockerReason: nextFields.blockerReason,
                nextAction: nextFields.nextAction,
                startedAt: nextFields.startedAt,
                finishedAt: nextFields.finishedAt,
              },
            });
          }

          return {
            applied: true,
            agentRunId: run.id,
            eventId: event.id,
            duplicate: false,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await prisma.agentEvent.findUnique({ where });
        if (existing) {
          return {
            applied: false,
            agentRunId: existing.agentRunId,
            eventId: existing.id,
            duplicate: true,
          };
        }
      }

      if (isWriteConflict(error) && attempt < 3) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Agent event transaction retry limit exceeded");
}

export async function recordAgentDecision(input: RecordAgentDecisionInput) {
  return prisma.agentDecision.create({
    data: {
      agentRunId: input.agentRunId,
      decisionType: input.decisionType,
      rationaleSummary: input.rationaleSummary,
      riskLevel: input.riskLevel ?? "UNKNOWN",
      humanApprovalRequired: input.humanApprovalRequired ?? false,
      humanApprovalReceivedAt: input.humanApprovalReceivedAt ?? null,
      selectedAction: input.selectedAction ?? null,
      evidenceRefs: input.evidenceRefs
        ? (input.evidenceRefs as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

export async function retryAgentRun(input: {
  failedRunId: string;
  triggerSource: AgentEventSource;
  idempotencyKey: string;
}) {
  const failed = await prisma.agentRun.findUniqueOrThrow({ where: { id: input.failedRunId } });
  if (!isTerminalAgentRunStatus(failed.status) || failed.status === "SUCCEEDED") {
    throw new Error("Retry requires a failed or cancelled terminal run");
  }

  return createFollowUpAgentRunAttempt({
    previousRunId: failed.id,
    triggerSource: input.triggerSource,
    idempotencyKey: input.idempotencyKey,
  });
}

/** New AgentRun row after any terminal attempt (including SUCCEEDED resume). */
export async function createFollowUpAgentRunAttempt(input: {
  previousRunId: string;
  triggerSource: AgentEventSource;
  idempotencyKey: string;
}) {
  const previous = await prisma.agentRun.findUniqueOrThrow({ where: { id: input.previousRunId } });
  if (!isTerminalAgentRunStatus(previous.status)) {
    throw new Error("Follow-up attempt requires a terminal run");
  }

  const existing = await prisma.agentRun.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const correlationId = previous.correlationId ?? previous.id;
  const nextAttempt = previous.attemptNumber + 1;

  return createAgentRun({
    agentId: previous.agentId,
    triggerSource: input.triggerSource,
    githubIssueNumber: previous.githubIssueNumber,
    correlationId,
    parentRunId: previous.id,
    idempotencyKey: input.idempotencyKey,
    attemptNumber: nextAttempt,
    inputSummary: (previous.inputSummary as AgentRunSummaryJson | null) ?? undefined,
    humanApprovalRequired: previous.humanApprovalRequired,
  });
}

export { initialRunFields, applyInboundEventToRunFields };
