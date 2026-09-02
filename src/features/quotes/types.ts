import type { QuotePriceVatType, QuoteSourceType, QuoteStatus } from "@prisma/client";

export type QuoteItemInput = {
  id?: string;
  pricingCalculationItemId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  productNameSnapshot?: string | null;
  variantNameSnapshot?: string | null;
  description?: string | null;
  designMediaAssetId?: string | null;
  designImageUrl?: string | null;
  skuSnapshot?: string | null;
  colorSnapshot?: string | null;
  categorySnapshot?: string | null;
  genderSnapshot?: string | null;
  moqSnapshot?: number | null;
  itemNote?: string | null;
  productionLeadTime?: string | null;
  sampleFee?: number | null;
  sampleLeadTime?: string | null;
  quantity: number;
  unit?: string;
  baseUnitPrice?: number;
  serviceFee?: number;
  setupFee?: number;
  unitPrice?: number;
  discountAmount?: number;
  costEstimate?: number | null;
  marginAmount?: number | null;
  marginRate?: number | null;
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
  quoteDate?: string | null;
  currency?: string;
  priceVatType?: QuotePriceVatType;
  customerCompanySnapshot?: string | null;
  customerTaxCodeSnapshot?: string | null;
  customerAddressSnapshot?: string | null;
  customerContactNameSnapshot?: string | null;
  customerContactTitleSnapshot?: string | null;
  customerPhoneSnapshot?: string | null;
  customerEmailSnapshot?: string | null;
  salesRepresentativeId?: string | null;
  salesName?: string | null;
  salesTitleSnapshot?: string | null;
  salesPhone?: string | null;
  salesEmail?: string | null;
  salesAddress?: string | null;
  preparedBy?: string | null;
  discountAmount?: number;
  shippingFee?: number;
  vatRate?: number;
  manualTotalAmount?: number | null;
  manualOverrideReason?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  terms?: string | null;
  sampleFee?: number | null;
  sampleLeadTime?: string | null;
  sampleRefundCondition?: string | null;
  items: QuoteItemInput[];
  pricingCalculationIds?: string[];
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

export type PublicQuoteItem = {
  designImageUrl: string | null;
  colorSnapshot: string | null;
  categorySnapshot: string | null;
  genderSnapshot: string | null;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  description: string | null;
  moqSnapshot: number | null;
  itemNote: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  productionLeadTime: string | null;
  sampleFee: number | null;
  sampleLeadTime: string | null;
};

export type QuoteManufacturingEvidenceItem = {
  id: string;
  title: string;
  description: string;
  categoryName: string | null;
  categorySlug: string | null;
  visibility: "PUBLIC" | "DEALER_ONLY" | "CUSTOMER_ONLY" | "INTERNAL";
  featured: boolean;
  priority: number;
  imageUrl: string;
  alt: string;
  displayLocationKeys: string[];
  sortOrder: number;
};

export type PublicQuoteDocument = {
  quoteNo: string;
  status: QuoteStatus;
  title: string | null;
  validUntil: string | null;
  quoteDate: string | null;
  currency: string;
  priceVatType: QuotePriceVatType;
  customerCompany: string | null;
  customerCode: string | null;
  customerTaxCode: string | null;
  customerAddress: string | null;
  customerCompanyPhone: string | null;
  customerCompanyEmail: string | null;
  customerContactName: string | null;
  customerContactTitle: string | null;
  /** Contact person phone (Người liên hệ). */
  customerContactPhone: string | null;
  /** Contact person email (Người liên hệ). */
  customerContactEmail: string | null;
  /** @deprecated Use customerContactPhone */
  customerPhone: string | null;
  /** @deprecated Use customerContactEmail */
  customerEmail: string | null;
  salesName: string | null;
  salesTitle: string | null;
  salesPhone: string | null;
  salesEmail: string | null;
  salesAddress: string | null;
  preparedBy: string | null;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  customerNote: string | null;
  terms: string | null;
  sampleFee: number | null;
  sampleLeadTime: string | null;
  sampleRefundCondition: string | null;
  items: PublicQuoteItem[];
  showProductionLeadTime: boolean;
  showSampleFee: boolean;
  showSampleLeadTime: boolean;
  manufacturingEvidence: QuoteManufacturingEvidenceItem[];
};
