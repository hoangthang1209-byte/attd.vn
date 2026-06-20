import type { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";
import { listOrders } from "@/features/orders/order.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentState = searchParams.get("paymentState");
  try {
    const result = await listOrders({
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as OrderStatus | null) ?? undefined,
      paymentState: paymentState
        ? (paymentState as OrderPaymentStateFilter)
        : undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      leadId: searchParams.get("leadId") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ message: "Không thể tải danh sách đơn hàng" }, { status: 500 });
  }
}
