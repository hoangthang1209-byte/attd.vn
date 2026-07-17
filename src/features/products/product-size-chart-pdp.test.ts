import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapProductToPublicDetail } from "@/features/products/product-detail.mapper";
import {
  isPublicSizeChartRenderable,
  mergePublicSizeChartIntoMetadata,
  normalizeProductPublicMetadata,
  normalizeProductSizeChartMetadata,
  parsePublicSizeChartFromMetadata,
} from "@/features/products/product-size-chart";

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "ao-thun-regular-attd-001",
    name: "Áo thun regular attd 001",
    productCode: "PRRE0003",
    shortDescription: "Short",
    description: "Long description for product",
    seoTitle: "SEO",
    seoDescription: "SEO desc",
    material: null,
    form: null,
    fit: null,
    gsm: null,
    defaultMoq: 50,
    leadTime: "5-7 ngày",
    supportsPrinting: true,
    supportsEmbroidery: false,
    supportsOem: true,
    useCases: [],
    targetCustomers: [],
    featuredImage: "https://cdn.example.com/a.jpg",
    gallery: [],
    category: { id: "c1", name: "Áo thun", slug: "ao-thun" },
    images: [],
    options: [
      {
        id: "opt-color",
        name: "Màu sắc",
        slug: "color",
        sortOrder: 0,
        values: [
          { id: "c-navy", label: "Navy", valueCode: "NVY", imageUrl: null, sortOrder: 0 },
        ],
      },
      {
        id: "opt-size",
        name: "Kích thước",
        slug: "size",
        sortOrder: 1,
        values: [
          { id: "s-xs", label: "XS", valueCode: "XS", imageUrl: null, sortOrder: 0 },
        ],
      },
    ],
    specifications: [],
    attributeAssignments: [],
    customizationCapabilities: [],
    variants: [
      {
        id: "v1",
        sku: "PRRE0003-NVY-XS",
        displayLabel: "Navy / XS",
        colorName: "Navy",
        colorCode: "NVY",
        sizeName: "XS",
        dimensions: null,
        capacity: null,
        stockStatus: "OUT_OF_STOCK",
        stockQty: 0,
        imageUrl: null,
        moqOverride: null,
        leadTimeOverride: null,
        materialOverride: null,
        color: null,
        size: null,
        optionValues: [
          {
            optionValue: {
              id: "c-navy",
              label: "Navy",
              valueCode: "NVY",
              imageUrl: null,
              sortOrder: 0,
              option: { id: "opt-color", slug: "color", name: "Màu sắc" },
            },
          },
          {
            optionValue: {
              id: "s-xs",
              label: "XS",
              valueCode: "XS",
              imageUrl: null,
              sortOrder: 0,
              option: { id: "opt-size", slug: "size", name: "Kích thước" },
            },
          },
        ],
      },
    ],
    metadata: null,
    ...overrides,
  };
}

describe("public PDP size chart mapper", () => {
  it("includes renderable size chart on public detail", () => {
    const metadata = mergePublicSizeChartIntoMetadata(null, {
      enabled: true,
      unit: "cm",
      title: "Bảng size áo thun",
      note: "±1–2cm",
      columns: [
        { id: "chest", label: "Ngang ngực" },
        { id: "length", label: "Dài áo" },
      ],
      rows: [
        { id: "m", size: "M", values: { chest: "50", length: "68" } },
        { id: "l", size: "L", values: { chest: "52", length: "70" } },
      ],
    });

    const detail = mapProductToPublicDetail(baseProduct({ metadata }));
    assert.ok(detail.sizeChart);
    assert.equal(detail.sizeChart?.title, "Bảng size áo thun");
    assert.equal(detail.sizeChart?.rows.length, 2);
    assert.equal(detail.sizeChart?.columns[0]?.label, "Ngang ngực");
    assert.equal(isPublicSizeChartRenderable(detail.sizeChart), true);
  });

  it("does not expose disabled size chart on public detail", () => {
    const metadata = mergePublicSizeChartIntoMetadata(
      { curatedSalesBadges: ["NEW"] },
      {
        enabled: false,
        unit: "cm",
        columns: [{ id: "chest", label: "Ngang ngực" }],
        rows: [{ id: "m", size: "M", values: { chest: "50" } }],
      },
    );
    const detail = mapProductToPublicDetail(baseProduct({ metadata }));
    assert.equal(detail.sizeChart, null);
    assert.deepEqual(parsePublicSizeChartFromMetadata(metadata).enabled, false);
    assert.deepEqual(
      (metadata as Record<string, unknown>).curatedSalesBadges,
      ["NEW"],
    );
  });

  it("renders when publicSizeChart is missing", () => {
    const detail = mapProductToPublicDetail(baseProduct({ metadata: {} }));
    assert.equal(detail.sizeChart, null);
    assert.equal(detail.name, "Áo thun regular attd 001");
  });

  it("renders when publicSizeChart has missing rows/columns and hides empty section", () => {
    const detail = mapProductToPublicDetail(
      baseProduct({
        metadata: {
          publicSizeChart: {
            enabled: true,
            unit: "cm",
            title: "Bảng size",
            columns: [],
            rows: null,
          },
        },
      }),
    );
    assert.equal(detail.sizeChart, null);
    assert.equal(isPublicSizeChartRenderable(detail.sizeChart), false);
  });

  it("renders when metadata is null/string/array/unexpected object", () => {
    for (const metadata of [null, "bad", [1, 2], 42, { publicSizeChart: "oops" }]) {
      const detail = mapProductToPublicDetail(baseProduct({ metadata }));
      assert.equal(detail.sizeChart, null);
      assert.ok(detail.slug);
    }
  });

  it("renders when generated variants have colorId/sizeId null relations", () => {
    const detail = mapProductToPublicDetail(baseProduct());
    assert.equal(detail.variants.length, 1);
    assert.equal(detail.variants[0]?.label, "Navy / XS");
    assert.equal(detail.variants[0]?.colorName, "Navy");
    assert.equal(detail.variants[0]?.sizeName, "XS");
    assert.equal(detail.hasStructuredOptions, true);
  });

  it("ao-thun-regular-attd-001 fixture renders without throwing", () => {
    const detail = mapProductToPublicDetail(
      baseProduct({
        metadata: {
          curatedSalesBadges: ["NEW"],
          publicSizeChart: {
            enabled: true,
            unit: "cm",
            title: "Bảng size",
            note: "Tham khảo",
            columns: [{ id: "chest", label: "Ngang áo" }],
            rows: [{ id: "xs", size: "XS", values: { chest: "44" } }],
          },
        },
      }),
    );
    assert.equal(detail.slug, "ao-thun-regular-attd-001");
    assert.ok(detail.sizeChart);
    assert.equal(detail.variants[0]?.stockStatus, "OUT_OF_STOCK");
  });
});

describe("normalizeProductPublicMetadata", () => {
  it("normalizes malformed metadata safely", () => {
    assert.equal(normalizeProductSizeChartMetadata(null).enabled, false);
    assert.deepEqual(normalizeProductPublicMetadata("x").curatedSalesBadges, []);
    assert.equal(normalizeProductPublicMetadata({ publicSizeChart: { enabled: true } }).sizeChart.enabled, true);
    assert.equal(
      normalizeProductPublicMetadata({ publicSizeChart: { enabled: true, columns: null, rows: null } })
        .sizeChart.columns.length,
      0,
    );
  });
});

describe("product detail query shape", () => {
  it("does not put scalar metadata inside Prisma include", () => {
    const source = readFileSync(
      join(process.cwd(), "src/features/products/services/product.service.ts"),
      "utf8",
    );
    const includeMatch = source.match(
      /const PRODUCT_DETAIL_INCLUDE = \{([\s\S]*?)\} as const;/,
    );
    assert.ok(includeMatch, "PRODUCT_DETAIL_INCLUDE block missing");
    assert.doesNotMatch(includeMatch[1]!, /^\s*metadata:\s*true\s*,?\s*$/m);
    assert.match(source, /Product\.metadata is a scalar Json field/);
  });
});
