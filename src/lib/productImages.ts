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
