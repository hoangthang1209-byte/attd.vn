import type { AutomationTask } from "@/features/automation/automation-task.types";

export type AutomationStatusFilter = AutomationTask["status"] | "all";
export type AutomationRiskFilter = AutomationTask["risk"] | "all";
export type AutomationOpenFilter = "all" | "open" | "closed";
export type AutomationTaskAreaFilter = "all" | string;

export function matchesAutomationTaskFilters(
  task: AutomationTask,
  filters: {
    statusFilter: AutomationStatusFilter;
    riskFilter: AutomationRiskFilter;
    openFilter: AutomationOpenFilter;
    taskAreaFilter: AutomationTaskAreaFilter;
    searchQuery: string;
  },
): boolean {
  const { statusFilter, riskFilter, openFilter, taskAreaFilter, searchQuery } = filters;

  if (statusFilter !== "all" && task.status !== statusFilter) return false;
  if (riskFilter !== "all" && task.risk !== riskFilter) return false;
  if (openFilter === "open" && !task.isOpen) return false;
  if (openFilter === "closed" && task.isOpen) return false;
  if (taskAreaFilter !== "all" && task.taskArea !== taskAreaFilter) return false;

  const query = searchQuery.trim().toLowerCase();
  if (!query) return true;

  return (
    task.title.toLowerCase().includes(query) ||
    task.taskArea.toLowerCase().includes(query) ||
    String(task.issueNumber).includes(query) ||
    (task.blockerReason?.toLowerCase().includes(query) ?? false)
  );
}

export function collectTaskAreaFilterOptions(tasks: AutomationTask[]): Array<{
  value: string;
  label: string;
}> {
  const areas = new Set(tasks.map((task) => task.taskArea));
  return Array.from(areas)
    .sort((left, right) => left.localeCompare(right, "vi"))
    .map((area) => ({ value: area, label: area }));
}
