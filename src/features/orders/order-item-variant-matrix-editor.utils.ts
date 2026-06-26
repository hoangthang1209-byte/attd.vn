import type { OrderItemSupplySource } from "@prisma/client";
import type { OrderItemVariantInput } from "@/features/orders/order-totals";
import {
  buildQuickOrderColorDisplaySnapshot,
  sanitizeQuickOrderColorCode,
  sanitizeQuickOrderColorName,
} from "@/features/orders/quick-order/quick-order-color";
import {
  addSizeColumnFromLabel,
  columnFromHeaderLabel,
  createStableSizeKey,
  findDuplicateSizeColumn,
  normalizeSizeComparisonKey,
  normalizeSizeForStockMatch,
  sizeColumnLabelToVariantSizeValue,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";

export const EDITOR_DEFAULT_MATRIX_SIZE_LABELS = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "Free",
] as const;

export type VariantCellMeta = {
  id?: string | null;
  skuSnapshot?: string | null;
  unit?: string | null;
  sortOrder?: number;
};

export type MatrixColorRow = {
  key: string;
  colorId: string | null;
  colorName: string;
  colorCode: string;
  isCustomColor: boolean;
  quantities: Record<string, number>;
  variantMeta: Record<string, VariantCellMeta>;
};

export type VariantMatrixEditorState = {
  columns: QuickOrderSizeColumn[];
  rows: MatrixColorRow[];
};

export type ProductStockVariant = {
  colorId: string | null;
  colorName: string | null;
  sizeName: string | null;
};

function parseColorSnapshot(snapshot: string | null | undefined): {
  colorName: string;
  colorCode: string;
} {
  const raw = (snapshot ?? "").trim();
  if (!raw) return { colorName: "", colorCode: "" };
  const parts = raw.split("·").map((p) => p.trim());
  if (parts.length >= 2) {
    return { colorName: parts[0] ?? "", colorCode: parts.slice(1).join(" · ") };
  }
  return { colorName: raw, colorCode: "" };
}

function colorRowKey(colorId: string | null, colorName: string): string {
  if (colorId) return `id:${colorId}`;
  return `custom:${normalizeSizeComparisonKey(colorName)}`;
}

function sizeLabelFromColumn(column: QuickOrderSizeColumn): string {
  return sizeColumnLabelToVariantSizeValue(column);
}

export function createEmptyMatrixColorRow(): MatrixColorRow {
  return {
    key: crypto.randomUUID(),
    colorId: null,
    colorName: "",
    colorCode: "",
    isCustomColor: false,
    quantities: {},
    variantMeta: {},
  };
}

export function buildMatrixColumnsFromVariants(
  variants: OrderItemVariantInput[],
  extraColumns: QuickOrderSizeColumn[] = [],
): QuickOrderSizeColumn[] {
  const columns: QuickOrderSizeColumn[] = [...extraColumns];

  for (const label of EDITOR_DEFAULT_MATRIX_SIZE_LABELS) {
    const column = columnFromHeaderLabel(label);
    if (column && !findDuplicateSizeColumn(columns, column.label)) {
      columns.push({ ...column, isDefault: true });
    }
  }

  const customOrder: string[] = [];
  for (const variant of variants) {
    const raw = variant.sizeValue?.trim();
    if (!raw) continue;
    const label =
      normalizeSizeComparisonKey(raw) === "free size" || normalizeSizeComparisonKey(raw) === "free"
        ? "Free"
        : raw;
    if (!customOrder.includes(label)) customOrder.push(label);
  }

  for (const label of customOrder) {
    if (findDuplicateSizeColumn(columns, label)) continue;
    const isDefaultLabel = EDITOR_DEFAULT_MATRIX_SIZE_LABELS.some(
      (def) => normalizeSizeComparisonKey(def) === normalizeSizeComparisonKey(label),
    );
    if (isDefaultLabel) continue;
    const column = columnFromHeaderLabel(label) ?? {
      key: createStableSizeKey(label),
      label,
      isDefault: false,
    };
    columns.push({ ...column, isDefault: false });
  }

  return columns;
}

export function variantsToMatrixState(
  variants: OrderItemVariantInput[],
  columns: QuickOrderSizeColumn[],
): VariantMatrixEditorState {
  const rowMap = new Map<string, MatrixColorRow>();

  for (const variant of variants) {
    const parsed = parseColorSnapshot(variant.colorNameSnapshot);
    const colorName =
      parsed.colorName || (variant.colorId ? variant.colorNameSnapshot?.trim() ?? "" : parsed.colorName);
    const rowId = colorRowKey(variant.colorId ?? null, colorName);
    let row = rowMap.get(rowId);
    if (!row) {
      row = {
        key: rowId,
        colorId: variant.colorId ?? null,
        colorName,
        colorCode: parsed.colorCode,
        isCustomColor: !variant.colorId && Boolean(colorName),
        quantities: {},
        variantMeta: {},
      };
      rowMap.set(rowId, row);
    }

    const sizeRaw = variant.sizeValue?.trim();
    if (!sizeRaw) continue;
    const sizeLabel =
      normalizeSizeComparisonKey(sizeRaw) === "free size" || normalizeSizeComparisonKey(sizeRaw) === "free"
        ? "Free"
        : sizeRaw;
    const column =
      columns.find((c) => normalizeSizeComparisonKey(c.label) === normalizeSizeComparisonKey(sizeLabel)) ??
      columnFromHeaderLabel(sizeLabel);
    if (!column) continue;

    row.quantities[column.key] = Math.max(0, Math.floor(variant.quantity));
    row.variantMeta[column.key] = {
      id: variant.id ?? null,
      skuSnapshot: variant.skuSnapshot ?? null,
      unit: variant.unit ?? null,
      sortOrder: variant.sortOrder,
    };
  }

  return { columns, rows: [...rowMap.values()] };
}

export function matrixStateToVariants(
  state: VariantMatrixEditorState,
  defaultUnit: string,
): OrderItemVariantInput[] {
  const variants: OrderItemVariantInput[] = [];
  let sortOrder = 0;

  for (const row of state.rows) {
    const hasQuantity = state.columns.some((col) => Math.max(0, row.quantities[col.key] ?? 0) > 0);
    const hasColor = Boolean(row.colorId) || row.colorName.trim().length > 0;
    if (!hasQuantity || !hasColor) continue;

    const colorNameSnapshot = row.colorId
      ? null
      : buildQuickOrderColorDisplaySnapshot({
          colorName: sanitizeQuickOrderColorName(row.colorName),
          colorCode: sanitizeQuickOrderColorCode(row.colorCode),
        }) || sanitizeQuickOrderColorName(row.colorName);

    for (const column of state.columns) {
      const quantity = Math.max(0, Math.floor(row.quantities[column.key] ?? 0));
      if (quantity <= 0) continue;

      const meta = row.variantMeta[column.key] ?? {};
      variants.push({
        key: meta.id ?? `${row.key}|${column.key}`,
        id: meta.id ?? null,
        colorId: row.colorId,
        colorNameSnapshot: row.colorId ? null : colorNameSnapshot,
        sizeValue: sizeLabelFromColumn(column),
        skuSnapshot: meta.skuSnapshot ?? null,
        quantity,
        unit: meta.unit?.trim() || defaultUnit,
        sortOrder: meta.sortOrder ?? sortOrder,
      });
      sortOrder += 1;
    }
  }

  return variants;
}

export function sumMatrixRowTotal(row: MatrixColorRow, columns: QuickOrderSizeColumn[]): number {
  return columns.reduce((sum, col) => sum + Math.max(0, Math.floor(row.quantities[col.key] ?? 0)), 0);
}

export function sumMatrixGrandTotal(state: VariantMatrixEditorState): number {
  return state.rows.reduce((sum, row) => sum + sumMatrixRowTotal(row, state.columns), 0);
}

export function rowHasQuantities(row: MatrixColorRow, columns: QuickOrderSizeColumn[]): boolean {
  return columns.some((col) => Math.max(0, row.quantities[col.key] ?? 0) > 0);
}

export function columnHasQuantities(state: VariantMatrixEditorState, columnKey: string): boolean {
  return state.rows.some((row) => Math.max(0, row.quantities[columnKey] ?? 0) > 0);
}

export function addMatrixSizeColumn(
  state: VariantMatrixEditorState,
  label: string,
): { state: VariantMatrixEditorState; error?: string } {
  const result = addSizeColumnFromLabel(state.columns, label);
  if (result.error) return { state, error: result.error };
  return {
    state: {
      ...state,
      columns: result.columns,
      rows: state.rows.map((row) => ({
        ...row,
        quantities: { ...row.quantities, [result.columns[result.columns.length - 1]!.key]: 0 },
      })),
    },
  };
}

export function removeMatrixSizeColumn(
  state: VariantMatrixEditorState,
  columnKey: string,
): VariantMatrixEditorState {
  const column = state.columns.find((c) => c.key === columnKey);
  if (!column || column.isDefault) return state;
  return {
    columns: state.columns.filter((c) => c.key !== columnKey),
    rows: state.rows.map((row) => {
      const nextQuantities = { ...row.quantities };
      const nextMeta = { ...row.variantMeta };
      delete nextQuantities[columnKey];
      delete nextMeta[columnKey];
      return { ...row, quantities: nextQuantities, variantMeta: nextMeta };
    }),
  };
}

export function validateMatrixStockCells(input: {
  supplySource?: OrderItemSupplySource | null;
  productId?: string | null;
  stockVariants: ProductStockVariant[];
  state: VariantMatrixEditorState;
}): string | null {
  if (input.supplySource !== "ATTD_STOCK") return null;
  if (!input.productId) return "Sản phẩm lấy từ Kho ATTD cần chọn sản phẩm có trong kho.";

  for (const row of input.state.rows) {
    if (!rowHasQuantities(row, input.state.columns)) continue;

    if (!row.colorId) {
      return "Sản phẩm lấy từ Kho ATTD cần chọn màu có trong kho.";
    }

    for (const column of input.state.columns) {
      const qty = Math.max(0, row.quantities[column.key] ?? 0);
      if (qty <= 0) continue;

      const normalizedOrderSize = normalizeSizeForStockMatch(sizeLabelFromColumn(column));
      const displaySize =
        normalizedOrderSize === "Free size" ? column.label : column.label;

      const colorName = row.colorName.trim().toLowerCase();
      const hasMatch = input.stockVariants.some((stock) => {
        const colorMatch =
          stock.colorId === row.colorId ||
          (stock.colorName?.trim().toLowerCase() ?? "") === colorName;
        const stockSize = normalizeSizeForStockMatch(stock.sizeName);
        return colorMatch && stockSize === normalizedOrderSize;
      });

      if (!hasMatch) {
        return `Size ${displaySize} không có trong kho cho sản phẩm này.`;
      }
    }
  }

  return null;
}
