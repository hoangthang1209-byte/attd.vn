import { NextResponse } from "next/server";
import { canViewOrderFinancials } from "@/features/auth/order-financial-permissions";
import { shapeOperationalSummaryResponse } from "@/features/orders/order-financial-redact";
import { getOrderOperationalSummary } from "@/features/orders/order-operations.service";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";

export async function GET() {
  try {
    const session = await getAdminSessionFromCookies();
    const summary = await getOrderOperationalSummary();
    const shaped = shapeOperationalSummaryResponse(summary, canViewOrderFinancials(session));
    return NextResponse.json(shaped);
  } catch (err) {
    console.error("[GET /api/orders/operations-summary]", err);
    return NextResponse.json({ message: "Không thể tải tổng quan vận hành" }, { status: 500 });
  }
}
