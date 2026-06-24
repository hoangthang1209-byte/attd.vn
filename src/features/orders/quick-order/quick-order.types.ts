import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import {
  DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
  emptyQuickOrderSizeQuantities,
  ensureRowSizesForColumns,
  migrateLegacyFixedSizes,
  QUICK_ORDER_FREE_SIZE_VALUE,
  sumQuickOrderSizeQuantities,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";

export type { QuickOrderSizeColumn } from "@/features/orders/quick-order/quick-order-sizes";

/** @deprecated Use DEFAULT_QUICK_ORDER_SIZE_COLUMNS */
export const QUICK_ORDER_SIZE_KEYS = DEFAULT_QUICK_ORDER_SIZE_COLUMNS.map((col) => col.key);

export type QuickOrderSizeKey = string;

export { QUICK_ORDER_FREE_SIZE_VALUE } from "@/features/orders/quick-order/quick-order-sizes";

export const QUICK_ORDER_DRAFT_STORAGE_KEY = "attd.quick-order.draft.v2";
export const QUICK_ORDER_DRAFT_STORAGE_KEY_V1 = "attd.quick-order.draft.v1";

export type QuickOrderSizeQuantities = Record<string, number>;

export type QuickOrderGridRow = {
  key: string;
  lineCode: string;
  productId: string | null;
  productName: string;
  supplySource: OrderItemSupplySource | null;
  processingMethod: OrderItemProcessingMethod | null;
  revenueCategoryId: string | null;
  colorId: string | null;
  colorName: string;
  colorCode: string;
  isCustomColor: boolean;
  description: string;
  sizes: QuickOrderSizeQuantities;
  unit: string;
  unitPrice: number;
  fieldErrors?: Partial<Record<string, string>>;
  importWarnings?: string[];
};

export type QuickOrderHeaderState = {
  customerId: string | null;
  contactId: string | null;
  salesEmployeeId: string | null;
  orderDate: string;
  currency: string;
  priceVatType: "INCLUDING_VAT" | "EXCLUDING_VAT";
  customerNote: string;
  internalNote: string;
  productionDueDate: string;
  productionOwnerId: string | null;
};

export type QuickOrderDraft = {
  header: QuickOrderHeaderState;
  sizeColumns: QuickOrderSizeColumn[];
  rows: QuickOrderGridRow[];
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  savedAt: string;
};

export function emptyQuickOrderSizes(
  columns: QuickOrderSizeColumn[] = DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
): QuickOrderSizeQuantities {
  return emptyQuickOrderSizeQuantities(columns);
}

export function sumQuickOrderSizes(
  sizes: QuickOrderSizeQuantities,
  columns: QuickOrderSizeColumn[] = DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
): number {
  return sumQuickOrderSizeQuantities(sizes, columns);
}

export function createEmptyQuickOrderRow(
  index = 1,
  columns: QuickOrderSizeColumn[] = DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
): QuickOrderGridRow {
  return {
    key: `row-${Date.now()}-${index}`,
    lineCode: "",
    productId: null,
    productName: "",
    supplySource: null,
    processingMethod: "AS_IS",
    revenueCategoryId: null,
    colorId: null,
    colorName: "",
    colorCode: "",
    isCustomColor: false,
    description: "",
    sizes: emptyQuickOrderSizes(columns),
    unit: "cái",
    unitPrice: 0,
  };
}

export function normalizeQuickOrderDraft(
  draft: Partial<QuickOrderDraft> & {
    rows?: Array<Partial<QuickOrderGridRow> & { sizes?: Record<string, number> }>;
  },
): QuickOrderDraft {
  const sizeColumns = draft.sizeColumns?.length
    ? draft.sizeColumns
    : DEFAULT_QUICK_ORDER_SIZE_COLUMNS;

  const rows = (draft.rows ?? []).map((row, index) => {
    const base = createEmptyQuickOrderRow(index + 1, sizeColumns);
    const sizes = ensureRowSizesForColumns(
      migrateLegacyFixedSizes(row.sizes, sizeColumns),
      sizeColumns,
    );
    return {
      ...base,
      ...row,
      colorCode: row.colorCode ?? "",
      isCustomColor: row.isCustomColor ?? false,
      sizes,
    };
  });

  return {
    header: draft.header ?? {
      customerId: null,
      contactId: null,
      salesEmployeeId: null,
      orderDate: "",
      currency: "VND",
      priceVatType: "EXCLUDING_VAT",
      customerNote: "",
      internalNote: "",
      productionDueDate: "",
      productionOwnerId: null,
    },
    sizeColumns,
    rows: rows.length ? rows : [createEmptyQuickOrderRow(1, sizeColumns)],
    discountAmount: draft.discountAmount ?? 0,
    shippingFee: draft.shippingFee ?? 0,
    vatRate: draft.vatRate ?? 8,
    savedAt: draft.savedAt ?? new Date().toISOString(),
  };
}

/** @deprecated Use sizeColumnLabelToVariantSizeValue from quick-order-sizes */
export function sizeKeyToVariantSizeValue(sizeKey: string): string {
  const column = DEFAULT_QUICK_ORDER_SIZE_COLUMNS.find((col) => col.key === sizeKey);
  if (!column) return sizeKey;
  if (column.key === "Free") return QUICK_ORDER_FREE_SIZE_VALUE;
  return column.label;
}
