import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  evaluateCategoryPublishQuality,
  evaluateProductPublishQuality,
  formatSeoPublishQualityGateApiError,
  SeoPublishQualityGateError,
} from "@/lib/seo/publish-quality-gate";

function baseCompleteProduct() {
  return {
    name: "Áo thun cotton cao cấp",
    slug: "ao-thun-cotton-cao-cap",
    categoryId: "category-1",
    description: "Mô tả sản phẩm đủ nội dung để xuất bản công khai trên website.",
    seoTitle: "Áo thun cotton cao cấp | ATTD",
    seoDescription: "Mô tả SEO đủ nội dung cho trang sản phẩm công khai trên ATTD.",
    featuredImage: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    variants: [{ variantStatus: "ACTIVE" }],
  };
}

describe("alternate API gate parity", () => {
  it("blocks incomplete ACTIVE product payloads at the shared gate", () => {
    const result = evaluateProductPublishQuality({
      ...baseCompleteProduct(),
      seoTitle: "",
      variants: [],
    });
    assert.equal(result.valid, false);
    assert.ok(result.issues.length >= 2);
  });

  it("blocks incomplete indexable category payloads at the shared gate", () => {
    const result = evaluateCategoryPublishQuality(
      {
        name: "Áo thun trơn",
        slug: "ao-thun-tron",
        description: "",
        seoTitle: "",
        seoDescription: "",
        imageUrl: "",
      },
      { requireIndexableLandingFields: true },
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "imageUrl"));
    assert.ok(result.issues.some((issue) => issue.field === "seoTitle"));
  });

  it("returns HTTP 422 contract for service-level gate failures", () => {
    const err = new SeoPublishQualityGateError([
      {
        field: "seoTitle",
        label: "Tiêu đề SEO",
        message: "Vui lòng nhập tiêu đề SEO trước khi xuất bản.",
      },
    ]);
    const formatted = formatSeoPublishQualityGateApiError(err);
    assert.equal(formatted.status, 422);
    assert.equal(formatted.code, SEO_PUBLISH_QUALITY_GATE_FAILED);
    assert.ok(formatted.issues.length > 0);
    assert.ok(formatted.fieldErrors.seoTitle);
  });
});

describe("structural category slug changes into indexable landing", () => {
  it("requires SEO landing fields when slug becomes indexable", () => {
    const result = evaluateCategoryPublishQuality(
      { name: "Phụ kiện", slug: "ao-thun-tron" },
      { requireIndexableLandingFields: true },
    );
    assert.equal(result.valid, false);
  });
});
