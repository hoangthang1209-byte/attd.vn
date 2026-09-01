import type {
  CostingCalculatorInput,
  CostingCalculatorResult,
  CostingComponentBreakdown,
  CostingComponentInput,
  CostingComponentType,
} from "@/features/pricing/costing-types";

const PROCESS_COMPONENT_TYPES: CostingComponentType[] = [
  "CUTTING",
  "SEWING",
  "PRINTING",
  "EMBROIDERY",
  "WASH",
  "PACKAGING",
  "LOGISTICS",
  "OTHER",
];

const DEFAULT_COMPONENT_LABELS: Record<CostingComponentType, string> = {
  MATERIAL: "Vải / vật liệu chính",
  RIB: "Bo / phụ liệu chính",
  CUTTING: "Cắt",
  SEWING: "May",
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  WASH: "Wash",
  PACKAGING: "Đóng gói",
  LOGISTICS: "Logistics",
  OTHER: "Chi phí khác",
};

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function positive(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }
  return fallback;
}

function normalizeRate(value: unknown, fallback = 0): number {
  return Math.min(99.99, Math.max(0, positive(value, fallback)));
}

function componentTypeOf(input: CostingComponentInput): CostingComponentType {
  const type = input.type ?? "OTHER";
  return [
    "MATERIAL",
    "RIB",
    "CUTTING",
    "SEWING",
    "PRINTING",
    "EMBROIDERY",
    "WASH",
    "PACKAGING",
    "LOGISTICS",
    "OTHER",
  ].includes(type)
    ? type
    : "OTHER";
}

function componentKey(label: string, index: number): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `component-${index + 1}`;
}

function buildComponentBreakdown(
  component: CostingComponentInput,
  quantity: number,
  index: number,
): CostingComponentBreakdown {
  const label = component.label?.trim() || DEFAULT_COMPONENT_LABELS[componentTypeOf(component)];
  const type = componentTypeOf(component);
  const quantityFactor = positive(component.quantityFactor, 1) || 1;
  const explicitTotal = component.totalCost != null ? positive(component.totalCost) : null;
  const unitCost =
    explicitTotal != null
      ? roundMoney(explicitTotal / quantity)
      : roundMoney(positive(component.unitCost) * quantityFactor);
  const totalCost =
    explicitTotal != null ? roundMoney(explicitTotal) : roundMoney(unitCost * quantity);

  return {
    key: component.key?.trim() || componentKey(label, index),
    label,
    type,
    unitCost,
    totalCost,
    quantityFactor,
    note: component.note?.trim() || null,
  };
}

export type CostingPreviewContext = {
  productName?: string | null;
  variantName?: string | null;
};

/** Client-side preview — mirrors server calculateCosting formulas without DB lookups. */
export function previewCostingCalculation(
  input: CostingCalculatorInput,
  context?: CostingPreviewContext,
): CostingCalculatorResult {
  const quantity = Math.max(1, Math.round(positive(input.quantity, 1)));
  const warnings: string[] = [];
  const productName =
    input.customProductName?.trim() || context?.productName?.trim() || "Sản phẩm tùy chỉnh";
  const fabricPrice = positive(input.fabricPrice);
  const fabricConsumption = positive(input.fabricConsumption);
  const fabricCostPerUnit =
    input.fabricCostPerUnit != null
      ? positive(input.fabricCostPerUnit)
      : roundMoney(fabricConsumption > 0 ? fabricPrice / fabricConsumption : 0);
  const ribCostPerUnit = positive(input.ribCostPerUnit);
  const baseComponents: CostingComponentInput[] = [];

  if (fabricCostPerUnit > 0) {
    baseComponents.push({
      key: "fabric",
      label: input.materialName?.trim() || "Vải / vật liệu chính",
      type: "MATERIAL",
      unitCost: fabricCostPerUnit,
      note:
        fabricConsumption > 0
          ? `Giá ${fabricPrice.toLocaleString("vi-VN")} / định mức ${fabricConsumption}`
          : undefined,
    });
  } else if (fabricPrice > 0 || fabricConsumption > 0) {
    warnings.push("Thiếu giá vải hoặc định mức nên chưa tính được cost vải.");
  }

  if (ribCostPerUnit > 0) {
    baseComponents.push({
      key: "rib",
      label: "Bo / phụ liệu chính",
      type: "RIB",
      unitCost: ribCostPerUnit,
    });
  }

  const components = [...baseComponents, ...(input.components ?? [])]
    .filter(
      (component) =>
        component.label?.trim() ||
        positive(component.unitCost) > 0 ||
        positive(component.totalCost) > 0,
    )
    .map((component, index) => buildComponentBreakdown(component, quantity, index));

  const materialCostPerUnit = roundMoney(
    components
      .filter((component) => component.type === "MATERIAL" || component.type === "RIB")
      .reduce((sum, component) => sum + component.unitCost, 0),
  );
  const processCostPerUnit = roundMoney(
    components
      .filter((component) => PROCESS_COMPONENT_TYPES.includes(component.type))
      .reduce((sum, component) => sum + component.unitCost, 0),
  );
  const componentCostPerUnit = roundMoney(
    components.reduce((sum, component) => sum + component.unitCost, 0),
  );
  const overheadRate = normalizeRate(input.overheadRate);
  const overheadCostPerUnit = roundMoney(componentCostPerUnit * (overheadRate / 100));
  const totalCostPerUnit = roundMoney(componentCostPerUnit + overheadCostPerUnit);
  const totalCost = roundMoney(totalCostPerUnit * quantity);
  const targetMarginRate = normalizeRate(input.targetMarginRate, 30);
  const suggestedSellingPricePerUnit = roundMoney(
    targetMarginRate >= 99.99
      ? totalCostPerUnit
      : totalCostPerUnit / (1 - targetMarginRate / 100),
  );
  const revenueBeforeVat = roundMoney(suggestedSellingPricePerUnit * quantity);
  const vatRate = normalizeRate(input.vatRate);
  const vatAmount = roundMoney((revenueBeforeVat * vatRate) / 100);
  const finalQuotePrice = roundMoney(revenueBeforeVat + vatAmount);
  const grossProfit = roundMoney(revenueBeforeVat - totalCost);
  const actualMarginRate =
    revenueBeforeVat > 0 ? roundMoney((grossProfit / revenueBeforeVat) * 100) : 0;

  if (totalCostPerUnit <= 0) {
    warnings.push("Tổng cost đang bằng 0. Kiểm tra lại các dòng chi phí.");
  }
  if (!input.productId && !input.customProductName?.trim()) {
    warnings.push("Chưa chọn sản phẩm hoặc nhập tên sản phẩm tùy chỉnh.");
  }

  return {
    productId: input.productId ?? null,
    variantId: input.variantId ?? null,
    productName,
    variantName: context?.variantName ?? null,
    quantity,
    unit: input.unit?.trim() || "cái",
    materialName: input.materialName?.trim() || null,
    gsm: input.gsm != null ? positive(input.gsm) : null,
    fabricPrice,
    fabricConsumption,
    fabricCostPerUnit,
    ribCostPerUnit,
    materialCostPerUnit,
    processCostPerUnit,
    componentCostPerUnit,
    overheadRate,
    overheadCostPerUnit,
    totalCostPerUnit,
    totalCost,
    targetMarginRate,
    suggestedSellingPricePerUnit,
    revenueBeforeVat,
    vatRate,
    vatAmount,
    finalQuotePrice,
    grossProfit,
    actualMarginRate,
    components,
    warnings: [...new Set(warnings)],
  };
}
