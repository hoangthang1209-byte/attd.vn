import type { AdminSearchEntityType } from "@/features/admin-search/types";

export const ADMIN_SEARCH_ENTITY_LABELS: Record<AdminSearchEntityType, string> = {
  OPPORTUNITY: "Cơ hội",
  LEAD: "Lead",
  CUSTOMER: "Khách hàng",
  CONTACT: "Liên hệ",
  QUOTE: "Báo giá",
  PRICING: "Bản tính giá",
  ORDER: "Đơn hàng",
  PRODUCT: "Sản phẩm",
  VARIANT: "Biến thể",
  TECH_PACK: "Tech Pack",
};

export const ADMIN_SEARCH_TYPE_BADGES: Record<AdminSearchEntityType, string> = {
  OPPORTUNITY: "OPP",
  LEAD: "LEAD",
  CUSTOMER: "CUS",
  CONTACT: "CONTACT",
  QUOTE: "QUOTE",
  PRICING: "COST",
  ORDER: "ORDER",
  PRODUCT: "PRODUCT",
  VARIANT: "SKU",
  TECH_PACK: "TP",
};
