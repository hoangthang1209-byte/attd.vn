import { NextRequest } from "next/server";
import { exportProductionSuppliersCsv } from "@/features/production-master/production-master-export.service";
import { downloadCsvResponse } from "@/features/import/import-template-utils";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";

export async function GET(req: NextRequest) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const csv = await exportProductionSuppliersCsv({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true",
    });
    return downloadCsvResponse("production-suppliers", csv);
  } catch {
    return new Response(JSON.stringify({ message: "Không thể xuất CSV." }), { status: 500 });
  }
}
