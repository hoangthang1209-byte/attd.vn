import { NextResponse } from "next/server";
import {
  buildCustomerImportTemplate,
  CUSTOMER_IMPORT_TEMPLATE_FILENAME,
} from "@/features/crm/services/customer-import.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

export const dynamic = "force-dynamic";

async function requireCustomerImportPermission(request: Request) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request,
  });
  if (permission.ok) return null;
  if (permission.response.status === 401) {
    return unauthorizedResponse("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }
  return forbiddenResponse("Bạn không có quyền import khách hàng.");
}

export async function GET(request: Request) {
  const permissionResponse = await requireCustomerImportPermission(request);
  if (permissionResponse) return permissionResponse;

  const workbook = buildCustomerImportTemplate();
  const body = new Uint8Array(workbook);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${CUSTOMER_IMPORT_TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
