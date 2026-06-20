import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function getAllowedOrderStatusTransitions(status: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function orderStatusActionLabel(status: OrderStatus): string | null {
  switch (status) {
    case "CONFIRMED":
      return "Xác nhận đơn";
    case "IN_PRODUCTION":
      return "Bắt đầu sản xuất";
    case "READY_TO_SHIP":
      return "Sẵn sàng giao";
    case "SHIPPED":
      return "Đã giao hàng";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Hủy đơn";
    default:
      return null;
  }
}

export function formatOrderStatusTransition(from: OrderStatus, to: OrderStatus): string {
  return `Trạng thái: ${ORDER_STATUS_LABELS[from]} → ${ORDER_STATUS_LABELS[to]}`;
}

export function orderStatusTimestampField(status: OrderStatus): string | null {
  switch (status) {
    case "CONFIRMED":
      return "confirmedAt";
    case "IN_PRODUCTION":
      return "productionStartedAt";
    case "READY_TO_SHIP":
      return "readyToShipAt";
    case "SHIPPED":
      return "shippedAt";
    case "COMPLETED":
      return "completedAt";
    case "CANCELLED":
      return "cancelledAt";
    default:
      return null;
  }
}

export function isOrderPaymentLocked(status: OrderStatus): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}
