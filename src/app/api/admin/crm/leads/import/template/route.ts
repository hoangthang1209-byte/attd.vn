import { NextRequest, NextResponse } from "next/server";
import {
  buildLeadImportTemplateCsv,
  LEAD_IMPORT_TEMPLATE_FILENAME,
} from "@/features/crm/services/lead-import.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

export const dynamic = "force-dynamic";

async function requireLeadImportPermission(request: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request,
  });
  if (permission.ok) return null;
  if (permission.response.status === 401) {
    return unauthorizedResponse("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return forbiddenResponse("Bạn không có quyền tải mẫu import lead.");
}

export async function GET(req: NextRequest) {
  const denied = await requireLeadImportPermission(req);
  if (denied) return denied;

  const body = buildLeadImportTemplateCsv();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${LEAD_IMPORT_TEMPLATE_FILENAME}"`,
    },
  });
}
