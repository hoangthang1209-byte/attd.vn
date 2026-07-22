import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPublicMediaUrl,
  isBrokenPublicMediaReference,
  uniquePublicMediaUrls,
} from "@/features/media/get-public-media-url";
import { buildProductImages, getPrimaryProductImageFromProduct } from "@/lib/productImages";
import { mapProductToPublicDetail } from "@/features/products/product-detail.mapper";
import { evaluateProductReadiness } from "@/features/products/product-admin-readiness";

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "ao-thun-test",
    name: "Áo thun test",
    productCode: "P1",
    shortDescription: null,
    description: null,
    descriptionBlocks: null,
    seoTitle: null,
    seoDescription: null,
    material: null,
    form: null,
    fit: null,
    gsm: null,
    defaultMoq: 50,
    leadTime: null,
    supportsPrinting: false,
    supportsEmbroidery: false,
    supportsOem: false,
    useCases: [],
    targetCustomers: [],
    featuredImage: "https://cdn.example.com/main.jpg",
    gallery: [] as string[],
    metadata: null,
    images: [] as Array<{ id: string; imageUrl: string; altText: string | null; sortOrder: number }>,
    variants: [] as unknown[],
    options: [] as unknown[],
    attributeAssignments: [],
    specifications: [],
    customizationCapabilities: [],
    category: { id: "c1", name: "Áo thun", slug: "ao-thun" },
    ...overrides,
  };
}

describe("getPublicMediaUrl", () => {
  it("accepts https public URLs", () => {
    assert.equal(
      getPublicMediaUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg"),
      "https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
    );
  });

  it("prefers MediaAsset.url over thumbnail", () => {
    assert.equal(
      getPublicMediaUrl({
        url: "https://cdn.example.com/full.jpg",
        thumbnailUrl: "https://cdn.example.com/thumb.jpg",
      }),
      "https://cdn.example.com/full.jpg",
    );
  });

  it("rejects empty, admin API, and unsafe URLs", () => {
    assert.equal(getPublicMediaUrl(""), null);
    assert.equal(getPublicMediaUrl("   "), null);
    assert.equal(getPublicMediaUrl("/api/media/abc"), null);
    assert.equal(getPublicMediaUrl("/admin/media/abc.jpg"), null);
    assert.equal(getPublicMediaUrl("javascript:alert(1)"), null);
    assert.equal(getPublicMediaUrl("blob:https://example.com/1"), null);
    assert.equal(getPublicMediaUrl("http://cdn.example.com/a.jpg"), null);
  });

  it("dedupes public URLs", () => {
    assert.deepEqual(
      uniquePublicMediaUrls([
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/a.jpg",
        "/api/admin/x",
        "https://cdn.example.com/b.jpg",
      ]),
      ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
    );
  });

  it("flags broken public media references", () => {
    assert.equal(isBrokenPublicMediaReference("/api/media/x"), true);
    assert.equal(isBrokenPublicMediaReference("https://cdn.example.com/a.jpg"), false);
    assert.equal(isBrokenPublicMediaReference(""), false);
  });
});

describe("product public image serialization", () => {
  it("returns valid public image URL from featuredImage / MediaAsset-like fields", () => {
    const images = buildProductImages({
      featuredImage: "https://cdn.example.com/main.jpg",
      gallery: ["https://cdn.example.com/g1.jpg", "https://cdn.example.com/main.jpg"],
      images: [],
    });
    assert.equal(images[0]?.imageUrl, "https://cdn.example.com/main.jpg");
    assert.equal(images.length, 2);
    assert.equal(
      getPrimaryProductImageFromProduct({
        featuredImage: "https://cdn.example.com/main.jpg",
        gallery: [],
        images: [],
      }),
      "https://cdn.example.com/main.jpg",
    );
  });

  it("filters empty and admin API image URLs", () => {
    const images = buildProductImages({
      featuredImage: "",
      gallery: ["", "/api/media/secret", "https://cdn.example.com/ok.jpg"],
      images: [{ imageUrl: "/admin/files/x.jpg", sortOrder: 0 }],
    });
    assert.deepEqual(
      images.map((image) => image.imageUrl),
      ["https://cdn.example.com/ok.jpg"],
    );
  });

  it("does not expose admin API image URLs on public PDP mapper", () => {
    const detail = mapProductToPublicDetail(
      baseProduct({
        featuredImage: "/api/media/private.jpg",
        gallery: ["https://cdn.example.com/public.jpg"],
        variants: [
          {
            id: "v1",
            sku: "SKU-1",
            displayLabel: null,
            colorName: "Đen",
            colorCode: null,
            sizeName: "M",
            dimensions: null,
            capacity: null,
            stockStatus: "IN_STOCK",
            stockQty: 10,
            imageUrl: "/admin/media/variant.jpg",
            moqOverride: null,
            leadTimeOverride: null,
            materialOverride: null,
            color: null,
            size: null,
            optionValues: [],
          },
        ],
      }) as Parameters<typeof mapProductToPublicDetail>[0],
    );

    assert.ok(detail.images.every((image) => !image.imageUrl.includes("/api/")));
    assert.ok(detail.images.every((image) => !image.imageUrl.includes("/admin/")));
    assert.equal(detail.images[0]?.imageUrl, "https://cdn.example.com/public.jpg");
    assert.equal(detail.variants[0]?.imageUrl, null);
  });

  it("falls back cleanly when product has no usable image", () => {
    const detail = mapProductToPublicDetail(
      baseProduct({
        featuredImage: null,
        gallery: [],
        images: [],
        variants: [],
      }) as Parameters<typeof mapProductToPublicDetail>[0],
    );

    assert.deepEqual(detail.images, []);
    assert.equal(
      getPrimaryProductImageFromProduct({
        featuredImage: "/api/media/x",
        gallery: [],
        images: [],
      }),
      null,
    );
  });
});

describe("product readiness broken image badge", () => {
  it("flags deterministic broken image references as Ảnh lỗi", () => {
    const result = evaluateProductReadiness({
      status: "ACTIVE",
      featuredImage: "/api/media/broken.jpg",
      gallery: [],
      images: [],
      seoTitle: "SEO",
      seoDescription: "SEO",
      variants: [
        {
          stockQty: 1,
          stockStatus: "IN_STOCK",
          variantStatus: "ACTIVE",
          wholesalePrice: 1000,
        },
      ],
    });
    assert.equal(result.hasImage, false);
    assert.equal(result.hasBrokenImage, true);
    assert.ok(result.badges.includes("broken_image"));
  });
});
