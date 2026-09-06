import { revalidateTag } from "next/cache";

/** Shared Next.js data-cache tags for public CMS / catalog surfaces. */
export const PUBLIC_CACHE_TAGS = {
  branding: "public-branding",
  company: "public-company",
  navigation: "public-navigation",
  categories: "public-categories",
  products: "public-products",
  blog: "public-blog",
  homepage: "public-homepage",
} as const;

export type PublicCacheTag =
  (typeof PUBLIC_CACHE_TAGS)[keyof typeof PUBLIC_CACHE_TAGS];

/** Default ISR / data-cache window for shared public reads (matches homepage). */
export const PUBLIC_CACHE_REVALIDATE_SECONDS = 3600;

/** Invalidate tagged public data caches (stale-while-revalidate via profile "max"). */
export function revalidatePublicCacheTags(...tags: PublicCacheTag[]): void {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}
