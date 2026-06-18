import { NextRequest, NextResponse } from "next/server";
import {
  PricingValidationError,
  updatePriceGroup,
} from "@/features/pricing/services/price-group.service";

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
    const priceGroup = await updatePriceGroup(id, {
      code: typeof raw.code === "string" ? raw.code : undefined,
      name: typeof raw.name === "string" ? raw.name : undefined,
      description: raw.description !== undefined ? (typeof raw.description === "string" ? raw.description : null) : undefined,
      isDefault: typeof raw.isDefault === "boolean" ? raw.isDefault : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ priceGroup });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/price-groups/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật nhóm giá" }, { status: 500 });
  }
}
