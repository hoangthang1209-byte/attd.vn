import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { getAutomationDashboard } from "@/features/automation/automation-task.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

async function requireAutomationDashboardPermission(request: NextRequest) {
  const session = getAdminSessionFromRequest(request);
  if (!session.authenticated) {
    return { ok: false as const, response: unauthorizedResponse() };
  }
  if (!can(session, "dashboard.view")) {
    return { ok: false as const, response: forbiddenResponse() };
  }
  return { ok: true as const, session };
}

export async function GET(request: NextRequest) {
  const permission = await requireAutomationDashboardPermission(request);
  if (!permission.ok) return permission.response;

  try {
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
