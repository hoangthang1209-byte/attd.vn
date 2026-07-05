import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { parseCrmReportFilters } from "@/features/crm/services/crm-reporting-utils";
import { assertCanViewReports } from "@/features/crm/services/crm-reporting-scope";
import { getLeadSourceReport, serializeReportForCsv } from "@/features/crm/services/crm-reporting.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

function buildRows(report: Awaited<ReturnType<typeof getLeadSourceReport>>) {
  return report.rows.map((row) => ({
    "Nguồn lead": row.label,
    "Lead mới": row.newLeads,
    "Lead active": row.activeLeads,
    "Lead won": row.wonLeads,
    "Lead lost": row.lostLeads,
    "Quotes created": row.quotesCreated,
    "Orders created": row.ordersCreated,
    "Conversion rate": row.conversionRate == null ? "" : `${(row.conversionRate * 100).toFixed(1)}%`,
    "Financial value": row.financialValue ?? "",
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
    const report = await getLeadSourceReport(session, filters);
    const format = req.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
    const rows = buildRows(report);
    const filename = `crm-sources-${filters.from.toISOString().slice(0, 10)}-${filters.to.toISOString().slice(0, 10)}.${format}`;
    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sources");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const csv = serializeReportForCsv(rows as Array<Record<string, string | number | null>>, Object.keys(rows[0] ?? { "Nguồn lead": "" }));
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
    return NextResponse.json({ message: "Không thể xuất báo cáo nguồn lead." }, { status: 500 });
  }
}
