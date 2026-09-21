import type {
  AutomationDashboardView,
  AutomationTask,
} from "@/features/automation/automation-task.types";

export type { AutomationDashboardView };

export const AUTOMATION_DASHBOARD_VIEW_OPTIONS: Array<{
  value: AutomationDashboardView;
  label: string;
}> = [
  { value: "active", label: "Đang thực hiện" },
  { value: "all", label: "Tất cả task" },
  { value: "completed", label: "Đã hoàn tất" },
];

const EXCLUDED_FROM_ACTIVE_STATUSES = new Set<AutomationTask["status"]>(["merged", "superseded"]);

const COMPLETED_TERMINAL_STATUSES = new Set<AutomationTask["status"]>([
  "merged",
  "failed",
  "superseded",
]);

export function isActiveAutomationTask(task: AutomationTask): boolean {
  if (!task.isOpen) return false;
  return !EXCLUDED_FROM_ACTIVE_STATUSES.has(task.status);
}

export function isCompletedAutomationTask(task: AutomationTask): boolean {
  if (task.isOpen) return false;
  return COMPLETED_TERMINAL_STATUSES.has(task.status);
}

export function matchesAutomationView(
  task: AutomationTask,
  view: AutomationDashboardView,
): boolean {
  switch (view) {
    case "active":
      return isActiveAutomationTask(task);
    case "all":
      return true;
    case "completed":
      return isCompletedAutomationTask(task);
    default:
      return true;
  }
}

/** Hide superseded rows in Completed until the user explicitly filters by that status. */
export function shouldShowTaskInCompletedDefaultList(
  task: AutomationTask,
  statusFilter: AutomationTask["status"] | "all",
): boolean {
  if (statusFilter === "superseded") return task.status === "superseded";
  if (statusFilter !== "all") return true;
  return task.status !== "superseded";
}

export function defaultOpenFilterForView(view: AutomationDashboardView): "all" | "open" | "closed" {
  switch (view) {
    case "active":
      return "open";
    case "completed":
      return "closed";
    default:
      return "all";
  }
}

export function parseAutomationDashboardView(
  raw: string | null | undefined,
): AutomationDashboardView {
  if (raw === "all" || raw === "completed") return raw;
  return "active";
}
