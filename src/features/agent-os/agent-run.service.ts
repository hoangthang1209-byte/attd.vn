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
  const existingEvent = await prisma.agentEvent.findUnique({
    where: {
      agentRunId_idempotencyKey: {
        agentRunId: input.agentRunId,
        idempotencyKey: input.inbound.idempotencyKey,
      },
    },
  });
  if (existingEvent) {
    return {
      applied: false,
      agentRunId: existingEvent.agentRunId,
      eventId: existingEvent.id,
      duplicate: true,
    };
  }

  const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: input.agentRunId } });
  if (isTerminalAgentRunStatus(run.status)) {
    try {
      const event = await prisma.agentEvent.create({
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existing = await prisma.agentEvent.findUniqueOrThrow({
          where: {
            agentRunId_idempotencyKey: {
              agentRunId: run.id,
              idempotencyKey: input.inbound.idempotencyKey,
            },
          },
        });
        return {
          applied: false,
          agentRunId: run.id,
          eventId: existing.id,
          duplicate: true,
          skippedDueToTerminal: true,
        };
      }
      throw error;
    }
  }

  const nextFields = applyInboundEventToRunFields(runToMutableFields(run), input.inbound);

  let event;
  try {
    event = await prisma.$transaction(async (tx) => {
    const created = await tx.agentEvent.create({
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

      return created;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await prisma.agentEvent.findUniqueOrThrow({
        where: {
          agentRunId_idempotencyKey: {
            agentRunId: run.id,
            idempotencyKey: input.inbound.idempotencyKey,
          },
        },
      });
      return {
        applied: false,
        agentRunId: run.id,
        eventId: existing.id,
        duplicate: true,
      };
    }
    throw error;
  }

  return { applied: true, agentRunId: run.id, eventId: event.id, duplicate: false };
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

  const existing = await prisma.agentRun.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const correlationId = failed.correlationId ?? failed.id;
  const nextAttempt = failed.attemptNumber + 1;

  return createAgentRun({
    agentId: failed.agentId,
    triggerSource: input.triggerSource,
    githubIssueNumber: failed.githubIssueNumber,
    correlationId,
    parentRunId: failed.id,
    idempotencyKey: input.idempotencyKey,
    attemptNumber: nextAttempt,
    inputSummary: (failed.inputSummary as AgentRunSummaryJson | null) ?? undefined,
    humanApprovalRequired: failed.humanApprovalRequired,
  });
}

/** Seed helper for G2 admin visibility when no run exists yet (read-only sync stub). */
export async function ensurePlaceholderRunForIssue(input: {
  agentId: string;
  githubIssueNumber: number;
  correlationId?: string;
}) {
  const correlationId = input.correlationId ?? `github-issue:${input.githubIssueNumber}`;
  const idempotencyKey = `ensure:${correlationId}`;

  const existing = await prisma.agentRun.findFirst({
    where: { githubIssueNumber: input.githubIssueNumber },
    orderBy: { attemptNumber: "desc" },
  });
  if (existing) return existing;

  return createAgentRun({
    agentId: input.agentId,
    triggerSource: "GITHUB_ISSUE_STATUS",
    githubIssueNumber: input.githubIssueNumber,
    correlationId,
    idempotencyKey,
    inputSummary: { kind: "github_issue_link", issueNumber: input.githubIssueNumber },
  });
}

export { initialRunFields, applyInboundEventToRunFields };
