import { NextRequest, NextResponse } from "next/server";
import { parseVoidPaymentBody } from "@/features/orders/order-input";
import { shapeOrderDetailResponse } from "@/features/orders/order-financial-redact";
import {
  OrderValidationError,
  voidOrderPayment,
} from "@/features/orders/order.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { assertFinancialApiAccess } from "@/lib/admin-auth/financial-access";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { id, paymentId } = await context.params;
  const session = getAdminSessionFromRequest(req);
  const forbidden = assertFinancialApiAccess(session, "POST /api/orders/[id]/payments/[paymentId]/void");
  if (forbidden) return forbidden;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const order = await voidOrderPayment(
      id,
      paymentId,
      parseVoidPaymentBody((body ?? {}) as Record<string, unknown>).voidReason,
    );
    return NextResponse.json(shapeOrderDetailResponse(order, canViewOrderFinancials(session)));
  } catch (err) {
    if (err instanceof OrderValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/payments/[paymentId]/void]", err);
    return NextResponse.json({ message: "Không thể hủy ghi nhận thanh toán" }, { status: 500 });
  }
}
