import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  deactivateCostingSourcePrice,
  updateCostingSourcePrice,
} from "@/features/pricing/services/costing-source-price.service";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

type RouteContext = { params: Promise<{ id: string; priceId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { id, priceId } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const item = await updateCostingSourcePrice(priceId, {
      expectedSourceType: "COST_LIBRARY",
      expectedSourceId: id,
      supplierId: typeof body.supplierId === "string" ? body.supplierId : undefined,
      unitPrice: body.unitPrice,
      unit: body.unit,
      calculationType: body.calculationType,
      note: body.note,
      isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể cập nhật giá theo nhà cung cấp.");
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { id, priceId } = await context.params;
  try {
    const item = await deactivateCostingSourcePrice(priceId, {
      sourceType: "COST_LIBRARY",
      sourceId: id,
    });
    return NextResponse.json({ item, message: "Đã vô hiệu hóa giá theo nhà cung cấp." });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể vô hiệu hóa giá theo nhà cung cấp.");
  }
}
