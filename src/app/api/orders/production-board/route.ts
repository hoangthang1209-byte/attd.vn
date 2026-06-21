import type { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getProductionBoardOrders,
} from "@/features/orders/order-operations.service";
import type { ProductionDueFilter } from "@/features/orders/order-operations.types";

const DUE_FILTERS = new Set<ProductionDueFilter>([
  "overdue",
  "today",
  "upcoming",
  "upcoming3",
  "upcoming7",
  "none",
]);

const STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status");
  const dueRaw = searchParams.get("due");

  try {
    const result = await getProductionBoardOrders({
      status:
        statusRaw && STATUSES.has(statusRaw as OrderStatus)
          ? (statusRaw as OrderStatus)
          : undefined,
      ownerId: searchParams.get("ownerId") ?? undefined,
      due:
        dueRaw && DUE_FILTERS.has(dueRaw as ProductionDueFilter)
          ? (dueRaw as ProductionDueFilter)
          : undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      salesEmployeeId: searchParams.get("salesEmployeeId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/orders/production-board]", err);
    return NextResponse.json({ message: "Không thể tải bảng sản xuất" }, { status: 500 });
  }
}
