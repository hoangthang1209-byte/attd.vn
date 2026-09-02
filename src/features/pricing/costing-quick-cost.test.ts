import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CostingWorkspaceClone } from "@/features/pricing/costing-calculation-clone";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import { computeSellingPriceCommercials } from "@/features/pricing/costing-batch-selling-price";
import {
  applyQuickCostLineUnitCost,
  flattenWorkspaceToQuickCostLines,
  nextQuickCostCellIndex,
  removeQuickCostLine,
  workspaceToCalculatorInput,
} from "@/features/pricing/costing-quick-cost";

function sampleWorkspace(): CostingWorkspaceClone {
  return {
    sourceCalculationId: "calc-1",
    sourceCode: "PRICE-0001",
    sourceRevisionDisplay: "V1",
    productId: "",
    variantId: "",
    customProductName: "Tour T-Shirt",
    quantity: "750",
    unit: "cái",
    materialName: "Cotton",
    gsm: "200",
    fabricPrice: "135000",
    fabricConsumption: "3.7",
    fabricCostPerUnit: "43333",
    ribCostPerUnit: "2000",
    components: [
      {
        label: "May",
        type: "SEWING",
        unitCost: "12000",
        totalCost: "",
        quantityFactor: "1",
        note: "",
      },
      {
        label: "In",
        type: "PRINTING",
        unitCost: "15000",
        totalCost: "",
        quantityFactor: "1",
        note: "",
      },
    ],
    overheadRate: "0",
    targetMarginRate: "35",
    vatRate: "0",
    leadId: "",
    customerId: "cust-1",
    contactId: "",
    priceGroupId: "",
    internalNote: "",
    quantityTiers: "30, 50, 100",
  };
}

describe("costing quick cost helpers", () => {
  it("2. flattens workspace into quick cost lines", () => {
    const lines = flattenWorkspaceToQuickCostLines(sampleWorkspace());
    assert.ok(lines.some((l) => l.source === "fabric"));
    assert.ok(lines.some((l) => l.label === "May"));
    assert.equal(lines.find((l) => l.label === "In")?.unitCost, "15000");
  });

  it("3. editing unit cost updates workspace and preview", () => {
    const workspace = sampleWorkspace();
    const line = flattenWorkspaceToQuickCostLines(workspace).find((l) => l.label === "May");
    assert.ok(line);
    const updated = applyQuickCostLineUnitCost(workspace, line!, "13000");
    const preview = previewCostingCalculation(workspaceToCalculatorInput(updated));
    assert.ok(preview.totalCostPerUnit > 0);
  });

  it("7–8. tab index navigation within quick cost lines", () => {
    assert.equal(nextQuickCostCellIndex(0, 5, 1), 1);
    assert.equal(nextQuickCostCellIndex(0, 5, -1), 0);
    assert.equal(nextQuickCostCellIndex(4, 5, 1), 4);
  });

  it("15. selling price independent from estimated cost on save preview", () => {
    const preview = previewCostingCalculation(workspaceToCalculatorInput(sampleWorkspace()));
    const costBefore = preview.totalCost;
    const commercials = computeSellingPriceCommercials({
      quantity: 750,
      costEstimate: costBefore,
      sellingPricePerUnit: 171000,
    });
    assert.equal(commercials.costEstimate, costBefore);
    assert.equal(commercials.sellingPricePerUnit, 171000);
    assert.equal(commercials.revenue, 128250000);
  });

  it("removing component line updates workspace", () => {
    const workspace = sampleWorkspace();
    const line = flattenWorkspaceToQuickCostLines(workspace).find((l) => l.label === "In");
    assert.ok(line);
    const next = removeQuickCostLine(workspace, line!);
    assert.equal(next.components.length, 1);
  });
});
