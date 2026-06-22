import type { OrderStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  getDeliveryBoardOrders,
} from "@/features/orders/order-operations.service";
import type { DeliveryReadiness } from "@/features/orders/order-operations.types";

const STATUSES = new Set<OrderStatus>(["READY_TO_SHIP", "SHIPPED", "COMPLETED"]);
const READINESS = new Set<DeliveryReadiness>([
  "READY",
  "MISSING_INFO",
  "LATE",
  "IN_TRANSIT",
  "COMPLETED",
]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusRaw = searchParams.get("status");
  const readinessRaw = searchParams.get("readiness");

  try {
    const result = await getDeliveryBoardOrders({
      status:
        statusRaw && STATUSES.has(statusRaw as OrderStatus)
          ? (statusRaw as OrderStatus)
          : undefined,
      readiness:
        readinessRaw && READINESS.has(readinessRaw as DeliveryReadiness)
          ? (readinessRaw as DeliveryReadiness)
          : undefined,
      includeCompleted:
        searchParams.get("includeCompleted") === "1" ||
        searchParams.get("completedToday") === "1",
      completedToday: searchParams.get("completedToday") === "1",
      search: searchParams.get("search") ?? undefined,
      executionFilter: searchParams.get("execution") ?? undefined,
      proofFilter: searchParams.get("proof") ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/orders/delivery-board]", err);
    return NextResponse.json({ message: "Không thể tải bảng giao hàng" }, { status: 500 });
  }
}
