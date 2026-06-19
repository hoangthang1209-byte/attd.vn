import type { QuoteSourceType, QuoteStatus } from "@prisma/client";

export type QuoteItemInput = {
  id?: string;
  pricingCalculationItemId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  description?: string | null;
  quantity: number;
  unit?: string;
  baseUnitPrice?: number;
  serviceFee?: number;
  setupFee?: number;
  unitPrice?: number;
  discountAmount?: number;
  manualUnitPrice?: number | null;
  manualOverrideReason?: string | null;
  pricingSnapshot?: Record<string, unknown> | null;
  sortOrder?: number;
};

export type CreateQuoteInput = {
  sourceType?: QuoteSourceType;
  pricingCalculationId?: string | null;
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  priceGroupId?: string | null;
  status?: QuoteStatus;
  title?: string | null;
  validUntil?: string | null;
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  manualTotalAmount?: number | null;
  manualOverrideReason?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  terms?: string | null;
  items: QuoteItemInput[];
};

export type QuoteTotals = {
  subtotal: number;
  serviceTotal: number;
  setupTotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  calculatedTotalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
};

export type ComputedQuoteItem = QuoteItemInput & {
  lineSubtotal: number;
  lineTotal: number;
  unitPrice: number;
  manualOverride: boolean;
};

export type QuoteListRecord = {
  id: string;
  quoteNo: string;
  status: QuoteStatus;
  title: string | null;
  totalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  validUntil: string | null;
  createdAt: string;
  leadLabel: string | null;
  customerLabel: string | null;
};
