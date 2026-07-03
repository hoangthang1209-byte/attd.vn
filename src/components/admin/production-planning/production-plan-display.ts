import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionPlanJobRow } from "@/features/production-planning/production-plan.types";
import { PRODUCTION_PLAN_PRIORITY_LABELS } from "@/features/production-planning/production-plan-labels";
import type { ProductionPlanPriority } from "@prisma/client";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(iso: string | null, now = new Date()): number | null {
  if (!iso) return null;
  const target = startOfDay(new Date(iso));
  const today = startOfDay(now);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatDeadlineCell(row: ProductionPlanJobRow): {
  primary: string;
  deliveryLine: string | null;
  relative: string | null;
  relativeTone: "danger" | "warn" | "muted" | "default";
} {
  const internal = row.internalDeadline;
  const delivery = row.deliveryDeadline;
  const sameDay =
    internal &&
    delivery &&
    startOfDay(new Date(internal)).getTime() === startOfDay(new Date(delivery)).getTime();

  let primary: string;
  if (internal) {
    primary = formatOrderDate(internal);
  } else {
    primary = "Chưa có hạn SX";
  }

  let deliveryLine: string | null = null;
  if (delivery && (!internal || !sameDay)) {
    deliveryLine = `Giao khách: ${formatOrderDate(delivery)}`;
  }

  let relative: string | null = null;
  let relativeTone: "danger" | "warn" | "muted" | "default" = "default";

  if (row.risks.includes("Quá hạn")) {
    const ref = internal ?? delivery;
    const diff = daysUntil(ref);
    if (diff != null && diff < 0) {
      relative = `Quá hạn ${Math.abs(diff)} ngày`;
      relativeTone = "danger";
    } else {
      relative = "Quá hạn";
      relativeTone = "danger";
    }
  } else if (row.risks.includes("Sắp trễ")) {
    relative = "Sắp trễ";
    relativeTone = "warn";
  } else if (!row.planId && !internal) {
    relative = "Chưa lập kế hoạch";
    relativeTone = "muted";
  } else {
    const ref = internal ?? delivery;
    const diff = daysUntil(ref);
    if (diff != null) {
      if (diff === 0) {
        relative = "Hôm nay";
        relativeTone = "warn";
      } else if (diff > 0 && diff <= 3) {
        relative = `${diff} ngày nữa`;
        relativeTone = diff <= 2 ? "warn" : "default";
      }
    }
  }

  return { primary, deliveryLine, relative, relativeTone };
}

export function formatPlanningCell(row: ProductionPlanJobRow): {
  range: string;
  priorityBadge: string | null;
  priorityClass: string;
} {
  const start = row.plannedStartAt ? formatOrderDate(row.plannedStartAt) : null;
  const end = row.plannedEndAt ? formatOrderDate(row.plannedEndAt) : null;

  let range: string;
  if (start && end) range = `${start} → ${end}`;
  else if (end) range = `Đến ${end}`;
  else if (start) range = `Từ ${start}`;
  else if (!row.planId) range = "Chưa lập kế hoạch";
  else range = "—";

  const priorityBadge =
    row.priority === "URGENT" || row.priority === "HIGH"
      ? PRODUCTION_PLAN_PRIORITY_LABELS[row.priority]
      : null;

  const priorityClass =
    row.priority === "URGENT"
      ? "prod-plan-priority--urgent"
      : row.priority === "HIGH"
        ? "prod-plan-priority--high"
        : "";

  return { range, priorityBadge, priorityClass };
}

export function formatStatusSecondaries(row: ProductionPlanJobRow): string[] {
  const lines: string[] = [];
  const blockedByRisk = new Set(row.risks);

  if (
    row.docStatus === "ok" &&
    row.status !== "WAITING_DOCUMENTS" &&
    !blockedByRisk.has("Thiếu file")
  ) {
    lines.push("Tài liệu đủ");
  }
  if (
    row.materialStatus === "ok" &&
    row.status !== "WAITING_MATERIALS" &&
    !blockedByRisk.has("Thiếu vật tư")
  ) {
    lines.push("Vật tư đủ");
  }
  if (row.qcStatus === "awaiting" && !blockedByRisk.has("Chờ QC") && !blockedByRisk.has("Cần làm lại")) {
    lines.push("QC chờ xử lý");
  }

  return lines.slice(0, 2);
}

export function formatQuantity(row: ProductionPlanJobRow): string {
  return `${row.quantity.toLocaleString("vi-VN")} ${row.quantityUnit}`;
}

export function priorityClass(p: ProductionPlanPriority): string {
  if (p === "URGENT") return "prod-plan-priority--urgent";
  if (p === "HIGH") return "prod-plan-priority--high";
  if (p === "LOW") return "prod-plan-priority--low";
  return "";
}

export function statusClass(status: string): string {
  return `prod-plan-status prod-plan-status--${status.toLowerCase()}`;
}
