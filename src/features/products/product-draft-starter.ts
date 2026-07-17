import { toSlug } from "@/lib/slug";
import {
  isProductEntryMode,
  isProductTemplateKey,
  mergeProductEntryIntoMetadata,
  type ProductEntryMode,
} from "@/features/products/product-entry-modes";
import {
  buildProductMetaDescriptionFallback,
  buildProductSeoTitleFallback,
  buildProductSlugFallback,
} from "@/features/products/product-seo-fallback";

export type DraftStarterInput = {
  name?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  productMode?: string | null;
  productTemplateKey?: string | null;
};

export type DraftStarterValidationResult = {
  valid: boolean;
  fieldErrors: Record<string, string>;
};

export function validateDraftStarter(input: DraftStarterInput): DraftStarterValidationResult {
  const fieldErrors: Record<string, string> = {};
  if (!input.name?.trim()) fieldErrors.name = "Tên sản phẩm là bắt buộc.";
  if (!input.categoryId?.trim()) fieldErrors.categoryId = "Danh mục là bắt buộc.";
  if (input.productMode?.trim()) {
    if (!isProductEntryMode(input.productMode)) {
      fieldErrors.productMode = "Loại sản phẩm không hợp lệ.";
    }
  }
  if (input.productTemplateKey?.trim()) {
    if (!isProductTemplateKey(input.productTemplateKey)) {
      fieldErrors.productTemplateKey = "Mẫu sản phẩm không hợp lệ.";
    }
    if (!input.productMode?.trim()) {
      fieldErrors.productMode = "Chọn loại sản phẩm trước khi chọn mẫu.";
    }
  }
  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export type DraftStarterPayload = {
  name: string;
  categoryId: string;
  status: "DRAFT";
  slug: string;
  seoTitle: string;
  seoDescription: string;
  metadata: Record<string, unknown>;
};

export function buildDraftStarterPayload(input: DraftStarterInput): DraftStarterPayload {
  const name = input.name?.trim() ?? "";
  const categoryId = input.categoryId?.trim() ?? "";
  const categoryName = input.categoryName?.trim() || null;
  const productMode = isProductEntryMode(input.productMode) ? (input.productMode as ProductEntryMode) : null;
  const productTemplateKey = isProductTemplateKey(input.productTemplateKey)
    ? input.productTemplateKey
    : null;

  const seoInput = {
    name,
    categoryName,
    productMode,
  };

  return {
    name,
    categoryId,
    status: "DRAFT",
    slug: buildProductSlugFallback(name) || toSlug(name),
    seoTitle: buildProductSeoTitleFallback(seoInput),
    seoDescription: buildProductMetaDescriptionFallback(seoInput),
    metadata: mergeProductEntryIntoMetadata(null, {
      mode: productMode ?? undefined,
      templateKey: productTemplateKey ?? undefined,
    }),
  };
}
