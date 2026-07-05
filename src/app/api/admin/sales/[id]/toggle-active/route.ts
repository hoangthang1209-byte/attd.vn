import { NextRequest, NextResponse } from "next/server";
import { toggleSalesRepresentativeActive } from "@/features/sales/services/sales-representative.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "crm",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await ctx.params;
  const salesRep = await toggleSalesRepresentativeActive(id);
  if (!salesRep) {
    return NextResponse.json({ message: "Không tìm thấy nhân viên tư vấn" }, { status: 404 });
  }
  return NextResponse.json({ salesRep });
}
