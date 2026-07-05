import { NextRequest, NextResponse } from "next/server";
import { parseEditOrderPaymentBody } from "@/features/orders/order-input";
import { shapeOrderDetailResponse } from "@/features/orders/order-financial-redact";
import {
  editOrderPayment,
  OrderValidationError,
} from "@/features/orders/order.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id, paymentId } = await context.params;
  const session = getAdminSessionFromRequest(req);
  const forbidden = assertFinancialApiAccess(session, "PATCH /api/orders/[id]/payments/[paymentId]");
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
    const order = await editOrderPayment(
      id,
      paymentId,
      parseEditOrderPaymentBody(body as Record<string, unknown>),
    );
    return NextResponse.json(shapeOrderDetailResponse(order, canViewOrderFinancials(session)));
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/payments/[paymentId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật thanh toán" }, { status: 500 });
  }
}
