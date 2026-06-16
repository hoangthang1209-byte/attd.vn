/**
 * Product image helpers — primary image, gallery, and upload config resolution.
 */

import {
  resolveUploadImage,
  isValidImageSrc,
  isAcceptableAspectRatio,
  type UploadFolder,
} from "@/lib/imagePaths";

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
  return sortProductImages(images).filter((img) =>
    isValidImageSrc(img.imageUrl)
  );
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
  if (product.featuredImage && isValidImageSrc(product.featuredImage as string)) {
    result.push({ id: "featured", imageUrl: product.featuredImage as string, altText: null, sortOrder: 0 });
  }
  const gallery = Array.isArray(product.gallery) ? product.gallery as string[] : [];
  for (let i = 0; i < gallery.length; i++) {
    const url = gallery[i];
    if (url && isValidImageSrc(url)) {
      result.push({ id: `gallery-${i}`, imageUrl: url, altText: null, sortOrder: i + 1 });
    }
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
