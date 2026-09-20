import { NextRequest, NextResponse } from "next/server";
import { getAutomationDashboard } from "@/features/automation/automation-task.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request,
  });
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
