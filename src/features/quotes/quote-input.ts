import { parseMoneyInput, parseOptionalInt } from "@/features/pricing/parse-money";
import type { CreateQuoteInput, QuoteItemInput } from "@/features/quotes/types";

function parseItems(raw: unknown): QuoteItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      pricingCalculationItemId: typeof item.pricingCalculationItemId === "string" ? item.pricingCalculationItemId : null,
      productId: typeof item.productId === "string" ? item.productId : null,
      variantId: typeof item.variantId === "string" ? item.variantId : null,
      productNameSnapshot: typeof item.productNameSnapshot === "string" ? item.productNameSnapshot : null,
      variantNameSnapshot: typeof item.variantNameSnapshot === "string" ? item.variantNameSnapshot : null,
      description: typeof item.description === "string" ? item.description : null,
      designMediaAssetId: typeof item.designMediaAssetId === "string" ? item.designMediaAssetId : null,
      designImageUrl: typeof item.designImageUrl === "string" ? item.designImageUrl : null,
      skuSnapshot: typeof item.skuSnapshot === "string" ? item.skuSnapshot : null,
      colorSnapshot: typeof item.colorSnapshot === "string" ? item.colorSnapshot : null,
      categorySnapshot: typeof item.categorySnapshot === "string" ? item.categorySnapshot : null,
      genderSnapshot: typeof item.genderSnapshot === "string" ? item.genderSnapshot : null,
      moqSnapshot: parseOptionalInt(item.moqSnapshot),
      itemNote: typeof item.itemNote === "string" ? item.itemNote : null,
      productionLeadTime: typeof item.productionLeadTime === "string" ? item.productionLeadTime : null,
      sampleFee: parseMoneyInput(item.sampleFee),
      sampleLeadTime: typeof item.sampleLeadTime === "string" ? item.sampleLeadTime : null,
      quantity: parseOptionalInt(item.quantity) ?? 1,
      unit: typeof item.unit === "string" ? item.unit : "cái",
      baseUnitPrice: parseMoneyInput(item.baseUnitPrice) ?? 0,
      serviceFee: parseMoneyInput(item.serviceFee) ?? 0,
      setupFee: parseMoneyInput(item.setupFee) ?? 0,
      unitPrice: parseMoneyInput(item.unitPrice) ?? undefined,
      discountAmount: parseMoneyInput(item.discountAmount) ?? 0,
      manualUnitPrice: parseMoneyInput(item.manualUnitPrice),
      manualOverrideReason: typeof item.manualOverrideReason === "string" ? item.manualOverrideReason : null,
      pricingSnapshot: item.pricingSnapshot && typeof item.pricingSnapshot === "object"
        ? item.pricingSnapshot as Record<string, unknown>
        : null,
      sortOrder: parseOptionalInt(item.sortOrder) ?? index,
    };
  });
}

export function parseCreateQuoteBody(raw: Record<string, unknown>): CreateQuoteInput {
  return {
    sourceType: typeof raw.sourceType === "string" ? raw.sourceType as CreateQuoteInput["sourceType"] : undefined,
    pricingCalculationId: typeof raw.pricingCalculationId === "string" ? raw.pricingCalculationId : null,
    leadId: typeof raw.leadId === "string" ? raw.leadId : null,
    customerId: typeof raw.customerId === "string" ? raw.customerId : null,
    contactId: typeof raw.contactId === "string" ? raw.contactId : null,
    priceGroupId: typeof raw.priceGroupId === "string" ? raw.priceGroupId : null,
    status: typeof raw.status === "string" ? raw.status as CreateQuoteInput["status"] : undefined,
    title: typeof raw.title === "string" ? raw.title : null,
    validUntil: typeof raw.validUntil === "string" ? raw.validUntil : null,
    quoteDate: typeof raw.quoteDate === "string" ? raw.quoteDate : null,
    currency: typeof raw.currency === "string" ? raw.currency : undefined,
    priceVatType: typeof raw.priceVatType === "string" ? raw.priceVatType as CreateQuoteInput["priceVatType"] : undefined,
    customerCompanySnapshot: typeof raw.customerCompanySnapshot === "string" ? raw.customerCompanySnapshot : null,
    customerTaxCodeSnapshot: typeof raw.customerTaxCodeSnapshot === "string" ? raw.customerTaxCodeSnapshot : null,
    customerAddressSnapshot: typeof raw.customerAddressSnapshot === "string" ? raw.customerAddressSnapshot : null,
    customerContactNameSnapshot: typeof raw.customerContactNameSnapshot === "string" ? raw.customerContactNameSnapshot : null,
    customerContactTitleSnapshot: typeof raw.customerContactTitleSnapshot === "string" ? raw.customerContactTitleSnapshot : null,
    customerPhoneSnapshot: typeof raw.customerPhoneSnapshot === "string" ? raw.customerPhoneSnapshot : null,
    customerEmailSnapshot: typeof raw.customerEmailSnapshot === "string" ? raw.customerEmailSnapshot : null,
    salesRepresentativeId: typeof raw.salesRepresentativeId === "string" ? raw.salesRepresentativeId : null,
    salesName: typeof raw.salesName === "string" ? raw.salesName : null,
    salesTitleSnapshot: typeof raw.salesTitleSnapshot === "string" ? raw.salesTitleSnapshot : null,
    salesPhone: typeof raw.salesPhone === "string" ? raw.salesPhone : null,
    salesEmail: typeof raw.salesEmail === "string" ? raw.salesEmail : null,
    salesAddress: typeof raw.salesAddress === "string" ? raw.salesAddress : null,
    preparedBy: typeof raw.preparedBy === "string" ? raw.preparedBy : null,
    discountAmount: parseMoneyInput(raw.discountAmount) ?? undefined,
    shippingFee: parseMoneyInput(raw.shippingFee) ?? undefined,
    vatRate: parseMoneyInput(raw.vatRate) ?? undefined,
    manualTotalAmount: parseMoneyInput(raw.manualTotalAmount),
    manualOverrideReason: typeof raw.manualOverrideReason === "string" ? raw.manualOverrideReason : null,
    customerNote: typeof raw.customerNote === "string" ? raw.customerNote : null,
    internalNote: typeof raw.internalNote === "string" ? raw.internalNote : null,
    terms: typeof raw.terms === "string" ? raw.terms : null,
    items: parseItems(raw.items),
  };
}
