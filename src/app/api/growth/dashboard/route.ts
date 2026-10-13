import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { getGrowthDashboardReport } from "@/features/growth/services/growth-dashboard.service";
import { parseGrowthReportFilters } from "@/features/growth/services/growth-reporting-utils";
import { assertCanViewGrowthDashboard } from "@/features/growth/services/growth-reporting-scope";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  try {
    assertCanViewGrowthDashboard(session);
    const filters = parseGrowthReportFilters(req.nextUrl.searchParams);
    const data = await getGrowthDashboardReport(session, filters);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json(
        { message: "Bạn không có quyền xem Growth Engine dashboard." },
        { status: 403 },
      );
    }
    console.error("[GET /api/growth/dashboard]", error);
    return NextResponse.json(
      { message: "Không thể tải báo cáo Growth Engine." },
      { status: 500 },
    );
  }
}
