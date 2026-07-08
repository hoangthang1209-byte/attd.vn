import { NextRequest, NextResponse } from "next/server";
import {
  createOrderDraftFromOpportunity,
  OrderHandoverError,
} from "@/features/sales/opportunities/order-handover.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  try {
    const order = await createOrderDraftFromOpportunity(id);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderHandoverError) {
      return NextResponse.json({ message: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/sales/opportunities/[id]/handover]", err);
    return NextResponse.json({ message: "Không thể tạo đơn hàng nháp" }, { status: 500 });
  }
}
