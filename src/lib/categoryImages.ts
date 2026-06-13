/**
 * Category image config — hero and gallery images per category slug.
 * Drop files in /public/uploads/categories/ and reference filenames here.
 */

import { resolveUploadImage, isValidImageSrc } from "@/lib/imagePaths";

export type CategoryImageConfig = {
  /** Hero banner filename or path */
  heroImage?: string;
  /** Additional gallery filenames or paths */
  galleryImages?: string[];
};

/**
 * Example:
 * "ao-thun-tron": { heroImage: "ao-thun-tron-hero.jpg", galleryImages: ["ao-thun-1.jpg"] }
 */
export const CATEGORY_IMAGES: Record<string, CategoryImageConfig> = {};

export function getCategoryHeroImage(
  slug: string,
  dbImageUrl?: string | null
): string | null {
  const config = CATEGORY_IMAGES[slug];
  const configHero = config?.heroImage
    ? resolveUploadImage("categories", config.heroImage)
    : null;

  if (configHero && isValidImageSrc(configHero)) return configHero;
  if (dbImageUrl && isValidImageSrc(dbImageUrl)) return dbImageUrl.trim();
  return null;
}

export function getCategoryGalleryImages(slug: string): string[] {
  const config = CATEGORY_IMAGES[slug];
  if (!config?.galleryImages?.length) return [];

  return config.galleryImages
    .map((filename) => resolveUploadImage("categories", filename))
    .filter((src): src is string => Boolean(src && isValidImageSrc(src)));
}

export function countConfiguredCategoryImages(): {
  total: number;
  withHero: number;
  withGallery: number;
} {
  const slugs = Object.keys(CATEGORY_IMAGES);
  const withHero = slugs.filter((slug) =>
    Boolean(getCategoryHeroImage(slug))
  ).length;
  const withGallery = slugs.filter(
    (slug) => getCategoryGalleryImages(slug).length > 0
  ).length;
  return { total: slugs.length, withHero, withGallery };
}
