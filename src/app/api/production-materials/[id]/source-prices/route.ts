import { NextRequest, NextResponse } from "next/server";
import {
  listCostingSourcePrices,
  upsertCostingSourcePrice,
} from "@/features/pricing/services/costing-source-price.service";
import { costingSourcePriceErrorResponse } from "@/features/pricing/costing-source-price-http";
import { requireProductionUpdate, requireProductionView } from "@/lib/admin-auth/require-production-api";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = requireProductionView(req);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const activeOnly = new URL(req.url).searchParams.get("activeOnly") === "true";
  try {
    const items = await listCostingSourcePrices({
      sourceType: "PRODUCTION_MATERIAL",
      sourceId: id,
      activeOnly,
    });
    return NextResponse.json({ items });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể tải giá nhà cung cấp.");
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "manufacturing",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;
  const auth = requireProductionUpdate(req);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const item = await upsertCostingSourcePrice({
      sourceType: "PRODUCTION_MATERIAL",
      sourceId: id,
      supplierId: typeof body.supplierId === "string" ? body.supplierId : "",
      unitPrice: body.unitPrice,
      unit: body.unit,
      note: body.note,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return costingSourcePriceErrorResponse(err, "Không thể lưu giá nhà cung cấp.");
  }
}
