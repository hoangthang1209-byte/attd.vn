import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ATTRIBUTE_VALUE_DUPLICATE_MESSAGE,
  isColorAttribute,
  isValidHexColor,
  nextAvailableAttributeCode,
  resolveAttributeNamingSource,
  suggestAttributeColorCode,
  suggestAttributeCode,
  suggestAttributeValueCode,
  suggestColorHex,
} from "./attribute-color-utils";

describe("attribute-color-utils", () => {
  it("maps common Vietnamese/English color names to codes", () => {
    assert.equal(suggestAttributeColorCode("Xanh lá"), "GRN");
    assert.equal(suggestAttributeColorCode("Green"), "GRN");
    assert.equal(suggestAttributeColorCode("Navy"), "NVY");
    assert.equal(suggestAttributeColorCode("Đen"), "BLK");
    assert.equal(suggestAttributeColorCode("Trắng"), "WHT");
    assert.equal(suggestAttributeColorCode("Tím"), "PUR");
    assert.equal(suggestAttributeColorCode("Be"), "BEI");
  });

  it("suggests HEX from known codes and validates HEX", () => {
    assert.equal(suggestColorHex("NVY"), "#1E3A5F");
    assert.equal(suggestColorHex("Trắng"), "#FFFFFF");
    assert.equal(suggestColorHex("Green"), "#16A34A");
    assert.equal(suggestColorHex("Black"), "#111827");
    assert.equal(isValidHexColor("#fff"), true);
    assert.equal(isValidHexColor("#FFFFFF"), true);
    assert.equal(isValidHexColor("zzz"), false);
    assert.equal(isValidHexColor(""), true);
    assert.equal(suggestColorHex("UnknownHue"), "");
  });

  it("prefers English name for code generation with Vietnamese fallback", () => {
    assert.equal(resolveAttributeNamingSource("Xanh lá", "Green"), "Green");
    assert.equal(resolveAttributeNamingSource("Xanh lá", ""), "Xanh lá");
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Xanh lá", nameEn: "Green", isColor: true }),
      "GRN",
    );
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Xanh lá", isColor: true }),
      "GRN",
    );
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Vừa", nameEn: "Medium", isSize: true }),
      "M",
    );
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Cotton 100%", nameEn: "Cotton 100%" }),
      "COTTON100",
    );
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Regular fit", nameEn: "Regular fit" }),
      "REGULAR",
    );
    assert.equal(
      suggestAttributeValueCode({ nameVi: "Oversize", nameEn: "Oversize" }),
      "OVERSIZE",
    );
  });

  it("resolves duplicate codes with deterministic suffixes without overwriting", () => {
    assert.equal(nextAvailableAttributeCode("GRN", ["GRN"]), "GRN2");
    assert.equal(nextAvailableAttributeCode("GRN", ["GRN", "GRN2"]), "GRN3");
    assert.equal(nextAvailableAttributeCode("S", ["S", "M"]), "S2");
    assert.equal(
      suggestAttributeValueCode({
        nameVi: "Xanh lá",
        nameEn: "Green",
        isColor: true,
        existingCodes: ["GRN"],
      }),
      "GRN2",
    );
    assert.equal(suggestAttributeCode("Màu sắc", "Color", ["COLOR"]), "COLOR2");
  });

  it("detects color attributes and duplicate message", () => {
    assert.equal(isColorAttribute({ code: "COLOR", name: "Màu sắc", displayType: "COLOR_SWATCH" }), true);
    assert.equal(isColorAttribute({ code: "SIZE", name: "Kích thước", displayType: "SIZE" }), false);
    assert.match(ATTRIBUTE_VALUE_DUPLICATE_MESSAGE, /đã tồn tại/);
  });
});
