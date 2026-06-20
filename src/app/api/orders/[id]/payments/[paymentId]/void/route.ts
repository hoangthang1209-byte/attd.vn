import { NextRequest, NextResponse } from "next/server";
import { parseVoidPaymentBody } from "@/features/orders/order-input";
import {
  OrderValidationError,
  voidOrderPayment,
} from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const order = await voidOrderPayment(
      id,
      paymentId,
      parseVoidPaymentBody((body ?? {}) as Record<string, unknown>).voidReason,
    );
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/payments/[paymentId]/void]", err);
    return NextResponse.json({ message: "Không thể hủy ghi nhận thanh toán" }, { status: 500 });
  }
}
