import { revalidatePath } from "next/cache";
import {
  PUBLIC_CACHE_TAGS,
  revalidatePublicCacheTags,
} from "@/lib/public-cache-tags";

/** Bust cached public pages that render the category mega menu / catalog filter. */
export function revalidatePublicCategoryCache(): void {
  revalidatePublicCacheTags(PUBLIC_CACHE_TAGS.categories, PUBLIC_CACHE_TAGS.homepage);
  revalidatePath("/", "layout");
  revalidatePath("/san-pham");
  revalidatePath("/danh-muc-san-pham");
  revalidatePath("/admin/danh-muc");
  revalidatePath("/admin/products/categories");
}
