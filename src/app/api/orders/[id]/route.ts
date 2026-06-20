import { NextRequest, NextResponse } from "next/server";
import { getOrderDetail } from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const order = await getOrderDetail(id);
    if (!order) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    console.error("[GET /api/orders/[id]]", err);
    return NextResponse.json({ message: "Không thể tải đơn hàng" }, { status: 500 });
  }
}
