import { getPublicMediaUrl } from "@/features/media/get-public-media-url";
import type { ProductImageRecord } from "@/lib/productImages";

/** URLs explicitly attached to this product record (gallery). */
export function buildProductImageUrlSet(
  images: ProductImageRecord[],
): ReadonlySet<string> {
  const set = new Set<string>();
  for (const img of images) {
    const url = getPublicMediaUrl(img.imageUrl);
    if (url) set.add(url);
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
    const resolved = getPublicMediaUrl(url);
    if (resolved) set.add(resolved);
  }
}

/** Image URLs owned by the currently loaded product record (gallery + variants + options). */
export function buildPdpImageAllowlist(input: AllowlistInput): ReadonlySet<string> {
  const set = new Set(buildProductImageUrlSet(input.images));

  const featured = getPublicMediaUrl(input.featuredImage);
  if (featured) set.add(featured);

  for (const url of input.gallery ?? []) {
    const resolved = getPublicMediaUrl(url);
    if (resolved) set.add(resolved);
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
  return images
    .map((img) => {
      const imageUrl = getPublicMediaUrl(img.imageUrl);
      if (!imageUrl || !allowlist.has(imageUrl)) return null;
      return { ...img, imageUrl };
    })
    .filter((img): img is ProductImageRecord => Boolean(img));
}

/** Variant/option images must belong to this product's allowlist. */
export function isProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): boolean {
  const resolved = getPublicMediaUrl(url);
  if (!resolved) return false;
  return allowedUrls.has(resolved);
}

export function acceptProductScopedImageUrl(
  url: string | null | undefined,
  allowedUrls: ReadonlySet<string>,
): string | null {
  const resolved = getPublicMediaUrl(url);
  if (!resolved || !allowedUrls.has(resolved)) return null;
  return resolved;
}
