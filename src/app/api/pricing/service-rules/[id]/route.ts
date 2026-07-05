import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { updateServicePriceRule } from "@/features/pricing/services/service-rule.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { parseMoneyInput, parseOptionalInt } from "@/features/pricing/parse-money";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

const SERVICE_TYPES: PricingServiceType[] = [
  "PRINT_DTF", "PRINT_SILK", "EMBROIDERY", "OEM", "PACKAGING", "DESIGN", "SETUP", "SHIPPING", "OTHER",
];
const CALC_TYPES: PricingCalculationType[] = ["PER_ITEM", "PER_ORDER", "PER_POSITION", "MANUAL"];

export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const raw = body as Record<string, unknown>;
  const serviceType = raw.serviceType as PricingServiceType | undefined;
  const calculationType = raw.calculationType as PricingCalculationType | undefined;

  if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json({ message: "Loại dịch vụ không hợp lệ" }, { status: 400 });
  }
  if (calculationType && !CALC_TYPES.includes(calculationType)) {
    return NextResponse.json({ message: "Cách tính không hợp lệ" }, { status: 400 });
  }

  try {
    const rule = await updateServicePriceRule(id, {
      serviceType,
      name: typeof raw.name === "string" ? raw.name : undefined,
      priceGroupId: raw.priceGroupId !== undefined ? (typeof raw.priceGroupId === "string" ? raw.priceGroupId : null) : undefined,
      minQuantity: parseOptionalInt(raw.minQuantity) ?? undefined,
      maxQuantity: raw.maxQuantity !== undefined ? parseOptionalInt(raw.maxQuantity) : undefined,
      calculationType,
      unitPrice: parseMoneyInput(raw.unitPrice) ?? undefined,
      setupFee: parseMoneyInput(raw.setupFee) ?? undefined,
      note: raw.note !== undefined ? (typeof raw.note === "string" ? raw.note : null) : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ rule });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/pricing/service-rules/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật quy tắc phí" }, { status: 500 });
  }
}
