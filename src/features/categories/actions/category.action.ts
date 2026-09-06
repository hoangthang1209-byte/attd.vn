"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { revalidatePublicCategoryCache } from "@/features/categories/revalidate-public-category-cache";

export async function createCategory(
  name: string,
  slug: string
) {
  await prisma.category.create({
    data: {
      name,
      slug,
    },
  });

  revalidatePath("/admin/danh-muc");
  revalidatePublicCategoryCache();
}

export async function deleteCategory(
  id: string
) {
  await prisma.category.delete({
    where: {
      id,
    },
  });

  revalidatePath("/admin/danh-muc");
  revalidatePublicCategoryCache();
}