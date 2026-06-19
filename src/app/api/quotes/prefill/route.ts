import { NextRequest, NextResponse } from "next/server";
import { buildQuotePrefill } from "@/features/quotes/quote.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const prefill = await buildQuotePrefill({
      pricingCalculationId: searchParams.get("pricingCalculationId") ?? undefined,
      leadId: searchParams.get("leadId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
    });
    return NextResponse.json({ prefill });
  } catch (err) {
    console.error("[GET /api/quotes/prefill]", err);
    return NextResponse.json({ message: "Không thể tải dữ liệu mẫu" }, { status: 500 });
  }
}
