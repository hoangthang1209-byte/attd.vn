import type { AgentRunStatus } from "@/features/agent-os/agent-run.types";

export class AgentRunTransitionError extends Error {
  readonly from: AgentRunStatus;
  readonly to: AgentRunStatus;

  constructor(from: AgentRunStatus, to: AgentRunStatus) {
    super(`Invalid agent run transition: ${from} → ${to}`);
    this.name = "AgentRunTransitionError";
    this.from = from;
    this.to = to;
  }
}

const TERMINAL_STATUSES: ReadonlySet<AgentRunStatus> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

const ALLOWED_TRANSITIONS: Readonly<Record<AgentRunStatus, readonly AgentRunStatus[]>> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING_EXTERNAL", "WAITING_HUMAN", "SUCCEEDED", "FAILED", "CANCELLED"],
  WAITING_EXTERNAL: ["RUNNING", "FAILED", "CANCELLED"],
  WAITING_HUMAN: ["RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export function isTerminalAgentRunStatus(status: AgentRunStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canTransitionAgentRunStatus(from: AgentRunStatus, to: AgentRunStatus): boolean {
  if (from === to) return true;
  if (isTerminalAgentRunStatus(from)) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertAgentRunTransition(from: AgentRunStatus, to: AgentRunStatus): void {
  if (!canTransitionAgentRunStatus(from, to)) {
    throw new AgentRunTransitionError(from, to);
  }
}

export function nextStatusAfterEvent(input: {
  current: AgentRunStatus;
  suggested: AgentRunStatus;
}): AgentRunStatus {
  if (input.current === input.suggested) return input.current;
  if (canTransitionAgentRunStatus(input.current, input.suggested)) {
    return input.suggested;
  }
  return input.current;
}
