import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  createServicePriceRule,
  listServicePriceRules,
} from "@/features/pricing/services/service-rule.service";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { parseMoneyInput, parseOptionalInt } from "@/features/pricing/parse-money";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

const SERVICE_TYPES: PricingServiceType[] = [
  "PRINT_DTF", "PRINT_SILK", "EMBROIDERY", "OEM", "PACKAGING", "DESIGN", "SETUP", "SHIPPING", "OTHER",
];
const CALC_TYPES: PricingCalculationType[] = ["PER_ITEM", "PER_ORDER", "PER_POSITION", "MANUAL"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceType = searchParams.get("serviceType") as PricingServiceType | null;
  if (serviceType && !SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json({ message: "Loại dịch vụ không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await listServicePriceRules({
      serviceType: serviceType ?? undefined,
      priceGroupId: searchParams.get("priceGroupId") ?? undefined,
      activeOnly: searchParams.get("activeOnly") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pricing/service-rules]", err);
    return NextResponse.json({ message: "Không thể tải phí dịch vụ" }, { status: 500 });
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
  const serviceType = raw.serviceType as PricingServiceType;
  const calculationType = raw.calculationType as PricingCalculationType | undefined;

  if (!SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json({ message: "Loại dịch vụ không hợp lệ" }, { status: 400 });
  }
  if (calculationType && !CALC_TYPES.includes(calculationType)) {
    return NextResponse.json({ message: "Cách tính không hợp lệ" }, { status: 400 });
  }

  try {
    const rule = await createServicePriceRule({
      serviceType,
      name: typeof raw.name === "string" ? raw.name : "",
      priceGroupId: typeof raw.priceGroupId === "string" ? raw.priceGroupId : null,
      minQuantity: parseOptionalInt(raw.minQuantity) ?? 1,
      maxQuantity: parseOptionalInt(raw.maxQuantity),
      calculationType,
      unitPrice: parseMoneyInput(raw.unitPrice) ?? 0,
      setupFee: parseMoneyInput(raw.setupFee) ?? 0,
      note: typeof raw.note === "string" ? raw.note : null,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/service-rules]", err);
    return NextResponse.json({ message: "Không thể tạo quy tắc phí" }, { status: 500 });
  }
}
