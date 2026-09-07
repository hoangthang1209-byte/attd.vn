import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can, canViewOrderFinancials } from "@/features/auth/admin-permissions";
import { canAccessOrderRecord } from "@/features/auth/order-scope";
import {
  DATA_ACCESS_DENIED_MESSAGE,
  ORDER_FINANCIAL_DENIED_MESSAGE,
} from "@/features/auth/admin-session.types";
import {
  getOrderActualCostSummary,
  OrderActualCostValidationError,
  createOrderActualCostEntry,
} from "@/features/orders/order-actual-cost.service";
import { parseUpsertActualCostEntryBody } from "@/features/orders/order-actual-cost-input";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOrderScope(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      salesEmployeeId: true,
      productionOwnerId: true,
      deliveryOwnerId: true,
    },
  });
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const session = getAdminSessionFromRequest(req);
  try {
    const row = await loadOrderScope(id);
    if (!row) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    if (!canAccessOrderRecord(session, row, "orders.view")) {
      return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
    }
    if (
      !canViewOrderFinancials(session) ||
      !canAccessOrderRecord(session, row, "orders.view_financials")
    ) {
      return NextResponse.json({ message: ORDER_FINANCIAL_DENIED_MESSAGE }, { status: 403 });
    }

    const summary = await getOrderActualCostSummary(id);
    return NextResponse.json({ actualCost: summary });
  } catch (err) {
    if (err instanceof OrderActualCostValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[GET /api/orders/[id]/actual-cost]", err);
    return NextResponse.json({ message: "Không thể tải chi phí thực tế" }, { status: 500 });
  }
}

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

  const row = await loadOrderScope(id);
  if (!row) {
    return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
  }
  if (
    !canAccessOrderRecord(session, row, "orders.update") ||
    !canAccessOrderRecord(session, row, "orders.view_financials")
  ) {
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
    const input = parseUpsertActualCostEntryBody(body as Record<string, unknown>);
    const summary = await createOrderActualCostEntry(id, input, session.userId);
    return NextResponse.json({ actualCost: summary }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderActualCostValidationError || err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[POST /api/orders/[id]/actual-cost]", err);
    return NextResponse.json({ message: "Không thể thêm chi phí thực tế" }, { status: 500 });
  }
}
