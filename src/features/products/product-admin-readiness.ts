/**
 * Advisory product readiness for admin list — does not change publish rules.
 */

import {
  getPublicMediaUrl,
} from "@/features/media/get-public-media-url";
import { classifyImageUrlDeterministic } from "@/features/products/product-image-health";

export type ProductReadinessBadge =
  | "missing_image"
  | "broken_image"
  | "missing_price"
  | "missing_variants"
  | "missing_stock"
  | "unpublished"
  | "missing_seo"
  | "ready";

export const PRODUCT_READINESS_BADGE_LABELS: Record<ProductReadinessBadge, string> = {
  missing_image: "Thiếu ảnh",
  broken_image: "Ảnh lỗi",
  missing_price: "Thiếu giá",
  missing_variants: "Thiếu biến thể",
  missing_stock: "Thiếu tồn kho",
  unpublished: "Chưa publish",
  missing_seo: "Thiếu SEO",
  ready: "Sẵn sàng",
};

export type ProductReadinessFilter =
  | "all"
  | "ready"
  | "missing_image"
  | "broken_image"
  | "missing_price"
  | "missing_variants"
  | "unpublished"
  | "missing_seo"
  | "needs_attention";

export const PRODUCT_READINESS_FILTER_OPTIONS: Array<{
  value: ProductReadinessFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "ready", label: "Sẵn sàng" },
  { value: "needs_attention", label: "Cần bổ sung" },
  { value: "missing_image", label: "Thiếu ảnh" },
  { value: "broken_image", label: "Ảnh lỗi" },
  { value: "missing_price", label: "Thiếu giá" },
  { value: "missing_variants", label: "Thiếu biến thể" },
  { value: "unpublished", label: "Chưa publish" },
  { value: "missing_seo", label: "Thiếu SEO" },
];

export type ProductReadinessInput = {
  status: string;
  featuredImage?: string | null;
  gallery?: string[] | null;
  images?: Array<{ imageUrl?: string | null }> | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  variants?: Array<{
    stockQty?: number | null;
    stockStatus?: string | null;
    variantStatus?: string | null;
    wholesalePrice?: number | null;
    dealerPrice?: number | null;
  }> | null;
};

export type ProductReadinessResult = {
  badges: ProductReadinessBadge[];
  isReady: boolean;
  needsAttention: boolean;
  isPublished: boolean;
  hasImage: boolean;
  hasBrokenImage: boolean;
  hasPrice: boolean;
  hasVariants: boolean;
  hasStock: boolean;
  hasSeo: boolean;
};

function collectRawImageUrls(input: ProductReadinessInput): string[] {
  const urls: string[] = [];
  if (input.featuredImage != null) urls.push(input.featuredImage);
  for (const url of input.gallery ?? []) urls.push(url);
  for (const image of input.images ?? []) {
    if (image.imageUrl != null) urls.push(image.imageUrl);
  }
  return urls;
}

export function productHasMainImage(input: ProductReadinessInput): boolean {
  return collectRawImageUrls(input).some((url) => Boolean(getPublicMediaUrl(url)));
}

const BROKEN_IMAGE_STATUSES = new Set<string>([
  "INVALID_URL",
  "UNREACHABLE",
  "STALE_BLOB",
  "ADMIN_API_URL",
  "NON_CANONICAL",
]);

export function productHasBrokenImageReference(input: ProductReadinessInput): boolean {
  const nonEmpty = collectRawImageUrls(input).filter((url) => Boolean(url?.trim()));
  if (!nonEmpty.length) return false;
  // Deterministic only — no remote HEAD checks on list render.
  if (nonEmpty.some((url) => BROKEN_IMAGE_STATUSES.has(classifyImageUrlDeterministic(url).status))) {
    return true;
  }
  return !productHasMainImage(input);
}

export function productHasPriceData(input: ProductReadinessInput): boolean {
  return (input.variants ?? []).some(
    (variant) =>
      (variant.wholesalePrice != null && variant.wholesalePrice >= 0) ||
      (variant.dealerPrice != null && variant.dealerPrice >= 0),
  );
}

export function productHasVariants(input: ProductReadinessInput): boolean {
  return (input.variants ?? []).length > 0;
}

export function productHasStockData(input: ProductReadinessInput): boolean {
  const variants = input.variants ?? [];
  if (!variants.length) return false;
  return variants.some(
    (variant) =>
      (variant.stockQty != null && variant.stockQty > 0) ||
      variant.stockStatus === "PREORDER",
  );
}

export function productHasSeoData(input: ProductReadinessInput): boolean {
  return Boolean(input.seoTitle?.trim() || input.seoDescription?.trim());
}

export function evaluateProductReadiness(input: ProductReadinessInput): ProductReadinessResult {
  const isPublished = input.status === "ACTIVE";
  const hasImage = productHasMainImage(input);
  const hasBrokenImage = productHasBrokenImageReference(input);
  const hasPrice = productHasPriceData(input);
  const hasVariants = productHasVariants(input);
  const hasStock = productHasStockData(input);
  const hasSeo = productHasSeoData(input);

  const isReady =
    isPublished && hasImage && !hasBrokenImage && hasVariants && hasPrice && hasStock && hasSeo;

  if (isReady) {
    return {
      badges: ["ready"],
      isReady: true,
      needsAttention: false,
      isPublished,
      hasImage,
      hasBrokenImage,
      hasPrice,
      hasVariants,
      hasStock,
      hasSeo,
    };
  }

  const badges: ProductReadinessBadge[] = [];
  if (!isPublished) badges.push("unpublished");
  if (!hasImage && hasBrokenImage) badges.push("broken_image");
  else if (!hasImage) badges.push("missing_image");
  else if (hasBrokenImage) badges.push("broken_image");
  if (!hasVariants) badges.push("missing_variants");
  if (!hasPrice) badges.push("missing_price");
  if (hasVariants && !hasStock) badges.push("missing_stock");
  if (!hasSeo) badges.push("missing_seo");

  return {
    badges,
    isReady: false,
    needsAttention: badges.length > 0,
    isPublished,
    hasImage,
    hasBrokenImage,
    hasPrice,
    hasVariants,
    hasStock,
    hasSeo,
  };
}

export function productMatchesReadinessFilter(
  result: ProductReadinessResult,
  filter: ProductReadinessFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "ready") return result.isReady;
  if (filter === "needs_attention") return result.needsAttention;
  if (filter === "unpublished") return !result.isPublished;
  if (filter === "missing_image") return !result.hasImage;
  if (filter === "broken_image") return result.hasBrokenImage;
  if (filter === "missing_price") return !result.hasPrice;
  if (filter === "missing_variants") return !result.hasVariants;
  if (filter === "missing_seo") return !result.hasSeo;
  return true;
}

export function summarizeProductReadiness(
  results: ProductReadinessResult[],
): {
  total: number;
  ready: number;
  needsAttention: number;
  unpublished: number;
} {
  return {
    total: results.length,
    ready: results.filter((item) => item.isReady).length,
    needsAttention: results.filter((item) => item.needsAttention).length,
    unpublished: results.filter((item) => !item.isPublished).length,
  };
}
