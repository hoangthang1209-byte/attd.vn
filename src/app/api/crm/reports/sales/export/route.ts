import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { parseCrmReportFilters } from "@/features/crm/services/crm-reporting-utils";
import { assertCanViewReports } from "@/features/crm/services/crm-reporting-scope";
import { getSalesPerformanceReport, serializeReportForCsv } from "@/features/crm/services/crm-reporting.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function buildRows(report: Awaited<ReturnType<typeof getSalesPerformanceReport>>) {
  return report.rows.map((row) => ({
    "Nhân viên": row.salesName,
    "Leads assigned": row.leadsAssigned,
    "Leads contacted": row.leadsContacted,
    "Leads won": row.leadsWon,
    "Leads lost": row.leadsLost,
    "Follow-up overdue": row.followUpOverdue,
    "Activities completed": row.activitiesCompleted,
    "Quotes created": row.quotesCreated,
    "Quotes converted": row.quotesConvertedToOrders,
    "Customers created": row.customersCreated,
    "Orders from CRM": row.ordersCreatedFromCrm,
    "Quote value": row.quoteValue ?? "",
    "Order value": row.orderValue ?? "",
    "Avg order value": row.averageOrderValue ?? "",
  }));
}

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const session = getAdminSessionFromRequest(req);
  try {
    assertCanViewReports(session);
    const filters = parseCrmReportFilters(req.nextUrl.searchParams);
    const report = await getSalesPerformanceReport(session, filters);
    const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const rows = buildRows(report);
    const filename = `crm-sales-${filters.from.toISOString().slice(0, 10)}-${filters.to.toISOString().slice(0, 10)}.${format}`;
    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = serializeReportForCsv(rows as Array<Record<string, string | number | null>>, Object.keys(rows[0] ?? { "Nhân viên": "" }));
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Bạn không có quyền xuất báo cáo này." }, { status: 403 });
    }
    return NextResponse.json({ message: "Không thể xuất báo cáo hiệu suất sales." }, { status: 500 });
  }
}
