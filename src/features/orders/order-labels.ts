import type {
  OrderActivityType,
  OrderPaymentMethod,
  OrderPaymentStatus,
  OrderPaymentType,
  OrderStatus,
} from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Đơn mới",
  CONFIRMED: "Đã xác nhận",
  IN_PRODUCTION: "Đang sản xuất",
  READY_TO_SHIP: "Sẵn sàng giao",
  SHIPPED: "Đã giao hàng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

export const ORDER_PAYMENT_TYPE_LABELS: Record<OrderPaymentType, string> = {
  DEPOSIT: "Tiền cọc",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  ADJUSTMENT: "Điều chỉnh",
};

export const ORDER_PAYMENT_METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  BANK_TRANSFER: "Chuyển khoản",
  CASH: "Tiền mặt",
  OTHER: "Khác",
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  CONFIRMED: "Đã ghi nhận",
  VOID: "Đã hủy",
};

export const ORDER_PAYMENT_STATE_LABELS = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERPAID: "Thanh toán vượt",
} as const;

export type OrderPaymentStateFilter = keyof typeof ORDER_PAYMENT_STATE_LABELS;

export const ORDER_ACTIVITY_TYPE_LABELS: Record<OrderActivityType, string> = {
  CREATED: "Tạo đơn",
  STATUS_CHANGED: "Đổi trạng thái",
  PAYMENT_RECORDED: "Ghi nhận thanh toán",
  PAYMENT_VOIDED: "Hủy ghi nhận thanh toán",
  PAYMENT_EDITED: "Chỉnh sửa thanh toán",
  ORDER_EDITED: "Cập nhật đơn hàng",
  PRODUCTION_UPDATED: "Cập nhật sản xuất",
  DELIVERY_UPDATED: "Cập nhật giao hàng",
  NOTE_ADDED: "Thêm ghi chú",
};
