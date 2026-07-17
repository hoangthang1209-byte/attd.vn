import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureUniqueSku, getColorSkuCode } from "./product-sku-utils";

describe("getColorSkuCode", () => {
  it("maps Vietnamese and English color names to stable SKU codes", () => {
    assert.equal(getColorSkuCode("Đỏ"), "RED");
    assert.equal(getColorSkuCode("Do"), "RED");
    assert.equal(getColorSkuCode("Red"), "RED");
    assert.equal(getColorSkuCode("Đen"), "BLK");
    assert.equal(getColorSkuCode("Den"), "BLK");
    assert.equal(getColorSkuCode("Black"), "BLK");
    assert.equal(getColorSkuCode("Navy"), "NVY");
    assert.equal(getColorSkuCode("Vàng"), "YLW");
    assert.equal(getColorSkuCode("Vang"), "YLW");
    assert.equal(getColorSkuCode("Yellow"), "YLW");
    assert.equal(getColorSkuCode("Trắng"), "WHT");
    assert.equal(getColorSkuCode("Trang"), "WHT");
    assert.equal(getColorSkuCode("White"), "WHT");
  });
});

describe("ensureUniqueSku", () => {
  it("detects batch-level duplicate SKUs via reserved set", async () => {
    const reserved = new Set<string>();
    const db = {
      productVariant: {
        findUnique: async () => null,
      },
    };

    const first = await ensureUniqueSku("HOODIE001-RED-S", db, reserved);
    const second = await ensureUniqueSku("HOODIE001-RED-S", db, reserved);

    assert.equal(first, "HOODIE001-RED-S");
    assert.equal(second, "HOODIE001-RED-S-2");
    assert.ok(reserved.has("HOODIE001-RED-S"));
    assert.ok(reserved.has("HOODIE001-RED-S-2"));
  });

  it("resolves DB-level existing SKU conflict with a unique suffix", async () => {
    const taken = new Set(["HOODIE001-NVY-S", "HOODIE001-NVY-S-2"]);
    const db = {
      productVariant: {
        findUnique: async ({ where }: { where: { sku: string } }) =>
          taken.has(where.sku) ? { id: "existing", sku: where.sku } : null,
      },
    };

    const sku = await ensureUniqueSku("HOODIE001-NVY-S", db);
    assert.equal(sku, "HOODIE001-NVY-S-3");
  });
});
