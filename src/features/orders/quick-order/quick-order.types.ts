import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";

export const QUICK_ORDER_SIZE_KEYS = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "Free"] as const;

export type QuickOrderSizeKey = (typeof QUICK_ORDER_SIZE_KEYS)[number];

/** Canonical free-size value used by variant matrix / SKU helpers. */
export const QUICK_ORDER_FREE_SIZE_VALUE = "Free size";

export const QUICK_ORDER_DRAFT_STORAGE_KEY = "attd.quick-order.draft.v1";

export type QuickOrderSizeQuantities = Record<QuickOrderSizeKey, number>;

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
  rows: QuickOrderGridRow[];
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  savedAt: string;
};

export function emptyQuickOrderSizes(): QuickOrderSizeQuantities {
  return { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, Free: 0 };
}

export function sumQuickOrderSizes(sizes: QuickOrderSizeQuantities): number {
  return QUICK_ORDER_SIZE_KEYS.reduce((sum, key) => sum + Math.max(0, Math.floor(sizes[key] || 0)), 0);
}

export function createEmptyQuickOrderRow(index = 1): QuickOrderGridRow {
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
    description: "",
    sizes: emptyQuickOrderSizes(),
    unit: "cái",
    unitPrice: 0,
  };
}

export function sizeKeyToVariantSizeValue(sizeKey: QuickOrderSizeKey): string {
  return sizeKey === "Free" ? QUICK_ORDER_FREE_SIZE_VALUE : sizeKey;
}
