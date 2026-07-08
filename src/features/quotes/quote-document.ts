import type { Prisma, QuotePriceVatType, QuoteStatus } from "@prisma/client";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import type { PublicQuoteDocument, PublicQuoteItem } from "@/features/quotes/types";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { getQuoteDesignImageUrl } from "@/features/quotes/quote-format";

function decimalToNum(value: Prisma.Decimal | null | undefined): number | null {
  return value == null ? null : value.toNumber();
}

type QuoteRow = {
  quoteNo: string;
  status: QuoteStatus;
  title: string | null;
  validUntil: Date | null;
  quoteDate: Date | null;
  currency: string;
  priceVatType: QuotePriceVatType;
  customerCompanySnapshot: string | null;
  customerTaxCodeSnapshot: string | null;
  customerAddressSnapshot: string | null;
  customerContactNameSnapshot: string | null;
  customerContactTitleSnapshot: string | null;
  customerPhoneSnapshot: string | null;
  customerEmailSnapshot: string | null;
  salesName: string | null;
  salesTitleSnapshot: string | null;
  salesPhone: string | null;
  salesEmail: string | null;
  salesAddress: string | null;
  preparedBy: string | null;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  vatRate: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  manualOverride: boolean;
  manualTotalAmount: Prisma.Decimal | null;
  customerNote: string | null;
  terms: string | null;
  sampleFee: Prisma.Decimal | null;
  sampleLeadTime: string | null;
  sampleRefundCondition: string | null;
  customer?: {
    code?: string;
    name: string;
    legalName: string | null;
    taxCode: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  contact?: { fullName: string; title: string | null; phone: string | null; email: string | null } | null;
  lead?: { fullName: string; companyName: string | null; company: string | null; phone: string; email: string | null } | null;
  items: Array<{
    designImageUrl: string | null;
    designMediaAsset?: { url: string } | null;
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
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    productionLeadTime: string | null;
    sampleFee: Prisma.Decimal | null;
    sampleLeadTime: string | null;
  }>;
};

function mapPublicItem(item: QuoteRow["items"][number]): PublicQuoteItem {
  return {
    designImageUrl: getQuoteDesignImageUrl(item),
    colorSnapshot: item.colorSnapshot,
    categorySnapshot: item.categorySnapshot,
    genderSnapshot: item.genderSnapshot,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variantNameSnapshot,
    skuSnapshot: item.skuSnapshot,
    description: item.description,
    moqSnapshot: item.moqSnapshot,
    itemNote: item.itemNote,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice.toNumber(),
    lineTotal: item.lineTotal.toNumber(),
    productionLeadTime: item.productionLeadTime,
    sampleFee: decimalToNum(item.sampleFee),
    sampleLeadTime: item.sampleLeadTime,
  };
}

export function formatPublicQuoteDocument(
  row: QuoteRow,
  manufacturingEvidence: PublicQuoteDocument["manufacturingEvidence"] = [],
): PublicQuoteDocument {
  const items = row.items.map(mapPublicItem);

  const showProductionLeadTime = items.some((i) => i.productionLeadTime?.trim());
  const showSampleFee = items.some((i) => i.sampleFee != null && i.sampleFee > 0);
  const showSampleLeadTime = items.some((i) => i.sampleLeadTime?.trim());

  const contactPhone =
    row.customerPhoneSnapshot?.trim() ||
    row.contact?.phone?.trim() ||
    row.lead?.phone?.trim() ||
    null;
  const contactEmail =
    row.customerEmailSnapshot?.trim() ||
    row.contact?.email?.trim() ||
    row.lead?.email?.trim() ||
    null;

  return {
    quoteNo: row.quoteNo,
    status: row.status,
    title: row.title,
    validUntil: row.validUntil?.toISOString() ?? null,
    quoteDate: row.quoteDate?.toISOString() ?? null,
    currency: row.currency,
    priceVatType: row.priceVatType,
    customerCompany:
      row.customerCompanySnapshot?.trim() ||
      row.customer?.legalName ||
      row.customer?.name ||
      row.lead?.companyName ||
      row.lead?.company ||
      null,
    customerCode: row.customer?.code?.trim() || null,
    customerTaxCode: row.customerTaxCodeSnapshot?.trim() || row.customer?.taxCode || null,
    customerAddress: row.customerAddressSnapshot?.trim() || row.customer?.address || null,
    customerCompanyPhone: row.customer?.phone?.trim() || null,
    customerCompanyEmail: row.customer?.email?.trim() || null,
    customerContactName:
      row.customerContactNameSnapshot?.trim() ||
      row.contact?.fullName ||
      row.lead?.fullName ||
      null,
    customerContactTitle: row.customerContactTitleSnapshot?.trim() || row.contact?.title || null,
    customerContactPhone: contactPhone,
    customerContactEmail: contactEmail,
    customerPhone: contactPhone,
    customerEmail: contactEmail,
    salesName: row.salesName,
    salesTitle: row.salesTitleSnapshot,
    salesPhone: row.salesPhone,
    salesEmail: row.salesEmail,
    salesAddress: row.salesAddress,
    preparedBy: row.preparedBy,
    subtotal: row.subtotal.toNumber(),
    discountAmount: row.discountAmount.toNumber(),
    shippingFee: row.shippingFee.toNumber(),
    vatRate: row.vatRate.toNumber(),
    vatAmount: row.vatAmount.toNumber(),
    totalAmount: row.totalAmount.toNumber(),
    manualOverride: row.manualOverride,
    manualTotalAmount: decimalToNum(row.manualTotalAmount),
    customerNote: row.customerNote,
    terms: row.terms?.trim() || DEFAULT_QUOTE_TERMS,
    sampleFee: decimalToNum(row.sampleFee),
    sampleLeadTime: row.sampleLeadTime,
    sampleRefundCondition: row.sampleRefundCondition,
    items,
    showProductionLeadTime,
    showSampleFee,
    showSampleLeadTime,
    manufacturingEvidence,
  };
}

export type QuotePdfData = PublicQuoteDocument & {
  company?: QuoteCompanyProfile & {
    logoUrl?: string | null;
  };
};

export function formatQuotePdfData(
  row: QuoteRow,
  company?: QuotePdfData["company"],
  manufacturingEvidence: PublicQuoteDocument["manufacturingEvidence"] = [],
): QuotePdfData {
  return {
    ...formatPublicQuoteDocument(row, manufacturingEvidence),
    company,
  };
}
