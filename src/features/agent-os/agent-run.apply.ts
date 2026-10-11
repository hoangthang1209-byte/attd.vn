import type { InboundAgentEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  assertAgentRunTransition,
  isTerminalAgentRunStatus,
  nextStatusAfterEvent,
} from "@/features/agent-os/agent-run.state-machine";
import type { AgentRunStatus } from "@/features/agent-os/agent-run.types";

export type AgentRunMutableFields = {
  status: AgentRunStatus;
  blockerReason: string | null;
  nextAction: string | null;
  humanApprovalRequired: boolean;
  humanApprovalReceivedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export function initialRunFields(): AgentRunMutableFields {
  return {
    status: "QUEUED",
    blockerReason: null,
    nextAction: null,
    humanApprovalRequired: false,
    humanApprovalReceivedAt: null,
    startedAt: null,
    finishedAt: null,
  };
}

export function applyInboundEventToRunFields(
  fields: AgentRunMutableFields,
  inbound: InboundAgentEvent,
  now: Date = new Date(),
): AgentRunMutableFields {
  const next: AgentRunMutableFields = { ...fields };

  if (next.status === "QUEUED" && inbound.suggestedStatus === "RUNNING") {
    assertAgentRunTransition("QUEUED", "RUNNING");
    next.status = "RUNNING";
    next.startedAt = next.startedAt ?? now;
  }

  if (inbound.suggestedStatus) {
    const resolved = nextStatusAfterEvent({
      current: next.status,
      suggested: inbound.suggestedStatus,
    });
    if (resolved !== next.status) {
      assertAgentRunTransition(next.status, resolved);
      next.status = resolved;
      if (resolved === "RUNNING" && !next.startedAt) next.startedAt = now;
      if (isTerminalAgentRunStatus(resolved)) next.finishedAt = now;
    }
  }

  const recovered = next.status === "RUNNING" || next.status === "SUCCEEDED";
  if (recovered && inbound.blockerReason === undefined) {
    next.blockerReason = null;
  }
  if (recovered && inbound.nextAction === undefined) {
    next.nextAction = null;
  }

  if (inbound.blockerReason !== undefined) {
    next.blockerReason = inbound.blockerReason;
  }
  if (inbound.nextAction !== undefined) {
    next.nextAction = inbound.nextAction;
  }
  if (typeof inbound.humanApprovalRequired === "boolean") {
    next.humanApprovalRequired = inbound.humanApprovalRequired;
  }
  if (inbound.humanApprovalReceived) {
    next.humanApprovalReceivedAt = now;
    next.humanApprovalRequired = false;
  }

  return next;
}
