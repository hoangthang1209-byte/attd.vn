import { NextRequest, NextResponse } from "next/server";
import {
  deactivateCostingSourcePrice,
  updateCostingSourcePrice,
} from "@/features/pricing/services/costing-source-price.service";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import { requireProductionUpdate } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; priceId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, priceId } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const item = await updateCostingSourcePrice(priceId, {
      expectedSourceType: "PRODUCTION_MATERIAL",
      expectedSourceId: id,
      supplierId: typeof body.supplierId === "string" ? body.supplierId : undefined,
      unitPrice: body.unitPrice,
      unit: body.unit,
      note: body.note,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể cập nhật giá nhà cung cấp.");
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id, priceId } = await context.params;
  try {
    const item = await deactivateCostingSourcePrice(priceId, {
      sourceType: "PRODUCTION_MATERIAL",
      sourceId: id,
    });
    return NextResponse.json({ item, message: "Đã vô hiệu hóa giá nhà cung cấp." });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể vô hiệu hóa giá nhà cung cấp.");
  }
}
