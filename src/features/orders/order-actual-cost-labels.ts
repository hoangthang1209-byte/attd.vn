import type { OrderActualCostCategory } from "@prisma/client";

export const ORDER_ACTUAL_COST_CATEGORY_LABELS: Record<OrderActualCostCategory, string> = {
  PRODUCTION: "Sản xuất / Xưởng",
  PRINT_EMBROIDERY: "In / Thêu / Gia công",
  MATERIAL: "Nguyên phụ liệu",
  PACKAGING: "Đóng gói",
  SHIPPING: "Vận chuyển",
  OTHER: "Khác",
};

export const ORDER_ACTUAL_COST_CATEGORIES = Object.keys(
  ORDER_ACTUAL_COST_CATEGORY_LABELS,
) as OrderActualCostCategory[];

export function isOrderActualCostCategory(value: unknown): value is OrderActualCostCategory {
  return typeof value === "string" && value in ORDER_ACTUAL_COST_CATEGORY_LABELS;
}
