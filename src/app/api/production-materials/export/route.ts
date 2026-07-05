import { NextRequest } from "next/server";
import { exportProductionMaterialsCsv } from "@/features/production-master/production-master-export.service";
import { downloadCsvResponse } from "@/features/import/import-template-utils";
import { requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "export",
    request: req,
  });
  if (!permission.ok) return permission.response;


  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  try {
    const csv = await exportProductionMaterialsCsv({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "true",
      category: searchParams.get("category") ?? undefined,
    });
    return downloadCsvResponse("production-materials", csv);
  } catch {
    return new Response(JSON.stringify({ message: "Không thể xuất CSV." }), { status: 500 });
  }
}
