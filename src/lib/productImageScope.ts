import { isValidImageSrc } from "@/lib/imagePaths";
import type { ProductImageRecord } from "@/lib/productImages";

/** URLs explicitly attached to this product record (gallery). */
export function buildProductImageUrlSet(
  images: ProductImageRecord[],
): ReadonlySet<string> {
  const set = new Set<string>();
  for (const img of images) {
    if (img.imageUrl && isValidImageSrc(img.imageUrl)) {
      set.add(img.imageUrl);
    }
  }
  return set;
}

/** Variant/option images must belong to this product's gallery — never unrelated assets. */
export function isProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): boolean {
  if (!url || !isValidImageSrc(url)) return false;
  return allowedUrls.has(url);
}

export function acceptProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): string | null {
  return isProductScopedImageUrl(url, allowedUrls) ? url! : null;
}
