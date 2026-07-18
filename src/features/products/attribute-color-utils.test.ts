import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTRIBUTE_VALUE_DUPLICATE_MESSAGE,
  isColorAttribute,
  isValidHexColor,
  suggestAttributeColorCode,
  suggestColorHex,
} from "./attribute-color-utils";

describe("attribute-color-utils", () => {
  it("maps common Vietnamese/English color names to codes", () => {
    assert.equal(suggestAttributeColorCode("Xanh lá"), "GRN");
    assert.equal(suggestAttributeColorCode("Navy"), "NVY");
    assert.equal(suggestAttributeColorCode("Đen"), "BLK");
    assert.equal(suggestAttributeColorCode("Trắng"), "WHT");
    assert.equal(suggestAttributeColorCode("Tím"), "PUR");
    assert.equal(suggestAttributeColorCode("Be"), "BEI");
  });

  it("suggests HEX from known codes and validates HEX", () => {
    assert.equal(suggestColorHex("NVY"), "#1E3A8A");
    assert.equal(suggestColorHex("Trắng"), "#FFFFFF");
    assert.equal(isValidHexColor("#fff"), true);
    assert.equal(isValidHexColor("#FFFFFF"), true);
    assert.equal(isValidHexColor("zzz"), false);
    assert.equal(isValidHexColor(""), true);
  });

  it("detects color attributes", () => {
    assert.equal(isColorAttribute({ code: "COLOR", name: "Màu sắc", displayType: "COLOR_SWATCH" }), true);
    assert.equal(isColorAttribute({ code: "SIZE", name: "Kích thước", displayType: "SIZE" }), false);
    assert.match(ATTRIBUTE_VALUE_DUPLICATE_MESSAGE, /đã tồn tại/);
  });
});
