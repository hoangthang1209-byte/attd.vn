import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can, canViewOrderFinancials } from "@/features/auth/admin-permissions";
import { canAccessOrderRecord } from "@/features/auth/order-scope";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import {
  closeOrderActualCost,
  OrderActualCostValidationError,
} from "@/features/orders/order-actual-cost.service";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return permission.response;

  const { id } = await context.params;
  const session = getAdminSessionFromRequest(req);
  if (!can(session, "orders.update") || !canViewOrderFinancials(session)) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

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
  if (
    !canAccessOrderRecord(session, row, "orders.update") ||
    !canAccessOrderRecord(session, row, "orders.view_financials")
  ) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  let note: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && typeof (body as { note?: unknown }).note === "string") {
      note = (body as { note: string }).note;
    }
  } catch {
    // note optional
  }

  try {
    const summary = await closeOrderActualCost(id, session.userId, note);
    return NextResponse.json({ actualCost: summary });
  } catch (err) {
    if (err instanceof OrderActualCostValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/actual-cost/close]", err);
    return NextResponse.json({ message: "Không thể chốt chi phí thực tế" }, { status: 500 });
  }
}
