import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recomputeCostingQuantityBreaksForSave } from "@/features/pricing/costing-quantity-break-recompute";
import type { CostingCalculatorInput } from "@/features/pricing/costing-types";

describe("costing quantity break server authority", () => {
  it("recomputes monetary fields from calculator input instead of trusting client amounts", async () => {
    const input: CostingCalculatorInput = {
      customProductName: "Test tee",
      quantity: 100,
      fabricCostPerUnit: 50000,
      targetMarginRate: 30,
      vatRate: 8,
      quantityBreaks: [
        {
          quantity: 100,
          totalCostPerUnit: 1,
          suggestedSellingPricePerUnit: 1,
          revenueBeforeVat: 1,
          grossProfit: 1,
          actualMarginRate: 1,
          finalQuotePrice: 1,
        },
        {
          quantity: 200,
          totalCostPerUnit: 999,
          suggestedSellingPricePerUnit: 999,
          revenueBeforeVat: 999,
          grossProfit: 999,
          actualMarginRate: 99,
          finalQuotePrice: 999,
        },
      ],
    };

    const breaks = await recomputeCostingQuantityBreaksForSave(input);
    assert.equal(breaks.length, 2);
    assert.equal(breaks[0]!.quantity, 100);
    assert.ok(breaks[0]!.totalCostPerUnit > 1000);
    assert.ok(breaks[0]!.suggestedSellingPricePerUnit > breaks[0]!.totalCostPerUnit);
    assert.notEqual(breaks[0]!.finalQuotePrice, 1);
    assert.equal(breaks[1]!.quantity, 200);
    assert.notEqual(breaks[1]!.totalCostPerUnit, 999);
  });
});
