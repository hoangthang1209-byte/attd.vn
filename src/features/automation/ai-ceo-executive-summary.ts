import type { AutomationTask } from "@/features/automation/automation-task.types";

/** Read-only CEO summary over the existing Agent OS task objects. */
export type AiCeoExecutiveSummary = {
  total: number;
  today: number;
  inProgress: number;
  needsApproval: number;
  blocked: number;
  completed: number;
  unknown: number;
  incompleteSource: boolean;
};

const ACTIVE = new Set(["approved", "building", "pr_open", "ci_review", "needs_fix", "queued", "ready_to_merge"]);
const BLOCKED = new Set(["failed", "blocked", "stalled"]);
// Superseded means replaced, not successfully completed.
const COMPLETED = new Set(["merged"]);

/**
 * Derive a truthful, non-mutating CEO overview from the existing Agent OS read model.
 * A GitHub issue is not necessarily a commercial RFQ; this is an engineering-task
 * overview until business-domain agent events are integrated.
 */
export function deriveAiCeoExecutiveSummary(
  tasks: readonly Pick<AutomationTask, "status" | "latestUpdateAt" | "isOpen" | "hasBuildApproved">[],
  options: { date: string; incompleteSource?: boolean },
): AiCeoExecutiveSummary {
  const summary: AiCeoExecutiveSummary = {
    total: tasks.length,
    today: 0,
    inProgress: 0,
    needsApproval: 0,
    blocked: 0,
    completed: 0,
    unknown: 0,
    incompleteSource: options.incompleteSource ?? false,
  };
  for (const task of tasks) {
    if (task.latestUpdateAt.slice(0, 10) === options.date) summary.today++;
    if (BLOCKED.has(task.status)) {
      summary.blocked++;
    } else if (COMPLETED.has(task.status)) {
      summary.completed++;
    } else if (task.isOpen && task.status === "backlog" && !task.hasBuildApproved) {
      summary.needsApproval++;
    } else if (ACTIVE.has(task.status)) {
      summary.inProgress++;
    } else {
      summary.unknown++;
    }
  }
  return summary;
}
