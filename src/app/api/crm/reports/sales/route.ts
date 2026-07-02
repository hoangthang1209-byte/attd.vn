import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { parseCrmReportFilters } from "@/features/crm/services/crm-reporting-utils";
import { assertCanViewReports } from "@/features/crm/services/crm-reporting-scope";
import { getSalesPerformanceReport } from "@/features/crm/services/crm-reporting.service";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  try {
    assertCanViewReports(session);
    const filters = parseCrmReportFilters(req.nextUrl.searchParams);
    const data = await getSalesPerformanceReport(session, filters);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền xem báo cáo CRM." }, { status: 403 });
    }
    return NextResponse.json({ message: "Không thể tải báo cáo hiệu suất sales." }, { status: 500 });
  }
}
