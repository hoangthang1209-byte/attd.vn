import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import type { QuoteItemInput } from "@/features/quotes/types";

export type QuickQuotePartyState = {
  customerId: string;
  contactId: string;
  customerCompany: string;
  customerTaxCode: string;
  customerAddress: string;
  customerContactName: string;
  customerContactTitle: string;
  customerPhone: string;
  customerEmail: string;
};

export type QuickQuoteCommercialState = {
  leadId: string;
  title: string;
  validUntil: string;
  quoteDate: string;
  currency: string;
  priceVatType: "EXCLUDING_VAT" | "INCLUDING_VAT";
  discountAmount: string;
  shippingFee: string;
  vatRate: string;
  salesRepresentativeId: string;
  salesName: string;
  salesTitle: string;
  salesPhone: string;
  salesEmail: string;
  salesAddress: string;
  customerNote: string;
};

export function buildQuickQuotePayload(
  party: QuickQuotePartyState,
  commercial: QuickQuoteCommercialState,
  items: QuoteItemInput[],
  status: "DRAFT" | "SENT" = "DRAFT",
) {
  return {
    sourceType: "MANUAL" as const,
    pricingCalculationId: null,
    leadId: commercial.leadId || null,
    customerId: party.customerId || null,
    contactId: party.contactId || null,
    title: commercial.title,
    validUntil: commercial.validUntil || null,
    quoteDate: commercial.quoteDate || null,
    currency: commercial.currency,
    priceVatType: commercial.priceVatType,
    customerCompanySnapshot: party.customerCompany || null,
    customerTaxCodeSnapshot: party.customerTaxCode || null,
    customerAddressSnapshot: party.customerAddress || null,
    customerContactNameSnapshot: party.customerContactName || null,
    customerContactTitleSnapshot: party.customerContactTitle || null,
    customerPhoneSnapshot: party.customerPhone || null,
    customerEmailSnapshot: party.customerEmail || null,
    salesRepresentativeId: commercial.salesRepresentativeId || null,
    salesName: commercial.salesName || null,
    salesTitleSnapshot: commercial.salesTitle || null,
    salesPhone: commercial.salesPhone || null,
    salesEmail: commercial.salesEmail || null,
    salesAddress: commercial.salesAddress || null,
    preparedBy: null,
    discountAmount: Number(commercial.discountAmount) || 0,
    shippingFee: Number(commercial.shippingFee) || 0,
    vatRate: Number(commercial.vatRate) || 0,
    manualTotalAmount: null,
    manualOverrideReason: null,
    customerNote: commercial.customerNote || null,
    internalNote: null,
    terms: DEFAULT_QUOTE_TERMS,
    sampleFee: null,
    sampleLeadTime: null,
    sampleRefundCondition: null,
    status,
    items,
  };
}

export function validateQuickQuoteItems(items: QuoteItemInput[]): string | null {
  const active = items.filter(
    (item) =>
      item.productNameSnapshot?.trim() ||
      item.productId ||
      (item.quantity ?? 0) > 0 ||
      (item.unitPrice ?? 0) > 0,
  );
  if (!active.length) {
    return "Vui lòng thêm ít nhất một sản phẩm.";
  }
  for (const item of active) {
    if (!item.productNameSnapshot?.trim()) {
      return "Vui lòng chọn hoặc nhập tên sản phẩm cho mỗi dòng.";
    }
    if (!item.quantity || item.quantity <= 0) {
      return "Số lượng phải lớn hơn 0.";
    }
  }
  return null;
}
