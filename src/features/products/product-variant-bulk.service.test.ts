import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBulkNextPrice,
  computeBulkNextStockQty,
  isClientTempVariantId,
} from "@/features/products/product-variant-bulk.service";
import { applyBulkResultToVariants } from "@/features/products/product-catalog-form-mappers";
import type { BulkVariantResult } from "@/features/products/product-variant-bulk.service";
import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";

describe("isClientTempVariantId", () => {
  it("rejects empty and client temp IDs", () => {
    assert.equal(isClientTempVariantId(""), true);
    assert.equal(isClientTempVariantId("   "), true);
    assert.equal(isClientTempVariantId("var-abc123"), true);
    assert.equal(isClientTempVariantId("tmp_1"), true);
    assert.equal(isClientTempVariantId("client-key"), true);
    assert.equal(isClientTempVariantId("legacy-row"), true);
  });

  it("allows persisted cuid-like IDs", () => {
    assert.equal(isClientTempVariantId("cm1234567890abcdefghijkl"), false);
    assert.equal(isClientTempVariantId("clk9xyzproductvariant01"), false);
  });
});

describe("computeBulkNextStockQty", () => {
  it("supports set / increase / decrease modes", () => {
    assert.equal(computeBulkNextStockQty(10, "set", 50), 50);
    assert.equal(computeBulkNextStockQty(40, "increase", 10), 50);
    assert.equal(computeBulkNextStockQty(50, "decrease", 10), 40);
  });

  it("can produce a negative value so callers can reject it", () => {
    assert.equal(computeBulkNextStockQty(40, "decrease", 100), -60);
  });

  it("floors fractional quantities", () => {
    assert.equal(computeBulkNextStockQty(10, "set", 12.9), 12);
    assert.equal(computeBulkNextStockQty(10, "increase", 1.8), 11);
  });
});

describe("computeBulkNextPrice", () => {
  it("sets and adjusts wholesale/dealer style amounts", () => {
    assert.equal(computeBulkNextPrice(100_000, "set", 120_000), 120_000);
    assert.equal(computeBulkNextPrice(100_000, "increase_amount", 10_000), 110_000);
    assert.equal(computeBulkNextPrice(100_000, "decrease_amount", 10_000), 90_000);
    assert.equal(computeBulkNextPrice(100_000, "increase_percent", 10), 110_000);
    assert.equal(computeBulkNextPrice(100_000, "decrease_percent", 10), 90_000);
  });

  it("treats null current price as 0 for relative modes", () => {
    assert.equal(computeBulkNextPrice(null, "set", 50_000), 50_000);
    assert.equal(computeBulkNextPrice(null, "increase_amount", 5_000), 5_000);
    assert.equal(computeBulkNextPrice(null, "decrease_amount", 1_000), -1_000);
  });

  it("rounds to 2 decimal places", () => {
    assert.equal(computeBulkNextPrice(100, "increase_percent", 33.333), 133.33);
  });
});

describe("applyBulkResultToVariants", () => {
  const baseRow = (overrides: Partial<MatrixVariantFormRow> = {}): MatrixVariantFormRow => ({
    id: "variant-1",
    clientKey: "variant-1",
    variantKind: "structured",
    displayLabel: "Đen / M",
    optionValueIds: ["c1", "s1"],
    colorName: "Đen",
    colorCode: "#000",
    sizeName: "M",
    dimensions: "",
    capacity: "",
    sku: "SKU-1",
    variantStatus: "ACTIVE",
    stockQty: "10",
    stockStatus: "IN_STOCK",
    moqOverride: "",
    leadTimeOverride: "",
    materialOverride: "",
    wholesalePrice: "100000",
    dealerPrice: "90000",
    imageUrl: "",
    internalNote: "",
    ...overrides,
  });

  it("merges stock and price fields after bulk update", () => {
    const result: BulkVariantResult = {
      operation: "price",
      successCount: 1,
      skippedCount: 0,
      blockedCount: 0,
      deletedIds: [],
      message: "Đã cập nhật 1 biến thể.",
      variants: [
        {
          id: "variant-1",
          sku: "SKU-1",
          displayLabel: "Đen / M",
          variantStatus: "ACTIVE",
          stockQty: 40,
          stockStatus: "IN_STOCK",
          moqOverride: null,
          leadTimeOverride: null,
          wholesalePrice: 120000,
          dealerPrice: 90000,
          imageUrl: "https://cdn.example.com/a.jpg",
          colorName: "Đen",
          colorCode: "#000",
          sizeName: "M",
          dimensions: null,
          capacity: null,
          optionValueIds: ["c1", "s1"],
        },
      ],
    };

    const next = applyBulkResultToVariants([baseRow()], result);
    assert.equal(next[0]?.stockQty, "40");
    assert.equal(next[0]?.wholesalePrice, "120000");
    assert.equal(next[0]?.dealerPrice, "90000");
    assert.equal(next[0]?.imageUrl, "https://cdn.example.com/a.jpg");
  });

  it("removes deleted variants from the table state", () => {
    const result: BulkVariantResult = {
      operation: "delete",
      successCount: 1,
      skippedCount: 0,
      blockedCount: 0,
      deletedIds: ["variant-1"],
      message: "Đã xóa 1 biến thể.",
      variants: [],
    };
    const next = applyBulkResultToVariants(
      [baseRow(), baseRow({ id: "variant-2", clientKey: "variant-2", sku: "SKU-2" })],
      result,
    );
    assert.equal(next.length, 1);
    assert.equal(next[0]?.id, "variant-2");
  });
});

describe("104-variant bulk math scale", () => {
  it("computes stock set/decrease for 104 variants without negatives when valid", () => {
    const stocks = Array.from({ length: 104 }, () => 50);
    const afterSet = stocks.map((qty) => computeBulkNextStockQty(qty, "set", 50));
    assert.equal(afterSet.length, 104);
    assert.ok(afterSet.every((qty) => qty === 50));

    const afterDecrease = afterSet.map((qty) => computeBulkNextStockQty(qty, "decrease", 10));
    assert.ok(afterDecrease.every((qty) => qty === 40));

    const wouldGoNegative = afterDecrease.map((qty) => computeBulkNextStockQty(qty, "decrease", 100));
    assert.ok(wouldGoNegative.every((qty) => qty < 0));
  });

  it("computes price set for 200 variants", () => {
    const prices = Array.from({ length: 200 }, (_, i) => 100_000 + i);
    const next = prices.map((price) => computeBulkNextPrice(price, "set", 150_000));
    assert.equal(next.length, 200);
    assert.ok(next.every((price) => price === 150_000));
  });
});
