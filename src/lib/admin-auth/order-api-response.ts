import { NextResponse } from "next/server";
import type { AdminSessionUser } from "@/features/auth/order-financial-permissions";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { shapeOrderDetailResponse } from "@/features/orders/order-financial-redact";

export function jsonOrderDetailResponse(
  order: OrderDetailRecord,
  session: AdminSessionUser,
  init?: ResponseInit,
) {
  return NextResponse.json(
    shapeOrderDetailResponse(order, canViewOrderFinancials(session)),
    init,
  );
}
