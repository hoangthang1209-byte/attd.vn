import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { can, canViewOrderFinancials } from "@/features/auth/admin-permissions";
import { canAccessOrderRecord } from "@/features/auth/order-scope";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import {
  deleteOrderActualCostEntry,
  OrderActualCostValidationError,
  updateOrderActualCostEntry,
} from "@/features/orders/order-actual-cost.service";
import { parseUpsertActualCostEntryBody } from "@/features/orders/order-actual-cost-input";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { requireAdminPermission } from "@/lib/permissions/require-admin-permission";

type RouteContext = { params: Promise<{ id: string; entryId: string }> };

async function assertMutateAccess(req: NextRequest, orderId: string) {
  const permission = await requireAdminPermission({
    platform: "commercial",
    action: "update",
    request: req,
  });
  if (!permission.ok) return { ok: false as const, response: permission.response };

  const session = getAdminSessionFromRequest(req);
  if (!can(session, "orders.update") || !canViewOrderFinancials(session)) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    };
  }

  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      salesEmployeeId: true,
      productionOwnerId: true,
      deliveryOwnerId: true,
    },
  });
  if (!row) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 }),
    };
  }
  if (
    !canAccessOrderRecord(session, row, "orders.update") ||
    !canAccessOrderRecord(session, row, "orders.view_financials")
  ) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 }),
    };
  }

  return { ok: true as const, session };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id, entryId } = await context.params;
  const access = await assertMutateAccess(req, id);
  if (!access.ok) return access.response;

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
    const summary = await updateOrderActualCostEntry(id, entryId, input, access.session.userId);
    return NextResponse.json({ actualCost: summary });
  } catch (err) {
    if (err instanceof OrderActualCostValidationError || err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[PATCH /api/orders/[id]/actual-cost/entries/[entryId]]", err);
    return NextResponse.json({ message: "Không thể cập nhật chi phí thực tế" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id, entryId } = await context.params;
  const access = await assertMutateAccess(req, id);
  if (!access.ok) return access.response;

  try {
    const summary = await deleteOrderActualCostEntry(id, entryId);
    return NextResponse.json({ actualCost: summary });
  } catch (err) {
    if (err instanceof OrderActualCostValidationError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[DELETE /api/orders/[id]/actual-cost/entries/[entryId]]", err);
    return NextResponse.json({ message: "Không thể xóa chi phí thực tế" }, { status: 500 });
  }
}
