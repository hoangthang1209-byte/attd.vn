import { NextRequest, NextResponse } from "next/server";
import { parseUpdateOrderDeliveryBody } from "@/features/orders/order-input";
import {
  OrderValidationError,
  updateOrderDelivery,
} from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const order = await updateOrderDelivery(
      id,
      parseUpdateOrderDeliveryBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/delivery]", err);
    return NextResponse.json({ message: "Không thể cập nhật thông tin giao hàng" }, { status: 500 });
  }
}
