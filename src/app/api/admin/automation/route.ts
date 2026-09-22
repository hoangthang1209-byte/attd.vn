import { NextRequest, NextResponse } from "next/server";
import { requireAutomationDashboardPermission } from "@/features/automation/automation-api-auth";
import { parseAutomationDashboardView } from "@/features/automation/automation-dashboard.views";
import type { AutomationDashboardView } from "@/features/automation/automation-task.types";

type AutomationDashboardLoader = {
  getAutomationDashboard: (view?: AutomationDashboardView) => Promise<unknown>;
};

async function loadAutomationDashboardService(): Promise<AutomationDashboardLoader> {
  return import("@/features/automation/automation-task.service");
}

export async function handleAutomationDashboardGet(
  request: NextRequest,
  loadDashboard: () => Promise<AutomationDashboardLoader> = loadAutomationDashboardService,
) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  try {
    const { getAutomationDashboard } = await loadDashboard();
    const view = parseAutomationDashboardView(request.nextUrl.searchParams.get("view"));
    const dashboard = await getAutomationDashboard(view);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[GET /api/admin/automation]", error);
    return NextResponse.json(
      { message: "Không thể tải dashboard automation" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAutomationDashboardGet(request);
}
