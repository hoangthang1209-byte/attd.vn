import { formatPricingCurrency } from "@/features/pricing/format";
import {
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
  PRODUCTION_TRIM_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";

export type MaterialLibraryKind = "material" | "trim";

export type MaterialLibraryPriceSummary = {
  activeCount: number;
  minUnitPrice: number | null;
  maxUnitPrice: number | null;
  unit: string | null;
};

export type MaterialLibraryListItem = {
  id: string;
  kind: MaterialLibraryKind;
  sourceType: "PRODUCTION_MATERIAL" | "PRODUCTION_TRIM";
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  typeLabel: string;
  composition: string | null;
  gsm: string | null;
  width: string | null;
  specLabel: string;
  defaultSupplierName: string | null;
  isActive: boolean;
  usageCount: number;
  updatedAt: string;
  priceSummary: MaterialLibraryPriceSummary;
  detailPath: string;
};

export function materialLibraryTypeLabel(kind: MaterialLibraryKind): string {
  return kind === "material" ? "Vải" : "Phụ liệu";
}

export function materialLibraryCategoryLabel(kind: MaterialLibraryKind, category: string): string {
  if (kind === "material") {
    return PRODUCTION_MATERIAL_CATEGORY_LABELS[category as keyof typeof PRODUCTION_MATERIAL_CATEGORY_LABELS] ?? category;
  }
  return PRODUCTION_TRIM_CATEGORY_LABELS[category as keyof typeof PRODUCTION_TRIM_CATEGORY_LABELS] ?? category;
}

export function buildMaterialSpecLabel(input: {
  composition?: string | null;
  gsm?: string | null;
  width?: string | null;
}): string {
  const parts = [
    input.composition?.trim() || null,
    input.gsm?.trim() ? `${input.gsm.trim()} GSM` : null,
    input.width?.trim() ? `Khổ ${input.width.trim()}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function summarizeActiveSourcePrices(
  prices: Array<{ unitPrice: number | string; unit: string }>,
): MaterialLibraryPriceSummary {
  if (prices.length === 0) {
    return { activeCount: 0, minUnitPrice: null, maxUnitPrice: null, unit: null };
  }
  const amounts = prices.map((row) => Number(row.unitPrice)).filter((value) => Number.isFinite(value));
  const units = [...new Set(prices.map((row) => row.unit.trim()).filter(Boolean))];
  return {
    activeCount: prices.length,
    minUnitPrice: amounts.length ? Math.min(...amounts) : null,
    maxUnitPrice: amounts.length ? Math.max(...amounts) : null,
    unit: units.length === 1 ? units[0]! : units.length > 1 ? "nhiều ĐV" : null,
  };
}

export function formatSupplierCountLabel(count: number): string {
  if (count <= 0) return "Chưa có NCC";
  return `${count} NCC`;
}

export function formatSupplierPriceRange(summary: MaterialLibraryPriceSummary): string {
  if (summary.activeCount <= 0 || summary.minUnitPrice == null || summary.maxUnitPrice == null) {
    return "Chưa có giá nhà cung cấp";
  }
  const unitSuffix = summary.unit ? `/${summary.unit}` : "";
  if (summary.minUnitPrice === summary.maxUnitPrice) {
    return `${formatPricingCurrency(summary.minUnitPrice)}${unitSuffix}`;
  }
  return `${formatPricingCurrency(summary.minUnitPrice)} – ${formatPricingCurrency(summary.maxUnitPrice)}${unitSuffix}`;
}
