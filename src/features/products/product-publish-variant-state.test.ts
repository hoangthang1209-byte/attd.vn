import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VariantStatus } from "@prisma/client";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SeoPublishQualityGateError,
  assertProductPublishQuality,
  evaluateProductPublishQuality,
  type ProductPublishQualityInput,
} from "@/lib/seo/publish-quality-gate";
import {
  DEFAULT_NEW_VARIANT_PUBLISH_STATUS,
  buildPublishQualityVariantsFromUpdateInput,
  mapCreateInputVariantsToPublishQualityInput,
  mergeVariantPublishQualityFields,
} from "@/features/products/product-publish-quality-snapshot";

function completePublishSnapshot(
  variants: ProductPublishQualityInput["variants"],
): ProductPublishQualityInput {
  return {
    name: "Áo thun cotton cao cấp",
    slug: "ao-thun-cotton-cao-cap",
    categoryId: "category-1",
    description: "Mô tả sản phẩm đủ nội dung để xuất bản công khai trên website.",
    seoTitle: "Áo thun cotton cao cấp | ATTD",
    seoDescription: "Mô tả SEO đủ nội dung cho trang sản phẩm công khai trên ATTD.",
    featuredImage: "/uploads/products/ao-thun.jpg",
    variants,
  };
}

describe("mergeVariantPublishQualityFields", () => {
  it("keeps persisted INACTIVE when payload omits variantStatus", () => {
    const merged = mergeVariantPublishQualityFields(
      { id: "variant-1" },
      { variantStatus: "INACTIVE", imageUrl: null },
    );
    assert.equal(merged.variantStatus, "INACTIVE");
  });

  it("defaults new variants without persisted state to ACTIVE", () => {
    const merged = mergeVariantPublishQualityFields({});
    assert.equal(merged.variantStatus, DEFAULT_NEW_VARIANT_PUBLISH_STATUS);
    assert.equal(merged.variantStatus, "ACTIVE");
  });

  it("honors explicit ACTIVE on an owned INACTIVE variant", () => {
    const merged = mergeVariantPublishQualityFields(
      { id: "variant-1", variantStatus: "ACTIVE" },
      { variantStatus: "INACTIVE", imageUrl: null },
    );
    assert.equal(merged.variantStatus, "ACTIVE");
  });

  it("inherits persisted imageUrl when payload omits imageUrl", () => {
    const merged = mergeVariantPublishQualityFields(
      { id: "variant-1", variantStatus: "ACTIVE" },
      { variantStatus: "INACTIVE", imageUrl: "/uploads/products/existing.jpg" },
    );
    assert.equal(merged.imageUrl, "/uploads/products/existing.jpg");
  });
});

describe("buildPublishQualityVariantsFromUpdateInput", () => {
  const existingVariants = [
    {
      id: "variant-1",
      variantStatus: "INACTIVE" as const,
      imageUrl: null,
    },
  ];

  it("projects omitted variantStatus as INACTIVE for owned variants", () => {
    const projected = buildPublishQualityVariantsFromUpdateInput(
      [{ id: "variant-1" }],
      existingVariants,
    );
    assert.deepEqual(projected, [{ variantStatus: "INACTIVE", imageUrl: null }]);
  });

  it("fails publish quality when only owned INACTIVE variant is referenced", () => {
    const projected = buildPublishQualityVariantsFromUpdateInput(
      [{ id: "variant-1" }],
      existingVariants,
    );
    const result = evaluateProductPublishQuality(completePublishSnapshot(projected));
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "variants"));
  });

  it("passes publish quality when owned variant is explicitly activated", () => {
    const projected = buildPublishQualityVariantsFromUpdateInput(
      [{ id: "variant-1", variantStatus: "ACTIVE" }],
      existingVariants,
    );
    const result = evaluateProductPublishQuality(completePublishSnapshot(projected));
    assert.equal(result.valid, true);
  });
});

describe("mapCreateInputVariantsToPublishQualityInput", () => {
  it("defaults omitted status on new variants to ACTIVE consistently", () => {
    const projected = mapCreateInputVariantsToPublishQualityInput([{}]);
    assert.deepEqual(projected, [{ variantStatus: "ACTIVE", imageUrl: null }]);
    assert.doesNotThrow(() =>
      assertProductPublishQuality(completePublishSnapshot(projected)),
    );
  });

  it("rejects create-as-ACTIVE when only explicit INACTIVE variant is provided", () => {
    const projected = mapCreateInputVariantsToPublishQualityInput([
      { variantStatus: "INACTIVE" },
    ]);
    assert.throws(
      () => assertProductPublishQuality(completePublishSnapshot(projected)),
      (error: unknown) =>
        error instanceof SeoPublishQualityGateError &&
        error.code === SEO_PUBLISH_QUALITY_GATE_FAILED,
    );
  });
});

describe("publish activation guard", () => {
  it("throws SEO_PUBLISH_QUALITY_GATE_FAILED for inactive-only configuration", () => {
    assert.throws(
      () =>
        assertProductPublishQuality(
          completePublishSnapshot([{ variantStatus: "INACTIVE" as VariantStatus, imageUrl: null }]),
        ),
      (error: unknown) =>
        error instanceof SeoPublishQualityGateError &&
        error.code === SEO_PUBLISH_QUALITY_GATE_FAILED,
    );
  });
});
