import { NextResponse } from "next/server";
import { evaluateCompletionReadiness } from "@/features/orders/delivery-fulfillment.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const readiness = await evaluateCompletionReadiness(id);
    return NextResponse.json({ readiness });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/completion-readiness]", err);
    return NextResponse.json({ message: "Không thể đánh giá hoàn tất đơn" }, { status: 500 });
  }
}
