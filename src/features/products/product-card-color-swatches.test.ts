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
      ["Trắng", "Xanh", "Đen", "Đỏ"].sort(),
    );
  });

  it("1b active variants with stockQty=0 / OUT_OF_STOCK still show configured colors", () => {
    const colors = extractProductCardColorSwatches({
      supportsOem: false,
      variants: [
        {
          id: "v1",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-den", "Den"), colorOptionValue("s-m", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v2",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-den", "Den"), colorOptionValue("s-l", "L", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v3",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-xanh", "Xanh"), colorOptionValue("s-m", "M", { name: "Kích thước", slug: "size" })],
        },
        {
          id: "v4",
          variantStatus: "ACTIVE",
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
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
          stockStatus: "OUT_OF_STOCK",
          stockQty: 0,
          optionValues: [colorOptionValue("c-do", "Do"), colorOptionValue("s-xl", "XL", { name: "Kích thước", slug: "size" })],
        },
      ],
    });

    assert.equal(colors.length, 4);
    assert.deepEqual(
      colors.map((c) => c.name).sort(),
      ["Trắng", "Xanh", "Đen", "Đỏ"].sort(),
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

    const listingPage = readFileSync(
      resolve(repoRoot, "app/(public)/san-pham/page.tsx"),
      "utf8",
    );
    assert.ok(listingPage.includes("mapProductCardAvailableColors"));
    assert.ok(listingPage.includes("availableColors={mapProductCardAvailableColors(product)}"));

    const cardSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCard.tsx"),
      "utf8",
    );
    assert.ok(cardSource.includes("availableColors"));
    assert.ok(cardSource.includes("ProductCardColorSwatches"));
    assert.ok(!cardSource.includes("prisma."));
  });

  it("10b ProductCard renders swatches after lead-time and before Liên hệ CTA", () => {
    const cardSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCard.tsx"),
      "utf8",
    );
    const leadTimeIdx = cardSource.indexOf("product-card-leadtime");
    const catalogLeadIdx = cardSource.indexOf('product-card-catalog-meta__label">Lead time');
    const swatchIdx = cardSource.indexOf("<ProductCardColorSwatches colors={availableColors}");
    const contactIdx = cardSource.indexOf("product-card-footer");
    const lienHeIdx = cardSource.indexOf("Liên hệ báo giá sỉ");

    assert.ok(swatchIdx > 0, "swatch component must be rendered");
    assert.ok(contactIdx > swatchIdx, "swatches must appear before footer/contact CTA");
    assert.ok(lienHeIdx > swatchIdx, "swatches must appear before Liên hệ CTA text");
    assert.ok(
      leadTimeIdx > 0 && swatchIdx > leadTimeIdx,
      "swatches must appear after lead-time row",
    );
    assert.ok(
      catalogLeadIdx > 0 && swatchIdx > catalogLeadIdx,
      "swatches must appear after catalog lead-time meta",
    );
    assert.ok(
      !cardSource.includes("product-card-media") ||
        cardSource.indexOf("product-card-media") < swatchIdx,
      "swatches stay in body, not under media-only placement before title",
    );

    // Swatches must not be the first child of product-card-body (no longer under image).
    const bodyStart = cardSource.indexOf('<div className="product-card-body">');
    const bodySlice = cardSource.slice(bodyStart, bodyStart + 280);
    assert.ok(
      !bodySlice.includes("<ProductCardColorSwatches"),
      "swatches must not be first content under the image/body start",
    );

    const swatchSource = readFileSync(
      resolve(repoRoot, "components/public/ProductCardColorSwatches.tsx"),
      "utf8",
    );
    assert.ok(swatchSource.includes('className={["product-card-colors"'));
    assert.ok(swatchSource.includes("if (!colors.length) return null"));
  });

  it("10c swatch CSS class is present and not hidden", () => {
    const css = readFileSync(resolve(repoRoot, "app/globals.css"), "utf8");
    assert.ok(css.includes(".product-card-colors {"));
    assert.ok(css.includes(".product-card-swatch {"));
    assert.ok(css.includes(".product-card-swatch--bordered"));
    const colorsBlockStart = css.indexOf(".product-card-colors {");
    const colorsBlock = css.slice(colorsBlockStart, colorsBlockStart + 280);
    assert.ok(!/display:\s*none/.test(colorsBlock));
    assert.ok(!/visibility:\s*hidden/.test(colorsBlock));
    assert.ok(!/height:\s*0(?!\d)/.test(colorsBlock.replace(/min-height:\s*0;?/g, "")));
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
