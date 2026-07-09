import { NextRequest, NextResponse } from "next/server";
import { getExecutiveDashboard } from "@/features/business-intelligence/dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  try {
    const payload = await getExecutiveDashboard();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/bi/dashboard]", error);
    return NextResponse.json(
      { message: "Không thể tải Executive Dashboard" },
      { status: 500 },
    );
  }
}
