import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { calculatePricing } from "@/features/pricing/services/pricing-engine.service";
import { parseCalculateBody } from "@/features/pricing/pricing-calculate-input";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }

  try {
    const input = parseCalculateBody(body as Record<string, unknown>);
    if (!input.items.length) {
      return NextResponse.json({ message: "Cần ít nhất một dòng sản phẩm." }, { status: 400 });
    }
    const result = await calculatePricing(input);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[POST /api/pricing/calculate]", err);
    return NextResponse.json({ message: "Không thể tính giá" }, { status: 500 });
  }
}
