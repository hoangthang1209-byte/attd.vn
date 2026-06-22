/**
 * URL-based product media validation (Sprint 27.2.6).
 * Cloudinary/R2/MediaAsset unification will replace direct URL fields later.
 */

export const PRODUCT_IMAGE_URL_ERROR =
  "URL ảnh không hợp lệ. Vui lòng dùng link ảnh bắt đầu bằng https://.";

/** Future MediaAsset unification touchpoints (do not wire in this sprint). */
export const MEDIA_ASSET_INTEGRATION_POINTS = [
  "Product.featuredImage",
  "Product.gallery[]",
  "ProductVariant.imageUrl",
  "ProductOptionValue.imageUrl",
  "import/export featuredImageUrl, galleryUrls, imageUrl columns",
  "bulk variant image assignment",
] as const;

export function isValidProductImageUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}

export function normalizeProductImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidProductImageUrl(trimmed) ? trimmed : null;
}

export function validateProductImageUrlField(
  value: string,
  fieldErrors: Record<string, string>,
  field: string,
  optional = true,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return optional ? null : "";
  if (!isValidProductImageUrl(trimmed)) {
    fieldErrors[field] = PRODUCT_IMAGE_URL_ERROR;
    return null;
  }
  return trimmed;
}
