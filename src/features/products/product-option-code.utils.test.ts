import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateOptionGroupSlug,
  generateOptionValueCode,
  validateOptionValueCodesInGroup,
} from "./product-option-code.utils";

describe("generateOptionGroupSlug", () => {
  it("maps Vietnamese color group to color slug", () => {
    assert.equal(generateOptionGroupSlug("Màu sắc"), "color");
  });

  it("maps size group to size slug", () => {
    assert.equal(generateOptionGroupSlug("Kích thước"), "size");
  });
});

describe("generateOptionValueCode", () => {
  const colorGroup = { name: "Màu sắc", slug: "color" };
  const sizeGroup = { name: "Kích thước", slug: "size" };

  it("generates color codes from Vietnamese labels", () => {
    assert.equal(generateOptionValueCode(colorGroup, "Đen"), "BLK");
    assert.equal(generateOptionValueCode(colorGroup, "Trắng"), "WHT");
    assert.equal(generateOptionValueCode(colorGroup, "Navy"), "NVY");
  });

  it("generates size codes", () => {
    assert.equal(generateOptionValueCode(sizeGroup, "S"), "S");
    assert.equal(generateOptionValueCode(sizeGroup, "M"), "M");
    assert.equal(generateOptionValueCode(sizeGroup, "XL"), "XL");
  });

  it("deduplicates codes within a group", () => {
    const codes = ["BLK"];
    const next = generateOptionValueCode(colorGroup, "Đen", codes);
    assert.notEqual(next.toUpperCase(), "BLK");
    assert.match(next, /^BLK\d+$/);
  });
});

describe("validateOptionValueCodesInGroup", () => {
  it("flags duplicate labels and codes", () => {
    const errors = validateOptionValueCodesInGroup(0, "Màu sắc", [
      { label: "Đen", valueCode: "BLK" },
      { label: "Đen", valueCode: "BLK2" },
      { label: "Trắng", valueCode: "BLK" },
    ]);
    assert.ok(errors["options.0.values.1.label"]);
    assert.ok(errors["options.0.values.2.valueCode"]);
  });
});
