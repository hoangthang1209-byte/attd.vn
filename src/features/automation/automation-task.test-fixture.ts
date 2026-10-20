import { resolveAutomationFactoryLoopSnapshot } from "@/features/automation/automation-factory-loop";
import type { AutomationTask } from "@/features/automation/automation-task.types";

const DEFAULT_AGENT_ASSIGNMENT: AutomationTask["agentAssignment"] = {
  agentId: "ATTD_CTO",
  agentDisplayName: "ATTD CTO",
  routingReason: "default_cto",
  requiresHumanEscalation: false,
  agentOverrideAreaMismatch: false,
};

/** Shared defaults for AutomationTask test fixtures (Phase G1 agent fields). */
export function withAutomationTaskAgentDefaults(
  task: Omit<
    AutomationTask,
    | "agentAssignment"
    | "taskPriority"
    | "parentTaskIssueNumber"
    | "metadataTaskArea"
    | "factoryLoop"
  > &
    Partial<
      Pick<
        AutomationTask,
        | "agentAssignment"
        | "taskPriority"
        | "parentTaskIssueNumber"
        | "metadataTaskArea"
        | "factoryLoop"
      >
    >,
): AutomationTask {
  const base = {
    metadataTaskArea: null,
    taskPriority: "unknown",
    parentTaskIssueNumber: null,
    agentAssignment: DEFAULT_AGENT_ASSIGNMENT,
    ...task,
  } as AutomationTask;

  return {
    ...base,
    factoryLoop:
      task.factoryLoop ??
      resolveAutomationFactoryLoopSnapshot({
        status: base.status,
        comments: base.recentStatusComments,
      }),
  };
}
