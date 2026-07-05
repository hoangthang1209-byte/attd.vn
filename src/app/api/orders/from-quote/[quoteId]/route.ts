import { NextRequest, NextResponse } from "next/server";
import {
  convertQuoteToOrder,
  OrderConversionError,
} from "@/features/orders/order-conversion.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ quoteId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { quoteId } = await context.params;
  try {
    const order = await convertQuoteToOrder(quoteId);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderConversionError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/from-quote/[quoteId]]", err);
    return NextResponse.json({ message: "Không thể tạo đơn hàng từ báo giá" }, { status: 500 });
  }
}
