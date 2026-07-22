/**
 * Product image helpers — primary image, gallery, and upload config resolution.
 */

import {
  resolveUploadImage,
  isValidImageSrc,
  isAcceptableAspectRatio,
  type UploadFolder,
} from "@/lib/imagePaths";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

export type ProductImageRecord = {
  id?: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder?: number;
};

/** Sort images by sortOrder ascending (primary first). */
export function sortProductImages(
  images: ProductImageRecord[]
): ProductImageRecord[] {
  return [...images].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );
}

/** Valid gallery images only — used for thumbnail strip. */
export function getProductGalleryImages(
  images: ProductImageRecord[]
): ProductImageRecord[] {
  return sortProductImages(images)
    .map((img) => {
      const imageUrl = getPublicMediaUrl(img.imageUrl);
      if (!imageUrl) return null;
      return { ...img, imageUrl };
    })
    .filter((img): img is ProductImageRecord => Boolean(img));
}

/** Primary (first valid) product image URL, or null for fallback placeholder. */
export function getPrimaryProductImage(
  images: ProductImageRecord[]
): string | null {
  const gallery = getProductGalleryImages(images);
  return gallery[0]?.imageUrl ?? null;
}

/** Resolve optional upload-folder filename for catalog/config overrides. */
export function resolveProductUploadImage(
  filename?: string | null
): string | null {
  return resolveUploadImage("products", filename);
}

/** Merge DB images with optional config upload filename (config takes precedence when set). */
export function resolveProductImages(
  dbImages: ProductImageRecord[],
  configFilename?: string | null
): ProductImageRecord[] {
  const configSrc = resolveProductUploadImage(configFilename);
  if (configSrc && isValidImageSrc(configSrc)) {
    return [{ id: "config-primary", imageUrl: configSrc, sortOrder: 0 }];
  }
  return getProductGalleryImages(dbImages);
}

export { isAcceptableAspectRatio, isValidImageSrc };

// ─── New-style image fields (featuredImage + gallery on Product model) ────────

export type ProductWithNewImages = {
  featuredImage?: string | null;
  gallery?: string[] | unknown;
  images: ProductImageRecord[];
};

/**
 * Build a unified ProductImageRecord[] from both legacy `images` relation
 * AND new `featuredImage` / `gallery` fields.
 * Legacy ProductImage records take priority if they exist.
 */
export function buildProductImages(
  product: ProductWithNewImages
): ProductImageRecord[] {
  const legacyImages = getProductGalleryImages(product.images);
  if (legacyImages.length > 0) return legacyImages;

  const result: ProductImageRecord[] = [];
  const featured = getPublicMediaUrl(product.featuredImage);
  if (featured) {
    result.push({ id: "featured", imageUrl: featured, altText: null, sortOrder: 0 });
  }
  const gallery = Array.isArray(product.gallery) ? (product.gallery as string[]) : [];
  const seen = new Set(featured ? [featured] : []);
  for (let i = 0; i < gallery.length; i++) {
    const url = getPublicMediaUrl(gallery[i]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push({ id: `gallery-${i}`, imageUrl: url, altText: null, sortOrder: i + 1 });
  }
  return result;
}

/** Primary image URL using new-style image fields with legacy fallback. */
export function getPrimaryProductImageFromProduct(
  product: ProductWithNewImages
): string | null {
  const images = buildProductImages(product);
  return images[0]?.imageUrl ?? null;
}

/**
 * Second distinct valid gallery image after the primary — used for desktop card hover.
 * Returns null when no suitable alternate image exists.
 */
export function getProductCardHoverImageUrl(
  images: ProductImageRecord[],
  primaryImageUrl?: string | null,
): string | null {
  const gallery = getProductGalleryImages(images);
  const primary =
    getPublicMediaUrl(primaryImageUrl) ?? gallery[0]?.imageUrl ?? null;
  if (!primary) return null;

  const primaryIndex = gallery.findIndex((img) => img.imageUrl === primary);
  const startIndex = primaryIndex >= 0 ? primaryIndex + 1 : 1;

  for (let i = startIndex; i < gallery.length; i++) {
    const candidate = gallery[i]!.imageUrl;
    if (candidate !== primary) return candidate;
  }
  return null;
}

/** Hover image URL from unified product image fields with legacy fallback. */
export function getProductCardHoverImageFromProduct(
  product: ProductWithNewImages,
): string | null {
  const images = buildProductImages(product);
  const primary = images[0]?.imageUrl ?? null;
  return getProductCardHoverImageUrl(images, primary);
}

export type ProductImageStats = {
  total: number;
  withImages: number;
};

export function computeProductImageStats(
  products: { images: ProductImageRecord[] }[]
): ProductImageStats {
  const total = products.length;
  const withImages = products.filter(
    (p) => getPrimaryProductImage(p.images) != null
  ).length;
  return { total, withImages };
}
