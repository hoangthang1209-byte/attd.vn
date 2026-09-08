import type { QuoteItemInput } from "@/features/quotes/types";

/** Minimal pricing-calc item shape needed to build a QuoteItem. */
export type PricingCalcItemForQuote = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  pricingSnapshot: unknown;
  quantity: number;
  unit: string;
  baseUnitPrice: number;
  serviceFee: number;
  setupFee: number;
  unitPrice: number;
  discountAmount: number;
  manualUnitPrice: number | null;
  manualOverrideReason: string | null;
  costEstimate: number | null;
  marginAmount: number | null;
  marginRate: number | null;
};

export type PricingCalcForQuoteItems = {
  items: PricingCalcItemForQuote[];
  resultSnapshot: unknown;
};

function isUnsafeCustomerDescription(value: string): boolean {
  return /VL:|GSM:|target margin|Giá từ Costing Calculator|costing snapshot|supplierUnitPrice|cost breakdown|supplierName|sourcePriceId|Định mức|PER_ITEM|PER_ORDER|PER_POSITION/i.test(
    value,
  );
}

function existingCustomerFacingDescription(item: PricingCalcItemForQuote): string | null {
  const snapshot =
    item.pricingSnapshot && typeof item.pricingSnapshot === "object"
      ? (item.pricingSnapshot as Record<string, unknown>)
      : null;
  const candidates = [snapshot?.customerFacingDescription, snapshot?.publicDescription];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed || isUnsafeCustomerDescription(trimmed)) continue;
    return trimmed;
  }
  return null;
}

function buildCostingQuoteItemDescription(item: PricingCalcItemForQuote): string | null {
  const existing = existingCustomerFacingDescription(item);
  if (existing) return existing;
  const name = item.productNameSnapshot?.trim() || "";
  const variant = item.variantNameSnapshot?.trim() || "";
  const parts = [name, variant].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function mapPricingCalculationItemToQuoteItem(
  item: PricingCalcItemForQuote,
  calcQuantityBreaks: unknown[],
  sortOrder: number,
): QuoteItemInput {
  void calcQuantityBreaks;
  return {
    pricingSnapshot: item.pricingSnapshot as Record<string, unknown> | null,
    pricingCalculationItemId: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variantNameSnapshot,
    description: buildCostingQuoteItemDescription(item),
    itemNote: null,
    quantity: item.quantity,
    unit: item.unit,
    baseUnitPrice: item.baseUnitPrice,
    serviceFee: item.serviceFee,
    setupFee: item.setupFee,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    manualUnitPrice: item.manualUnitPrice,
    manualOverrideReason: item.manualOverrideReason,
    costEstimate: item.costEstimate,
    marginAmount: item.marginAmount,
    marginRate: item.marginRate,
    sortOrder,
  };
}

/** One QuoteItem per pricing-calc item across all selected calculations (batch → quote). */
export function collectQuoteItemsFromPricingCalculations(
  calcs: PricingCalcForQuoteItems[],
): QuoteItemInput[] {
  const items: QuoteItemInput[] = [];
  let sortOrder = 0;
  for (const calc of calcs) {
    const calcResult =
      calc.resultSnapshot && typeof calc.resultSnapshot === "object"
        ? (calc.resultSnapshot as Record<string, unknown>)
        : null;
    const calcQuantityBreaks = Array.isArray(calcResult?.quantityBreaks)
      ? calcResult.quantityBreaks
      : [];
    for (const item of calc.items) {
      items.push(mapPricingCalculationItemToQuoteItem(item, calcQuantityBreaks, sortOrder));
      sortOrder += 1;
    }
  }
  return items;
}
