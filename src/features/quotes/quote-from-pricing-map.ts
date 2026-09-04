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

function buildCostingQuoteItemDescription(item: PricingCalcItemForQuote): string {
  return [
    (() => {
      const materialName = (item.pricingSnapshot as { materialName?: unknown } | null)?.materialName;
      return typeof materialName === "string" && materialName.trim()
        ? `VL: ${materialName.trim()}`
        : null;
    })(),
    (() => {
      const gsm = (item.pricingSnapshot as { gsm?: unknown } | null)?.gsm;
      return typeof gsm === "number" && Number.isFinite(gsm) ? `GSM: ${gsm}` : null;
    })(),
    `SL: ${item.quantity.toLocaleString("vi-VN")} ${item.unit}`,
    (() => {
      const targetMarginRate = (item.pricingSnapshot as { targetMarginRate?: unknown } | null)
        ?.targetMarginRate;
      return typeof targetMarginRate === "number" && Number.isFinite(targetMarginRate)
        ? `Target margin: ${targetMarginRate}%`
        : null;
    })(),
    "Giá từ Costing Calculator",
  ]
    .filter(Boolean)
    .join(" | ");
}

export function mapPricingCalculationItemToQuoteItem(
  item: PricingCalcItemForQuote,
  calcQuantityBreaks: unknown[],
  sortOrder: number,
): QuoteItemInput {
  return {
    pricingSnapshot: item.pricingSnapshot as Record<string, unknown> | null,
    pricingCalculationItemId: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productNameSnapshot: item.productNameSnapshot,
    variantNameSnapshot: item.variantNameSnapshot,
    description: buildCostingQuoteItemDescription(item),
    itemNote:
      calcQuantityBreaks.length > 0
        ? "Có bảng giá theo số lượng trong costing snapshot."
        : null,
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
