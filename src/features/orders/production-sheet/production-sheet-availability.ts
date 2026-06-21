import type { OrderStatus } from "@prisma/client";

const PRODUCTION_SHEET_ALLOWED: OrderStatus[] = [
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY_TO_SHIP",
  "SHIPPED",
  "COMPLETED",
];

type AvailabilityInput = { status: OrderStatus };

export function getProductionSheetAvailability(order: AvailabilityInput): {
  available: boolean;
  reason: string | null;
} {
  if (order.status === "CANCELLED") {
    return {
      available: false,
      reason: "Không thể tạo lệnh sản xuất cho đơn đã hủy.",
    };
  }
  if (order.status === "NEW") {
    return {
      available: false,
      reason: "Đơn hàng cần được xác nhận trước khi tạo lệnh sản xuất.",
    };
  }
  if (!PRODUCTION_SHEET_ALLOWED.includes(order.status)) {
    return {
      available: false,
      reason: "Không thể tạo lệnh sản xuất cho trạng thái đơn hàng này.",
    };
  }
  return { available: true, reason: null };
}

export function productionSheetPdfFilename(orderNo: string): string {
  const safeOrderNo = orderNo.replace(/[^\w-]+/g, "-");
  return `lenh-san-xuat-${safeOrderNo}.pdf`;
}
