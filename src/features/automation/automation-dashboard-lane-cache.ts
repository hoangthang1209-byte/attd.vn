import type { AutomationDashboardView } from "@/features/automation/automation-dashboard.views";
import type { AutomationDashboardResponse } from "@/features/automation/automation-task.types";

/** Non-active tabs need a dedicated active-view payload for the 7-lane board. */
export function needsActiveLaneSeed(
  view: AutomationDashboardView,
  activeLaneData: AutomationDashboardResponse | null,
): boolean {
  return view !== "active" && activeLaneData === null;
}

/** Manual refresh must keep the lane board authoritative on every tab. */
export function resolveManualRefreshTargets(
  view: AutomationDashboardView,
): AutomationDashboardView[] {
  if (view === "active") return ["active"];
  return [view, "active"];
}
