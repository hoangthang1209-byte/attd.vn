import { NextRequest, NextResponse } from "next/server";
import {
  createDeliveryMethod,
  DeliveryMethodValidationError,
  listDeliveryMethods,
} from "@/features/delivery/delivery-method.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  try {
    const result = await listDeliveryMethods({
      search: searchParams.get("search") ?? undefined,
      activeOnly: searchParams.get("active") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/delivery-methods]", err);
    return NextResponse.json({ message: "Không thể tải hình thức giao hàng" }, { status: 500 });
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
    const deliveryMethod = await createDeliveryMethod({
      name: typeof raw.name === "string" ? raw.name : "",
      description: typeof raw.description === "string" ? raw.description : null,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : 0,
      isActive: raw.isActive !== false,
    });
    return NextResponse.json({ deliveryMethod }, { status: 201 });
  } catch (err) {
    if (err instanceof DeliveryMethodValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/delivery-methods]", err);
    return NextResponse.json({ message: "Không thể tạo hình thức giao hàng" }, { status: 500 });
  }
}
