import type {
  DeliveryReadiness,
  ProductionUrgency,
} from "@/features/orders/order-operations.types";

export function productionUrgencyLabel(urgency: ProductionUrgency): string {
  switch (urgency) {
    case "OVERDUE":
      return "Quá hạn";
    case "TODAY":
      return "Đến hạn hôm nay";
    case "UPCOMING":
      return "Sắp đến hạn";
    case "NO_DUE_DATE":
      return "Chưa có hạn";
    case "ON_TRACK":
      return "Đúng tiến độ";
  }
}

export function productionUrgencyClass(urgency: ProductionUrgency): string {
  switch (urgency) {
    case "OVERDUE":
      return "ops-urgency--overdue";
    case "TODAY":
      return "ops-urgency--today";
    case "UPCOMING":
      return "ops-urgency--upcoming";
    case "NO_DUE_DATE":
      return "ops-urgency--muted";
    case "ON_TRACK":
      return "ops-urgency--ok";
  }
}

export function deliveryReadinessLabel(readiness: DeliveryReadiness): string {
  switch (readiness) {
    case "READY":
      return "Sẵn sàng giao";
    case "MISSING_INFO":
      return "Thiếu thông tin";
    case "LATE":
      return "Giao trễ dự kiến";
    case "IN_TRANSIT":
      return "Đang giao";
    case "COMPLETED":
      return "Đã hoàn tất";
  }
}

export function deliveryReadinessClass(readiness: DeliveryReadiness): string {
  switch (readiness) {
    case "READY":
      return "ops-readiness--ready";
    case "MISSING_INFO":
      return "ops-readiness--missing";
    case "LATE":
      return "ops-readiness--late";
    case "IN_TRANSIT":
      return "ops-readiness--transit";
    case "COMPLETED":
      return "ops-readiness--completed";
  }
}
