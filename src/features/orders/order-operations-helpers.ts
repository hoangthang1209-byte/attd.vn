import type { OrderStatus } from "@prisma/client";
import type {
  DeliveryReadiness,
  ProductionUrgency,
} from "@/features/orders/order-operations.types";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getProductionUrgency(
  productionDueDate: Date | null | undefined,
  now = new Date(),
): ProductionUrgency {
  if (!productionDueDate) return "NO_DUE_DATE";
  const due = startOfDay(productionDueDate);
  const today = startOfDay(now);
  if (due < today) return "OVERDUE";
  if (due.getTime() === today.getTime()) return "TODAY";
  const inThreeDays = endOfDay(addDays(today, 3));
  if (productionDueDate <= inThreeDays) return "UPCOMING";
  return "ON_TRACK";
}

export type DeliveryInfoInput = {
  status: OrderStatus;
  deliveryRecipientName?: string | null;
  deliveryRecipientPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryMethodId?: string | null;
  deliveryMethodName?: string | null;
  deliveryMethod?: string | null;
  deliveryMethodRequiresCarrier?: boolean;
  deliveryCarrierId?: string | null;
  deliveryCarrierName?: string | null;
  deliveryCarrier?: string | null;
  deliveryExpectedAt?: Date | null;
  deliveredAt?: Date | null;
};

export function getMissingDeliveryFields(order: DeliveryInfoInput): string[] {
  const missing: string[] = [];
  if (!order.deliveryRecipientName?.trim()) missing.push("Người nhận");
  if (!order.deliveryRecipientPhone?.trim()) missing.push("Số điện thoại");
  if (!order.deliveryAddress?.trim()) missing.push("Địa chỉ giao hàng");
  if (
    !order.deliveryMethodId &&
    !order.deliveryMethodName?.trim() &&
    !order.deliveryMethod?.trim()
  ) {
    missing.push("Hình thức giao hàng");
  }
  if (order.deliveryMethodRequiresCarrier) {
    const carrier =
      order.deliveryCarrierId ||
      order.deliveryCarrierName?.trim() ||
      order.deliveryCarrier?.trim();
    if (!carrier) missing.push("Đơn vị vận chuyển");
  }
  return missing;
}

export function getDeliveryReadiness(
  order: DeliveryInfoInput,
  now = new Date(),
): DeliveryReadiness {
  if (order.status === "COMPLETED") return "COMPLETED";
  const missing = getMissingDeliveryFields(order);
  if (order.status === "READY_TO_SHIP") {
    return missing.length > 0 ? "MISSING_INFO" : "READY";
  }
  if (order.status === "SHIPPED") {
    if (order.deliveredAt) return "COMPLETED";
    if (
      order.deliveryExpectedAt &&
      order.deliveryExpectedAt < now &&
      !order.deliveredAt
    ) {
      return "LATE";
    }
    return missing.length > 0 ? "MISSING_INFO" : "IN_TRANSIT";
  }
  return missing.length > 0 ? "MISSING_INFO" : "READY";
}

export { startOfDay, endOfDay, addDays };
