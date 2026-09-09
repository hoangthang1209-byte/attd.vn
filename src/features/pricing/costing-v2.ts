import type {
  CostingCalculatorInput,
  CostingCalculatorResult,
  CostingComponentBreakdown,
  CostingComponentType,
  CostingLineOrigin,
  CostingLineSection,
  CostingPreviewContext,
  CostingPricingBasis,
  CostingStructuredLine,
} from "@/features/pricing/costing-types";
import type { PricingCalculationType } from "@prisma/client";
import { costLibraryCategoryToComponentType } from "@/features/pricing/cost-library";

export const COSTING_WORKSPACE_VERSION = 2 as const;

const DEFAULT_COMPONENT_LABELS: Record<CostingComponentType, string> = {
  MATERIAL: "Vải / vật liệu chính",
  RIB: "Bo / phụ liệu chính",
  CUTTING: "Cắt",
  SEWING: "May",
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  WASH: "Wash",
  FINISHING: "Hoàn thiện",
  PACKAGING: "Đóng gói",
  LOGISTICS: "Logistics",
  OTHER: "Chi phí khác",
};

export function roundCostingMoney(value: number): number {
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

export function newCostingLineKey(): string {
  return `cl-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function usesV2CostLines(input: Pick<CostingCalculatorInput, "workspaceVersion" | "costLines">): boolean {
  if (input.workspaceVersion === COSTING_WORKSPACE_VERSION) return true;
  return Array.isArray(input.costLines);
}

export function suggestedSellingPricePerUnit(totalCostPerUnit: number, targetMarginRate: number): number {
  const margin = normalizeRate(targetMarginRate, 30);
  if (margin >= 99.99) return roundCostingMoney(totalCostPerUnit);
  return roundCostingMoney(totalCostPerUnit / (1 - margin / 100));
}

export function computeStructuredLineCost(
  line: CostingStructuredLine,
  orderQuantity: number,
): { costPerUnit: number; totalCost: number; warning?: string } {
  const quantity = Math.max(1, Math.round(positive(orderQuantity, 1)));
  const unitPrice = positive(line.unitPrice);
  const consumption = positive(line.consumption);
  const factor = positive(line.quantityFactor, 1) || 1;
  let costPerUnit = 0;
  let warning: string | undefined;

  switch (line.pricingBasis) {
    case "LEGACY_YIELD":
      if (unitPrice > 0 && consumption > 0) {
        costPerUnit = roundCostingMoney(unitPrice / consumption);
      } else if (unitPrice > 0 || consumption > 0) {
        warning = "Thiếu giá vải hoặc định mức nên chưa tính được cost vải.";
      }
      break;
    case "UNIT_TIMES_CONSUMPTION":
      costPerUnit = roundCostingMoney(unitPrice * consumption);
      break;
    case "PER_ITEM":
    case "PER_POSITION":
      costPerUnit = roundCostingMoney(unitPrice * factor);
      break;
    case "PER_ORDER":
      if (quantity <= 0) {
        warning = "Chi phí theo đơn cần số lượng đơn lớn hơn 0";
        costPerUnit = 0;
      } else {
        costPerUnit = roundCostingMoney(unitPrice / quantity);
      }
      break;
    case "MANUAL":
    default:
      costPerUnit = roundCostingMoney(unitPrice);
      break;
  }

  return {
    costPerUnit,
    totalCost: roundCostingMoney(costPerUnit * quantity),
    warning,
  };
}

export function finalizeStructuredLine(
  line: Omit<CostingStructuredLine, "costPerUnit" | "totalCost"> & {
    costPerUnit?: number;
    totalCost?: number;
  },
  orderQuantity: number,
): CostingStructuredLine {
  const computed = computeStructuredLineCost(
    { ...line, costPerUnit: line.costPerUnit ?? 0, totalCost: line.totalCost ?? 0 },
    orderQuantity,
  );
  return {
    ...line,
    costPerUnit: computed.costPerUnit,
    totalCost: computed.totalCost,
    isOverride:
      line.referenceUnitPrice != null &&
      Number.isFinite(line.referenceUnitPrice) &&
      roundCostingMoney(line.unitPrice) !== roundCostingMoney(line.referenceUnitPrice),
  };
}

function componentTypeOf(type: unknown): CostingComponentType {
  const value = typeof type === "string" ? type : "OTHER";
  return (
    [
      "MATERIAL",
      "RIB",
      "CUTTING",
      "SEWING",
      "PRINTING",
      "EMBROIDERY",
      "WASH",
      "FINISHING",
      "PACKAGING",
      "LOGISTICS",
      "OTHER",
    ] as const
  ).includes(value as CostingComponentType)
    ? (value as CostingComponentType)
    : "OTHER";
}

function componentKey(label: string, index: number): string {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `component-${index + 1}`
  );
}

export function structuredLineToBreakdown(
  line: CostingStructuredLine,
  index: number,
): CostingComponentBreakdown {
  return {
    key: line.key || componentKey(line.label, index),
    label: line.label.trim() || DEFAULT_COMPONENT_LABELS[line.componentType],
    type: line.componentType,
    unitCost: line.costPerUnit,
    totalCost: line.totalCost,
    quantityFactor: line.quantityFactor ?? line.consumption ?? 1,
    note: line.note?.trim() || null,
  };
}

export function sectionTotalsFromLines(lines: CostingStructuredLine[]): {
  materialCostPerUnit: number;
  processCostPerUnit: number;
  otherCostPerUnit: number;
} {
  return {
    materialCostPerUnit: roundCostingMoney(
      lines.filter((line) => line.section === "MATERIAL").reduce((sum, line) => sum + line.costPerUnit, 0),
    ),
    processCostPerUnit: roundCostingMoney(
      lines.filter((line) => line.section === "PROCESS").reduce((sum, line) => sum + line.costPerUnit, 0),
    ),
    otherCostPerUnit: roundCostingMoney(
      lines.filter((line) => line.section === "OTHER").reduce((sum, line) => sum + line.costPerUnit, 0),
    ),
  };
}

export function projectLegacyInputToCostLines(input: CostingCalculatorInput): CostingStructuredLine[] {
  const quantity = Math.max(1, Math.round(positive(input.quantity, 1)));
  const lines: CostingStructuredLine[] = [];
  const fabricPrice = positive(input.fabricPrice);
  const fabricConsumption = positive(input.fabricConsumption);
  const fabricOverride = input.fabricCostPerUnit != null ? positive(input.fabricCostPerUnit) : null;
  const ribCostPerUnit = positive(input.ribCostPerUnit);

  if (fabricPrice > 0 || fabricConsumption > 0 || (fabricOverride != null && fabricOverride > 0)) {
    const basis: CostingPricingBasis =
      fabricOverride != null && fabricOverride > 0 && fabricConsumption <= 0
        ? "MANUAL"
        : "LEGACY_YIELD";
    const draft = finalizeStructuredLine(
      {
        key: "legacy-fabric",
        section: "MATERIAL",
        componentType: "MATERIAL",
        origin: "LEGACY",
        pricingBasis: basis === "MANUAL" ? "MANUAL" : "LEGACY_YIELD",
        label: input.materialName?.trim() || "Vải / vật liệu chính",
        sourceType: "LEGACY",
        sourceGsm: input.gsm != null ? String(input.gsm) : null,
        unitPrice: basis === "MANUAL" ? fabricOverride ?? 0 : fabricPrice,
        referenceUnitPrice: fabricPrice || null,
        unit: "kg",
        consumption: basis === "MANUAL" ? null : fabricConsumption || null,
        note:
          fabricConsumption > 0
            ? `Định mức cũ (SP/đơn vị): ${fabricConsumption}`
            : null,
      },
      quantity,
    );
    if (basis === "LEGACY_YIELD" && fabricOverride != null && fabricOverride > 0) {
      lines.push({
        ...draft,
        costPerUnit: roundCostingMoney(fabricOverride),
        totalCost: roundCostingMoney(fabricOverride * quantity),
        isOverride: true,
        note: [draft.note, "Cost vải / SP đã ghi đè"].filter(Boolean).join(" · "),
      });
    } else {
      lines.push(draft);
    }
  }

  if (ribCostPerUnit > 0) {
    lines.push(
      finalizeStructuredLine(
        {
          key: "legacy-rib",
          section: "MATERIAL",
          componentType: "RIB",
          origin: "LEGACY",
          pricingBasis: "MANUAL",
          label: "Bo / phụ liệu chính",
          sourceType: "LEGACY",
          unitPrice: ribCostPerUnit,
          unit: "cái",
        },
        quantity,
      ),
    );
  }

  for (const component of input.components ?? []) {
    const type = componentTypeOf(component.type);
    const section: CostingLineSection =
      type === "MATERIAL" || type === "RIB" ? "MATERIAL" : type === "OTHER" ? "OTHER" : "PROCESS";
    const hasTotal = component.totalCost != null && positive(component.totalCost) > 0;
    lines.push(
      finalizeStructuredLine(
        {
          key: component.key?.trim() || newCostingLineKey(),
          section,
          componentType: type,
          origin: "CUSTOM",
          pricingBasis: hasTotal ? "MANUAL" : "PER_ITEM",
          label: component.label?.trim() || DEFAULT_COMPONENT_LABELS[type],
          sourceType: "CUSTOM",
          unitPrice: hasTotal
            ? roundCostingMoney(positive(component.totalCost) / quantity)
            : positive(component.unitCost),
          unit: "cái",
          calculationType: hasTotal ? "MANUAL" : "PER_ITEM",
          quantityFactor: hasTotal ? 1 : positive(component.quantityFactor, 1) || 1,
          note: component.note?.trim() || null,
        },
        quantity,
      ),
    );
  }

  return lines;
}

/** Brand-new V2 Costing starts with zero rows. Operators add library or manual lines explicitly. */
export function defaultV2ProcessLines(): CostingStructuredLine[] {
  return [];
}

export function computeV2Costing(
  input: CostingCalculatorInput,
  context?: CostingPreviewContext,
): CostingCalculatorResult {
  const quantity = Math.max(1, Math.round(positive(input.quantity, 1)));
  const warnings: string[] = [];
  const rawLines = (input.costLines ?? []).filter(
    (line) =>
      line.label?.trim() ||
      positive(line.unitPrice) > 0 ||
      positive(line.costPerUnit) > 0,
  );
  const lines = rawLines.map((line) => finalizeStructuredLine(line, quantity));
  for (const line of lines) {
    const computed = computeStructuredLineCost(line, quantity);
    if (computed.warning) warnings.push(computed.warning);
  }

  const sections = sectionTotalsFromLines(lines);
  const componentCostPerUnit = roundCostingMoney(
    sections.materialCostPerUnit + sections.processCostPerUnit + sections.otherCostPerUnit,
  );
  const overheadRate = normalizeRate(input.overheadRate);
  const overheadCostPerUnit = roundCostingMoney(componentCostPerUnit * (overheadRate / 100));
  const totalCostPerUnit = roundCostingMoney(componentCostPerUnit + overheadCostPerUnit);
  const totalCost = roundCostingMoney(totalCostPerUnit * quantity);
  const targetMarginRate = normalizeRate(input.targetMarginRate, 30);
  const selling = suggestedSellingPricePerUnit(totalCostPerUnit, targetMarginRate);
  const revenueBeforeVat = roundCostingMoney(selling * quantity);
  const vatRate = normalizeRate(input.vatRate);
  const vatAmount = roundCostingMoney((revenueBeforeVat * vatRate) / 100);
  const finalQuotePrice = roundCostingMoney(revenueBeforeVat + vatAmount);
  const grossProfit = roundCostingMoney(revenueBeforeVat - totalCost);
  const actualMarginRate = revenueBeforeVat > 0 ? roundCostingMoney((grossProfit / revenueBeforeVat) * 100) : 0;
  const components = lines.map((line, index) => structuredLineToBreakdown(line, index));
  const fabricLine = lines.find((line) => line.key === "legacy-fabric" || line.pricingBasis === "LEGACY_YIELD");

  if (totalCostPerUnit <= 0) warnings.push("Tổng cost đang bằng 0. Kiểm tra lại các dòng chi phí.");
  if (!input.productId && !input.customProductName?.trim()) {
    warnings.push("Chưa chọn sản phẩm hoặc nhập tên sản phẩm tùy chỉnh.");
  }

  return {
    productId: input.productId ?? null,
    variantId: input.variantId ?? null,
    productName: input.customProductName?.trim() || context?.productName?.trim() || "Sản phẩm tùy chỉnh",
    variantName: context?.variantName ?? null,
    quantity,
    unit: input.unit?.trim() || "cái",
    materialName: input.materialName?.trim() || fabricLine?.label || null,
    gsm: input.gsm != null ? positive(input.gsm) : null,
    fabricPrice: fabricLine?.pricingBasis === "LEGACY_YIELD" ? positive(fabricLine.unitPrice) : positive(input.fabricPrice),
    fabricConsumption:
      fabricLine?.pricingBasis === "LEGACY_YIELD"
        ? positive(fabricLine.consumption)
        : positive(input.fabricConsumption),
    fabricCostPerUnit: fabricLine?.componentType === "MATERIAL" ? fabricLine.costPerUnit : 0,
    ribCostPerUnit: lines.find((line) => line.componentType === "RIB")?.costPerUnit ?? 0,
    materialCostPerUnit: sections.materialCostPerUnit,
    processCostPerUnit: sections.processCostPerUnit,
    otherCostPerUnit: sections.otherCostPerUnit,
    componentCostPerUnit,
    overheadRate,
    overheadCostPerUnit,
    totalCostPerUnit,
    totalCost,
    targetMarginRate,
    suggestedSellingPricePerUnit: selling,
    revenueBeforeVat,
    vatRate,
    vatAmount,
    finalQuotePrice,
    grossProfit,
    actualMarginRate,
    components,
    costLines: lines,
    workspaceVersion: COSTING_WORKSPACE_VERSION,
    warnings: [...new Set(warnings)],
  };
}

export function validateCostingLineForSave(
  line: CostingStructuredLine,
  orderQuantity: number,
): string | null {
  if (line.section === "MATERIAL" && line.origin === "LIBRARY" && !line.supplierId && !line.isOverride) {
    return "Vui lòng chọn nhà cung cấp";
  }
  if (line.pricingBasis === "UNIT_TIMES_CONSUMPTION") {
    if (line.consumption == null || !Number.isFinite(line.consumption)) return "Vui lòng nhập định mức";
    if (line.consumption <= 0) return "Định mức phải lớn hơn 0";
  }
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) return "Đơn giá không hợp lệ";
  if (line.pricingBasis === "PER_ORDER" && orderQuantity <= 0) {
    return "Chi phí theo đơn cần số lượng đơn lớn hơn 0";
  }
  return null;
}

export function processCategoryToComponentType(category: string, name: string): CostingComponentType {
  return costLibraryCategoryToComponentType(category as never, name);
}

export function calculationTypeToPricingBasis(
  calculationType: PricingCalculationType | null | undefined,
): CostingPricingBasis {
  if (calculationType === "PER_ORDER") return "PER_ORDER";
  if (calculationType === "PER_POSITION") return "PER_POSITION";
  if (calculationType === "MANUAL") return "MANUAL";
  return "PER_ITEM";
}

const LINE_SECTIONS: CostingLineSection[] = ["MATERIAL", "PROCESS", "OTHER"];
const LINE_ORIGINS: CostingLineOrigin[] = ["LIBRARY", "CUSTOM", "LEGACY"];
const PRICING_BASES: CostingPricingBasis[] = [
  "LEGACY_YIELD",
  "UNIT_TIMES_CONSUMPTION",
  "PER_ITEM",
  "PER_POSITION",
  "PER_ORDER",
  "MANUAL",
];
const CALCULATION_TYPES: PricingCalculationType[] = ["PER_ITEM", "PER_ORDER", "PER_POSITION", "MANUAL"];
const SOURCE_TYPES = ["PRODUCTION_MATERIAL", "PRODUCTION_TRIM", "COST_LIBRARY", "CUSTOM", "LEGACY"] as const;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

export function parseStructuredCostingLine(raw: unknown): CostingStructuredLine | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const label = asString(row.label) ?? "";
  const section = includesValue(LINE_SECTIONS, row.section) ? row.section : null;
  const origin = includesValue(LINE_ORIGINS, row.origin) ? row.origin : "CUSTOM";
  const pricingBasis = includesValue(PRICING_BASES, row.pricingBasis)
    ? row.pricingBasis
    : origin === "LEGACY"
      ? "LEGACY_YIELD"
      : "MANUAL";
  const componentType = componentTypeOf(row.componentType ?? row.type);
  const unitPrice = asFiniteNumber(row.unitPrice) ?? 0;
  const unit = asString(row.unit) ?? "cái";
  if (!section) return null;
  if (!label && unitPrice <= 0 && (asFiniteNumber(row.costPerUnit) ?? 0) <= 0) return null;

  return {
    key: asString(row.key) || newCostingLineKey(),
    section,
    componentType,
    origin,
    pricingBasis,
    label: label || DEFAULT_COMPONENT_LABELS[componentType],
    sourceType: includesValue(SOURCE_TYPES, row.sourceType) ? row.sourceType : null,
    sourceId: asString(row.sourceId) ?? null,
    sourceCode: asString(row.sourceCode) ?? null,
    sourceComposition: asString(row.sourceComposition) ?? null,
    sourceGsm: asString(row.sourceGsm) ?? null,
    supplierId: asString(row.supplierId) ?? null,
    supplierName: asString(row.supplierName) ?? null,
    sourcePriceId: asString(row.sourcePriceId) ?? null,
    unitPrice,
    referenceUnitPrice: asFiniteNumber(row.referenceUnitPrice) ?? null,
    unit,
    calculationType: includesValue(CALCULATION_TYPES, row.calculationType) ? row.calculationType : null,
    consumption: asFiniteNumber(row.consumption) ?? null,
    quantityFactor: asFiniteNumber(row.quantityFactor) ?? null,
    costPerUnit: asFiniteNumber(row.costPerUnit) ?? 0,
    totalCost: asFiniteNumber(row.totalCost) ?? 0,
    isOverride: asBoolean(row.isOverride),
    note: asString(row.note) ?? null,
  };
}

export function parseStructuredCostingLines(value: unknown): CostingStructuredLine[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map(parseStructuredCostingLine)
    .filter((line): line is CostingStructuredLine => line != null);
}

export function resolveCostLinesForWorkspace(input: CostingCalculatorInput): CostingStructuredLine[] {
  if (usesV2CostLines(input) && Array.isArray(input.costLines)) {
    return input.costLines.map((line) => finalizeStructuredLine(line, input.quantity));
  }
  return projectLegacyInputToCostLines(input);
}

export function emptyManualOtherLine(quantity = 1): CostingStructuredLine {
  return finalizeStructuredLine(
    {
      key: newCostingLineKey(),
      section: "OTHER",
      componentType: "OTHER",
      origin: "CUSTOM",
      pricingBasis: "MANUAL",
      label: "",
      sourceType: "CUSTOM",
      unitPrice: 0,
      unit: "cái",
      calculationType: "MANUAL",
    },
    quantity,
  );
}

export function emptyCustomMaterialLine(quantity = 1): CostingStructuredLine {
  return finalizeStructuredLine(
    {
      key: newCostingLineKey(),
      section: "MATERIAL",
      componentType: "MATERIAL",
      origin: "CUSTOM",
      pricingBasis: "UNIT_TIMES_CONSUMPTION",
      label: "",
      sourceType: "CUSTOM",
      unitPrice: 0,
      unit: "kg",
      consumption: null,
    },
    quantity,
  );
}

export function emptyCustomProcessLine(quantity = 1): CostingStructuredLine {
  return finalizeStructuredLine(
    {
      key: newCostingLineKey(),
      section: "PROCESS",
      componentType: "SEWING",
      origin: "CUSTOM",
      pricingBasis: "PER_ITEM",
      label: "",
      sourceType: "CUSTOM",
      unitPrice: 0,
      unit: "cái",
      calculationType: "PER_ITEM",
      quantityFactor: 1,
    },
    quantity,
  );
}

export function restoreLineReferencePrice(line: CostingStructuredLine, quantity: number): CostingStructuredLine {
  if (line.referenceUnitPrice == null || !Number.isFinite(line.referenceUnitPrice)) return line;
  return finalizeStructuredLine(
    {
      ...line,
      unitPrice: line.referenceUnitPrice,
      isOverride: false,
    },
    quantity,
  );
}

export function structuredLineFromSourcePick(input: {
  section: "MATERIAL" | "PROCESS";
  source: {
    id: string;
    type: "PRODUCTION_MATERIAL" | "PRODUCTION_TRIM" | "COST_LIBRARY";
    name: string;
    code?: string | null;
    composition?: string | null;
    gsm?: string | null;
    category?: string | null;
  };
  price: {
    id: string;
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    unit: string;
    calculationType?: PricingCalculationType | null;
  } | null;
  manual: boolean;
  quantity: number;
}): CostingStructuredLine {
  const isMaterial = input.section === "MATERIAL";
  const componentType: CostingComponentType = isMaterial
    ? input.source.type === "PRODUCTION_TRIM"
      ? "RIB"
      : "MATERIAL"
    : processCategoryToComponentType(input.source.category ?? "OTHER", input.source.name);
  const calculationType = input.price?.calculationType ?? (isMaterial ? null : "PER_ITEM");
  const pricingBasis = input.manual
    ? isMaterial
      ? "UNIT_TIMES_CONSUMPTION"
      : "PER_ITEM"
    : isMaterial
      ? "UNIT_TIMES_CONSUMPTION"
      : calculationTypeToPricingBasis(calculationType);
  const identity = [input.source.name, input.source.composition, input.source.gsm ? `${input.source.gsm} GSM` : null]
    .filter(Boolean)
    .join(" · ");
  return finalizeStructuredLine(
    {
      key: newCostingLineKey(),
      section: input.section,
      componentType,
      origin: input.manual ? "CUSTOM" : "LIBRARY",
      pricingBasis,
      label: identity || input.source.name,
      sourceType: input.source.type,
      sourceId: input.source.id,
      sourceCode: input.source.code ?? null,
      sourceComposition: input.source.composition ?? null,
      sourceGsm: input.source.gsm ?? null,
      supplierId: input.price?.supplierId ?? null,
      supplierName: input.price?.supplierName ?? null,
      sourcePriceId: input.price?.id ?? null,
      unitPrice: input.price?.unitPrice ?? 0,
      referenceUnitPrice: input.price?.unitPrice ?? null,
      unit: input.price?.unit ?? (isMaterial ? "kg" : "cái"),
      calculationType,
      consumption: isMaterial ? null : null,
      quantityFactor: isMaterial ? null : 1,
    },
    input.quantity,
  );
}

export function costLinesFromBomItems(
  items: Array<{
    label: string;
    type: CostingComponentType;
    unitCost: number;
    quantityFactor?: number;
    note?: string;
  }>,
  extras: {
    quantity: number;
    materialName?: string;
    fabricPrice?: number;
    fabricConsumption?: number;
    ribCostPerUnit?: number;
  },
): CostingStructuredLine[] {
  const skipFabricEstimate = extras.fabricPrice != null && extras.fabricConsumption != null;
  const hasRibItems = items.some((item) => item.type === "RIB");
  return projectLegacyInputToCostLines({
    quantity: extras.quantity,
    materialName: extras.materialName,
    fabricPrice: extras.fabricPrice,
    fabricConsumption: extras.fabricConsumption,
    ribCostPerUnit: hasRibItems ? 0 : extras.ribCostPerUnit,
    components: items
      .filter((item) => {
        if (skipFabricEstimate && item.type === "MATERIAL" && item.note?.includes("Ước tính từ giá vải")) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        label: item.label,
        type: item.type,
        unitCost: item.unitCost,
        quantityFactor: item.quantityFactor,
        note: item.note,
      })),
  });
}

export function validateCostingLinesForSave(
  lines: CostingStructuredLine[],
  orderQuantity: number,
): string | null {
  for (const line of lines) {
    const empty =
      !line.label.trim() &&
      positive(line.unitPrice) <= 0 &&
      positive(line.costPerUnit) <= 0 &&
      (line.consumption == null || line.consumption <= 0);
    if (empty) continue;
    const error = validateCostingLineForSave(line, orderQuantity);
    if (error) return `${line.label.trim() || "Dòng chi phí"}: ${error}`;
  }
  return null;
}
