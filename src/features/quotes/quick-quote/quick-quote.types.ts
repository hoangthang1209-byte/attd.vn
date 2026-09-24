import type { QuoteItemInput } from "@/features/quotes/types";

export type QuickQuoteStep = "customer" | "products" | "commercial" | "preview" | "success";

export type QuickQuoteLineRow = {
  key: string;
  productId: string;
  variantId: string;
  quantity: string;
  itemNote: string;
  manualUnitPrice: string;
};

export type QuickQuoteDraft = {
  version: 1;
  step: QuickQuoteStep;
  leadId: string;
  customerId: string;
  contactId: string;
  customerCompany: string;
  customerContactName: string;
  customerPhone: string;
  customerEmail: string;
  lines: QuickQuoteLineRow[];
  discountAmount: string;
  shippingFee: string;
  vatRate: string;
  customerNote: string;
  validUntil: string;
  salesRepresentativeId: string;
  recentProductIds: string[];
  updatedAt: string;
};

export const QUICK_QUOTE_DRAFT_STORAGE_KEY = "attd.quick-quote.draft.v1";

export function createEmptyQuickQuoteLine(): QuickQuoteLineRow {
  return {
    key: crypto.randomUUID(),
    productId: "",
    variantId: "",
    quantity: "100",
    itemNote: "",
    manualUnitPrice: "",
  };
}

export function normalizeQuickQuoteDraft(raw: Partial<QuickQuoteDraft>): QuickQuoteDraft {
  return {
    version: 1,
    step: raw.step ?? "customer",
    leadId: raw.leadId ?? "",
    customerId: raw.customerId ?? "",
    contactId: raw.contactId ?? "",
    customerCompany: raw.customerCompany ?? "",
    customerContactName: raw.customerContactName ?? "",
    customerPhone: raw.customerPhone ?? "",
    customerEmail: raw.customerEmail ?? "",
    lines:
      Array.isArray(raw.lines) && raw.lines.length > 0
        ? raw.lines.map((line) => ({
            key: line.key ?? crypto.randomUUID(),
            productId: line.productId ?? "",
            variantId: line.variantId ?? "",
            quantity: line.quantity ?? "100",
            itemNote: line.itemNote ?? "",
            manualUnitPrice: line.manualUnitPrice ?? "",
          }))
        : [createEmptyQuickQuoteLine()],
    discountAmount: raw.discountAmount ?? "0",
    shippingFee: raw.shippingFee ?? "0",
    vatRate: raw.vatRate ?? "8",
    customerNote: raw.customerNote ?? "",
    validUntil: raw.validUntil ?? "",
    salesRepresentativeId: raw.salesRepresentativeId ?? "",
    recentProductIds: Array.isArray(raw.recentProductIds) ? raw.recentProductIds.slice(0, 12) : [],
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export type QuickQuoteCalculatedItem = QuoteItemInput;
