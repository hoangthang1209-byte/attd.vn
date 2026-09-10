import { NextRequest, NextResponse } from "next/server";
import { can } from "@/features/auth/admin-permissions";
import {
  listCostingSourcePrices,
  upsertCostingSourcePrice,
} from "@/features/pricing/services/costing-source-price.service";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "view",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { id } = await context.params;
  const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "true";
  try {
    const items = await listCostingSourcePrices({
      sourceType: "COST_LIBRARY",
      sourceId: id,
      activeOnly,
    });
    return NextResponse.json({ items });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể tải giá theo nhà cung cấp.");
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  if (!can(permission.session, "pricing.manage")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const item = await upsertCostingSourcePrice({
      sourceType: "COST_LIBRARY",
      sourceId: id,
      supplierId: typeof body.supplierId === "string" ? body.supplierId : "",
      unitPrice: body.unitPrice,
      unit: body.unit,
      calculationType: body.calculationType,
      note: body.note,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể lưu giá theo nhà cung cấp.");
  }
}
