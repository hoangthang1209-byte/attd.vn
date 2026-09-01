import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCostingWorkspaceClone,
  parseCostingCalculatorInputSnapshot,
  type CostingCalculationCloneRecord,
} from "@/features/pricing/costing-calculation-clone";
import { formatRevisionDisplayLabel } from "@/features/pricing/pricing-calculation-revision";

function sleevelessTopV1Final(): CostingCalculationCloneRecord {
  const inputSnapshot = {
    calculator: "costing",
    customProductName: "Sleeveless Top",
    quantity: 200,
    unit: "cái",
    materialName: "65/35",
    fabricPrice: 135000,
    fabricConsumption: 3.7,
    ribCostPerUnit: 4600,
    overheadRate: 0,
    targetMarginRate: 35,
    vatRate: 0,
    leadId: "lead-1",
    customerId: "cust-1",
    contactId: "contact-1",
    priceGroupId: "pg-1",
    internalNote: "Big Bang batch",
    components: [
      { label: "Cắt", type: "CUTTING", unitCost: 1000, quantityFactor: 1 },
      { label: "May", type: "SEWING", unitCost: 20000, quantityFactor: 1 },
      { label: "In", type: "PRINTING", unitCost: 9000, quantityFactor: 1 },
      {
        label: "Đóng gói + bao bì, thùng",
        type: "PACKAGING",
        unitCost: 1000,
        quantityFactor: 1,
      },
    ],
  };

  const resultSnapshot = {
    calculator: "costing",
    productName: "Sleeveless Top",
    quantity: 200,
    unit: "cái",
    materialName: "65/35",
    fabricPrice: 135000,
    fabricConsumption: 3.7,
    ribCostPerUnit: 4600,
    overheadRate: 0,
    targetMarginRate: 35,
    vatRate: 0,
    components: [
      { label: "Vải chính", type: "MATERIAL", unitCost: 36486, totalCost: 7297200, quantityFactor: 1 },
      { label: "Cắt", type: "CUTTING", unitCost: 1000, totalCost: 200000, quantityFactor: 1 },
      { label: "May", type: "SEWING", unitCost: 20000, totalCost: 4000000, quantityFactor: 1 },
    ],
  };

  return {
    id: "calc-v1",
    code: "PRICE-000002",
    revisionLabel: "V1",
    isFinal: true,
    inputSnapshot,
    resultSnapshot,
    internalNote: "Big Bang batch",
    leadId: "lead-1",
    customerId: "cust-1",
    contactId: "contact-1",
    priceGroupId: "pg-1",
    items: [
      {
        productId: null,
        variantId: null,
        productNameSnapshot: "Sleeveless Top",
        pricingSnapshot: resultSnapshot,
      },
    ],
  };
}

describe("costing calculation clone", () => {
  it("1. clone from finalized calculation preserves original record", () => {
    const source = sleevelessTopV1Final();
    const before = structuredClone(source);

    const workspace = buildCostingWorkspaceClone(source);
    assert.ok(workspace);
    assert.equal(source.isFinal, before.isFinal);
    assert.equal(source.revisionLabel, before.revisionLabel);
    assert.deepEqual(source.inputSnapshot, before.inputSnapshot);
    assert.equal(workspace?.quantity, "200");
    assert.equal(workspace?.sourceCode, "PRICE-000002");
    assert.equal(workspace?.sourceRevisionDisplay, "V1 — FINAL");
  });

  it("2. cloned workspace contains original component lines from inputSnapshot", () => {
    const workspace = buildCostingWorkspaceClone(sleevelessTopV1Final());
    assert.ok(workspace);
    assert.equal(workspace!.components.length, 4);
    assert.equal(workspace!.components[0].label, "Cắt");
    assert.equal(workspace!.components[1].type, "SEWING");
    assert.equal(workspace!.components[1].unitCost, "20000");
    assert.ok(!workspace!.components.some((row) => row.type === "MATERIAL"));
    assert.ok(!workspace!.components.some((row) => row.type === "RIB"));
  });

  it("3. quantity can change independently after clone", () => {
    const workspace = buildCostingWorkspaceClone(sleevelessTopV1Final());
    assert.ok(workspace);
    workspace!.quantity = "270";
    assert.equal(workspace!.quantity, "270");
    assert.equal(parseCostingCalculatorInputSnapshot(sleevelessTopV1Final().inputSnapshot)?.quantity, 200);
  });

  it("4. V1 remains FINAL until V2 is explicitly finalized (clone is read-only)", () => {
    const source = sleevelessTopV1Final();
    buildCostingWorkspaceClone(source);
    assert.equal(source.isFinal, true);
    assert.equal(source.revisionLabel, "V1");
    assert.equal(formatRevisionDisplayLabel(source.revisionLabel, 1, source.isFinal), "V1 — FINAL");
    assert.equal(formatRevisionDisplayLabel(null, 2, false), "V2");
  });

  it("5. finalizing V2 clears sibling FINAL is existing service behavior (revision labels)", () => {
    assert.equal(formatRevisionDisplayLabel("V2", 2, true), "V2 — FINAL");
    assert.equal(formatRevisionDisplayLabel("V1", 1, false), "V1");
  });

  it("6. clone has no Quote/Order side effects (pure mapping only)", () => {
    const workspace = buildCostingWorkspaceClone(sleevelessTopV1Final());
    assert.ok(workspace);
    const serialized = JSON.stringify(workspace);
    assert.ok(!serialized.includes("quote"));
    assert.ok(!serialized.includes("order"));
    assert.ok(!serialized.includes("Quote"));
    assert.ok(!serialized.includes("Order"));
  });

  it("preserves CRM, price group, notes, and fabric fields from inputSnapshot", () => {
    const workspace = buildCostingWorkspaceClone(sleevelessTopV1Final());
    assert.ok(workspace);
    assert.equal(workspace!.customProductName, "Sleeveless Top");
    assert.equal(workspace!.leadId, "lead-1");
    assert.equal(workspace!.customerId, "cust-1");
    assert.equal(workspace!.contactId, "contact-1");
    assert.equal(workspace!.priceGroupId, "pg-1");
    assert.equal(workspace!.internalNote, "Big Bang batch");
    assert.equal(workspace!.fabricPrice, "135000");
    assert.equal(workspace!.fabricConsumption, "3.7");
    assert.equal(workspace!.ribCostPerUnit, "4600");
    assert.equal(workspace!.targetMarginRate, "35");
  });

  it("falls back to result breakdown when input components are missing", () => {
    const source = sleevelessTopV1Final();
    const inputWithoutComponents = {
      ...(source.inputSnapshot as Record<string, unknown>),
      components: undefined,
    };
    const workspace = buildCostingWorkspaceClone({
      ...source,
      inputSnapshot: inputWithoutComponents,
    });
    assert.ok(workspace);
    assert.equal(workspace!.components.length, 2);
    assert.equal(workspace!.components[0].label, "Cắt");
    assert.equal(workspace!.components[1].label, "May");
  });
});
