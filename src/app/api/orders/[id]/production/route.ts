import { NextRequest, NextResponse } from "next/server";
import { parseUpdateOrderProductionBody } from "@/features/orders/order-input";
import {
  OrderValidationError,
  updateOrderProduction,
} from "@/features/orders/order.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { jsonOrderDetailResponse } from "@/lib/admin-auth/order-api-response";

type RouteContext = { params: Promise<{ id: string }> };

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

  try {
    const order = await updateOrderProduction(
      id,
      parseUpdateOrderProductionBody(body as Record<string, unknown>),
    );
    return jsonOrderDetailResponse(order, getAdminSessionFromRequest(req));
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/production]", err);
    return NextResponse.json({ message: "Không thể cập nhật thông tin sản xuất" }, { status: 500 });
  }
}
