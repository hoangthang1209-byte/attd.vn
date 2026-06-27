import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";
import { parseCreateManualOrderBody } from "@/features/orders/order-input";
import { shapeOrderListResponse } from "@/features/orders/order-financial-redact";
import { EmployeeValidationError } from "@/features/employees/employee.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";
import {
  createManualOrder,
  listOrders,
  OrderValidationError,
} from "@/features/orders/order.service";

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  const { searchParams } = new URL(req.url);
  const paymentState = searchParams.get("paymentState");
  try {
    const result = await listOrders({
      search: searchParams.get("search") ?? undefined,
      status: (searchParams.get("status") as OrderStatus | null) ?? undefined,
      paymentState: paymentState
        ? (paymentState as OrderPaymentStateFilter)
        : undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      leadId: searchParams.get("leadId") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
      pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50,
    });
    const canViewFinancials = canViewOrderFinancials(session);
    const shaped = shapeOrderListResponse(result.orders, canViewFinancials);
    return NextResponse.json({
      ...result,
      orders: shaped.orders,
      permissions: shaped.permissions,
    });
  } catch (err) {
    console.error("[GET /api/orders]", err);
    return NextResponse.json({ message: "Không thể tải danh sách đơn hàng" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  const forbidden = assertFinancialApiAccess(session, "POST /api/orders");
  if (forbidden) return forbidden;

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
    const order = await createManualOrder(parseCreateManualOrderBody(body as Record<string, unknown>));
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderValidationError || err instanceof EmployeeValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders]", err);
    return NextResponse.json({ message: "Không thể tạo đơn hàng" }, { status: 500 });
  }
}
