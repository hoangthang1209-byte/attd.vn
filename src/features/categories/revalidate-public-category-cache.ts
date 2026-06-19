import { revalidatePath } from "next/cache";

/** Bust cached public pages that render the category mega menu / catalog filter. */
export function revalidatePublicCategoryCache(): void {
  revalidatePath("/", "layout");
  revalidatePath("/san-pham");
}
