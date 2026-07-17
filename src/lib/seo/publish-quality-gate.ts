import { isIndexableCategoryLanding, normalizeCategorySlug } from "@/lib/seo/indexable-category-routes";
import { isUsablePublishImageReference } from "@/features/products/product-image-url";
import { isValidPublishSlug } from "@/lib/slug";
import { evaluateProductModePublishRequirements } from "@/features/products/product-entry-modes";

export type SeoPublishQualityIssue = {
  field: string;
  label: string;
  message: string;
};

export type SeoPublishQualityResult = {
  valid: boolean;
  issues: SeoPublishQualityIssue[];
};

export const SEO_PUBLISH_QUALITY_GATE_FAILED = "SEO_PUBLISH_QUALITY_GATE_FAILED";

export const SEO_PUBLISH_QUALITY_SUMMARY =
  "Chưa đủ điều kiện xuất bản. Vui lòng hoàn thiện các mục còn thiếu.";

export class SeoPublishQualityGateError extends Error {
  readonly code = SEO_PUBLISH_QUALITY_GATE_FAILED;
  readonly issues: SeoPublishQualityIssue[];
  readonly fieldErrors: Record<string, string>;

  constructor(issues: SeoPublishQualityIssue[]) {
    super(SEO_PUBLISH_QUALITY_SUMMARY);
    this.name = "SeoPublishQualityGateError";
    this.issues = issues;
    this.fieldErrors = Object.fromEntries(issues.map((issue) => [issue.field, issue.message]));
  }
}

/** Normalize text for placeholder-only detection (case/space/punctuation/accent insensitive). */
export function normalizeForPlaceholderCheck(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PLACEHOLDER_EXACT = new Set([
  "test",
  "test 1",
  "test1",
  "test 2",
  "test2",
  "sample",
  "demo",
  "untitled",
  "new product",
  "newproduct",
  "chua dat ten",
  "chua dat ten san pham",
  "san pham moi",
  "danh muc moi",
  "category",
  "product",
]);

/**
 * True when the entire meaningful value is effectively placeholder-only content.
 * Does not reject legitimate sentences that merely contain words like "test".
 */
export function isPlaceholderOnlyContent(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = normalizeForPlaceholderCheck(trimmed);
  if (!normalized) return true;
  return PLACEHOLDER_EXACT.has(normalized);
}

/** At least one Unicode letter or digit in the original value. */
export function hasMeaningfulAlphanumericContent(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /[\p{L}\p{N}]/u.test(value.normalize("NFC"));
}

export function isValidPublishName(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  if (!hasMeaningfulAlphanumericContent(value)) return false;
  if (isPlaceholderOnlyContent(value)) return false;
  return true;
}

export function isValidPublishSlugValue(value: string | null | undefined): boolean {
  if (!isValidPublishSlug(value)) return false;
  if (isPlaceholderOnlyContent(value)) return false;
  return true;
}

export function isMeaningfulText(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  if (!hasMeaningfulAlphanumericContent(value)) return false;
  if (isPlaceholderOnlyContent(value)) return false;
  const normalized = normalizeForPlaceholderCheck(value);
  const words = normalized.split(" ").filter(Boolean);
  if (words.length >= 2) return true;
  return normalized.length >= 12;
}

export function isProductPublishTransition(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  return nextStatus === "ACTIVE" && previousStatus !== "ACTIVE";
}

export function shouldEnforceCategoryIndexableSeoGate(
  previousSlug: string | null | undefined,
  nextSlug: string,
): boolean {
  if (!isIndexableCategoryLanding(nextSlug)) return false;
  if (!isIndexableCategoryLanding(previousSlug)) return true;
  return normalizeCategorySlug(previousSlug ?? "") !== normalizeCategorySlug(nextSlug);
}

export type ProductPublishQualityInput = {
  name?: string | null;
  slug?: string | null;
  categoryId?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  featuredImage?: string | null;
  gallery?: string[];
  productImages?: string[];
  variants?: Array<{ variantStatus?: string | null; imageUrl?: string | null }>;
  specifications?: Array<{ label?: string | null; value?: string | null }>;
  attributeAssignments?: Array<{
    attributeId?: string | null;
    attributeValueId?: string | null;
    customValue?: string | null;
  }>;
  options?: Array<{ values?: Array<{ label?: string | null }> }>;
  productMode?: string | null;
  pricingMode?: string | null;
  stockMode?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  quoteCtaEnabled?: boolean;
  noVariantConfirmed?: boolean;
  /** Soft checklist only — does not block publish gate. */
  warnMissingSizeChart?: boolean;
  publicSizeChartEnabled?: boolean;
  publicSizeChartRenderable?: boolean;
};

export type CategoryPublishQualityInput = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  imageUrl?: string | null;
};

function pushIssue(
  issues: SeoPublishQualityIssue[],
  field: string,
  label: string,
  message: string,
) {
  issues.push({ field, label, message });
}

function hasUsableProductImage(input: ProductPublishQualityInput): boolean {
  if (isUsablePublishImageReference(input.featuredImage)) return true;
  if (input.gallery?.some((url) => isUsablePublishImageReference(url))) return true;
  if (input.productImages?.some((url) => isUsablePublishImageReference(url))) return true;
  if (input.variants?.some((variant) => isUsablePublishImageReference(variant.imageUrl))) return true;
  return false;
}

function hasProductConfigurationSignal(input: ProductPublishQualityInput): boolean {
  const activeVariants = (input.variants ?? []).filter(
    (variant) => (variant.variantStatus ?? "ACTIVE") === "ACTIVE",
  );
  if (activeVariants.length > 0) return true;

  const specifications = (input.specifications ?? []).filter(
    (row) => row.label?.trim() && row.value?.trim(),
  );
  if (specifications.length > 0) return true;

  const assignments = (input.attributeAssignments ?? []).filter(
    (row) => row.attributeId?.trim() && (row.attributeValueId?.trim() || row.customValue?.trim()),
  );
  if (assignments.length > 0) return true;

  const options = (input.options ?? []).filter(
    (group) => group.values?.some((value) => value.label?.trim()),
  );
  if (options.length > 0) return true;

  return false;
}

export function evaluateProductPublishQuality(
  input: ProductPublishQualityInput,
): SeoPublishQualityResult {
  const issues: SeoPublishQualityIssue[] = [];

  if (!isValidPublishName(input.name)) {
    pushIssue(
      issues,
      "name",
      "Tên sản phẩm",
      "Tên sản phẩm không được để trống hoặc dùng nội dung mẫu.",
    );
  }

  if (!isValidPublishSlugValue(input.slug)) {
    pushIssue(
      issues,
      "slug",
      "Slug sản phẩm",
      "Slug sản phẩm không hợp lệ hoặc đang dùng nội dung mẫu.",
    );
  }

  if (!input.categoryId?.trim()) {
    pushIssue(
      issues,
      "categoryId",
      "Danh mục sản phẩm",
      "Vui lòng chọn ít nhất một danh mục sản phẩm.",
    );
  }

  if (!hasUsableProductImage(input)) {
    pushIssue(
      issues,
      "featuredImage",
      "Ảnh sản phẩm",
      "Vui lòng thêm ảnh đại diện hoặc ảnh sản phẩm.",
    );
  }

  if (!isMeaningfulText(input.description)) {
    pushIssue(
      issues,
      "description",
      "Mô tả sản phẩm",
      "Vui lòng nhập mô tả sản phẩm đủ nội dung để xuất bản.",
    );
  }

  if (!isMeaningfulText(input.seoTitle)) {
    pushIssue(
      issues,
      "seoTitle",
      "Tiêu đề SEO",
      "Vui lòng nhập tiêu đề SEO trước khi xuất bản.",
    );
  }

  if (!isMeaningfulText(input.seoDescription)) {
    pushIssue(
      issues,
      "seoDescription",
      "Mô tả SEO",
      "Vui lòng nhập mô tả SEO trước khi xuất bản.",
    );
  }

  if (!hasProductConfigurationSignal(input)) {
    pushIssue(
      issues,
      "variants",
      "Thông số / biến thể",
      "Vui lòng bổ sung ít nhất một thông số hoặc lựa chọn sản phẩm.",
    );
  }

  if (input.productMode) {
    const hasActiveVariants = (input.variants ?? []).some(
      (variant) => (variant.variantStatus ?? "ACTIVE") === "ACTIVE",
    );
    for (const issue of evaluateProductModePublishRequirements({
      productMode: input.productMode,
      pricingMode: input.pricingMode,
      stockMode: input.stockMode,
      defaultMoq: input.defaultMoq,
      leadTime: input.leadTime,
      supportsPrinting: input.supportsPrinting,
      supportsEmbroidery: input.supportsEmbroidery,
      supportsOem: input.supportsOem,
      quoteCtaEnabled: input.quoteCtaEnabled,
      hasActiveVariants,
      noVariantConfirmed: input.noVariantConfirmed,
    })) {
      pushIssue(issues, issue.field, issue.label, issue.message);
    }
  }

  return { valid: issues.length === 0, issues };
}

export function evaluateCategoryPublishQuality(
  input: CategoryPublishQualityInput,
  options: { requireIndexableLandingFields: boolean },
): SeoPublishQualityResult {
  const issues: SeoPublishQualityIssue[] = [];

  if (!isValidPublishName(input.name)) {
    pushIssue(
      issues,
      "name",
      "Tên danh mục",
      "Tên danh mục không được để trống hoặc dùng nội dung mẫu.",
    );
  }

  if (!isValidPublishSlugValue(input.slug)) {
    pushIssue(
      issues,
      "slug",
      "Slug danh mục",
      "Slug danh mục không hợp lệ hoặc đang dùng nội dung mẫu.",
    );
  }

  if (!options.requireIndexableLandingFields) {
    return { valid: issues.length === 0, issues };
  }

  if (!isUsablePublishImageReference(input.imageUrl)) {
    pushIssue(
      issues,
      "imageUrl",
      "Ảnh danh mục",
      "Danh mục SEO cần có ảnh đại diện trước khi xuất bản.",
    );
  }

  if (!isMeaningfulText(input.description)) {
    pushIssue(
      issues,
      "description",
      "Mô tả danh mục",
      "Danh mục SEO cần có mô tả hiển thị trước khi xuất bản.",
    );
  }

  if (!isMeaningfulText(input.seoTitle)) {
    pushIssue(
      issues,
      "seoTitle",
      "Tiêu đề SEO",
      "Danh mục SEO cần có tiêu đề SEO trước khi xuất bản.",
    );
  }

  if (!isMeaningfulText(input.seoDescription)) {
    pushIssue(
      issues,
      "seoDescription",
      "Mô tả SEO",
      "Danh mục SEO cần có mô tả SEO trước khi xuất bản.",
    );
  }

  return { valid: issues.length === 0, issues };
}

export function assertProductPublishQuality(input: ProductPublishQualityInput): void {
  const result = evaluateProductPublishQuality(input);
  if (!result.valid) {
    throw new SeoPublishQualityGateError(result.issues);
  }
}

export function assertCategoryPublishQuality(
  input: CategoryPublishQualityInput,
  options: { requireIndexableLandingFields: boolean },
): void {
  const result = evaluateCategoryPublishQuality(input, options);
  if (!result.valid) {
    throw new SeoPublishQualityGateError(result.issues);
  }
}

export type PublishChecklistItem = {
  key: string;
  label: string;
  complete: boolean;
};

export function buildProductPublishChecklist(
  input: ProductPublishQualityInput,
): PublishChecklistItem[] {
  const result = evaluateProductPublishQuality(input);
  const failed = new Set(result.issues.map((issue) => issue.field));
  const items: PublishChecklistItem[] = [
    { key: "name", label: "Tên sản phẩm hợp lệ", complete: !failed.has("name") },
    { key: "slug", label: "Slug hợp lệ", complete: !failed.has("slug") },
    { key: "categoryId", label: "Đã chọn danh mục", complete: !failed.has("categoryId") },
    { key: "featuredImage", label: "Có ảnh sản phẩm", complete: !failed.has("featuredImage") },
    { key: "description", label: "Mô tả sản phẩm đủ nội dung", complete: !failed.has("description") },
    { key: "seoTitle", label: "Tiêu đề SEO", complete: !failed.has("seoTitle") },
    { key: "seoDescription", label: "Mô tả SEO", complete: !failed.has("seoDescription") },
    {
      key: "variants",
      label: "Có thông số hoặc lựa chọn sản phẩm",
      complete: !failed.has("variants"),
    },
  ];
  const MODE_CHECKLIST_LABELS: Record<string, string> = {
    pricingMode: "Hình thức giá",
    stockMode: "Trạng thái tồn kho",
    defaultMoq: "MOQ",
    leadTime: "Thời gian sản xuất",
    customization: "Khả năng tùy chỉnh / báo giá",
    quoteCta: "Kêu gọi báo giá",
  };
  for (const [field, label] of Object.entries(MODE_CHECKLIST_LABELS)) {
    if (failed.has(field)) items.push({ key: field, label, complete: false });
  }
  if (input.warnMissingSizeChart) {
    items.push({
      key: "publicSizeChart",
      label: "Nên có bảng size (khuyến nghị cho sản phẩm may mặc)",
      complete: Boolean(input.publicSizeChartRenderable),
    });
  }
  return items;
}

export function buildCategoryPublishChecklist(
  input: CategoryPublishQualityInput,
): PublishChecklistItem[] {
  const indexable = isIndexableCategoryLanding(input.slug);
  const result = evaluateCategoryPublishQuality(input, {
    requireIndexableLandingFields: indexable,
  });
  const failed = new Set(result.issues.map((issue) => issue.field));
  const items: PublishChecklistItem[] = [
    { key: "name", label: "Tên danh mục hợp lệ", complete: !failed.has("name") },
    { key: "slug", label: "Slug hợp lệ", complete: !failed.has("slug") },
  ];
  if (indexable) {
    items.push(
      { key: "imageUrl", label: "Ảnh danh mục SEO", complete: !failed.has("imageUrl") },
      { key: "description", label: "Mô tả hiển thị", complete: !failed.has("description") },
      { key: "seoTitle", label: "Tiêu đề SEO", complete: !failed.has("seoTitle") },
      { key: "seoDescription", label: "Mô tả SEO", complete: !failed.has("seoDescription") },
    );
  }
  return items;
}

export function requiresAtomicActiveProductPublish(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  if (nextStatus !== "ACTIVE") return false;
  if (previousStatus === undefined || previousStatus === null) return true;
  return isProductPublishTransition(previousStatus, nextStatus);
}

export function interimProductStatusForAtomicPublish(
  requestedStatus: string,
  previousStatus?: string | null,
): string {
  if (requestedStatus !== "ACTIVE") return requestedStatus;
  if (previousStatus === undefined || previousStatus === null) {
    return "DRAFT";
  }
  if (isProductPublishTransition(previousStatus, "ACTIVE")) {
    return previousStatus;
  }
  return requestedStatus;
}

export function formatSeoPublishQualityGateApiError(err: SeoPublishQualityGateError): {
  ok: false;
  code: string;
  error: string;
  message: string;
  issues: SeoPublishQualityIssue[];
  fieldErrors: Record<string, string>;
  status: number;
} {
  return {
    ok: false,
    code: err.code,
    error: err.message,
    message: err.message,
    issues: err.issues,
    fieldErrors: err.fieldErrors,
    status: 422,
  };
}
