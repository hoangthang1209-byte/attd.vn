import type { ComputedQuoteItem, QuoteItemInput, QuoteTotals } from "@/features/quotes/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeQuoteItem(item: QuoteItemInput): ComputedQuoteItem {
  const quantity = Math.max(1, item.quantity);
  const baseUnitPrice = item.baseUnitPrice ?? 0;
  const serviceFee = item.serviceFee ?? 0;
  const setupFee = item.setupFee ?? 0;
  const itemDiscount = item.discountAmount ?? 0;

  let manualOverride = false;
  let unitPrice = item.unitPrice ?? baseUnitPrice;
  if (item.manualUnitPrice != null && Number.isFinite(item.manualUnitPrice)) {
    manualOverride = true;
    unitPrice = item.manualUnitPrice;
  }

  const lineSubtotal = roundMoney(unitPrice * quantity + serviceFee + setupFee);
  const lineTotal = roundMoney(lineSubtotal - itemDiscount);

  return {
    ...item,
    quantity,
    unit: item.unit ?? "cái",
    baseUnitPrice,
    serviceFee,
    setupFee,
    unitPrice,
    discountAmount: itemDiscount,
    lineSubtotal,
    lineTotal,
    manualOverride,
  };
}

export function computeQuoteTotals(
  items: ComputedQuoteItem[],
  options: {
    discountAmount?: number;
    shippingFee?: number;
    vatRate?: number;
    manualTotalAmount?: number | null;
  } = {}
): QuoteTotals {
  const serviceTotal = roundMoney(items.reduce((sum, i) => sum + (i.serviceFee ?? 0), 0));
  const setupTotal = roundMoney(items.reduce((sum, i) => sum + (i.setupFee ?? 0), 0));
  const subtotal = roundMoney(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const discountAmount = options.discountAmount ?? 0;
  const shippingFee = options.shippingFee ?? 0;
  const vatRate = options.vatRate ?? 0;
  const taxableBase = roundMoney(subtotal - discountAmount + shippingFee);
  const vatAmount = roundMoney((taxableBase * vatRate) / 100);
  const calculatedTotalAmount = roundMoney(taxableBase + vatAmount);

  let manualOverride = false;
  let manualTotalAmount: number | null = null;
  let totalAmount = calculatedTotalAmount;

  if (options.manualTotalAmount != null && Number.isFinite(options.manualTotalAmount)) {
    manualOverride = true;
    manualTotalAmount = options.manualTotalAmount;
    totalAmount = options.manualTotalAmount;
  }

  return {
    subtotal,
    serviceTotal,
    setupTotal,
    discountAmount,
    shippingFee,
    vatRate,
    vatAmount,
    totalAmount,
    calculatedTotalAmount,
    manualOverride,
    manualTotalAmount,
  };
}

export function computeQuoteFromItems(
  items: QuoteItemInput[],
  options: Parameters<typeof computeQuoteTotals>[1] = {}
) {
  const computedItems = items.map(computeQuoteItem);
  const totals = computeQuoteTotals(computedItems, options);
  return { items: computedItems, totals };
}
