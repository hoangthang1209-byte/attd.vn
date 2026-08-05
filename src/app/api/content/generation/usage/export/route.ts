import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { getUsageExportRows } from "@/features/content-generation/services/usage-ledger.service";
import { buildUsageExportCsv, buildUsageExportJson } from "@/features/content-generation/services/usage-export";
import { mapContentGenerationError } from "@/app/api/content/generation/_shared";

/**
 * Sprint 18.1 — admin-only usage export. `?format=csv|json`, defaults to
 * json. Read-only: never mutates AiGenerationRun, never includes a secret
 * (only ids/provider/model/tokens/cost/status/timestamps).
 */
export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({ platform: "content", action: "read", request: req });
  if (!permission.ok) return permission.response;

  const format = (req.nextUrl.searchParams.get("format") ?? "json").toLowerCase();
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ message: "format phải là csv hoặc json.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const rows = await getUsageExportRows();

    if (format === "csv") {
      const csv = buildUsageExportCsv(rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ai-generation-usage-export.csv"`,
        },
      });
    }

    return NextResponse.json({ rows: buildUsageExportJson(rows), generatedAt: new Date().toISOString() });
  } catch (err) {
    return mapContentGenerationError(err);
  }
}
