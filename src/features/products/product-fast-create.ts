import {
  getProductModeConfig,
  getProductTemplateConfig,
  isProductEntryMode,
  isProductTemplateKey,
  mergeProductEntryIntoMetadata,
  type ProductPricingMode,
  type ProductStockMode,
} from "@/features/products/product-entry-modes";
import {
  buildProductSlugFallback,
  buildProductSeoTitleFallback,
  buildProductMetaDescriptionFallback,
} from "@/features/products/product-seo-fallback";

export const FAST_CREATE_CATEGORY_SKU_MISSING_WARNING =
  "Danh mục này thiếu mã. Cần bổ sung mã danh mục trước khi tạo SKU hàng loạt.";

export const FAST_CREATE_ALLOWS_INLINE_CATEGORY_CREATION = false;

export const PRICING_CLARITY_HELPER =
  "Giá bán chính thức nên được cấu hình trong bảng giá theo số lượng để dùng cho báo giá và đại lý.";

/** @deprecated Fast create UI was removed. Canonical create is /admin/products/new. */
export const FAST_CREATE_ROUTES = {
  fast: "/admin/products/new",
  advanced: "/admin/products/new",
} as const;

export type FastCreateCategoryOption = {
  id: string;
  skuCode?: string | null;
  isPublic?: boolean;
};

export type FastCreateDraftInput = {
  name?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  productMode?: string | null;
  productTemplateKey?: string | null;
  shortDescription?: string | null;
  featuredImage?: string | null;
  defaultMoq?: number | null;
  leadTime?: string | null;
  stockMode?: ProductStockMode | null;
  pricingMode?: ProductPricingMode | null;
  internalNote?: string | null;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
};

export type FastCreateValidationResult = {
  valid: boolean;
  fieldErrors: Record<string, string>;
};

export function validateFastCreateDraft(input: FastCreateDraftInput): FastCreateValidationResult {
  const fieldErrors: Record<string, string> = {};
  if (!input.name?.trim()) fieldErrors.name = "Tên sản phẩm là bắt buộc.";
  if (!input.categoryId?.trim()) fieldErrors.categoryId = "Danh mục là bắt buộc.";
  if (!input.productMode?.trim()) fieldErrors.productMode = "Vui lòng chọn loại sản phẩm.";
  else if (!isProductEntryMode(input.productMode)) fieldErrors.productMode = "Loại sản phẩm không hợp lệ.";
  if (!input.productTemplateKey?.trim()) fieldErrors.productTemplateKey = "Vui lòng chọn mẫu sản phẩm.";
  else if (!isProductTemplateKey(input.productTemplateKey)) fieldErrors.productTemplateKey = "Mẫu sản phẩm không hợp lệ.";
  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export function canGenerateSkuMatrix(category: FastCreateCategoryOption | null | undefined): boolean {
  return Boolean(category?.skuCode?.trim());
}

export function resolveFastCreateWarnings(
  category: (FastCreateCategoryOption & { name?: string }) | null | undefined,
): string[] {
  const warnings: string[] = [];
  if (category && !canGenerateSkuMatrix(category)) {
    warnings.push(FAST_CREATE_CATEGORY_SKU_MISSING_WARNING);
  }
  if (category && category.isPublic === false) {
    warnings.push("Danh mục này đang ẩn khỏi website công khai. Sản phẩm vẫn có thể lưu nháp cho nội bộ.");
  }
  return warnings;
}

export type FastCreateDraftPayload = {
  name: string;
  categoryId: string;
  status: "DRAFT";
  slug?: string;
  shortDescription?: string;
  featuredImage?: string;
  defaultMoq?: number | null;
  leadTime?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  metadata: Record<string, unknown>;
};

export function buildFastCreateDraftPayload(input: FastCreateDraftInput): FastCreateDraftPayload {
  const template = getProductTemplateConfig(input.productTemplateKey);
  const mode = getProductModeConfig(input.productMode);
  const name = (input.name ?? "").trim();
  const defaultMoq = input.defaultMoq ?? (template ? template.defaultMoq : null);
  const leadTime = input.leadTime?.trim() || (template ? template.defaultLeadTime : "") || null;
  const stockMode = input.stockMode ?? template?.defaultStockMode ?? mode?.defaultStockMode ?? undefined;
  const pricingMode = input.pricingMode ?? mode?.defaultPricingMode ?? undefined;

  const metadata = mergeProductEntryIntoMetadata(null, {
    mode: isProductEntryMode(input.productMode) ? input.productMode : undefined,
    templateKey: isProductTemplateKey(input.productTemplateKey) ? (input.productTemplateKey as string) : undefined,
    stockMode,
    pricingMode,
  });

  const payload: FastCreateDraftPayload = {
    name,
    categoryId: (input.categoryId ?? "").trim(),
    status: "DRAFT",
    metadata,
  };

  const slug = buildProductSlugFallback(name);
  if (slug) payload.slug = slug;

  const seoInput = {
    name,
    categoryName: input.categoryName ?? null,
    productMode: input.productMode ?? null,
    defaultMoq: defaultMoq ?? null,
    leadTime,
  };
  const seoTitle = buildProductSeoTitleFallback(seoInput);
  if (seoTitle) payload.seoTitle = seoTitle;
  const seoDescription = buildProductMetaDescriptionFallback(seoInput);
  if (seoDescription) payload.seoDescription = seoDescription;

  if (input.shortDescription?.trim()) payload.shortDescription = input.shortDescription.trim();
  if (input.featuredImage?.trim()) payload.featuredImage = input.featuredImage.trim();
  if (defaultMoq !== null && defaultMoq !== undefined) payload.defaultMoq = defaultMoq;
  if (leadTime) payload.leadTime = leadTime;
  payload.supportsPrinting = input.supportsPrinting ?? template?.supportsPrinting ?? false;
  payload.supportsEmbroidery = input.supportsEmbroidery ?? template?.supportsEmbroidery ?? false;
  payload.supportsOem = input.supportsOem ?? template?.supportsOem ?? false;
  return payload;
}

/** Preview matrix combination count from axis value strings. */
export function previewVariantMatrixCount(axisValueLists: string[][]): number {
  const nonEmpty = axisValueLists.filter((list) => list.length > 0);
  if (nonEmpty.length === 0) return 0;
  return nonEmpty.reduce((acc, list) => acc * list.length, 1);
}

export function parseAxisValuesInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  );
}
