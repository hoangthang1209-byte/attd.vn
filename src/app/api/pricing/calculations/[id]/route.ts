import { NextResponse } from "next/server";
import {
  finalizePricingCalculation,
  getPricingCalculationDetail,
} from "@/features/pricing/services/pricing-calculation.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const calculation = await getPricingCalculationDetail(id);
    if (!calculation) {
      return NextResponse.json({ message: "Không tìm thấy bản tính giá" }, { status: 404 });
    }
    return NextResponse.json({ calculation });
  } catch (err) {
    console.error("[GET /api/pricing/calculations/[id]]", err);
    return NextResponse.json({ message: "Không thể tải bản tính giá" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const action =
    body && typeof body === "object" && "action" in body && typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : null;

  if (action !== "finalize") {
    return NextResponse.json({ message: "Hành động không hợp lệ" }, { status: 400 });
  }

  try {
    const calculation = await finalizePricingCalculation(id);
    return NextResponse.json({ calculation });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/calculations/[id]]", err);
    return NextResponse.json({ message: "Không thể chốt giá vốn" }, { status: 500 });
  }
}
