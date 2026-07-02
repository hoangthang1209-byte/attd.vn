import type { OrderStatus } from "@prisma/client";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";

export type OrderMilestoneKey = "confirmed" | "production" | "qc" | "ready" | "delivered";

export type OrderMilestoneStep = {
  key: OrderMilestoneKey;
  label: string;
  state: "done" | "current" | "pending";
};

const MILESTONE_LABELS: Record<OrderMilestoneKey, string> = {
  confirmed: "Đã xác nhận",
  production: "Đang sản xuất",
  qc: "QC",
  ready: "Sẵn sàng giao",
  delivered: "Đã giao",
};

const STATUS_ORDER: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

function statusIndex(status: OrderStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function deriveOrderMilestones(
  order: OrderDetailRecord,
  bundle: ProductionExecutionBundle | null,
): OrderMilestoneStep[] {
  const status = order.status;
  const idx = statusIndex(status);

  const hasQcActivity =
    bundle?.items.some(
      (i) =>
        i.readiness.state === "AWAITING_QC" ||
        (i.qc && i.qc.status !== "DRAFT"),
    ) ?? false;

  const keys: OrderMilestoneKey[] = ["confirmed", "production", "qc", "ready", "delivered"];

  let currentKey: OrderMilestoneKey = "confirmed";
  if (status === "CANCELLED") {
    currentKey = "confirmed";
  } else if (idx >= statusIndex("COMPLETED")) {
    currentKey = "delivered";
  } else if (idx >= statusIndex("SHIPPED")) {
    currentKey = "delivered";
  } else if (idx >= statusIndex("READY_TO_SHIP")) {
    currentKey = "ready";
  } else if (hasQcActivity && idx >= statusIndex("IN_PRODUCTION")) {
    currentKey = "qc";
  } else if (idx >= statusIndex("IN_PRODUCTION")) {
    currentKey = "production";
  } else if (idx >= statusIndex("CONFIRMED")) {
    currentKey = "confirmed";
  }

  const currentIndex = keys.indexOf(currentKey);

  return keys.map((key, i) => {
    let state: OrderMilestoneStep["state"] = "pending";
    if (status === "CANCELLED") {
      state = key === "confirmed" && order.confirmedAt ? "done" : "pending";
    } else if (i < currentIndex) {
      state = "done";
    } else if (i === currentIndex) {
      state = "current";
    }
    return { key, label: MILESTONE_LABELS[key], state };
  });
}

export function deriveProductionReadinessIndicator(
  order: OrderDetailRecord,
  bundle: ProductionExecutionBundle | null,
): { label: string; tone: "ok" | "active" | "warn" | "muted" } {
  if (order.status === "CANCELLED") {
    return { label: "Sản xuất: —", tone: "muted" };
  }
  if (!bundle || bundle.items.length === 0) {
    if (order.status === "CONFIRMED" || order.status === "NEW") {
      return { label: "Sản xuất: Chưa sẵn sàng", tone: "muted" };
    }
    return { label: "Sản xuất: Chưa sẵn sàng", tone: "muted" };
  }
  const state = bundle.orderReadiness.state;
  switch (state) {
    case "MISSING_DOCS":
      return { label: "Sản xuất: Có cảnh báo", tone: "warn" };
    case "AWAITING_PRODUCTION":
      return { label: "Sản xuất: Chuẩn bị", tone: "warn" };
    case "IN_PRODUCTION":
    case "AWAITING_QC":
      return { label: "Sản xuất: Chuẩn bị", tone: "active" };
    case "READY_TO_SHIP":
      return { label: "Sản xuất: Đủ điều kiện", tone: "ok" };
    case "NEEDS_ATTENTION":
      return { label: "Sản xuất: Có cảnh báo", tone: "warn" };
    default:
      return { label: `Sản xuất: ${bundle.orderReadiness.stateLabel}`, tone: "muted" };
  }
}
