import { NextResponse } from "next/server";
import { getPricingOverview } from "@/features/pricing/services/pricing-overview.service";

export async function GET() {
  try {
    const overview = await getPricingOverview();
    return NextResponse.json(overview);
  } catch (err) {
    console.error("[GET /api/pricing/overview]", err);
    return NextResponse.json({ message: "Không thể tải tổng quan tính giá" }, { status: 500 });
  }
}
