import { revalidatePath } from "next/cache";

/** Bust cached public pages that render the category mega menu / catalog filter. */
export function revalidatePublicCategoryCache(): void {
  revalidatePath("/", "layout");
  revalidatePath("/san-pham");
  revalidatePath("/danh-muc-san-pham");
  revalidatePath("/admin/danh-muc");
  revalidatePath("/admin/products/categories");
}
