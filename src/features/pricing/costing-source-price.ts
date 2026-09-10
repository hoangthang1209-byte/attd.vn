import type { CostingSourceType, PricingCalculationType } from "@prisma/client";

export const COSTING_SOURCE_SEARCH_LIMIT = 20;

export const COSTING_SOURCE_TYPES = [
  "PRODUCTION_MATERIAL",
  "PRODUCTION_TRIM",
  "COST_LIBRARY",
] as const satisfies readonly CostingSourceType[];

export const COSTING_PURCHASE_UNITS = ["kg", "m", "yard", "mét", "cái", "bộ", "vị trí", "đơn"] as const;

export class CostingSourcePriceValidationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "CostingSourcePriceValidationError";
    this.code = code;
  }
}

export type CostingSourcePriceSourceInput = {
  sourceType: CostingSourceType;
  productionMaterialId?: string | null;
  productionTrimId?: string | null;
  costLibraryItemId?: string | null;
};

export type CostingSourcePriceRecord = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  sourceType: CostingSourceType;
  sourceId: string;
  unitPrice: number;
  unit: string;
  calculationType: PricingCalculationType | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CostingSourceSearchHit = {
  id: string;
  type: CostingSourceType;
  name: string;
  code?: string | null;
  composition?: string | null;
  gsm?: string | null;
  category?: string | null;
};

export type CostingSourcePricePickerRow = {
  id: string;
  sourceType: CostingSourceType;
  sourceId: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  unitPrice: number;
  unit: string;
  calculationType: PricingCalculationType | null;
  note: string | null;
};

export function isCostingSourceType(value: string): value is CostingSourceType {
  return (COSTING_SOURCE_TYPES as readonly string[]).includes(value);
}

export function tokenizeSearchQuery(query: string, maxTokens = 5): string[] {
  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, maxTokens);
  return tokens;
}

export function normalizeCostingPurchaseUnit(unit: unknown): string {
  if (typeof unit !== "string") {
    throw new CostingSourcePriceValidationError("Đơn vị mua là bắt buộc.", "UNIT_REQUIRED");
  }
  const normalized = unit.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new CostingSourcePriceValidationError("Đơn vị mua là bắt buộc.", "UNIT_REQUIRED");
  }
  if (normalized.length > 32) {
    throw new CostingSourcePriceValidationError("Đơn vị mua tối đa 32 ký tự.", "UNIT_TOO_LONG");
  }
  return normalized;
}

export function parseCostingUnitPrice(value: unknown): number {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(num) || num < 0) {
    throw new CostingSourcePriceValidationError("Giá phải là số >= 0.", "INVALID_PRICE");
  }
  if (num > 9_999_999_999.99) {
    throw new CostingSourcePriceValidationError("Giá vượt quá giới hạn.", "PRICE_TOO_LARGE");
  }
  return Math.round(num * 100) / 100;
}

export function parseCostingSourceNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new CostingSourcePriceValidationError("Ghi chú không hợp lệ.", "INVALID_NOTE");
  }
  const note = value.trim();
  if (!note) return null;
  if (note.length > 2000) {
    throw new CostingSourcePriceValidationError("Ghi chú tối đa 2000 ký tự.", "NOTE_TOO_LONG");
  }
  return note;
}

export function resolveSourceForeignKeys(input: CostingSourcePriceSourceInput): {
  sourceType: CostingSourceType;
  sourceId: string;
  productionMaterialId: string | null;
  productionTrimId: string | null;
  costLibraryItemId: string | null;
} {
  const productionMaterialId = input.productionMaterialId?.trim() || null;
  const productionTrimId = input.productionTrimId?.trim() || null;
  const costLibraryItemId = input.costLibraryItemId?.trim() || null;
  const selectedCount = [productionMaterialId, productionTrimId, costLibraryItemId].filter(Boolean).length;

  if (selectedCount !== 1) {
    throw new CostingSourcePriceValidationError(
      "Phải chọn đúng một nguồn: vật liệu, phụ liệu, hoặc cost library.",
      "SOURCE_REQUIRED",
    );
  }

  if (input.sourceType === "PRODUCTION_MATERIAL") {
    if (!productionMaterialId || productionTrimId || costLibraryItemId) {
      throw new CostingSourcePriceValidationError("Nguồn vật liệu không hợp lệ.", "SOURCE_MISMATCH");
    }
    return {
      sourceType: input.sourceType,
      sourceId: productionMaterialId,
      productionMaterialId,
      productionTrimId: null,
      costLibraryItemId: null,
    };
  }

  if (input.sourceType === "PRODUCTION_TRIM") {
    if (!productionTrimId || productionMaterialId || costLibraryItemId) {
      throw new CostingSourcePriceValidationError("Nguồn phụ liệu không hợp lệ.", "SOURCE_MISMATCH");
    }
    return {
      sourceType: input.sourceType,
      sourceId: productionTrimId,
      productionMaterialId: null,
      productionTrimId,
      costLibraryItemId: null,
    };
  }

  if (!costLibraryItemId || productionMaterialId || productionTrimId) {
    throw new CostingSourcePriceValidationError("Nguồn cost library không hợp lệ.", "SOURCE_MISMATCH");
  }
  return {
    sourceType: input.sourceType,
    sourceId: costLibraryItemId,
    productionMaterialId: null,
    productionTrimId: null,
    costLibraryItemId,
  };
}

export function sourceSupplierKey(
  sourceType: CostingSourceType,
  sourceId: string,
  supplierId: string,
): string {
  return `${sourceType}:${sourceId}:${supplierId}`;
}

export type StoredSourcePrice = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  sourceType: CostingSourceType;
  sourceId: string;
  unitPrice: number;
  unit: string;
  calculationType: PricingCalculationType | null;
  isActive: boolean;
  supplierIsActive?: boolean;
  note: string | null;
};

export function selectPickerSourcePrices(
  prices: StoredSourcePrice[],
  options?: { activeOnly?: boolean; activeSuppliersOnly?: boolean },
): StoredSourcePrice[] {
  const activeOnly = options?.activeOnly !== false;
  const activeSuppliersOnly = options?.activeSuppliersOnly !== false;
  const filtered = prices.filter((row) => {
    if (activeOnly && !row.isActive) return false;
    if (activeSuppliersOnly && row.supplierIsActive === false) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    const nameCmp = a.supplierName.localeCompare(b.supplierName, "vi");
    if (nameCmp !== 0) return nameCmp;
    return a.supplierCode.localeCompare(b.supplierCode, "vi");
  });
}

export function toPickerRows(prices: StoredSourcePrice[]): CostingSourcePricePickerRow[] {
  return prices.map((row) => ({
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierCode: row.supplierCode,
    unitPrice: row.unitPrice,
    unit: row.unit,
    calculationType: row.calculationType,
    note: row.note,
  }));
}

export function cheapestUnitPrice(prices: StoredSourcePrice[]): number | null {
  const active = prices.filter((row) => row.isActive && row.supplierIsActive !== false);
  if (active.length === 0) return null;
  return Math.min(...active.map((row) => row.unitPrice));
}

/** Preselect only when exactly one active price exists. Never pick cheapest among many. */
export function initialPickerSourcePriceId(prices: Array<{ id: string }>): string | null {
  return prices.length === 1 ? prices[0]!.id : null;
}

export function mergeMaterialAndTrimSearchHits(
  materials: CostingSourceSearchHit[],
  trims: CostingSourceSearchHit[],
  take: number,
): CostingSourceSearchHit[] {
  const limit = Math.min(Math.max(take, 1), COSTING_SOURCE_SEARCH_LIMIT);
  return [...materials, ...trims]
    .filter((hit) => hit.type === "PRODUCTION_MATERIAL" || hit.type === "PRODUCTION_TRIM")
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "vi");
      if (byName !== 0) return byName;
      return (a.code ?? "").localeCompare(b.code ?? "", "vi");
    })
    .slice(0, limit);
}

const CALCULATION_TYPES: PricingCalculationType[] = ["PER_ITEM", "PER_ORDER", "PER_POSITION", "MANUAL"];

export function parseCostingSourceCalculationType(
  sourceType: CostingSourceType,
  value: unknown,
): PricingCalculationType | null {
  if (sourceType !== "COST_LIBRARY") {
    return null;
  }
  if (typeof value !== "string" || !CALCULATION_TYPES.includes(value as PricingCalculationType)) {
    throw new CostingSourcePriceValidationError(
      "Dịch vụ phải có cách tính (PER_ITEM / PER_ORDER / PER_POSITION / MANUAL).",
      "CALCULATION_TYPE_REQUIRED",
    );
  }
  return value as PricingCalculationType;
}

/** Mirrors CostingSourcePrice_one_source_chk. */
export function costingSourceCheckAllows(row: {
  sourceType: CostingSourceType;
  productionMaterialId?: string | null;
  productionTrimId?: string | null;
  costLibraryItemId?: string | null;
  calculationType?: PricingCalculationType | null;
}): boolean {
  const materialId = row.productionMaterialId ?? null;
  const trimId = row.productionTrimId ?? null;
  const libraryId = row.costLibraryItemId ?? null;
  const calc = row.calculationType ?? null;
  if (row.sourceType === "PRODUCTION_MATERIAL") {
    return Boolean(materialId) && !trimId && !libraryId && calc == null;
  }
  if (row.sourceType === "PRODUCTION_TRIM") {
    return Boolean(trimId) && !materialId && !libraryId && calc == null;
  }
  return Boolean(libraryId) && !materialId && !trimId && calc != null;
}
