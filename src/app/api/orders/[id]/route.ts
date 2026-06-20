import { NextRequest, NextResponse } from "next/server";
import { parseUpdateOrderBody } from "@/features/orders/order-input";
import { EmployeeValidationError } from "@/features/employees/employee.service";
import {
  getOrderDetail,
  OrderValidationError,
  updateOrderDetails,
} from "@/features/orders/order.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const order = await getOrderDetail(id);
    if (!order) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    console.error("[GET /api/orders/[id]]", err);
    return NextResponse.json({ message: "Không thể tải đơn hàng" }, { status: 500 });
  }
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

  try {
    const order = await updateOrderDetails(id, parseUpdateOrderBody(body as Record<string, unknown>));
    return NextResponse.json({ order });
  } catch (err) {
    if (err instanceof OrderValidationError || err instanceof EmployeeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]]", err);
    return NextResponse.json({ message: "Không thể cập nhật đơn hàng" }, { status: 500 });
  }
}
