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

const STATUS_ORDER: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
];

const CORRECTABLE_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
]);

export function getAllowedOrderStatusTransitions(status: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function getOrderStatusCorrectionTargets(from: OrderStatus): OrderStatus[] {
  if (!CORRECTABLE_STATUSES.has(from)) return [];
  const fromIndex = STATUS_ORDER.indexOf(from);
  return STATUS_ORDER.filter(
    (s) => CORRECTABLE_STATUSES.has(s) && STATUS_ORDER.indexOf(s) < fromIndex,
  );
}

export function isOrderStatusCorrection(from: OrderStatus, to: OrderStatus): boolean {
  if (!CORRECTABLE_STATUSES.has(from) || !CORRECTABLE_STATUSES.has(to)) return false;
  return STATUS_ORDER.indexOf(to) < STATUS_ORDER.indexOf(from);
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canUpdateOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  options?: { correctionReason?: string | null },
): { allowed: boolean; isCorrection: boolean; error?: string } {
  if (from === "COMPLETED" || from === "CANCELLED") {
    return { allowed: false, isCorrection: false, error: "Không thể thay đổi trạng thái đơn hàng đã hoàn tất hoặc đã hủy." };
  }

  if (canTransitionOrderStatus(from, to)) {
    return { allowed: true, isCorrection: false };
  }

  if (isOrderStatusCorrection(from, to)) {
    if (!options?.correctionReason?.trim()) {
      return {
        allowed: false,
        isCorrection: true,
        error: "Vui lòng nhập lý do điều chỉnh trạng thái.",
      };
    }
    return { allowed: true, isCorrection: true };
  }

  return { allowed: false, isCorrection: false, error: "Không thể chuyển đơn hàng sang trạng thái này." };
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

export function orderStatusCorrectionLabel(status: OrderStatus): string {
  return `Quay lại: ${ORDER_STATUS_LABELS[status]}`;
}

export function formatOrderStatusTransition(from: OrderStatus, to: OrderStatus): string {
  return `Trạng thái: ${ORDER_STATUS_LABELS[from]} → ${ORDER_STATUS_LABELS[to]}`;
}

export function formatOrderStatusCorrection(from: OrderStatus, to: OrderStatus): string {
  return `Điều chỉnh trạng thái từ ${ORDER_STATUS_LABELS[from]} sang ${ORDER_STATUS_LABELS[to]}`;
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

export function isOrderEditable(status: OrderStatus): boolean {
  return status !== "COMPLETED" && status !== "CANCELLED";
}

export type DeliveryInfoLike = {
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
};

export function orderCarrierDisplay(order: {
  deliveryCarrierName?: string | null;
  deliveryCarrier?: string | null;
}): string | null {
  return order.deliveryCarrierName?.trim() || order.deliveryCarrier?.trim() || null;
}

export function validateDeliveryForShipped(order: DeliveryInfoLike): string | null {
  const name = order.deliveryRecipientName?.trim();
  const phone = order.deliveryRecipientPhone?.trim();
  const address = order.deliveryAddress?.trim();
  if (!name || !phone || !address) {
    return "Vui lòng nhập đầy đủ thông tin giao hàng trước khi chuyển sang Đã giao hàng.";
  }
  const method =
    order.deliveryMethodId ||
    order.deliveryMethodName?.trim() ||
    order.deliveryMethod?.trim();
  if (!method) {
    return "Vui lòng chọn hình thức giao hàng trước khi chuyển sang Đã giao hàng.";
  }
  if (order.deliveryMethodRequiresCarrier) {
    const carrier =
      order.deliveryCarrierId ||
      order.deliveryCarrierName?.trim() ||
      order.deliveryCarrier?.trim();
    if (!carrier) {
      return "Vui lòng chọn đơn vị vận chuyển trước khi chuyển sang Đã giao hàng.";
    }
  }
  return null;
}
