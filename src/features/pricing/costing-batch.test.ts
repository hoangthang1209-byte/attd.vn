import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSellingPriceCommercials } from "@/features/pricing/costing-batch-selling-price";
import {
  buildCostingWorkspaceClone,
  costingWorkspaceToCalculatorInput,
  parseCostingCalculatorInputSnapshot,
} from "@/features/pricing/costing-calculation-clone";

describe("costing batch selling price", () => {
  it("4. sell-price change does not alter estimated cost", () => {
    const costEstimate = 85500000;
    const commercials = computeSellingPriceCommercials({
      quantity: 750,
      costEstimate,
      sellingPricePerUnit: 171000,
    });
    assert.equal(commercials.costEstimate, costEstimate);
    assert.equal(commercials.sellingPricePerUnit, 171000);
    assert.equal(commercials.revenue, 128250000);
    assert.equal(commercials.profit, 42750000);
    assert.ok(commercials.marginRate > 0);
  });

  it("5. margin calculation is correct for commercial sell override", () => {
    const commercials = computeSellingPriceCommercials({
      quantity: 270,
      costEstimate: 27000000,
      sellingPricePerUnit: 162000,
    });
    assert.equal(commercials.revenue, 43740000);
    assert.equal(commercials.profit, 16740000);
    assert.equal(commercials.marginRate, 38.27);
  });
});

describe("costing batch clone semantics", () => {
  const sourceSnapshot = {
    calculator: "costing",
    customProductName: "Tour T-Shirt",
    quantity: 750,
    fabricPrice: 135000,
    fabricConsumption: 3.7,
    ribCostPerUnit: 4600,
    targetMarginRate: 35,
    components: [
      { label: "May", type: "SEWING", unitCost: 20000, quantityFactor: 1 },
      { label: "In", type: "PRINTING", unitCost: 9000, quantityFactor: 1 },
    ],
  };

  it("2–3. clone input is independent; quantity can differ from source", () => {
    const workspace = buildCostingWorkspaceClone({
      id: "src",
      code: "PRICE-000010",
      revisionLabel: "V1",
      isFinal: true,
      inputSnapshot: sourceSnapshot,
      resultSnapshot: sourceSnapshot,
      internalNote: null,
      leadId: null,
      customerId: "cust-1",
      contactId: null,
      priceGroupId: null,
      items: [
        {
          productId: null,
          variantId: null,
          productNameSnapshot: "Tour T-Shirt",
          pricingSnapshot: sourceSnapshot,
        },
      ],
    });
    assert.ok(workspace);
    workspace!.customProductName = "T-Shirt Charcoal";
    workspace!.quantity = "860";

    const input = costingWorkspaceToCalculatorInput(workspace!, { customerId: "cust-1" });
    assert.equal(input.customProductName, "T-Shirt Charcoal");
    assert.equal(input.quantity, 860);
    assert.equal(input.components?.length, 2);
    assert.equal(parseCostingCalculatorInputSnapshot(sourceSnapshot)?.quantity, 750);
  });

  it("1. source snapshot unchanged after workspace clone mapping", () => {
    const before = structuredClone(sourceSnapshot);
    buildCostingWorkspaceClone({
      id: "src",
      code: "PRICE-000010",
      revisionLabel: "V1",
      isFinal: true,
      inputSnapshot: sourceSnapshot,
      resultSnapshot: sourceSnapshot,
      internalNote: null,
      leadId: null,
      customerId: null,
      contactId: null,
      priceGroupId: null,
      items: [],
    });
    assert.deepEqual(sourceSnapshot, before);
  });
});
