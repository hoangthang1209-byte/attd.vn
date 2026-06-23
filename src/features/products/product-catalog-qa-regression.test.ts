import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterActivePublicVariants,
  mergeVariantStatusOnSave,
  resolveEffectiveMoq,
  runProductCatalogQaRegressionSelfTest,
} from "./product-catalog-qa-regression";
import { resolveQuoteVariantId } from "./product-pdp.utils";
import { variantStatusLabel } from "./product-variant-labels";
import { isValidProductImageUrl } from "./product-image-url";

describe("product variant status labels", () => {
  it("maps ACTIVE/INACTIVE/ARCHIVED to Vietnamese", () => {
    assert.equal(variantStatusLabel("ACTIVE"), "Đang hoạt động");
    assert.equal(variantStatusLabel("INACTIVE"), "Ngừng sử dụng");
    assert.equal(variantStatusLabel("ARCHIVED"), "Lưu trữ");
  });
});

describe("filterActivePublicVariants", () => {
  it("keeps only ACTIVE variants for PDP", () => {
    const result = filterActivePublicVariants([
      { id: "1", variantStatus: "ACTIVE" },
      { id: "2", variantStatus: "INACTIVE" },
    ]);
    assert.deepEqual(result.map((v) => v.id), ["1"]);
  });
});

describe("resolveEffectiveMoq", () => {
  it("prefers variant override over product default", () => {
    assert.equal(resolveEffectiveMoq(200, 50), 200);
    assert.equal(resolveEffectiveMoq(null, 50), 50);
  });
});

describe("mergeVariantStatusOnSave", () => {
  it("does not resurrect inactive when status omitted", () => {
    assert.equal(mergeVariantStatusOnSave("ARCHIVED", undefined), "ARCHIVED");
  });
});

describe("resolveQuoteVariantId", () => {
  it("returns null when selected variant is inactive", () => {
    assert.equal(
      resolveQuoteVariantId(
        [
          { id: "v1", variantStatus: "INACTIVE" },
          { id: "v2", variantStatus: "ACTIVE" },
        ],
        "v1",
      ),
      null,
    );
    assert.equal(
      resolveQuoteVariantId([{ id: "v2", variantStatus: "ACTIVE" }], "v2"),
      "v2",
    );
  });
});

describe("isValidProductImageUrl", () => {
  it("accepts https only", () => {
    assert.equal(isValidProductImageUrl("https://example.com/a.jpg"), true);
    assert.equal(isValidProductImageUrl("/local/path.jpg"), false);
    assert.equal(isValidProductImageUrl("javascript:alert(1)"), false);
  });
});

describe("runProductCatalogQaRegressionSelfTest", () => {
  it("passes all built-in regression checks", () => {
    const issues = runProductCatalogQaRegressionSelfTest();
    assert.deepEqual(issues, []);
  });
});
