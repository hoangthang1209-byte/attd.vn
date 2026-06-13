"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createProduct(
  name: string,
  slug: string,
  categoryId: string
) {
  await prisma.product.create({
    data: {
      name,
      slug,
      categoryId,
    },
  });

  revalidatePath("/admin/san-pham");
}