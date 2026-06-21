import type { OrderStatus } from "@prisma/client";
import type { OrderDocumentType } from "@/features/orders/order-document-types";

type OrderAvailabilityInput = {
  status: OrderStatus;
  deliveryRecipientName: string | null;
  deliveryRecipientPhone: string | null;
  deliveryAddress: string | null;
  deliveryMethodId: string | null;
  deliveryMethodName: string | null;
  deliveryMethod: string | null;
  deliveryMethodRequiresCarrier: boolean;
  deliveryCarrierId: string | null;
  deliveryCarrierName: string | null;
  deliveryCarrier: string | null;
};

const PRODUCTION_ALLOWED: OrderStatus[] = [
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

export function getOrderDocumentAvailability(
  docType: OrderDocumentType,
  order: OrderAvailabilityInput,
): { available: boolean; reason: string | null } {
  if (docType === "confirmation") {
    if (order.status === "CANCELLED") {
      return {
        available: false,
        reason: "Không thể tạo xác nhận đơn hàng cho đơn đã hủy.",
      };
    }
    return { available: true, reason: null };
  }

  if (docType === "production") {
    if (!PRODUCTION_ALLOWED.includes(order.status)) {
      return {
        available: false,
        reason: "Đơn hàng cần được xác nhận trước khi tạo lệnh sản xuất.",
      };
    }
    return { available: true, reason: null };
  }

  const hasRecipient = Boolean(order.deliveryRecipientName?.trim());
  const hasPhone = Boolean(order.deliveryRecipientPhone?.trim());
  const hasAddress = Boolean(order.deliveryAddress?.trim());
  const hasMethod = Boolean(
    order.deliveryMethodId?.trim() ||
      order.deliveryMethodName?.trim() ||
      order.deliveryMethod?.trim(),
  );

  if (!hasRecipient || !hasPhone || !hasAddress || !hasMethod) {
    return {
      available: false,
      reason: "Vui lòng hoàn thiện thông tin giao hàng trước khi tạo phiếu giao hàng.",
    };
  }

  if (order.deliveryMethodRequiresCarrier) {
    const hasCarrier = Boolean(
      order.deliveryCarrierId?.trim() ||
        order.deliveryCarrierName?.trim() ||
        order.deliveryCarrier?.trim(),
    );
    if (!hasCarrier) {
      return {
        available: false,
        reason: "Vui lòng chọn đơn vị vận chuyển trước khi tạo phiếu giao hàng.",
      };
    }
  }

  return { available: true, reason: null };
}
