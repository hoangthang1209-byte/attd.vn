import { NextRequest, NextResponse } from "next/server";
import {
  ensureProductionStagesInitialized,
} from "@/features/orders/production-stage.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const stages = await ensureProductionStagesInitialized(id);
    return NextResponse.json({ stages });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/production-stages]", err);
    return NextResponse.json({ message: "Không thể tải công đoạn sản xuất" }, { status: 500 });
  }
}
