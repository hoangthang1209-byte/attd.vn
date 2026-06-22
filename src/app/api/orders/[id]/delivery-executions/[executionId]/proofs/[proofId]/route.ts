import { NextResponse } from "next/server";
import { removeDeliveryProof } from "@/features/orders/delivery-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string; executionId: string; proofId: string }> };

export async function DELETE(_req: Request, context: RouteContext) {
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
