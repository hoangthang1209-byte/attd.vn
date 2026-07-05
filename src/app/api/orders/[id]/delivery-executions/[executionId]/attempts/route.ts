import { NextRequest, NextResponse } from "next/server";
import { parseDeliveryAttemptBody } from "@/features/orders/delivery-execution-input";
import { createDeliveryAttempt } from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; executionId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, executionId } = await context.params;
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
    const execution = await createDeliveryAttempt(
      id,
      executionId,
      parseDeliveryAttemptBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ execution }, { status: 201 });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST .../attempts]", err);
    return NextResponse.json({ message: "Không thể ghi nhận lần giao hàng" }, { status: 500 });
  }
}
