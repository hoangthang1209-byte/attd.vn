import { revalidatePath } from "next/cache";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCacheTags,
} from "@/lib/public-cache-tags";

export function revalidateBlogPaths(slug?: string, categorySlug?: string) {
  revalidatePublicCacheTags(PUBLIC_CACHE_TAGS.blog, PUBLIC_CACHE_TAGS.homepage);
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
  if (categorySlug) {
    revalidatePath(`/blog/danh-muc/${categorySlug}`);
  }
}
