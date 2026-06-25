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

type AllowlistInput = {
  images: ProductImageRecord[];
  featuredImage?: string | null;
  gallery?: string[] | null;
  /** ProductVariant.imageUrl values loaded for this product. */
  variantImageUrls?: Iterable<string | null | undefined>;
  /** ProductOptionValue.imageUrl values loaded for this product. */
  optionValueImageUrls?: Iterable<string | null | undefined>;
};

function addValidatedUrls(
  set: Set<string>,
  urls: Iterable<string | null | undefined> | undefined,
): void {
  if (!urls) return;
  for (const url of urls) {
    if (url && isValidImageSrc(url)) {
      set.add(url.trim());
    }
  }
}

/** Image URLs owned by the currently loaded product record (gallery + variants + options). */
export function buildPdpImageAllowlist(input: AllowlistInput): ReadonlySet<string> {
  const set = new Set(buildProductImageUrlSet(input.images));

  if (input.featuredImage && isValidImageSrc(input.featuredImage)) {
    set.add(input.featuredImage.trim());
  }

  for (const url of input.gallery ?? []) {
    if (url && isValidImageSrc(url)) {
      set.add(url.trim());
    }
  }

  addValidatedUrls(set, input.variantImageUrls);
  addValidatedUrls(set, input.optionValueImageUrls);

  return set;
}

/** Gallery-only allowlist: stored product media without variant/option-only URLs. */
export function buildPdpGalleryAllowlist(
  input: Pick<AllowlistInput, "images" | "featuredImage" | "gallery">,
): ReadonlySet<string> {
  return buildPdpImageAllowlist(input);
}

/** Gallery strip: only URLs present on this product's own media records. */
export function filterProductGalleryImages(
  images: ProductImageRecord[],
  allowlist: ReadonlySet<string>,
): ProductImageRecord[] {
  return images.filter(
    (img) => img.imageUrl && isValidImageSrc(img.imageUrl) && allowlist.has(img.imageUrl),
  );
}

/** Variant/option images must belong to this product's allowlist. */
export function isProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): boolean {
  if (!url || !isValidImageSrc(url)) return false;
  return allowedUrls.has(url.trim());
}

export function acceptProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): string | null {
  return isProductScopedImageUrl(url, allowedUrls) ? url!.trim() : null;
}
