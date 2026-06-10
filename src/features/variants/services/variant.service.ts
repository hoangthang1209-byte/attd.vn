import { prisma } from "@/lib/prisma";

export async function getVariantData() {
  const [products, colors, sizes] = await Promise.all([
    prisma.product.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.color.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.size.findMany({
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return {
    products,
    colors,
    sizes,
  };
}