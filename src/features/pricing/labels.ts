import type {
  PricingCalculationStatus,
  PricingCalculationType,
  PricingServiceType,
} from "@prisma/client";

export const PRICING_STATUS_LABELS: Record<PricingCalculationStatus, string> = {
  DRAFT: "Nháp",
  CALCULATED: "Đã tính",
  USED_FOR_QUOTE: "Đã dùng báo giá",
  ARCHIVED: "Lưu trữ",
};

export const PRICING_SERVICE_TYPE_LABELS: Record<PricingServiceType, string> = {
  PRINT_DTF: "In DTF",
  PRINT_SILK: "In lụa",
  EMBROIDERY: "Thêu",
  OEM: "May/OEM",
  PACKAGING: "Đóng gói",
  DESIGN: "Thiết kế",
  SETUP: "Phí setup",
  SHIPPING: "Vận chuyển",
  OTHER: "Khác",
};

export const PRICING_CALCULATION_TYPE_LABELS: Record<PricingCalculationType, string> = {
  PER_ITEM: "Theo sản phẩm",
  PER_ORDER: "Theo đơn",
  PER_POSITION: "Theo vị trí",
  MANUAL: "Nhập tay",
};

export function getPricingStatusLabel(status: PricingCalculationStatus): string {
  return PRICING_STATUS_LABELS[status] ?? status;
}

export function getServiceTypeLabel(type: PricingServiceType): string {
  return PRICING_SERVICE_TYPE_LABELS[type] ?? type;
}

export function getCalculationTypeLabel(type: PricingCalculationType): string {
  return PRICING_CALCULATION_TYPE_LABELS[type] ?? type;
}
