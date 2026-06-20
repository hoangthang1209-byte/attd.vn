import { NextRequest, NextResponse } from "next/server";
import { parseRecordOrderPaymentBody } from "@/features/orders/order-input";
import {
  OrderValidationError,
  recordOrderPayment,
} from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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
    const order = await recordOrderPayment(
      id,
      parseRecordOrderPaymentBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/payments]", err);
    return NextResponse.json({ message: "Không thể ghi nhận thanh toán" }, { status: 500 });
  }
}
