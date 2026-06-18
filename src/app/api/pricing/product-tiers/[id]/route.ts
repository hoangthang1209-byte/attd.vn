import { NextRequest, NextResponse } from "next/server";
import { updateProductPriceTier } from "@/features/pricing/services/product-tier.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { parseMoneyInput, parseOptionalInt } from "@/features/pricing/parse-money";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  try {
    const tier = await updateProductPriceTier(id, {
      variantId: raw.variantId !== undefined ? (typeof raw.variantId === "string" ? raw.variantId : null) : undefined,
      priceGroupId: typeof raw.priceGroupId === "string" ? raw.priceGroupId : undefined,
      minQuantity: parseOptionalInt(raw.minQuantity) ?? undefined,
      maxQuantity: raw.maxQuantity !== undefined ? parseOptionalInt(raw.maxQuantity) : undefined,
      unitPrice: parseMoneyInput(raw.unitPrice) ?? undefined,
      costPrice: raw.costPrice !== undefined ? parseMoneyInput(raw.costPrice) : undefined,
      effectiveFrom: raw.effectiveFrom !== undefined ? (typeof raw.effectiveFrom === "string" ? raw.effectiveFrom : null) : undefined,
      effectiveTo: raw.effectiveTo !== undefined ? (typeof raw.effectiveTo === "string" ? raw.effectiveTo : null) : undefined,
      note: raw.note !== undefined ? (typeof raw.note === "string" ? raw.note : null) : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ tier });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/product-tiers/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật dòng giá" }, { status: 500 });
  }
}
