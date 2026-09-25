import { NextRequest, NextResponse } from "next/server";
import { listCrmSalesOwners } from "@/features/crm/services/crm-sales-owners.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;

  try {
    const result = await listCrmSalesOwners();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/crm/sales-owners]", err);
    return NextResponse.json(
      { message: "Không thể tải danh sách phụ trách sales" },
      { status: 500 }
    );
  }
}
