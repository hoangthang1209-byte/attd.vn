import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATEGORY_SKU_CODE_MISSING_ERROR,
  PRODUCT_CODE_GENERATION_EXHAUSTED_ERROR,
  generateUniqueProductCode,
  getMaxProductCodeSuffixForPrefix,
  parseProductCodeSuffix,
  ProductSkuError,
  ensureUniqueSku,
  getColorSkuCode,
} from "./product-sku-utils";

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

    const first = await ensureUniqueSku("HOODIE001-RED-S", db as never, reserved);
    const second = await ensureUniqueSku("HOODIE001-RED-S", db as never, reserved);

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

    const sku = await ensureUniqueSku("HOODIE001-NVY-S", db as never);
    assert.equal(sku, "HOODIE001-NVY-S-3");
  });
});

describe("generateUniqueProductCode", () => {
  function mockDb(opts: {
    skuCode?: string | null;
    existingCodes?: string[];
  }) {
    const existing = new Set((opts.existingCodes ?? []).map((c) => c.toUpperCase()));
    return {
      category: {
        findUnique: async () =>
          opts.skuCode === undefined
            ? { skuCode: "PRRE" }
            : { skuCode: opts.skuCode },
      },
      product: {
        findMany: async ({ where }: { where: { productCode: { startsWith: string } } }) =>
          [...existing]
            .filter((code) => code.startsWith(where.productCode.startsWith.toUpperCase()))
            .map((productCode) => ({ productCode })),
        findUnique: async ({ where }: { where: { productCode: string } }) =>
          existing.has(where.productCode.toUpperCase())
            ? { id: "existing", productCode: where.productCode }
            : null,
      },
    };
  }

  it("creates first draft code for category skuCode", async () => {
    const code = await generateUniqueProductCode({
      categoryId: "cat-1",
      categorySkuCode: "PRRE",
      db: mockDb({ skuCode: "PRRE", existingCodes: [] }) as never,
    });
    assert.equal(code, "PRRE0001");
  });

  it("allocates next unique code after existing sequence", async () => {
    const code = await generateUniqueProductCode({
      categoryId: "cat-1",
      categorySkuCode: "PRRE",
      db: mockDb({
        skuCode: "PRRE",
        existingCodes: ["PRRE0001", "PRRE0002"],
      }) as never,
    });
    assert.equal(code, "PRRE0003");
  });

  it("skips codes held globally even when not owned by this category", async () => {
    // Another category already holds PRRE0001–PRRE0003. Global max drives next code.
    const code = await generateUniqueProductCode({
      categoryId: "cat-premium",
      categorySkuCode: "PRRE",
      db: mockDb({
        skuCode: "PRRE",
        existingCodes: ["PRRE0001", "PRRE0002", "PRRE0003"],
      }) as never,
    });
    assert.equal(code, "PRRE0004");
  });

  it("fills the next free slot when max candidate is already taken", async () => {
    const code = await generateUniqueProductCode({
      categoryId: "cat-premium",
      categorySkuCode: "PRRE",
      db: mockDb({
        skuCode: "PRRE",
        // max from findMany is 2 → candidate 3 is also taken → advance to 4
        existingCodes: ["PRRE0002", "PRRE0003"],
      }) as never,
    });
    assert.equal(code, "PRRE0004");
  });

  it("advances past simulated unique conflicts instead of regenerating the same code", async () => {
    const taken = new Set(["PRRE0003"]);
    let findUniqueCalls = 0;
    const db = {
      category: {
        findUnique: async () => ({ skuCode: "PRRE" }),
      },
      product: {
        findMany: async () => [{ productCode: "PRRE0002" }],
        findUnique: async ({ where }: { where: { productCode: string } }) => {
          findUniqueCalls += 1;
          return taken.has(where.productCode)
            ? { id: "existing", productCode: where.productCode }
            : null;
        },
      },
    };
    const code = await generateUniqueProductCode({
      categoryId: "cat-1",
      categorySkuCode: "PRRE",
      db: db as never,
    });
    assert.equal(code, "PRRE0004");
    assert.ok(findUniqueCalls >= 2);
  });

  it("returns actionable error when category skuCode is missing", async () => {
    await assert.rejects(
      () =>
        generateUniqueProductCode({
          categoryId: "cat-1",
          categorySkuCode: null,
          db: mockDb({ skuCode: null }) as never,
        }),
      (err: unknown) =>
        err instanceof ProductSkuError && err.message === CATEGORY_SKU_CODE_MISSING_ERROR,
    );
  });

  it("parseProductCodeSuffix and global max helper stay consistent", async () => {
    assert.equal(parseProductCodeSuffix("PRRE", "PRRE0007"), 7);
    assert.equal(parseProductCodeSuffix("PRRE", "PRRE-OLD"), null);
    const max = await getMaxProductCodeSuffixForPrefix(
      "PRRE",
      mockDb({ existingCodes: ["PRRE0001", "PRRE0009", "OTHER0001"] }) as never,
    );
    assert.equal(max, 9);
  });

  it("exhausted generation message is actionable", () => {
    assert.match(PRODUCT_CODE_GENERATION_EXHAUSTED_ERROR, /mã danh mục/i);
  });
});
