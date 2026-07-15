import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { calculateGraphCoverageDashboard } from "@/features/knowledge-graph/services/knowledge-graph-coverage.service";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "content",
    action: "read",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const coverage = await calculateGraphCoverageDashboard();
    return NextResponse.json({ coverage });
  } catch (err) {
    console.error("[GET /api/admin/knowledge-graph/coverage]", err);
    return NextResponse.json({ message: "Không thể tải coverage" }, { status: 500 });
  }
}
