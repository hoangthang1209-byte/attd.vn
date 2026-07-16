import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  extractProductCardColorSwatches,
  isLightColorSwatch,
  mapProductCardAvailableColors,
  normalizeColorNameKey,
  resolveColorSwatchHex,
  sanitizeCssHexColor,
  splitVisibleColorSwatches,
} from "./product-card-color-swatches";

const repoRoot = resolve(import.meta.dirname, "../..");

function colorOptionValue(
  id: string,
  label: string,
  option: { name: string; slug: string } = { name: "Màu sắc", slug: "color" },
) {
  return {
    optionValue: {
      id,
      label,
      valueCode: null,
      attributeValue: null,
      option,
    },
  };
}

describe("product-card-color-swatches", () => {
  it("1 extracts unique colors from color × size variants", () => {
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 10,
          optionValues: [colorOptionValue("c-den", "Den"), colorOptionValue("s-m", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v2",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 8,
          optionValues: [colorOptionValue("c-den", "Den"), colorOptionValue("s-l", "L", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v3",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 5,
          optionValues: [colorOptionValue("c-xanh", "Xanh"), colorOptionValue("s-m", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v4",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 4,
          optionValues: [colorOptionValue("c-xanh", "Xanh"), colorOptionValue("s-l", "L", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v5",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-trang", "Trang"), colorOptionValue("s-m", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v6",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 2,
          optionValues: [colorOptionValue("c-do", "Do"), colorOptionValue("s-xl", "XL", { name: "Kích thước", slug: "size" })],
        },
      ],
    });

    assert.deepEqual(
      colors.map((c) => c.name).sort(),
      ["Xanh", "Đen", "Đỏ"].sort(),
    );
  });

  it("2 does not duplicate color swatches across sizes", () => {
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 1,
          optionValues: [colorOptionValue("c1", "Đen"), colorOptionValue("s1", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v2",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 1,
          optionValues: [colorOptionValue("c1", "Đen"), colorOptionValue("s2", "L", { name: "Kích thước", slug: "size" })],
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].name, "Đen");
  });

  it("3 uses ProductVariantOptionValue / ProductOptionValue as source of truth", () => {
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 3,
          colorName: "ShouldNotWin",
          optionValues: [colorOptionValue("opt-blue", "Xanh navy")],
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].id, "opt-blue");
    assert.equal(colors[0].name, "Xanh navy");
  });

  it("4 falls back to legacy colorName when structured option links are absent", () => {
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 2,
          colorName: "Đỏ",
          colorCode: "RED",
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].name, "Đỏ");
    assert.equal(colors[0].code, "RED");
    assert.equal(colors[0].hex, "#dc2626");
  });

  it("5 maps Den and Đen to the same black swatch", () => {
    assert.equal(normalizeColorNameKey("Den"), normalizeColorNameKey("Đen"));
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 1,
          colorName: "Den",
        },
        {
          id: "v2",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 1,
          colorName: "Đen",
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].name, "Đen");
    assert.equal(colors[0].hex, "#111827");
  });

  it("6 white swatch resolves to light hex requiring visible border", () => {
    const hex = resolveColorSwatchHex({ name: "Trắng" });
    assert.equal(hex, "#ffffff");
    assert.equal(isLightColorSwatch(hex), true);
    assert.equal(isLightColorSwatch(resolveColorSwatchHex({ name: "Trang" })), true);
  });

  it("7 unknown color renders safely without invalid CSS", () => {
    assert.equal(sanitizeCssHexColor("red"), null);
    assert.equal(sanitizeCssHexColor("javascript:alert(1)"), null);
    assert.equal(sanitizeCssHexColor("#gghhii"), null);
    assert.equal(sanitizeCssHexColor("#abc"), "#aabbcc");
    assert.equal(sanitizeCssHexColor("#112233"), "#112233");

    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 1,
          colorName: "Coral Mist",
          color: { hex: "not-a-color" },
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].name, "Coral Mist");
    assert.equal(colors[0].hex, null);
  });

  it("8 displays at most 6 swatches and +n overflow", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      name: `Màu ${i}`,
      hex: null as string | null,
    }));
    const { visible, overflowCount } = splitVisibleColorSwatches(many);
    assert.equal(visible.length, 6);
    assert.equal(overflowCount, 2);
  });

  it("9 does not render swatch data when no colors exist", () => {
    assert.deepEqual(mapProductCardAvailableColors({ variants: [] }), []);
    assert.deepEqual(
      mapProductCardAvailableColors({
        variants: [
          {
            id: "v1",
            variantStatus: "ACTIVE",
            stockStatus: "IN_STOCK",
            stockQty: 1,
            sizeName: "M",
          } as never,
        ],
      }),
      [],
    );
  });

  it("10 public listing mapper select includes color fields without N+1 helper scatter", () => {
    const serviceSource = readFileSync(
      resolve(repoRoot, "features/products/services/product.service.ts"),
      "utf8",
    );
    assert.ok(serviceSource.includes("PRODUCT_CARD_COLOR_VARIANT_SELECT"));
    assert.ok(serviceSource.includes('where: { variantStatus: "ACTIVE" }'));
    assert.ok(serviceSource.includes("optionValues"));

    const cardSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCard.tsx"),
      "utf8",
    );
    assert.ok(cardSource.includes("availableColors"));
    assert.ok(cardSource.includes("ProductCardColorSwatches"));
    assert.ok(!cardSource.includes("prisma."));
  });

  it("11 archived/hidden variants do not contribute colors", () => {
    const colors = extractProductCardColorSwatches({
      variants: [
        {
          id: "v-arch",
          variantStatus: "ARCHIVED",
          stockStatus: "IN_STOCK",
          stockQty: 9,
          colorName: "Đỏ",
        },
        {
          id: "v-inactive",
          variantStatus: "INACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 9,
          colorName: "Xanh",
        },
        {
          id: "v-ok",
          variantStatus: "ACTIVE",
          stockStatus: "IN_STOCK",
          stockQty: 2,
          colorName: "Đen",
        },
      ],
    });
    assert.equal(colors.length, 1);
    assert.equal(colors[0].name, "Đen");
  });

  it("12 product cards still link normally when swatches are present", () => {
    const cardSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCard.tsx"),
      "utf8",
    );
    assert.ok(cardSource.includes('href={productHref}'));
    assert.ok(cardSource.includes("product-card-media-link"));
    assert.ok(cardSource.includes("Xem chi tiết"));

    const swatchSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCardColorSwatches.tsx"),
      "utf8",
    );
    assert.ok(!swatchSource.includes("<Link"));
    assert.ok(!swatchSource.includes("<a "));
    assert.ok(swatchSource.includes('aria-label="Màu sắc có sẵn"'));
  });

  it("OEM/MTO products include zero-stock configured colors", () => {
    const colors = extractProductCardColorSwatches({
      supportsOem: true,
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-den", "Den")],
        },
        {
          id: "v2",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-trang", "Trang")],
        },
      ],
    });
    assert.deepEqual(
      colors.map((c) => c.name).sort(),
      ["Trắng", "Đen"].sort(),
    );
  });
});
