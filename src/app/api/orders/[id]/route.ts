import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canViewOrderFinancials, can } from "@/features/auth/admin-permissions";
import { canAccessOrderRecord } from "@/features/auth/order-scope";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { parseUpdateOrderBody } from "@/features/orders/order-input";
import { shapeOrderDetailResponse } from "@/features/orders/order-financial-redact";
import { EmployeeValidationError } from "@/features/employees/employee.service";
import {
  getOrderDetail,
  OrderValidationError,
  updateOrderDetails,
} from "@/features/orders/order.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = getAdminSessionFromRequest(req);
  try {
    const row = await prisma.order.findUnique({
      where: { id },
      select: {
        salesEmployeeId: true,
        productionOwnerId: true,
        deliveryOwnerId: true,
      },
    });
    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    if (!canAccessOrderRecord(session, row, "orders.view")) {
      return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
    }

    const order = await getOrderDetail(id);
    if (!order) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    const shaped = shapeOrderDetailResponse(
      order,
      canViewOrderFinancials(session) && canAccessOrderRecord(session, row, "orders.view_financials"),
    );
    return NextResponse.json(shaped);
  } catch (err) {
    console.error("[GET /api/orders/[id]]", err);
    return NextResponse.json({ message: "Không thể tải đơn hàng" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = getAdminSessionFromRequest(req);
  const forbidden = assertFinancialApiAccess(session, "PATCH /api/orders/[id]");
  if (forbidden) return forbidden;
  if (!can(session, "orders.update")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

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
    const shaped = shapeOrderDetailResponse(order, true);
    return NextResponse.json(shaped);
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
