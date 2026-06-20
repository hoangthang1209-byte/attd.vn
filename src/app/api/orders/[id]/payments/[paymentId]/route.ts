import { NextRequest, NextResponse } from "next/server";
import { parseEditOrderPaymentBody } from "@/features/orders/order-input";
import {
  editOrderPayment,
  OrderValidationError,
} from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params;
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
    const order = await editOrderPayment(
      id,
      paymentId,
      parseEditOrderPaymentBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/payments/[paymentId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật thanh toán" }, { status: 500 });
  }
}
