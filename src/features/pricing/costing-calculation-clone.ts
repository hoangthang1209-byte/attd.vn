import type { CostingComponentRow } from "@/components/admin/pricing/costing/CostingComponentTable";
import type {
  CostingCalculatorInput,
  CostingComponentInput,
  CostingComponentType,
  CostingQuantityBreakResult,
} from "@/features/pricing/costing-types";
import { formatRevisionDisplayLabel } from "@/features/pricing/pricing-calculation-revision";

const PROCESS_TYPES: CostingComponentType[] = [
  "CUTTING",
  "SEWING",
  "PRINTING",
  "EMBROIDERY",
  "WASH",
  "FINISHING",
  "PACKAGING",
  "LOGISTICS",
  "OTHER",
];

export type CostingCalculationCloneRecord = {
  id: string;
  code: string;
  revisionLabel: string | null;
  isFinal: boolean;
  inputSnapshot: unknown;
  resultSnapshot: unknown;
  internalNote: string | null;
  leadId: string | null;
  customerId: string | null;
  contactId: string | null;
  priceGroupId: string | null;
  items: Array<{
    productId: string | null;
    variantId: string | null;
    productNameSnapshot: string | null;
    pricingSnapshot: unknown;
  }>;
};

export type CostingWorkspaceClone = {
  sourceCalculationId: string;
  sourceCode: string;
  sourceRevisionDisplay: string;
  productId: string;
  variantId: string;
  customProductName: string;
  quantity: string;
  unit: string;
  materialName: string;
  gsm: string;
  fabricPrice: string;
  fabricConsumption: string;
  fabricCostPerUnit: string;
  ribCostPerUnit: string;
  components: CostingComponentRow[];
  overheadRate: string;
  targetMarginRate: string;
  vatRate: string;
  leadId: string;
  customerId: string;
  contactId: string;
  priceGroupId: string;
  internalNote: string;
  quantityTiers: string;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function numToField(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function isComponentType(value: unknown): value is CostingComponentType {
  return typeof value === "string" && [...PROCESS_TYPES, "MATERIAL", "RIB"].includes(value as CostingComponentType);
}

function parseComponentInput(raw: unknown): CostingComponentInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const label = asString(row.label);
  const type = isComponentType(row.type) ? row.type : "OTHER";
  const unitCost = asNumber(row.unitCost);
  const totalCost = asNumber(row.totalCost);
  const quantityFactor = asNumber(row.quantityFactor);
  if (!label && unitCost == null && totalCost == null) return null;
  if (type === "MATERIAL" || type === "RIB") return null;
  return {
    key: asString(row.key),
    label: label ?? "Chi phí khác",
    type,
    unitCost,
    totalCost,
    quantityFactor,
    note: asString(row.note),
  };
}

export function parseCostingCalculatorInputSnapshot(snapshot: unknown): CostingCalculatorInput | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot as Record<string, unknown>;
  if (raw.calculator !== "costing") return null;

  const components = Array.isArray(raw.components)
    ? raw.components
        .map(parseComponentInput)
        .filter((row): row is CostingComponentInput => row != null)
    : undefined;

  const quantityBreaks = Array.isArray(raw.quantityBreaks)
    ? raw.quantityBreaks
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
        .map((row) => ({
          quantity: asNumber(row.quantity) ?? 0,
          totalCostPerUnit: asNumber(row.totalCostPerUnit) ?? 0,
          suggestedSellingPricePerUnit: asNumber(row.suggestedSellingPricePerUnit) ?? 0,
          revenueBeforeVat: asNumber(row.revenueBeforeVat) ?? 0,
          grossProfit: asNumber(row.grossProfit) ?? 0,
          actualMarginRate: asNumber(row.actualMarginRate) ?? 0,
          finalQuotePrice: asNumber(row.finalQuotePrice) ?? 0,
        }))
        .filter((row) => row.quantity > 0)
    : undefined;

  return {
    productId: asString(raw.productId),
    variantId: asString(raw.variantId),
    customProductName: asString(raw.customProductName),
    quantity: asNumber(raw.quantity) ?? 1,
    unit: asString(raw.unit),
    materialName: asString(raw.materialName),
    gsm: asNumber(raw.gsm),
    fabricPrice: asNumber(raw.fabricPrice),
    fabricConsumption: asNumber(raw.fabricConsumption),
    fabricCostPerUnit: asNumber(raw.fabricCostPerUnit),
    ribCostPerUnit: asNumber(raw.ribCostPerUnit),
    components,
    overheadRate: asNumber(raw.overheadRate),
    targetMarginRate: asNumber(raw.targetMarginRate),
    vatRate: asNumber(raw.vatRate),
    leadId: asString(raw.leadId),
    customerId: asString(raw.customerId),
    contactId: asString(raw.contactId),
    priceGroupId: asString(raw.priceGroupId),
    internalNote: asString(raw.internalNote),
    quantityBreaks,
  };
}

function parseCostingResultSnapshot(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot as Record<string, unknown>;
  if (raw.calculator !== "costing") return null;
  return raw;
}

function componentInputToRow(component: CostingComponentInput): CostingComponentRow {
  return {
    label: component.label,
    type: component.type ?? "OTHER",
    unitCost: numToField(component.unitCost),
    totalCost: numToField(component.totalCost),
    quantityFactor: numToField(component.quantityFactor ?? 1) || "1",
    note: component.note ?? "",
  };
}

function componentsFromResultBreakdown(snapshot: Record<string, unknown>): CostingComponentRow[] {
  const components = Array.isArray(snapshot.components) ? snapshot.components : [];
  return components
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .filter((row) => {
      const type = row.type;
      return typeof type === "string" && PROCESS_TYPES.includes(type as CostingComponentType);
    })
    .map((row) => {
      const totalCost = asNumber(row.totalCost);
      const unitCost = asNumber(row.unitCost);
      const quantityFactor = asNumber(row.quantityFactor) ?? 1;
      const hasLineTotal = totalCost != null && totalCost > 0;
      return {
        label: asString(row.label) ?? "Chi phí khác",
        type: (isComponentType(row.type) ? row.type : "OTHER") as CostingComponentType,
        unitCost: hasLineTotal ? "" : numToField(unitCost),
        totalCost: hasLineTotal ? numToField(totalCost) : "",
        quantityFactor: numToField(quantityFactor) || "1",
        note: asString(row.note) ?? "",
      };
    });
}

function quantityTiersFromBreaks(breaks: CostingQuantityBreakResult[] | undefined): string {
  if (!breaks?.length) return "30, 50, 100, 300, 500, 1000";
  return breaks.map((row) => row.quantity).join(", ");
}

export function buildCostingWorkspaceClone(record: CostingCalculationCloneRecord): CostingWorkspaceClone | null {
  const parsedInput = parseCostingCalculatorInputSnapshot(record.inputSnapshot);
  const parsedResult = parseCostingResultSnapshot(record.resultSnapshot);
  const itemSnapshot = parseCostingResultSnapshot(record.items[0]?.pricingSnapshot);

  if (!parsedInput && !parsedResult && !itemSnapshot) return null;

  const input = parsedInput ?? ({} as CostingCalculatorInput);
  const result = parsedResult ?? itemSnapshot ?? {};

  const productId = input.productId ?? asString(record.items[0]?.productId) ?? "";
  const variantId = input.variantId ?? asString(record.items[0]?.variantId) ?? "";
  const customProductName =
    input.customProductName ??
    asString(record.items[0]?.productNameSnapshot) ??
  asString(result.productName as unknown) ??
    "";

  const quantity = input.quantity ?? asNumber(result.quantity) ?? 1;
  const unit = input.unit ?? asString(result.unit as unknown) ?? "cái";

  const materialName = input.materialName ?? asString(result.materialName as unknown) ?? "";
  const gsm = input.gsm ?? asNumber(result.gsm);
  const fabricPrice = input.fabricPrice ?? asNumber(result.fabricPrice);
  const fabricConsumption = input.fabricConsumption ?? asNumber(result.fabricConsumption);
  const ribCostPerUnit = input.ribCostPerUnit ?? asNumber(result.ribCostPerUnit);

  let fabricCostPerUnit = input.fabricCostPerUnit;
  if (fabricCostPerUnit == null && parsedInput) {
    const raw = record.inputSnapshot as Record<string, unknown>;
    fabricCostPerUnit = asNumber(raw.fabricCostPerUnit);
  }

  const components =
    input.components?.length
      ? input.components.map(componentInputToRow)
      : componentsFromResultBreakdown(result);

  const revisionDisplay = formatRevisionDisplayLabel(
    record.revisionLabel,
    1,
    record.isFinal,
  );

  return {
    sourceCalculationId: record.id,
    sourceCode: record.code,
    sourceRevisionDisplay: revisionDisplay,
    productId,
    variantId,
    customProductName,
    quantity: String(quantity),
    unit,
    materialName,
    gsm: numToField(gsm),
    fabricPrice: numToField(fabricPrice),
    fabricConsumption: numToField(fabricConsumption),
    fabricCostPerUnit: numToField(fabricCostPerUnit),
    ribCostPerUnit: numToField(ribCostPerUnit),
    components: components.length ? components : [],
    overheadRate: numToField(input.overheadRate ?? asNumber(result.overheadRate)) || "0",
    targetMarginRate:
      numToField(input.targetMarginRate ?? asNumber(result.targetMarginRate)) || "35",
    vatRate: numToField(input.vatRate ?? asNumber(result.vatRate)) || "0",
    leadId: input.leadId ?? record.leadId ?? "",
    customerId: input.customerId ?? record.customerId ?? "",
    contactId: input.contactId ?? record.contactId ?? "",
    priceGroupId: input.priceGroupId ?? record.priceGroupId ?? "",
    internalNote: input.internalNote ?? record.internalNote ?? "",
    quantityTiers: quantityTiersFromBreaks(input.quantityBreaks),
  };
}
