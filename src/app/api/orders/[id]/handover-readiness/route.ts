import { NextRequest, NextResponse } from "next/server";
import { evaluateHandoverReadiness } from "@/features/orders/handover-readiness.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const partial = req.nextUrl.searchParams.get("partialDelivery") === "true";
  try {
    const readiness = await evaluateHandoverReadiness(id, {
      partialDeliveryAcknowledged: partial,
    });
    return NextResponse.json({ readiness });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/handover-readiness]", err);
    return NextResponse.json({ message: "Không thể đánh giá bàn giao" }, { status: 500 });
  }
}
