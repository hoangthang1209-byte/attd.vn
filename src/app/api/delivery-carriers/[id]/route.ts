import { NextRequest, NextResponse } from "next/server";
import {
  DeliveryCarrierValidationError,
  getDeliveryCarrierById,
  updateDeliveryCarrier,
} from "@/features/delivery/delivery-carrier.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deliveryCarrier = await getDeliveryCarrierById(id);
  if (!deliveryCarrier) {
    return NextResponse.json({ message: "Không tìm thấy đơn vị vận chuyển" }, { status: 404 });
  }
  return NextResponse.json({ deliveryCarrier });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Request body missing" }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;
  try {
    const deliveryCarrier = await updateDeliveryCarrier(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      shortName:
        typeof raw.shortName === "string"
          ? raw.shortName
          : raw.shortName === null
            ? null
            : undefined,
      description:
        typeof raw.description === "string"
          ? raw.description
          : raw.description === null
            ? null
            : undefined,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
      apiProviderKey:
        typeof raw.apiProviderKey === "string"
          ? raw.apiProviderKey
          : raw.apiProviderKey === null
            ? null
            : undefined,
      apiEnabled: typeof raw.apiEnabled === "boolean" ? raw.apiEnabled : undefined,
    });
    return NextResponse.json({ deliveryCarrier });
  } catch (err) {
    if (err instanceof DeliveryCarrierValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/delivery-carriers/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật đơn vị vận chuyển" }, { status: 500 });
  }
}
