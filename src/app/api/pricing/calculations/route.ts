import type { PricingCalculationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  listPricingCalculations,
  savePricingCalculation,
} from "@/features/pricing/services/pricing-calculation.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { parseCalculateBody } from "@/features/pricing/pricing-calculate-input";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as PricingCalculationStatus | null;
  const validStatuses: PricingCalculationStatus[] = ["DRAFT", "CALCULATED", "USED_FOR_QUOTE", "ARCHIVED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ message: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await listPricingCalculations({
      search: searchParams.get("search") ?? undefined,
      status: status ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50", 10),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pricing/calculations]", err);
    return NextResponse.json({ message: "Không thể tải lịch sử tính giá" }, { status: 500 });
  }
}

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
    const raw = body as Record<string, unknown>;
    const input = parseCalculateBody(raw);
    const calculation = await savePricingCalculation({
      ...input,
      status: typeof raw.status === "string" ? (raw.status as PricingCalculationStatus) : undefined,
    });
    return NextResponse.json({ calculation }, { status: 201 });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/calculations]", err);
    return NextResponse.json({ message: "Không thể lưu bản tính giá" }, { status: 500 });
  }
}
