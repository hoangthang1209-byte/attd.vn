import { NextRequest, NextResponse } from "next/server";
import { findCustomerQuickCreateMatches } from "@/features/crm/services/crm-customer-quick-create";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { searchParams } = new URL(req.url);
  try {
    const matches = await findCustomerQuickCreateMatches({
      name: searchParams.get("name") ?? undefined,
      taxCode: searchParams.get("taxCode") ?? undefined,
      email: searchParams.get("email") ?? undefined,
    });
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[GET /api/crm/customers/quick-create-check]", err);
    return NextResponse.json({ message: "Không thể kiểm tra trùng khách hàng" }, { status: 500 });
  }
}
