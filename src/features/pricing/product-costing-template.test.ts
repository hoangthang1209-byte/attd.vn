import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustedConsumption,
  buildProductCostingTemplate,
  preferVariantRequirements,
  selectReferenceSourcePrice,
  unitsCompatible,
  type ProductCostingRequirementDraft,
} from "@/features/pricing/product-costing-template";

function row(patch: Partial<ProductCostingRequirementDraft> = {}): ProductCostingRequirementDraft {
  return {
    id: "r1",
    materialId: "m1",
    variantId: null,
    materialType: "MAIN_FABRIC",
    materialName: "Vải chính",
    materialCode: "FAB-001",
    unit: "kg",
    consumptionPerUnit: 0.9,
    wastagePercent: 0,
    note: null,
    sortOrder: 0,
    source: null,
    ...patch,
  };
}

describe("Pricing V3 product costing template", () => {
  it("adds wastage to normalized consumption", () => {
    assert.equal(adjustedConsumption(0.9, 5), 0.945);
  });

  it("uses default supplier when multiple source prices exist", () => {
    const prices = [
      { id: "p1", supplierId: "s1", supplierName: "A", unitPrice: 100, unit: "kg" },
      { id: "p2", supplierId: "s2", supplierName: "B", unitPrice: 90, unit: "kg" },
    ];
    assert.equal(selectReferenceSourcePrice(prices, "s1")?.id, "p1");
    assert.equal(selectReferenceSourcePrice(prices, null), null);
  });

  it("does not silently select cheapest when supplier choice is ambiguous", () => {
    const template = buildProductCostingTemplate([
      row({
        source: {
          type: "PRODUCTION_MATERIAL",
          id: "pm1",
          code: "PM-001",
          name: "Fabric",
          defaultSupplierId: null,
          prices: [
            { id: "p1", supplierId: "s1", supplierName: "A", unitPrice: 140000, unit: "kg" },
            { id: "p2", supplierId: "s2", supplierName: "B", unitPrice: 130000, unit: "kg" },
          ],
        },
      }),
    ], 100);
    assert.equal(template.lines[0]?.unitPrice, 0);
    assert.match(template.warnings[0] ?? "", /nhiều giá nhà cung cấp/);
  });

  it("calculates Excel-style material cost from unit price x consumption", () => {
    const template = buildProductCostingTemplate([
      row({
        source: {
          type: "PRODUCTION_MATERIAL",
          id: "pm1",
          code: "PM-001",
          name: "Fabric",
          defaultSupplierId: "s1",
          prices: [
            { id: "p1", supplierId: "s1", supplierName: "NCC A", unitPrice: 140000, unit: "kg" },
          ],
        },
      }),
    ], 100);
    assert.equal(template.lines[0]?.costPerUnit, 126000);
    assert.equal(template.lines[0]?.supplierName, "NCC A");
  });

  it("prefers variant-specific BOM rows over matching generic rows", () => {
    const rows = [
      row({ id: "generic" }),
      row({ id: "variant", variantId: "v1", consumptionPerUnit: 1 }),
    ];
    assert.deepEqual(preferVariantRequirements(rows, "v1").map((x) => x.id), ["variant"]);
  });

  it("normalizes common unit aliases", () => {
    assert.equal(unitsCompatible("mét", "m"), true);
    assert.equal(unitsCompatible("kg", "m"), false);
  });
});
