import { NextRequest, NextResponse } from "next/server";
import { buildProductionExecutionBundle } from "@/features/orders/production-execution.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const bundle = await buildProductionExecutionBundle(id);
    return NextResponse.json({ bundle });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/production-execution]", err);
    return NextResponse.json({ message: "Không thể tải tiến độ sản xuất" }, { status: 500 });
  }
}
