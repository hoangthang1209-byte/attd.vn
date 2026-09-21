import { NextRequest, NextResponse } from "next/server";
import { requireAutomationDashboardPermission } from "@/features/automation/automation-api-auth";

export async function GET(request: NextRequest) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  try {
    const { getAutomationDashboard } = await import("@/features/automation/automation-task.service");
    const dashboard = await getAutomationDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[GET /api/admin/automation]", error);
    return NextResponse.json(
      { message: "Không thể tải dashboard automation" },
      { status: 500 },
    );
  }
}
