import { NextResponse } from "next/server";
import { getDeliveryFulfillment } from "@/features/orders/delivery-fulfillment.service";
import { ProductionExecutionValidationError } from "@/features/orders/production-quantity";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const fulfillment = await getDeliveryFulfillment(id);
    return NextResponse.json({ fulfillment });
  } catch (err) {
    if (err instanceof ProductionExecutionValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/delivery-fulfillment]", err);
    return NextResponse.json({ message: "Không thể tải tiến độ giao hàng" }, { status: 500 });
  }
}
