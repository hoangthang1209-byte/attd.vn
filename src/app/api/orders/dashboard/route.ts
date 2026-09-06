import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import type { OrderPaymentStateFilter } from "@/features/orders/order-labels";
import { can, canViewOrderFinancials } from "@/features/auth/admin-permissions";
import { DATA_ACCESS_DENIED_MESSAGE } from "@/features/auth/admin-session.types";
import { getAdminSessionFromRequest } from "@/lib/admin-auth/get-admin-session";
import { parseOrderListCustomerId } from "@/features/orders/order-list-customer-id";
import { listOrderDashboard } from "@/features/orders/order-list-dashboard.service";
import type {
  OrderListKpiKey,
  OrderListQuickFilter,
} from "@/features/orders/order-list-dashboard.types";

const KPI_KEYS = new Set<OrderListKpiKey>([
  "in_production",
  "awaiting_qc",
  "ready_to_ship",
  "at_risk",
  "overdue",
  "needs_action",
]);

const QUICK_FILTERS = new Set<OrderListQuickFilter>([
  "all",
  "mine",
  "in_production",
  "awaiting_qc",
  "missing_docs",
  "missing_materials",
  "ready_to_ship",
  "overdue",
]);

export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!can(session, "orders.view")) {
    return NextResponse.json({ message: DATA_ACCESS_DENIED_MESSAGE }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const kpiRaw = searchParams.get("kpi");
  const quickRaw = searchParams.get("quickFilter");
  const statusRaw = searchParams.get("status");
  const paymentRaw = searchParams.get("paymentState");
  const customerIdRaw = searchParams.get("customerId");
  const customerId = parseOrderListCustomerId(customerIdRaw);

  if (customerIdRaw?.trim() && !customerId) {
    return NextResponse.json({ message: "customerId không hợp lệ" }, { status: 400 });
  }

  try {
    const result = await listOrderDashboard(
      session,
      {
        search: searchParams.get("search") ?? undefined,
        customerId,
        status: statusRaw ? (statusRaw as OrderStatus) : undefined,
        paymentState: paymentRaw ? (paymentRaw as OrderPaymentStateFilter) : undefined,
        quickFilter:
          quickRaw && QUICK_FILTERS.has(quickRaw as OrderListQuickFilter)
            ? (quickRaw as OrderListQuickFilter)
            : undefined,
        kpi: kpiRaw && KPI_KEYS.has(kpiRaw as OrderListKpiKey) ? (kpiRaw as OrderListKpiKey) : undefined,
        mine: searchParams.get("mine") === "1",
        page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
        pageSize: searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50,
      },
      {
        canViewFinancials: canViewOrderFinancials(session),
        canCreateOrders: can(session, "orders.create"),
      },
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/orders/dashboard]", err);
    return NextResponse.json({ message: "Không thể tải danh sách đơn hàng" }, { status: 500 });
  }
}
