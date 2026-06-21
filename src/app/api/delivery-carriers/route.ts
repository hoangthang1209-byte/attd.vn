import { NextRequest, NextResponse } from "next/server";
import {
  createDeliveryCarrier,
  DeliveryCarrierValidationError,
  listDeliveryCarriers,
} from "@/features/delivery/delivery-carrier.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listDeliveryCarriers({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("active") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/delivery-carriers]", err);
    return NextResponse.json({ message: "Không thể tải đơn vị vận chuyển" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const deliveryCarrier = await createDeliveryCarrier({
      name: typeof raw.name === "string" ? raw.name : "",
      shortName: typeof raw.shortName === "string" ? raw.shortName : null,
      description: typeof raw.description === "string" ? raw.description : null,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : 0,
      isActive: raw.isActive !== false,
      apiProviderKey: typeof raw.apiProviderKey === "string" ? raw.apiProviderKey : null,
      apiEnabled: raw.apiEnabled === true,
    });
    return NextResponse.json({ deliveryCarrier }, { status: 201 });
  } catch (err) {
    if (err instanceof DeliveryCarrierValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/delivery-carriers]", err);
    return NextResponse.json({ message: "Không thể tạo đơn vị vận chuyển" }, { status: 500 });
  }
}
