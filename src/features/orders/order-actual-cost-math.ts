/** Pure Actual Cost / Margin Close math (VAT-exclusive commercial basis). */

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export type OrderCommercialFields = {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
};

/** VAT-exclusive commercial value: subtotal − discount + customer shipping fee. */
export function computeOrderCommercialValue(order: OrderCommercialFields): number {
  return roundMoney(order.subtotal - order.discountAmount + order.shippingFee);
}

export function computeEstimatedCostFromQuotedItems(
  items: Array<{ quotedTotalCost: number | null | undefined }>,
): number | null {
  const hasEstimate = items.some((item) => item.quotedTotalCost != null);
  if (!hasEstimate) return null;
  return roundMoney(items.reduce((sum, item) => sum + (item.quotedTotalCost ?? 0), 0));
}

export function computeGrossMargin(
  commercialValue: number,
  cost: number | null,
): { margin: number | null; rate: number | null } {
  if (cost == null) return { margin: null, rate: null };
  const margin = roundMoney(commercialValue - cost);
  const rate = commercialValue > 0 ? roundRate((margin / commercialValue) * 100) : null;
  return { margin, rate };
}

export function computeCostVariance(
  actualCost: number,
  estimatedCost: number | null,
): number | null {
  if (estimatedCost == null) return null;
  return roundMoney(actualCost - estimatedCost);
}

export function sumActualCostAmounts(amounts: number[]): number {
  return roundMoney(amounts.reduce((sum, amount) => sum + amount, 0));
}

export type ActualCostComputedMetrics = {
  commercialValue: number;
  estimatedCost: number | null;
  estimatedGrossMargin: number | null;
  estimatedGrossMarginRate: number | null;
  actualCostTotal: number;
  actualGrossMargin: number;
  actualGrossMarginRate: number | null;
  costVariance: number | null;
};

export function computeActualCostMetrics(input: {
  commercialValue: number;
  estimatedCost: number | null;
  actualCostTotal: number;
}): ActualCostComputedMetrics {
  const estimated = computeGrossMargin(input.commercialValue, input.estimatedCost);
  const actual = computeGrossMargin(input.commercialValue, input.actualCostTotal);
  return {
    commercialValue: roundMoney(input.commercialValue),
    estimatedCost: input.estimatedCost == null ? null : roundMoney(input.estimatedCost),
    estimatedGrossMargin: estimated.margin,
    estimatedGrossMarginRate: estimated.rate,
    actualCostTotal: roundMoney(input.actualCostTotal),
    actualGrossMargin: actual.margin ?? 0,
    actualGrossMarginRate: actual.rate,
    costVariance: computeCostVariance(input.actualCostTotal, input.estimatedCost),
  };
}

export function buildFrozenEstimatedBaseline(input: {
  commercialValue: number;
  estimatedCost: number | null;
}): {
  estimatedCommercialValue: number;
  estimatedCost: number | null;
  estimatedGrossMargin: number | null;
  estimatedGrossMarginRate: number | null;
} {
  const estimated = computeGrossMargin(input.commercialValue, input.estimatedCost);
  return {
    estimatedCommercialValue: roundMoney(input.commercialValue),
    estimatedCost: input.estimatedCost == null ? null : roundMoney(input.estimatedCost),
    estimatedGrossMargin: estimated.margin,
    estimatedGrossMarginRate: estimated.rate,
  };
}
