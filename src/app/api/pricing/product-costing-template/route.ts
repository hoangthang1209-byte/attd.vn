import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { getProductCostingTemplate } from "@/features/pricing/services/product-costing-template.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET(req: NextRequest) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId")?.trim() ?? "";
  const variantId = searchParams.get("variantId")?.trim() || null;
  const quantityRaw = Number(searchParams.get("quantity") ?? 1);

  if (!productId) {
    return NextResponse.json({ message: "productId là bắt buộc." }, { status: 400 });
  }

  const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.round(quantityRaw)) : 1;
  try {
    const template = await getProductCostingTemplate({ productId, variantId, quantity });
    return NextResponse.json({ template });
  } catch (err) {
    console.error("[GET /api/pricing/product-costing-template]", err);
    return NextResponse.json({ message: "Không thể tải BOM sản phẩm vào Costing." }, { status: 500 });
  }
}
