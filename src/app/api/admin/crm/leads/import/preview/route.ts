import { NextRequest, NextResponse } from "next/server";
import { parseLeadImportWorkbook } from "@/features/crm/services/lead-import.service";
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
  return forbiddenResponse("Bạn không có quyền import lead.");
}

export async function POST(req: NextRequest) {
  const denied = await requireLeadImportPermission(req);
  if (denied) return denied;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Thiếu file import." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = parseLeadImportWorkbook(buffer);
  return NextResponse.json(preview);
}
