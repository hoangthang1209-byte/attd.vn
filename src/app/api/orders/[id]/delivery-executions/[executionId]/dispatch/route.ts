import { NextResponse } from "next/server";
import { dispatchDeliveryExecution } from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; executionId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, executionId } = await context.params;
  try {
    const execution = await dispatchDeliveryExecution(id, executionId);
    return NextResponse.json({ execution });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST .../dispatch]", err);
    return NextResponse.json({ message: "Không thể xác nhận xuất hàng" }, { status: 500 });
  }
}
