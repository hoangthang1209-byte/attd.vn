import { NextResponse } from "next/server";
import { getPricingCalculationDetail } from "@/features/pricing/services/pricing-calculation.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const calculation = await getPricingCalculationDetail(id);
    if (!calculation) {
      return NextResponse.json({ message: "Không tìm thấy bản tính giá" }, { status: 404 });
    }
    return NextResponse.json({ calculation });
  } catch (err) {
    console.error("[GET /api/pricing/calculations/[id]]", err);
    return NextResponse.json({ message: "Không thể tải bản tính giá" }, { status: 500 });
  }
}
