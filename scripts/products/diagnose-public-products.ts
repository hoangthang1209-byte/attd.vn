/**
 * Read-only diagnostic for public product visibility consistency.
 *
 * Usage:
 *   npx tsx scripts/products/diagnose-public-products.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  buildPublicProductVisibilityWhere,
  isDemoOrSampleProductMetadata,
  shouldHideProductFromPublic,
} from "../../src/features/products/product-public-visibility";
import { isClientTempProductId } from "../../src/features/products/product-bulk.service";

const prisma = new PrismaClient();

async function main() {
  const byStatus = await prisma.product.groupBy({ by: ["status"], _count: true });
  const publicWhere = buildPublicProductVisibilityWhere();
  const publicVisible = await prisma.product.findMany({
    where: publicWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      productCode: true,
      status: true,
      metadata: true,
      category: { select: { isActive: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const allActive = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      productCode: true,
      status: true,
      metadata: true,
      category: { select: { isActive: true, slug: true } },
    },
  });

  const inconsistent = allActive.filter((product) =>
    shouldHideProductFromPublic({
      status: product.status,
      slug: product.slug,
      categoryIsActive: product.category.isActive,
      metadata: product.metadata,
    }),
  );

  const demoActive = allActive.filter((product) => isDemoOrSampleProductMetadata(product.metadata));
  const nullCode = allActive.filter((product) => !product.productCode);
  const emptySlug = allActive.filter((product) => !product.slug?.trim());
  const inactiveCategory = allActive.filter((product) => !product.category.isActive);
  const tempLike = allActive.filter((product) => isClientTempProductId(product.id));

  const report = {
    byStatus,
    publicVisibleCount: await prisma.product.count({ where: publicWhere }),
    activeCount: allActive.length,
    inconsistentActiveStillHiddenByCanonicalRules: inconsistent.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      productCode: p.productCode,
      reason: !p.slug?.trim()
        ? "empty_slug"
        : !p.category.isActive
          ? "inactive_category"
          : isDemoOrSampleProductMetadata(p.metadata)
            ? "demo_or_sample"
            : "unknown",
    })),
    demoOrSampleActive: demoActive.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    nullProductCodeActive: nullCode.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
    emptySlugActive: emptySlug.map((p) => ({ id: p.id, name: p.name })),
    inactiveCategoryActive: inactiveCategory.map((p) => ({
      id: p.id,
      slug: p.slug,
      categorySlug: p.category.slug,
    })),
    tempLikeIds: tempLike.map((p) => p.id),
    samplePublicVisible: publicVisible.slice(0, 10).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      productCode: p.productCode,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
