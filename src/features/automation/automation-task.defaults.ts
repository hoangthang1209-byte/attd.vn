import { createInitialCiStatus } from "@/features/automation/automation-ci";
import { createInitialProductionStatus } from "@/features/automation/automation-production";
import { createInitialReviewerStatus } from "@/features/automation/automation-reviewer";
import type { AutomationTask } from "@/features/automation/automation-task.types";

export function createDefaultLifecycleFields(checkedAt: string): Pick<
  AutomationTask,
  "productionStatus" | "ciStatus" | "reviewerStatus" | "nextAction" | "relationship"
> {
  return {
    productionStatus: createInitialProductionStatus(checkedAt),
    ciStatus: createInitialCiStatus(),
    reviewerStatus: createInitialReviewerStatus(),
    nextAction: { action: "unknown", label: "Không xác định" },
    relationship: {
      supersedesIssueNumbers: [],
      supersededByIssueNumber: null,
      repairForIssueNumber: null,
      isSupersededInActiveView: false,
      groupKey: null,
    },
  };
}
