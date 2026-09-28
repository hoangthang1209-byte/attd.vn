import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findOverlappingActiveTier,
  tiersOverlap,
  type ProductPriceTierOverlapFields,
} from "@/features/pricing/product-price-tier-overlap";

function tier(partial: Partial<ProductPriceTierOverlapFields> & Pick<ProductPriceTierOverlapFields, "id">): ProductPriceTierOverlapFields {
  return {
    productId: "p1",
    variantId: null,
    priceGroupId: "pg1",
    minQuantity: 1,
    maxQuantity: null,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    ...partial,
  };
}

describe("product price tier overlap", () => {
  it("detects overlapping quantity ranges for same product and price group", () => {
    const a = tier({ id: "a", minQuantity: 50, maxQuantity: 200 });
    const b = tier({ id: "b", minQuantity: 100, maxQuantity: 500 });
    assert.equal(tiersOverlap(a, b), true);
  });

  it("allows adjacent non-overlapping quantity ranges", () => {
    const a = tier({ id: "a", minQuantity: 1, maxQuantity: 99 });
    const b = tier({ id: "b", minQuantity: 100, maxQuantity: null });
    assert.equal(tiersOverlap(a, b), false);
  });

  it("respects variant scope", () => {
    const a = tier({ id: "a", variantId: "v1", minQuantity: 1, maxQuantity: null });
    const b = tier({ id: "b", variantId: "v2", minQuantity: 1, maxQuantity: null });
    assert.equal(tiersOverlap(a, b), false);
  });

  it("respects effective date overlap", () => {
    const a = tier({
      id: "a",
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: new Date("2026-06-30"),
    });
    const b = tier({
      id: "b",
      effectiveFrom: new Date("2026-06-01"),
      effectiveTo: new Date("2026-12-31"),
    });
    assert.equal(tiersOverlap(a, b), true);
  });

  it("ignores inactive tiers", () => {
    const a = tier({ id: "a", isActive: false });
    const b = tier({ id: "b", isActive: true });
    assert.equal(tiersOverlap(a, b), false);
  });

  it("findOverlappingActiveTier returns conflicting row", () => {
    const existing = [tier({ id: "existing", minQuantity: 10, maxQuantity: 100 })];
    const candidate = tier({ id: "new", minQuantity: 50, maxQuantity: 200 });
    const hit = findOverlappingActiveTier(candidate, existing);
    assert.equal(hit?.id, "existing");
  });
});
