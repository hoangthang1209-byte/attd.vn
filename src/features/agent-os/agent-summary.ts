import { listActiveAgents } from "@/features/agent-os/agent-registry";
import type { AgentId, AgentSummaryCard, AgentWorkloadCounts } from "@/features/agent-os/agent.types";
import type { AutomationTask, NormalizedTaskStatus } from "@/features/automation/automation-task.types";

const BLOCKED_STATUSES = new Set<NormalizedTaskStatus>(["blocked", "stalled", "failed"]);
const QUEUED_STATUSES = new Set<NormalizedTaskStatus>(["queued"]);
const ACTIVE_PIPELINE_STATUSES = new Set<NormalizedTaskStatus>([
  "backlog",
  "approved",
  "building",
  "pr_open",
  "ci_review",
  "needs_fix",
  "ready_to_merge",
  "unknown",
]);

function emptyCounts(): AgentWorkloadCounts {
  return { active: 0, blocked: 0, queued: 0 };
}

function classifyTaskWorkload(status: NormalizedTaskStatus, isOpen: boolean): keyof AgentWorkloadCounts | null {
  if (!isOpen) return null;
  if (QUEUED_STATUSES.has(status)) return "queued";
  if (BLOCKED_STATUSES.has(status)) return "blocked";
  if (ACTIVE_PIPELINE_STATUSES.has(status)) return "active";
  return null;
}

export type BuildAgentSummaryOptions = {
  /** When true, open-task counts may omit issues beyond the GitHub fetch cap. */
  isPartial?: boolean;
};

export function buildAgentSummaryCards(
  tasks: readonly AutomationTask[],
  options: BuildAgentSummaryOptions = {},
): AgentSummaryCard[] {
  const isPartial = options.isPartial ?? false;
  const countsByAgent = new Map<AgentId, AgentWorkloadCounts>();
  for (const agent of listActiveAgents()) {
    countsByAgent.set(agent.id, emptyCounts());
  }

  for (const task of tasks) {
    const bucket = classifyTaskWorkload(task.status, task.isOpen);
    if (!bucket) continue;
    const agentId = task.agentAssignment.agentId;
    const current = countsByAgent.get(agentId) ?? emptyCounts();
    current[bucket] += 1;
    countsByAgent.set(agentId, current);
  }

  return listActiveAgents().map((agent) => ({
    agentId: agent.id,
    displayName: agent.displayName,
    active: agent.active,
    counts: countsByAgent.get(agent.id) ?? emptyCounts(),
    isPartial,
  }));
}
