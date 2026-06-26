import type { OrderItemVariantRecord } from "@/features/orders/order.types";
import {
  columnFromHeaderLabel,
  createStableSizeKey,
  findDuplicateSizeColumn,
  normalizeSizeComparisonKey,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";

export type OrderItemSizeMatrixRow = {
  colorLabel: string;
  quantities: Record<string, number>;
  total: number;
};

export type OrderItemSizeMatrix = {
  columns: QuickOrderSizeColumn[];
  rows: OrderItemSizeMatrixRow[];
  grandTotal: number;
};

const LEGACY_SIZE_SORT_ORDER: Array<{ match: (label: string) => boolean; rank: number }> = [
  { match: (l) => normalizeSizeComparisonKey(l) === "xxs", rank: 0 },
  { match: (l) => normalizeSizeComparisonKey(l) === "xs", rank: 1 },
  { match: (l) => normalizeSizeComparisonKey(l) === "s", rank: 2 },
  { match: (l) => normalizeSizeComparisonKey(l) === "m", rank: 3 },
  { match: (l) => normalizeSizeComparisonKey(l) === "l", rank: 4 },
  { match: (l) => normalizeSizeComparisonKey(l) === "xl", rank: 5 },
  { match: (l) => normalizeSizeComparisonKey(l) === "2xl", rank: 6 },
  { match: (l) => normalizeSizeComparisonKey(l) === "3xl", rank: 7 },
  { match: (l) => normalizeSizeComparisonKey(l) === "4xl", rank: 8 },
  { match: (l) => normalizeSizeComparisonKey(l) === "5xl", rank: 9 },
  {
    match: (l) =>
      normalizeSizeComparisonKey(l) === "free" ||
      normalizeSizeComparisonKey(l) === "free size",
    rank: 10,
  },
];

function sizeSortRank(label: string): number {
  const known = LEGACY_SIZE_SORT_ORDER.find((entry) => entry.match(label));
  if (known) return known.rank;
  const numeric = Number(label.replace(/[^\d.]/g, ""));
  if (Number.isFinite(numeric) && /^\d/.test(label.trim())) {
    return 100 + numeric;
  }
  return 200 + label.trim().toLowerCase().charCodeAt(0);
}

function sortSizeColumns(columns: QuickOrderSizeColumn[]): QuickOrderSizeColumn[] {
  return [...columns].sort((a, b) => {
    const rankDiff = sizeSortRank(a.label) - sizeSortRank(b.label);
    if (rankDiff !== 0) return rankDiff;
    return a.label.localeCompare(b.label, "vi");
  });
}

function variantSizeLabel(variant: OrderItemVariantRecord): string {
  const raw = variant.sizeValue?.trim();
  if (!raw) return "—";
  if (normalizeSizeComparisonKey(raw) === "free size") return "Free";
  return raw;
}

function columnKeyForVariantSize(sizeLabel: string): string {
  if (sizeLabel === "—") return "unknown";
  const fromHeader = columnFromHeaderLabel(sizeLabel);
  if (fromHeader) return fromHeader.key;
  return createStableSizeKey(sizeLabel);
}

function collectSizeColumns(variants: OrderItemVariantRecord[]): QuickOrderSizeColumn[] {
  const columns: QuickOrderSizeColumn[] = [];
  for (const variant of variants) {
    const label = variantSizeLabel(variant);
    if (label === "—") continue;
    if (findDuplicateSizeColumn(columns, label)) continue;
    const column = columnFromHeaderLabel(label) ?? {
      key: createStableSizeKey(label),
      label,
      isDefault: false,
    };
    columns.push(column);
  }
  return sortSizeColumns(columns);
}

export function buildOrderItemSizeMatrix(variants: OrderItemVariantRecord[]): OrderItemSizeMatrix | null {
  if (variants.length === 0) return null;

  const columns = collectSizeColumns(variants);
  const colorGroups = new Map<string, OrderItemSizeMatrixRow>();

  for (const variant of variants) {
    const colorLabel = variant.colorNameSnapshot?.trim() || "—";
    const sizeLabel = variantSizeLabel(variant);
    const key = columnKeyForVariantSize(sizeLabel);
    const qty = Math.max(0, Math.floor(variant.quantity));

    let row = colorGroups.get(colorLabel);
    if (!row) {
      row = { colorLabel, quantities: {}, total: 0 };
      colorGroups.set(colorLabel, row);
    }
    row.quantities[key] = (row.quantities[key] ?? 0) + qty;
    row.total += qty;
  }

  const rows = [...colorGroups.values()];
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return { columns, rows, grandTotal };
}

export function matrixQuantityDisplay(
  quantities: Record<string, number>,
  columnKey: string,
): string {
  const value = quantities[columnKey];
  if (value == null || value === 0) return "—";
  return String(value);
}
