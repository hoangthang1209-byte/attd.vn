import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapProductToPublicDetail } from "@/features/products/product-detail.mapper";
import {
  isPublicSizeChartRenderable,
  mergePublicSizeChartIntoMetadata,
  parsePublicSizeChartFromMetadata,
} from "@/features/products/product-size-chart";

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "ao-thun-test",
    name: "Áo thun test",
    productCode: "TS0001",
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
    options: [],
    specifications: [],
    attributeAssignments: [],
    customizationCapabilities: [],
    variants: [],
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
});
