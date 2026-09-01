import type { CostingComponentType } from "@/features/pricing/costing-types";

export const COSTING_COMPONENT_TYPE_OPTIONS: Array<{ value: CostingComponentType; label: string }> = [
  { value: "CUTTING", label: "Cắt" },
  { value: "SEWING", label: "May" },
  { value: "PRINTING", label: "In" },
  { value: "EMBROIDERY", label: "Thêu" },
  { value: "WASH", label: "Wash" },
  { value: "PACKAGING", label: "Đóng gói" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "OTHER", label: "Khác" },
];

export function costingComponentTypeLabel(type: CostingComponentType): string {
  return COSTING_COMPONENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}
