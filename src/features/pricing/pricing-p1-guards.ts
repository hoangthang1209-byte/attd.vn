import type { CostingQuantityBreakResult } from "@/features/pricing/costing-types";

export type PriceTierInterval = {
  minQuantity: number;
  maxQuantity: number | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
};

export function priceTierRangesOverlap(a: PriceTierInterval, b: PriceTierInterval): boolean {
  const quantityOverlap =
    (a.maxQuantity == null || b.minQuantity <= a.maxQuantity) &&
    (b.maxQuantity == null || a.minQuantity <= b.maxQuantity);
  if (!quantityOverlap) return false;

  return (
    (a.effectiveTo == null || b.effectiveFrom == null || b.effectiveFrom <= a.effectiveTo) &&
    (b.effectiveTo == null || a.effectiveFrom == null || a.effectiveFrom <= b.effectiveTo)
  );
}

export function serviceRuleBelongsToPriceGroup(
  rulePriceGroupId: string | null,
  selectedPriceGroupId: string | null,
): boolean {
  return rulePriceGroupId == null || rulePriceGroupId === selectedPriceGroupId;
}

export function requestedQuantityTiers(
  breaks: CostingQuantityBreakResult[] | undefined,
): number[] {
  return [...new Set(
    (breaks ?? [])
      .map((item) => Math.round(Number.isFinite(item.quantity) ? item.quantity : 0))
      .filter((quantity) => quantity > 0),
  )].sort((a, b) => a - b);
}

export function pricingMarginRate(revenue: number, totalCost: number): number | null {
  if (!Number.isFinite(revenue) || revenue <= 0 || !Number.isFinite(totalCost) || totalCost < 0) return null;
  if (totalCost === 0) return 100;
  return Math.round((((revenue - totalCost) / revenue) * 100) * 100) / 100;
}

export function lineDiscountIsValid(lineSubtotal: number, discountAmount: number): boolean {
  return (
    Number.isFinite(lineSubtotal) &&
    lineSubtotal >= 0 &&
    Number.isFinite(discountAmount) &&
    discountAmount >= 0 &&
    discountAmount <= lineSubtotal
  );
}
