import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";

describe("costing preview", () => {
  it("matches expected unit cost from fabric and process lines", () => {
    const result = previewCostingCalculation({
      customProductName: "Sleeveless Top",
      quantity: 270,
      materialName: "Cotton",
      fabricPrice: 135000,
      fabricConsumption: 3.7,
      ribCostPerUnit: 4600,
      targetMarginRate: 35,
      components: [
        { label: "Cắt", type: "CUTTING", unitCost: 1000 },
        { label: "May", type: "SEWING", unitCost: 20000 },
        { label: "In", type: "PRINTING", unitCost: 9000 },
        { label: "Đóng gói", type: "PACKAGING", unitCost: 1000 },
      ],
    });

    assert.equal(result.quantity, 270);
    assert.equal(result.productName, "Sleeveless Top");
    assert.ok(result.fabricCostPerUnit > 0);
    assert.ok(result.totalCostPerUnit > result.fabricCostPerUnit);
    assert.ok(result.suggestedSellingPricePerUnit > result.totalCostPerUnit);
    assert.ok(result.components.some((c) => c.type === "MATERIAL"));
    assert.ok(result.components.some((c) => c.type === "SEWING"));
  });

  it("honors total line override semantics", () => {
    const result = previewCostingCalculation({
      quantity: 100,
      components: [{ label: "Wash", type: "WASH", totalCost: 500000 }],
    });
    const wash = result.components.find((c) => c.label === "Wash");
    assert.equal(wash?.totalCost, 500000);
    assert.equal(wash?.unitCost, 5000);
  });

  it("preserves FINISHING component type in breakdown", () => {
    const result = previewCostingCalculation({
      quantity: 270,
      components: [{ label: "Ủi", type: "FINISHING", unitCost: 3500 }],
    });
    const ironing = result.components.find((c) => c.label === "Ủi");
    assert.equal(ironing?.type, "FINISHING");
    assert.equal(ironing?.unitCost, 3500);
    assert.ok(result.processCostPerUnit >= 3500);
  });
});
