/**
 * Sync PRODUCT_CATALOG entries to the database.
 * Run: npx tsx scripts/seed-product-catalog.ts
 */
import { PrismaClient } from "@prisma/client";
import { PRODUCT_CATALOG } from "../src/lib/productCatalog";

const prisma = new PrismaClient();

async function main() {
  const beforeCount = await prisma.product.count({
    where: { status: "ACTIVE", slug: { not: "" } },
  });
  console.log(`Active products before: ${beforeCount}`);

  const categories = await prisma.category.findMany({
    where: { slug: { in: ["ao-thun-tron", "ao-polo-tron"] } },
    select: { id: true, slug: true },
  });

  const categoryBySlug = Object.fromEntries(
    categories.map((c) => [c.slug, c.id])
  );

  for (const slug of ["ao-thun-tron", "ao-polo-tron"]) {
    if (!categoryBySlug[slug]) {
      throw new Error(`Category "${slug}" not found. Run prisma/seed.ts first.`);
    }
  }

  const defaultColor = await prisma.color.findFirst({
    where: { slug: "trắng" },
  });
  const defaultSize = await prisma.size.findFirst({
    where: { slug: "m" },
  });

  if (!defaultColor || !defaultSize) {
    throw new Error("Default color/size not found. Run prisma/seed.ts first.");
  }

  for (const item of PRODUCT_CATALOG) {
    const categoryId = categoryBySlug[item.categorySlug];

    const existing =
      (await prisma.product.findUnique({ where: { productCode: item.sku } })) ??
      (await prisma.product.findUnique({ where: { slug: item.slug } }));

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            productCode: item.sku,
            name: item.name,
            slug: item.slug,
            shortDescription: item.shortDescription,
            description: item.content,
            seoTitle: item.seoTitle,
            seoDescription: item.seoDescription,
            gsm: null,
            material: null,
            fit: null,
            categoryId,
            status: "ACTIVE",
          },
        })
      : await prisma.product.create({
          data: {
            productCode: item.sku,
            name: item.name,
            slug: item.slug,
            shortDescription: item.shortDescription,
            description: item.content,
            seoTitle: item.seoTitle,
            seoDescription: item.seoDescription,
            categoryId,
            status: "ACTIVE",
          },
        });

    await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: { productId: product.id },
      create: {
        productId: product.id,
        sku: item.sku,
        colorId: defaultColor.id,
        sizeId: defaultSize.id,
        stockQty: 0,
        stockStatus: "IN_STOCK",
      },
    });

    console.log(`  ✓ ${item.sku} — /san-pham/${item.slug}`);
  }

  const afterCount = await prisma.product.count({
    where: { status: "ACTIVE", slug: { not: "" } },
  });
  console.log(`\nActive products after: ${afterCount}`);
  console.log(`Catalog synced: ${PRODUCT_CATALOG.length} products`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
