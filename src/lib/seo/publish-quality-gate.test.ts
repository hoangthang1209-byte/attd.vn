import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SEO_PUBLISH_QUALITY_SUMMARY,
  SeoPublishQualityGateError,
  assertCategoryPublishQuality,
  assertProductPublishQuality,
  evaluateCategoryPublishQuality,
  evaluateProductPublishQuality,
  formatSeoPublishQualityGateApiError,
  hasMeaningfulAlphanumericContent,
  interimProductStatusForAtomicPublish,
  isPlaceholderOnlyContent,
  isProductPublishTransition,
  isValidPublishSlugValue,
  requiresAtomicActiveProductPublish,
  shouldEnforceCategoryIndexableSeoGate,
  type CategoryPublishQualityInput,
  type ProductPublishQualityInput,
} from "./publish-quality-gate";
import { isUsablePublishImageReference } from "@/features/products/product-image-url";

function completeProductInput(
  overrides: Partial<ProductPublishQualityInput> = {},
): ProductPublishQualityInput {
  return {
    name: "Áo thun cotton cao cấp",
    slug: "ao-thun-cotton-cao-cap",
    categoryId: "category-1",
    description: "Mô tả sản phẩm đủ nội dung để xuất bản công khai trên website.",
    seoTitle: "Áo thun cotton cao cấp | ATTD",
    seoDescription: "Mô tả SEO đủ nội dung cho trang sản phẩm công khai trên ATTD.",
    featuredImage: "https://cdn.example.com/products/ao-thun.jpg",
    variants: [{ variantStatus: "ACTIVE" }],
    ...overrides,
  };
}

function completeIndexableCategoryInput(
  overrides: Partial<CategoryPublishQualityInput> = {},
): CategoryPublishQualityInput {
  return {
    name: "Áo thun trơn",
    slug: "ao-thun-tron",
    description: "Danh mục áo thun trơn với đầy đủ mô tả hiển thị công khai.",
    seoTitle: "Áo thun trơn sỉ | ATTD",
    seoDescription: "Mô tả SEO cho trang danh mục áo thun trơn trên ATTD.",
    imageUrl: "https://cdn.example.com/categories/ao-thun-tron.jpg",
    ...overrides,
  };
}

describe("isPlaceholderOnlyContent", () => {
  it("detects obvious placeholders case-insensitively", () => {
    assert.equal(isPlaceholderOnlyContent("Test"), true);
    assert.equal(isPlaceholderOnlyContent("TEST 1"), true);
    assert.equal(isPlaceholderOnlyContent("chưa đặt tên"), true);
  });

  it("treats punctuation-only values as placeholder-only", () => {
    assert.equal(isPlaceholderOnlyContent("..."), true);
    assert.equal(hasMeaningfulAlphanumericContent("..."), false);
  });

  it("does not reject legitimate sentences containing placeholder words", () => {
    assert.equal(isPlaceholderOnlyContent("Áo thun test chất lượng cao"), false);
    assert.equal(isPlaceholderOnlyContent("Sản phẩm demo cho doanh nghiệp"), false);
  });
});

describe("publish slug and image validation", () => {
  it("rejects malformed slugs", () => {
    assert.equal(isValidPublishSlugValue("---"), false);
    assert.equal(isValidPublishSlugValue("..."), false);
  });

  it("rejects punctuation-only names via product gate", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({ name: "...", slug: "---" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "name"));
    assert.ok(result.issues.some((issue) => issue.field === "slug"));
  });

  it("rejects unusable image references", () => {
    assert.equal(isUsablePublishImageReference("x"), false);
    assert.equal(isUsablePublishImageReference("javascript:alert(1)"), false);
    assert.equal(isUsablePublishImageReference("/not-an-image"), false);
    assert.equal(isUsablePublishImageReference("/api/admin"), false);
    assert.equal(isUsablePublishImageReference("/uploads"), false);
    assert.equal(isUsablePublishImageReference("data:image/png;base64,abc"), false);
    const result = evaluateProductPublishQuality(
      completeProductInput({ featuredImage: "x" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "featuredImage"));
  });

  it("accepts valid remote and local image references", () => {
    assert.equal(
      isUsablePublishImageReference("https://res.cloudinary.com/demo/image/upload/sample.jpg"),
      true,
    );
    assert.equal(isUsablePublishImageReference("/uploads/products/ao-thun.jpg"), true);
    const result = evaluateProductPublishQuality(
      completeProductInput({
        featuredImage: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      }),
    );
    assert.ok(!result.issues.some((issue) => issue.field === "featuredImage"));
  });
});

describe("atomic publish helpers", () => {
  it("defers ACTIVE status until relations are persisted on create", () => {
    assert.equal(interimProductStatusForAtomicPublish("ACTIVE"), "DRAFT");
  });

  it("keeps previous status during publish transition until final activation", () => {
    assert.equal(interimProductStatusForAtomicPublish("ACTIVE", "DRAFT"), "DRAFT");
  });

  it("requires atomic publish for create-as-ACTIVE and publish transitions", () => {
    assert.equal(requiresAtomicActiveProductPublish(null, "ACTIVE"), true);
    assert.equal(requiresAtomicActiveProductPublish("DRAFT", "ACTIVE"), true);
    assert.equal(requiresAtomicActiveProductPublish("ACTIVE", "ACTIVE"), false);
  });
});

describe("product publish quality gate", () => {
  it("allows incomplete product data to remain valid for draft-only evaluation context", () => {
    const result = evaluateProductPublishQuality({
      name: "Nháp",
      slug: "nhap",
      status: "DRAFT",
    } as ProductPublishQualityInput & { status: string });
    assert.equal(result.valid, false);
    assert.ok(result.issues.length > 0);
  });

  it("does not treat non-publish transition as publish", () => {
    assert.equal(isProductPublishTransition("ACTIVE", "ACTIVE"), false);
    assert.equal(isProductPublishTransition("DRAFT", "DRAFT"), false);
    assert.equal(isProductPublishTransition("INACTIVE", "DRAFT"), false);
  });

  it("fails publishing without category", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({ categoryId: "" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "categoryId"));
  });

  it("fails publishing without image", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({
        featuredImage: "",
        gallery: [],
        variants: [{ variantStatus: "ACTIVE", imageUrl: "" }],
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "featuredImage"));
  });

  it("fails publishing with placeholder product name", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({ name: "Test 1" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "name"));
  });

  it("fails publishing without SEO title", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({ seoTitle: "" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "seoTitle"));
  });

  it("fails publishing without SEO description", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({ seoDescription: "" }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "seoDescription"));
  });

  it("fails publishing without variant or specification signal", () => {
    const result = evaluateProductPublishQuality(
      completeProductInput({
        variants: [],
        specifications: [],
        attributeAssignments: [],
        options: [],
      }),
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "variants"));
  });

  it("allows complete product to publish", () => {
    const result = evaluateProductPublishQuality(completeProductInput());
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it("blocks direct public-status mutation via publish transition", () => {
    assert.equal(isProductPublishTransition("DRAFT", "ACTIVE"), true);
    assert.throws(
      () => assertProductPublishQuality(completeProductInput({ categoryId: "" })),
      (err: unknown) => err instanceof SeoPublishQualityGateError,
    );
  });
});

describe("category publish quality gate", () => {
  it("allows structural category with valid name and slug", () => {
    const result = evaluateCategoryPublishQuality(
      { name: "Phụ kiện", slug: "phu-kien" },
      { requireIndexableLandingFields: false },
    );
    assert.equal(result.valid, true);
  });

  it("fails structural category with placeholder name", () => {
    const result = evaluateCategoryPublishQuality(
      { name: "test", slug: "phu-kien" },
      { requireIndexableLandingFields: false },
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "name"));
  });

  it("fails indexable category landing without image", () => {
    const result = evaluateCategoryPublishQuality(
      completeIndexableCategoryInput({ imageUrl: "" }),
      { requireIndexableLandingFields: true },
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "imageUrl"));
  });

  it("fails indexable category landing without visible content", () => {
    const result = evaluateCategoryPublishQuality(
      completeIndexableCategoryInput({ description: "" }),
      { requireIndexableLandingFields: true },
    );
    assert.equal(result.valid, false);
    assert.ok(result.issues.some((issue) => issue.field === "description"));
  });

  it("fails indexable category landing without SEO title and description", () => {
    const withoutTitle = evaluateCategoryPublishQuality(
      completeIndexableCategoryInput({ seoTitle: "" }),
      { requireIndexableLandingFields: true },
    );
    const withoutDescription = evaluateCategoryPublishQuality(
      completeIndexableCategoryInput({ seoDescription: "" }),
      { requireIndexableLandingFields: true },
    );
    assert.equal(withoutTitle.valid, false);
    assert.equal(withoutDescription.valid, false);
    assert.ok(withoutTitle.issues.some((issue) => issue.field === "seoTitle"));
    assert.ok(withoutDescription.issues.some((issue) => issue.field === "seoDescription"));
  });

  it("allows complete indexable category landing to publish", () => {
    const result = evaluateCategoryPublishQuality(
      completeIndexableCategoryInput(),
      { requireIndexableLandingFields: true },
    );
    assert.equal(result.valid, true);
  });
});

describe("legacy compatibility helpers", () => {
  it("skips indexable SEO gate for same-slug legacy category edits", () => {
    assert.equal(
      shouldEnforceCategoryIndexableSeoGate("ao-thun-tron", "ao-thun-tron"),
      false,
    );
    assert.equal(
      shouldEnforceCategoryIndexableSeoGate("ao-thun-tron", "ao-polo-tron"),
      true,
    );
  });

  it("does not require publish transition when status stays ACTIVE", () => {
    assert.equal(isProductPublishTransition("ACTIVE", "ACTIVE"), false);
  });
});

describe("API error contract", () => {
  it("returns stable code, HTTP 422, and structured issues", () => {
    try {
      assertProductPublishQuality(completeProductInput({ seoTitle: "" }));
      assert.fail("expected gate error");
    } catch (err) {
      assert.ok(err instanceof SeoPublishQualityGateError);
      const formatted = formatSeoPublishQualityGateApiError(err);
      assert.equal(formatted.code, SEO_PUBLISH_QUALITY_GATE_FAILED);
      assert.equal(formatted.status, 422);
      assert.equal(formatted.message, SEO_PUBLISH_QUALITY_SUMMARY);
      assert.ok(formatted.issues.length > 0);
      assert.ok(formatted.fieldErrors.seoTitle);
    }
  });

  it("category gate error uses the same contract", () => {
    try {
      assertCategoryPublishQuality(
        completeIndexableCategoryInput({ seoDescription: "" }),
        { requireIndexableLandingFields: true },
      );
      assert.fail("expected gate error");
    } catch (err) {
      assert.ok(err instanceof SeoPublishQualityGateError);
      const formatted = formatSeoPublishQualityGateApiError(err);
      assert.equal(formatted.code, SEO_PUBLISH_QUALITY_GATE_FAILED);
      assert.equal(formatted.status, 422);
      assert.ok(formatted.issues.some((issue) => issue.field === "seoDescription"));
    }
  });
});
