import { NextRequest, NextResponse } from "next/server";
import { setPrimaryContact } from "@/features/crm/services/crm-customer.service";
import { getContactById } from "@/features/crm/services/crm-contact.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id: customerId, contactId } = await ctx.params;
  try {
    const contact = await getContactById(contactId);
    if (!contact || contact.customerId !== customerId) {
      return NextResponse.json(
        { message: "Người liên hệ không thuộc khách hàng đã chọn." },
        { status: 400 },
      );
    }
    const customer = await setPrimaryContact(customerId, contactId);
    if (!customer) {
      return NextResponse.json({ message: "Không thể đặt liên hệ chính" }, { status: 500 });
    }
    return NextResponse.json({ customer, contact });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Không thể đặt liên hệ chính" },
      { status: 400 },
    );
  }
}
