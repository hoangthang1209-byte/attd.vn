import { NextResponse } from "next/server";
import { removeDeliveryProof } from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; executionId: string; proofId: string }> };

export async function DELETE(req: Request, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "delete",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, executionId, proofId } = await context.params;
  try {
    await removeDeliveryProof(id, executionId, proofId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE .../proofs/[proofId]]", err);
    return NextResponse.json({ message: "Không thể xóa bằng chứng giao hàng" }, { status: 500 });
  }
}
