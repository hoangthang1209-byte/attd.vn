import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateProductReadiness,
  productMatchesReadinessFilter,
  summarizeProductReadiness,
} from "@/features/products/product-admin-readiness";

const readyBase = {
  status: "ACTIVE",
  featuredImage: "https://cdn.example.com/a.jpg",
  seoTitle: "Áo thun CVC",
  seoDescription: "Mô tả SEO",
  variants: [
    {
      stockQty: 20,
      stockStatus: "IN_STOCK",
      variantStatus: "ACTIVE",
      wholesalePrice: 100000,
      dealerPrice: 90000,
    },
  ],
};

describe("evaluateProductReadiness", () => {
  it("classifies a ready product", () => {
    const result = evaluateProductReadiness(readyBase);
    assert.equal(result.isReady, true);
    assert.deepEqual(result.badges, ["ready"]);
  });

  it("flags missing image", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      featuredImage: null,
      gallery: [],
      images: [],
    });
    assert.equal(result.hasImage, false);
    assert.ok(result.badges.includes("missing_image"));
    assert.equal(result.isReady, false);
  });

  it("flags stale blob / invalid image as broken_image and not ready", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      featuredImage:
        "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/dead.png",
    });
    assert.equal(result.hasImage, false);
    assert.equal(result.hasBrokenImage, true);
    assert.ok(result.badges.includes("broken_image"));
    assert.equal(result.isReady, false);
    assert.ok(!result.badges.includes("ready"));
  });

  it("does not treat empty gallery slot as broken when featured image is valid", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      featuredImage: "https://cdn.example.com/a.jpg",
      gallery: [""],
    });
    assert.equal(result.hasBrokenImage, false);
    assert.equal(result.isReady, true);
  });

  it("flags missing variants", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      variants: [],
    });
    assert.ok(result.badges.includes("missing_variants"));
  });

  it("flags draft as unpublished", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      status: "DRAFT",
    });
    assert.ok(result.badges.includes("unpublished"));
    assert.equal(result.isPublished, false);
  });

  it("flags missing SEO", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      seoTitle: "",
      seoDescription: "  ",
    });
    assert.ok(result.badges.includes("missing_seo"));
  });

  it("flags missing price and stock", () => {
    const result = evaluateProductReadiness({
      ...readyBase,
      variants: [
        {
          stockQty: 0,
          stockStatus: "OUT_OF_STOCK",
          wholesalePrice: null,
          dealerPrice: null,
        },
      ],
    });
    assert.ok(result.badges.includes("missing_price"));
    assert.ok(result.badges.includes("missing_stock"));
  });
});

describe("productMatchesReadinessFilter", () => {
  it("filters ready and missing image rows", () => {
    const ready = evaluateProductReadiness(readyBase);
    const missingImage = evaluateProductReadiness({
      ...readyBase,
      featuredImage: null,
      gallery: [],
      images: [],
    });
    assert.equal(productMatchesReadinessFilter(ready, "ready"), true);
    assert.equal(productMatchesReadinessFilter(missingImage, "ready"), false);
    assert.equal(productMatchesReadinessFilter(missingImage, "missing_image"), true);
    assert.equal(productMatchesReadinessFilter(ready, "all"), true);
  });

  it("filters broken_image rows (Ảnh lỗi)", () => {
    const broken = evaluateProductReadiness({
      ...readyBase,
      featuredImage: "/api/media/private.jpg",
    });
    assert.equal(productMatchesReadinessFilter(broken, "broken_image"), true);
    assert.equal(productMatchesReadinessFilter(evaluateProductReadiness(readyBase), "broken_image"), false);
  });
});

describe("summarizeProductReadiness", () => {
  it("summarizes page-level readiness counts", () => {
    const summary = summarizeProductReadiness([
      evaluateProductReadiness(readyBase),
      evaluateProductReadiness({ ...readyBase, status: "DRAFT" }),
      evaluateProductReadiness({ ...readyBase, featuredImage: null, gallery: [], images: [] }),
    ]);
    assert.equal(summary.total, 3);
    assert.equal(summary.ready, 1);
    assert.equal(summary.unpublished, 1);
    assert.equal(summary.needsAttention, 2);
  });
});
