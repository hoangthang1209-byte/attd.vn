import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const sql = readFileSync(
  path.join(root, "prisma/migrations/0097_costing_source_prices/migration.sql"),
  "utf8",
);

describe("0097 costing source prices migration safety", () => {
  it("is additive only", () => {
    assert.doesNotMatch(sql, /\bDROP\b/i);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
    assert.doesNotMatch(sql, /\bALTER TABLE\b[\s\S]{0,80}\bDROP\b/i);
    assert.match(sql, /CREATE TABLE "CostingSourcePrice"/);
    assert.match(sql, /legacyBuiltinId/);
  });

  it("uses explicit FKs and exactly-one-source CHECK", () => {
    assert.match(sql, /CostingSourcePrice_one_source_chk/);
    assert.match(sql, /productionMaterialId/);
    assert.match(sql, /productionTrimId/);
    assert.match(sql, /costLibraryItemId/);
    assert.match(sql, /REFERENCES "ProductionSupplier"/);
    assert.match(sql, /ON DELETE RESTRICT/);
    assert.match(
      sql,
      /PRODUCTION_MATERIAL[\s\S]*calculationType" IS NULL[\s\S]*PRODUCTION_TRIM[\s\S]*calculationType" IS NULL[\s\S]*COST_LIBRARY[\s\S]*calculationType" IS NOT NULL/,
    );
  });

  it("uniques current price per source \+ supplier regardless of isActive", () => {
    assert.match(sql, /CostingSourcePrice_material_supplier_key/);
    assert.match(sql, /CostingSourcePrice_trim_supplier_key/);
    assert.match(sql, /CostingSourcePrice_library_supplier_key/);
    assert.match(sql, /WHERE "productionMaterialId" IS NOT NULL/);
    assert.doesNotMatch(sql, /UNIQUE INDEX[\s\S]{0,200}isActive/);
    assert.match(sql, /independent of isActive/);
  });

  it("stamps unique legacyBuiltinId only when present", () => {
    assert.match(sql, /PricingCostLibraryItem_legacyBuiltinId_key/);
    assert.match(sql, /WHERE "legacyBuiltinId" IS NOT NULL/);
  });
});
