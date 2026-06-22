import { NextRequest, NextResponse } from "next/server";
import { parseDeliveryAttemptBody } from "@/features/orders/delivery-execution-input";
import { updateDeliveryAttempt } from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string; executionId: string; attemptId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, executionId, attemptId } = await context.params;
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
    const execution = await updateDeliveryAttempt(
      id,
      executionId,
      attemptId,
      parseDeliveryAttemptBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ execution });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH .../attempts/[attemptId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật lần giao hàng" }, { status: 500 });
  }
}
