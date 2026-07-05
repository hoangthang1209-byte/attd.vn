import { NextRequest, NextResponse } from "next/server";
import {
  createPriceGroup,
  listPriceGroups,
  PricingValidationError,
} from "@/features/pricing/services/price-group.service";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

export async function GET() {
  try {
    const result = await listPriceGroups();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/pricing/price-groups]", err);
    return NextResponse.json({ message: "Không thể tải nhóm giá" }, { status: 500 });
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
  try {
    const priceGroup = await createPriceGroup({
      code: typeof raw.code === "string" ? raw.code : "",
      name: typeof raw.name === "string" ? raw.name : "",
      description: typeof raw.description === "string" ? raw.description : null,
      isDefault: raw.isDefault === true,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ priceGroup }, { status: 201 });
  } catch (err) {
    if (err instanceof PricingValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/pricing/price-groups]", err);
    return NextResponse.json({ message: "Không thể tạo nhóm giá" }, { status: 500 });
  }
}
