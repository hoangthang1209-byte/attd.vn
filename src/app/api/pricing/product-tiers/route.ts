import { NextRequest, NextResponse } from "next/server";
import {
  createProductPriceTier,
  listProductPriceTiers,
} from "@/features/pricing/services/product-tier.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { parseMoneyInput, parseOptionalInt } from "@/features/pricing/parse-money";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listProductPriceTiers({
      productId: searchParams.get("productId") ?? undefined,
      priceGroupId: searchParams.get("priceGroupId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pricing/product-tiers]", err);
    return NextResponse.json({ message: "Không thể tải bảng giá sản phẩm" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "create",
    request: req,
  });
  if (!permission.ok) return permission.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const minQuantity = parseOptionalInt(raw.minQuantity);
  const unitPrice = parseMoneyInput(raw.unitPrice);

  try {
    if (!minQuantity || minQuantity < 1) {
      throw new PricingValidationError("Số lượng từ phải >= 1.");
    }
    if (unitPrice == null || unitPrice < 0) {
      throw new PricingValidationError("Đơn giá phải >= 0.");
    }

    const tier = await createProductPriceTier({
      productId: typeof raw.productId === "string" ? raw.productId : "",
      variantId: typeof raw.variantId === "string" ? raw.variantId : null,
      priceGroupId: typeof raw.priceGroupId === "string" ? raw.priceGroupId : "",
      minQuantity,
      maxQuantity: parseOptionalInt(raw.maxQuantity),
      unitPrice,
      costPrice: parseMoneyInput(raw.costPrice),
      effectiveFrom: typeof raw.effectiveFrom === "string" ? raw.effectiveFrom : null,
      effectiveTo: typeof raw.effectiveTo === "string" ? raw.effectiveTo : null,
      note: typeof raw.note === "string" ? raw.note : null,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ tier }, { status: 201 });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/product-tiers]", err);
    return NextResponse.json({ message: "Không thể tạo dòng giá" }, { status: 500 });
  }
}
