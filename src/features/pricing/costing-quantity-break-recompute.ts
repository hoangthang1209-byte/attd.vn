import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import type { CostingCalculatorInput, CostingQuantityBreakResult } from "@/features/pricing/costing-types";

function positive(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  return fallback;
}

export async function recomputeCostingQuantityBreaksForSave(
  input: CostingCalculatorInput,
): Promise<CostingQuantityBreakResult[]> {
  const tiers = [...new Set(
    (input.quantityBreaks ?? [])
      .map((row) => Math.round(positive(row.quantity)))
      .filter((tier) => tier > 0),
  )].sort((a, b) => a - b);

  return tiers.map((tier) => {
    const result = previewCostingCalculation({ ...input, quantity: tier });
    return {
      quantity: result.quantity,
      totalCostPerUnit: result.totalCostPerUnit,
      suggestedSellingPricePerUnit: result.suggestedSellingPricePerUnit,
      revenueBeforeVat: result.revenueBeforeVat,
      grossProfit: result.grossProfit,
      actualMarginRate: result.actualMarginRate,
      finalQuotePrice: result.finalQuotePrice,
    };
  });
}
