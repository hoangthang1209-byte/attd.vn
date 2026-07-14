import { NextRequest, NextResponse } from "next/server";
import { getSeoDashboardSummary } from "@/features/content/services/seo-dashboard.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  try {
    const dashboard = await getSeoDashboardSummary();
    return NextResponse.json({ dashboard });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể tải dashboard SEO" },
      { status: 500 },
    );
  }
}
