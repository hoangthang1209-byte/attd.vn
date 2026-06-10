"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/quan-tri/danh-muc");
}

export async function deleteCategory(
  id: string
) {
  await prisma.category.delete({
    where: {
      id,
    },
  });

  revalidatePath("/quan-tri/danh-muc");
}