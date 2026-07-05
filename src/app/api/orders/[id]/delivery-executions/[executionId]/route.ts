import { NextRequest, NextResponse } from "next/server";
import { parseCreateDeliveryExecutionBody } from "@/features/orders/delivery-execution-input";
import {
  getDeliveryExecution,
  updateDeliveryExecution,
} from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; executionId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id, executionId } = await context.params;
  try {
    const execution = await getDeliveryExecution(id, executionId);
    if (!execution) {
      return NextResponse.json({ message: "Không tìm thấy chuyến giao hàng" }, { status: 404 });
    }
    return NextResponse.json({ execution });
  } catch (err) {
    console.error("[GET /api/orders/[id]/delivery-executions/[executionId]]", err);
    return NextResponse.json({ message: "Không thể tải chuyến giao hàng" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const execution = await updateDeliveryExecution(
      id,
      executionId,
      parseCreateDeliveryExecutionBody(body as Record<string, unknown>),
    );
    return NextResponse.json({ execution });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/delivery-executions/[executionId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật chuyến giao hàng" }, { status: 500 });
  }
}
