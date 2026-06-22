import { NextRequest, NextResponse } from "next/server";
import { parseUpdateOrderStatusBody } from "@/features/orders/order-input";
import {
  OrderValidationError,
  updateOrderStatus,
} from "@/features/orders/order.service";
import { HandoverValidationError, ShippedValidationError, CompletionValidationError } from "@/features/orders/production-quantity";

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
    const order = await updateOrderStatus(id, parseUpdateOrderStatusBody(body as Record<string, unknown>));
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof HandoverValidationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: "HANDOVER_NOT_READY",
          missingConditions: err.missingConditions,
        },
        { status: 400 },
      );
    }
    if (err instanceof ShippedValidationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: "SHIPPED_EXECUTION_REQUIRED",
          missingConditions: err.missingConditions,
          requiresExecutionFlow: err.requiresExecutionFlow,
        },
        { status: 400 },
      );
    }
    if (err instanceof CompletionValidationError) {
      return NextResponse.json(
        {
          message: err.message,
          code: "COMPLETION_NOT_READY",
          missingConditions: err.missingConditions,
        },
        { status: 400 },
      );
    }
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/status]", err);
    return NextResponse.json({ message: "Không thể cập nhật trạng thái đơn hàng" }, { status: 500 });
  }
}
