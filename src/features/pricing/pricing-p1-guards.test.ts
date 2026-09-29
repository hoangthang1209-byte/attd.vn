// Regression coverage for Pricing P1 (#145).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  lineDiscountIsValid,
  priceTierRangesOverlap,
  pricingMarginRate,
  requestedQuantityTiers,
  serviceRuleBelongsToPriceGroup,
} from "@/features/pricing/pricing-p1-guards";
import type { CostingQuantityBreakResult } from "@/features/pricing/costing-types";

function tier(
  minQuantity: number,
  maxQuantity: number | null,
  effectiveFrom: string | null,
  effectiveTo: string | null,
) {
  return {
    minQuantity,
    maxQuantity,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
    effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
  };
}

function quantityBreak(quantity: number, fakeAmount = 999999999): CostingQuantityBreakResult {
  return {
    quantity,
    totalCostPerUnit: fakeAmount,
    suggestedSellingPricePerUnit: fakeAmount,
    revenueBeforeVat: fakeAmount,
    grossProfit: fakeAmount,
    actualMarginRate: 99,
    finalQuotePrice: fakeAmount,
  };
}

describe("Pricing P1 integrity guards", () => {
  it("detects active tier overlap with open-ended date ranges", () => {
    assert.equal(
      priceTierRangesOverlap(
        tier(1, 100, null, null),
        tier(50, 200, "2026-01-01", null),
      ),
      true,
    );
    assert.equal(
      priceTierRangesOverlap(
        tier(100, null, "2026-06-01", null),
        tier(50, 200, "2026-01-01", null),
      ),
      true,
    );
  });

  it("allows tiers when either quantity or effective windows do not overlap", () => {
    assert.equal(
      priceTierRangesOverlap(
        tier(1, 49, null, null),
        tier(50, 200, null, null),
      ),
      false,
    );
    assert.equal(
      priceTierRangesOverlap(
        tier(1, 100, "2026-01-01", "2026-03-31"),
        tier(1, 100, "2026-04-01", null),
      ),
      false,
    );
  });

  it("accepts only global or selected-price-group service rules", () => {
    assert.equal(serviceRuleBelongsToPriceGroup(null, "dealer"), true);
    assert.equal(serviceRuleBelongsToPriceGroup("dealer", "dealer"), true);
    assert.equal(serviceRuleBelongsToPriceGroup("retail", "dealer"), false);
    assert.equal(serviceRuleBelongsToPriceGroup("dealer", null), false);
  });

  it("extracts only quantity tiers and ignores client monetary results", () => {
    const breaks = [
      quantityBreak(500, 1),
      quantityBreak(100, 999999999),
      quantityBreak(500, 42),
      quantityBreak(-1, 123),
    ];
    assert.deepEqual(requestedQuantityTiers(breaks), [100, 500]);
  });

  it("returns 100% margin for positive revenue with zero cost", () => {
    assert.equal(pricingMarginRate(100000, 0), 100);
    assert.equal(pricingMarginRate(100000, 70000), 30);
    assert.equal(pricingMarginRate(0, 0), null);
  });

  it("rejects negative or over-subtotal line discounts", () => {
    assert.equal(lineDiscountIsValid(100000, 0), true);
    assert.equal(lineDiscountIsValid(100000, 100000), true);
    assert.equal(lineDiscountIsValid(100000, 100001), false);
    assert.equal(lineDiscountIsValid(100000, -1), false);
  });
});
