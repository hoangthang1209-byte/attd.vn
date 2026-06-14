import { revalidatePath } from "next/cache";

export function revalidateBlogPaths(slug?: string, categorySlug?: string) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
  if (categorySlug) {
    revalidatePath(`/blog/danh-muc/${categorySlug}`);
  }
}
