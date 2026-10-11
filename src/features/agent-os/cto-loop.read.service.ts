import "server-only";

import type { CtoLoopVisibility } from "@/features/agent-os/cto-loop.types";
import type { AgentTaskPriority } from "@/features/agent-os/agent.types";
import { prisma } from "@/lib/prisma";

function parseTier(value: unknown): AgentTaskPriority | null {
  if (value === "P0" || value === "P1" || value === "P2" || value === "P3" || value === "unknown") {
    return value;
  }
  return null;
}

function parseVerified(value: unknown): CtoLoopVisibility["lastVerifiedResult"] {
  if (value === "verified" || value === "pending" || value === "failed" || value === "skipped") {
    return value;
  }
  return null;
}

export async function getCtoLoopVisibilityForIssue(
  issueNumber: number,
): Promise<CtoLoopVisibility | null> {
  const run = await prisma.agentRun.findFirst({
    where: { githubIssueNumber: issueNumber, agentId: "ATTD_CTO" },
    orderBy: [{ attemptNumber: "desc" }, { updatedAt: "desc" }],
    include: {
      decisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!run) return null;

  const summary =
    run.outputSummary && typeof run.outputSummary === "object"
      ? (run.outputSummary as Record<string, unknown>)
      : {};

  const lastDecision = run.decisions[0] ?? null;

  const assignedFromSummary =
    typeof summary.g3AssignedAgent === "string" ? summary.g3AssignedAgent : null;

  return {
    issueNumber,
    assignedAgentId: assignedFromSummary ?? run.agentId,
    selectedAction:
      typeof summary.g3LastAction === "string"
        ? summary.g3LastAction
        : (lastDecision?.selectedAction ?? null),
    priorityReason:
      typeof summary.g3PriorityReason === "string" ? summary.g3PriorityReason : null,
    priorityTier: parseTier(summary.g3PriorityTier),
    lastVerifiedResult: parseVerified(summary.g3LastVerified),
    blockerReason: run.blockerReason,
    nextAction: run.nextAction,
    humanApprovalRequired: run.humanApprovalRequired,
    humanApprovalReceivedAt: run.humanApprovalReceivedAt?.toISOString() ?? null,
    attemptNumber: run.attemptNumber,
    correlationId: run.correlationId,
    lastDecisionAt: lastDecision?.createdAt.toISOString() ?? null,
    runStatus: run.status,
    updatedAt: run.updatedAt.toISOString(),
  };
}
