import { NextRequest, NextResponse } from "next/server";
import {
  parseCustomerImportFile,
  previewCustomerImportRows,
} from "@/features/crm/services/customer-import.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/errors/permission-errors";

export const dynamic = "force-dynamic";

async function requireCustomerImportPermission(request: NextRequest) {
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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: NextRequest) {
  const permissionResponse = await requireCustomerImportPermission(request);
  if (permissionResponse) return permissionResponse;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Vui lòng chọn file Excel.");
    }

    const rows = await parseCustomerImportFile(file);
    const preview = await previewCustomerImportRows(rows);
    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Không thể kiểm tra file Excel.";
    return jsonError(message);
  }
}
