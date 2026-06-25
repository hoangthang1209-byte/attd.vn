import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  comboSignature,
  optionValueNeedsUpdate,
  variantNeedsUpdate,
  variantOptionLinksNeedUpdate,
} from "./product-save-relation-diff";

describe("product save relation diff", () => {
  it("skips unchanged variant rows", () => {
    const existing = {
      id: "v1",
      sku: "POL0001-BLK-L",
      colorName: null,
      colorCode: null,
      sizeName: null,
      dimensions: null,
      capacity: null,
      displayLabel: "Black / L",
      moqOverride: null,
      leadTimeOverride: null,
      materialOverride: null,
      wholesalePrice: null,
      dealerPrice: null,
      costPrice: null,
      stockQty: 10,
      stockStatus: "IN_STOCK",
      weight: null,
      imageUrl: null,
      internalNote: null,
      variantStatus: "ACTIVE",
      optionValueIds: ["ov1", "ov2"],
    };
    assert.equal(
      variantNeedsUpdate(
        {
          id: "v1",
          sku: "POL0001-BLK-L",
          stockQty: 10,
          stockStatus: "IN_STOCK",
          variantStatus: "ACTIVE",
          imageUrl: undefined,
        },
        existing,
      ),
      false,
    );
  });

  it("detects changed variant image URL", () => {
    const existing = {
      id: "v1",
      sku: "POL0001-BLK-L",
      colorName: null,
      colorCode: null,
      sizeName: null,
      dimensions: null,
      capacity: null,
      displayLabel: "Black / L",
      moqOverride: null,
      leadTimeOverride: null,
      materialOverride: null,
      wholesalePrice: null,
      dealerPrice: null,
      costPrice: null,
      stockQty: 10,
      stockStatus: "IN_STOCK",
      weight: null,
      imageUrl: null,
      internalNote: null,
      variantStatus: "ACTIVE",
      optionValueIds: [],
    };
    assert.equal(
      variantNeedsUpdate({ id: "v1", imageUrl: "https://cdn.example.com/a.jpg" }, existing),
      true,
    );
  });

  it("skips unchanged option value rows", () => {
    const existing = {
      id: "val1",
      optionId: "opt1",
      label: "Black",
      valueCode: "BLK",
      imageUrl: "https://cdn.example.com/black.jpg",
      sortOrder: 0,
      attributeValueId: "attr-val-1",
    };
    assert.equal(
      optionValueNeedsUpdate(
        {
          id: "val1",
          label: "Black",
          valueCode: "BLK",
          imageUrl: "https://cdn.example.com/black.jpg",
          sortOrder: 0,
          attributeValueId: "attr-val-1",
        },
        existing,
        0,
      ),
      false,
    );
  });

  it("skips unchanged variant option-link combinations", () => {
    const desired = ["b", "a"];
    const existing = ["a", "b"];
    assert.equal(variantOptionLinksNeedUpdate(desired, existing), false);
    assert.equal(comboSignature(desired), comboSignature(existing));
    assert.equal(variantOptionLinksNeedUpdate(["a"], ["a", "b"]), true);
  });
});
