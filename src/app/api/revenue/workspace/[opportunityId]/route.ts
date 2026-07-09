import { NextRequest, NextResponse } from "next/server";
import { getRevenueWorkspace } from "@/features/revenue/workspace/revenue-workspace.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ opportunityId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "read",
    request,
  });
  if (!permission.ok) return permission.response;

  const { opportunityId } = await context.params;

  try {
    const payload = await getRevenueWorkspace(opportunityId);
    if (!payload) {
      return NextResponse.json({ message: "Cơ hội không tồn tại" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[GET /api/revenue/workspace/[opportunityId]]", error);
    return NextResponse.json(
      { message: "Không thể tải Revenue Workspace" },
      { status: 500 },
    );
  }
}
