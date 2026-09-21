import type { AutomationDashboardView } from "@/features/automation/automation-task.types";

export function parseAutomationDashboardView(
  raw: string | null | undefined,
): AutomationDashboardView {
  if (raw === "all" || raw === "completed") return raw;
  return "active";
}
