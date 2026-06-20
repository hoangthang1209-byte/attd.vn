import { NextRequest, NextResponse } from "next/server";
import {
  DeliveryMethodValidationError,
  getDeliveryMethodById,
  updateDeliveryMethod,
} from "@/features/delivery/delivery-method.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const deliveryMethod = await getDeliveryMethodById(id);
  if (!deliveryMethod) {
    return NextResponse.json({ message: "Không tìm thấy hình thức giao hàng" }, { status: 404 });
  }
  return NextResponse.json({ deliveryMethod });
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
    const deliveryMethod = await updateDeliveryMethod(id, {
      name: typeof raw.name === "string" ? raw.name : undefined,
      description: typeof raw.description === "string" ? raw.description : raw.description === null ? null : undefined,
      sortOrder: raw.sortOrder != null ? Number(raw.sortOrder) : undefined,
      isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
    });
    return NextResponse.json({ deliveryMethod });
  } catch (err) {
    if (err instanceof DeliveryMethodValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/delivery-methods/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật hình thức giao hàng" }, { status: 500 });
  }
}
