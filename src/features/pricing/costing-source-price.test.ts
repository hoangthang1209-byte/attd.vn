import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cheapestUnitPrice,
  COSTING_SOURCE_SEARCH_LIMIT,
  costingSourceCheckAllows,
  normalizeCostingPurchaseUnit,
  parseCostingSourceCalculationType,
  parseCostingUnitPrice,
  resolveSourceForeignKeys,
  selectPickerSourcePrices,
  sourceSupplierKey,
  tokenizeSearchQuery,
  CostingSourcePriceValidationError,
  type StoredSourcePrice,
} from "@/features/pricing/costing-source-price";

function price(
  overrides: Partial<StoredSourcePrice> &
    Pick<StoredSourcePrice, "id" | "supplierId" | "supplierName" | "unitPrice">,
): StoredSourcePrice {
  return {
    supplierCode: overrides.supplierCode ?? overrides.supplierId,
    sourceType: "PRODUCTION_MATERIAL",
    sourceId: "mat-cotton",
    unit: "kg",
    calculationType: null,
    isActive: true,
    note: null,
    ...overrides,
  };
}

describe("CostingSourcePrice model helpers", () => {
  it("allows one material with multiple supplier prices", () => {
    const rows = [
      price({ id: "p1", supplierId: "thien-tam", supplierName: "Thien Tam", unitPrice: 95000 }),
      price({ id: "p2", supplierId: "tan-phat", supplierName: "Tan Phat", unitPrice: 91000 }),
      price({ id: "p3", supplierId: "phuc-hung", supplierName: "Phuc Hung", unitPrice: 98000 }),
    ];
    const keys = new Set(rows.map((row) => sourceSupplierKey(row.sourceType, row.sourceId, row.supplierId)));
    assert.equal(keys.size, 3);
    const picker = selectPickerSourcePrices(rows);
    assert.equal(picker.length, 3);
    assert.deepEqual(
      picker.map((row) => row.supplierName),
      ["Phuc Hung", "Tan Phat", "Thien Tam"],
    );
  });

  it("allows one trim with multiple supplier prices", () => {
    const rows = [
      price({
        id: "t1",
        sourceType: "PRODUCTION_TRIM",
        sourceId: "trim-rib",
        supplierId: "ncc-a",
        supplierName: "NCC A",
        unitPrice: 2500,
        unit: "cái",
      }),
      price({
        id: "t2",
        sourceType: "PRODUCTION_TRIM",
        sourceId: "trim-rib",
        supplierId: "ncc-b",
        supplierName: "NCC B",
        unitPrice: 2200,
        unit: "cái",
      }),
    ];
    assert.equal(selectPickerSourcePrices(rows).length, 2);
  });

  it("allows one service with multiple providers", () => {
    const rows = [
      price({
        id: "s1",
        sourceType: "COST_LIBRARY",
        sourceId: "sew-db",
        supplierId: "xuong-a",
        supplierName: "Xưởng A",
        unitPrice: 20000,
        unit: "cái",
        calculationType: "PER_ITEM",
      }),
      price({
        id: "s2",
        sourceType: "COST_LIBRARY",
        sourceId: "sew-db",
        supplierId: "xuong-b",
        supplierName: "Xưởng B",
        unitPrice: 18500,
        unit: "cái",
        calculationType: "PER_ITEM",
      }),
    ];
    const picker = selectPickerSourcePrices(rows);
    assert.equal(picker.length, 2);
    assert.equal(cheapestUnitPrice(picker), 18500);
    assert.equal(picker[0]?.supplierName, "Xưởng A");
    assert.notEqual(picker[0]?.unitPrice, cheapestUnitPrice(picker));
  });

  it("looks up exact source + supplier key", () => {
    assert.equal(
      sourceSupplierKey("PRODUCTION_MATERIAL", "mat-1", "sup-1"),
      "PRODUCTION_MATERIAL:mat-1:sup-1",
    );
  });

  it("excludes inactive prices and archived suppliers from the default picker", () => {
    const rows = [
      price({ id: "p1", supplierId: "a", supplierName: "A", unitPrice: 1, isActive: false }),
      price({ id: "p2", supplierId: "b", supplierName: "B", unitPrice: 9, isActive: true, supplierIsActive: false }),
      price({ id: "p3", supplierId: "c", supplierName: "C", unitPrice: 8, isActive: true, supplierIsActive: true }),
    ];
    const picker = selectPickerSourcePrices(rows, { activeOnly: true, activeSuppliersOnly: true });
    assert.equal(picker.length, 1);
    assert.equal(picker[0]?.supplierId, "c");
  });

  it("does not automatically select the cheapest supplier", () => {
    const rows = [
      price({ id: "p1", supplierId: "expensive", supplierName: "Aaa Expensive", unitPrice: 98000 }),
      price({ id: "p2", supplierId: "cheap", supplierName: "Zzz Cheap", unitPrice: 91000 }),
    ];
    const picker = selectPickerSourcePrices(rows);
    assert.equal(picker[0]?.unitPrice, 98000);
    assert.equal(cheapestUnitPrice(rows), 91000);
    assert.notEqual(picker[0]?.id, rows.find((row) => row.unitPrice === cheapestUnitPrice(rows))?.id);
  });

  it("enforces exactly one source FK", () => {
    assert.throws(
      () =>
        resolveSourceForeignKeys({
          sourceType: "PRODUCTION_MATERIAL",
          productionMaterialId: "m1",
          productionTrimId: "t1",
        }),
      CostingSourcePriceValidationError,
    );
    const material = resolveSourceForeignKeys({
      sourceType: "PRODUCTION_MATERIAL",
      productionMaterialId: "m1",
    });
    assert.equal(material.productionMaterialId, "m1");
    assert.equal(material.productionTrimId, null);
    assert.equal(material.costLibraryItemId, null);
  });

  it("validates purchase unit and price", () => {
    assert.equal(normalizeCostingPurchaseUnit(" kg "), "kg");
    assert.equal(parseCostingUnitPrice("95000"), 95000);
    assert.throws(() => normalizeCostingPurchaseUnit("  "), CostingSourcePriceValidationError);
    assert.throws(() => parseCostingUnitPrice(-1), CostingSourcePriceValidationError);
  });

  it("bounds search to 20 results", () => {
    assert.equal(COSTING_SOURCE_SEARCH_LIMIT, 20);
    assert.deepEqual(tokenizeSearchQuery("cotton 250 extra token more"), [
      "cotton",
      "250",
      "extra",
      "token",
      "more",
    ]);
    assert.equal(tokenizeSearchQuery("a b c d e f g").length, 5);
  });

  it("mirrors CHECK: exactly one matching source FK", () => {
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "PRODUCTION_MATERIAL",
        productionMaterialId: "m1",
        calculationType: null,
      }),
      true,
    );
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "PRODUCTION_MATERIAL",
        productionMaterialId: "m1",
        calculationType: "PER_ITEM",
      }),
      false,
    );
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "PRODUCTION_TRIM",
        productionTrimId: "t1",
      }),
      true,
    );
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "COST_LIBRARY",
        costLibraryItemId: "c1",
        calculationType: "PER_POSITION",
      }),
      true,
    );
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "COST_LIBRARY",
        costLibraryItemId: "c1",
        calculationType: null,
      }),
      false,
    );
    assert.equal(
      costingSourceCheckAllows({
        sourceType: "PRODUCTION_MATERIAL",
        productionMaterialId: "m1",
        productionTrimId: "t1",
      }),
      false,
    );
    assert.equal(parseCostingSourceCalculationType("PRODUCTION_MATERIAL", "PER_ITEM"), null);
    assert.equal(parseCostingSourceCalculationType("COST_LIBRARY", "PER_ORDER"), "PER_ORDER");
    assert.throws(() => parseCostingSourceCalculationType("COST_LIBRARY", null), CostingSourcePriceValidationError);
  });

  it("treats source+supplier as one current row even when inactive", () => {
    const inactive = sourceSupplierKey("PRODUCTION_MATERIAL", "cotton", "thien-tam");
    const next = sourceSupplierKey("PRODUCTION_MATERIAL", "cotton", "thien-tam");
    assert.equal(inactive, next);
  });
});
