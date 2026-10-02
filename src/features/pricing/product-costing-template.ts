import type { MaterialType } from "@prisma/client";
import type { CostingComponentType, CostingStructuredLine } from "@/features/pricing/costing-types";
import { finalizeStructuredLine } from "@/features/pricing/costing-v2";

export type ProductCostingSourcePrice = {
  id: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  unit: string;
};

export type ProductCostingRequirementDraft = {
  id: string;
  materialId: string | null;
  variantId: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode: string | null;
  unit: string;
  consumptionPerUnit: number;
  wastagePercent: number;
  note: string | null;
  sortOrder: number;
  source:
    | {
        type: "PRODUCTION_MATERIAL" | "PRODUCTION_TRIM";
        id: string;
        code: string;
        name: string;
        defaultSupplierId: string | null;
        prices: ProductCostingSourcePrice[];
      }
    | null;
};

export type ProductCostingTemplate = {
  lines: CostingStructuredLine[];
  warnings: string[];
  requirementCount: number;
};

export function adjustedConsumption(consumptionPerUnit: number, wastagePercent: number): number {
  const consumption = Number.isFinite(consumptionPerUnit) ? Math.max(0, consumptionPerUnit) : 0;
  const wastage = Number.isFinite(wastagePercent) ? Math.max(0, wastagePercent) : 0;
  return Math.round(consumption * (1 + wastage / 100) * 10000) / 10000;
}

export function selectReferenceSourcePrice(
  prices: ProductCostingSourcePrice[],
  defaultSupplierId?: string | null,
): ProductCostingSourcePrice | null {
  if (defaultSupplierId) {
    const preferred = prices.find((price) => price.supplierId === defaultSupplierId);
    if (preferred) return preferred;
  }
  return prices.length === 1 ? prices[0]! : null;
}

function normalizeUnit(value: string): string {
  const unit = value.trim().toLocaleLowerCase("vi-VN");
  if (unit === "mét" || unit === "met" || unit === "meter" || unit === "metre") return "m";
  if (unit === "pcs" || unit === "piece" || unit === "pieces") return "cái";
  return unit;
}

export function unitsCompatible(requirementUnit: string, sourcePriceUnit: string): boolean {
  return normalizeUnit(requirementUnit) === normalizeUnit(sourcePriceUnit);
}

export function materialTypeToComponentType(type: MaterialType): CostingComponentType {
  if (type === "RIB_FABRIC") return "RIB";
  if (type === "PRINTING") return "PRINTING";
  if (type === "EMBROIDERY") return "EMBROIDERY";
  if (type === "PACKAGING" || type === "CARTON") return "PACKAGING";
  return "MATERIAL";
}

function requirementIdentity(row: ProductCostingRequirementDraft): string {
  return [
    row.materialId ?? "",
    row.materialCode ?? "",
    row.materialType,
    row.materialName.trim().toLocaleLowerCase("vi-VN"),
    row.unit.trim().toLocaleLowerCase("vi-VN"),
  ].join("|");
}

export function preferVariantRequirements(
  rows: ProductCostingRequirementDraft[],
  variantId?: string | null,
): ProductCostingRequirementDraft[] {
  if (!variantId) return rows.filter((row) => !row.variantId);
  const variantKeys = new Set(
    rows.filter((row) => row.variantId === variantId).map(requirementIdentity),
  );
  return rows.filter((row) => {
    if (row.variantId === variantId) return true;
    if (row.variantId) return false;
    return !variantKeys.has(requirementIdentity(row));
  });
}

export function buildProductCostingTemplate(
  rows: ProductCostingRequirementDraft[],
  quantity: number,
  variantId?: string | null,
): ProductCostingTemplate {
  const requirements = preferVariantRequirements(rows, variantId)
    .filter((row) => row.consumptionPerUnit > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const warnings: string[] = [];

  const lines = requirements.map((row) => {
    const consumption = adjustedConsumption(row.consumptionPerUnit, row.wastagePercent);
    const selectedPrice = row.source
      ? selectReferenceSourcePrice(row.source.prices, row.source.defaultSupplierId)
      : null;
    const compatiblePrice =
      selectedPrice && unitsCompatible(row.unit, selectedPrice.unit) ? selectedPrice : null;

    if (!row.source) {
      warnings.push(`${row.materialName}: chưa liên kết với Thư viện nguyên phụ liệu.`);
    } else if (row.source.prices.length === 0) {
      warnings.push(`${row.materialName}: chưa có giá nhà cung cấp.`);
    } else if (!selectedPrice) {
      warnings.push(`${row.materialName}: có nhiều giá nhà cung cấp, cần chọn NCC.`);
    } else if (!compatiblePrice) {
      warnings.push(
        `${row.materialName}: đơn vị BOM (${row.unit}) không khớp đơn vị giá NCC (${selectedPrice.unit}).`,
      );
    }

    const noteParts = [
      row.note?.trim() || null,
      row.wastagePercent > 0
        ? `Định mức gốc ${row.consumptionPerUnit} ${row.unit}/SP + hao hụt ${row.wastagePercent}%`
        : null,
      row.source && !compatiblePrice ? "Cần chọn/nhập giá NCC trước khi chốt" : null,
    ].filter(Boolean);

    return finalizeStructuredLine(
      {
        key: `product-bom-${row.id}`,
        section: "MATERIAL",
        componentType: materialTypeToComponentType(row.materialType),
        origin: row.source && compatiblePrice ? "LIBRARY" : "CUSTOM",
        pricingBasis: "UNIT_TIMES_CONSUMPTION",
        label: row.materialName,
        sourceType: row.source?.type ?? "CUSTOM",
        sourceId: row.source?.id ?? null,
        sourceCode: row.source?.code ?? row.materialCode,
        supplierId: compatiblePrice?.supplierId ?? null,
        supplierName: compatiblePrice?.supplierName ?? null,
        sourcePriceId: compatiblePrice?.id ?? null,
        unitPrice: compatiblePrice?.unitPrice ?? 0,
        referenceUnitPrice: compatiblePrice?.unitPrice ?? null,
        unit: compatiblePrice?.unit ?? row.unit,
        calculationType: null,
        consumption,
        quantityFactor: null,
        note: noteParts.join(" · ") || null,
      },
      quantity,
    );
  });

  return {
    lines,
    warnings: [...new Set(warnings)],
    requirementCount: requirements.length,
  };
}
