/**
 * Optional safe archive for demo/sample ACTIVE products.
 *
 * Usage:
 *   npx tsx scripts/products/archive-test-products.ts
 *   npx tsx scripts/products/archive-test-products.ts --confirm
 */
import { PrismaClient } from "@prisma/client";
import { isDemoOrSampleProductMetadata } from "../../src/features/products/product-public-visibility";

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

async function main() {
  const active = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      productCode: true,
      metadata: true,
    },
  });

  const targets = active.filter((product) => isDemoOrSampleProductMetadata(product.metadata));
  console.log(
    JSON.stringify(
      {
        confirm,
        candidateCount: targets.length,
        candidates: targets.map((p) => ({ id: p.id, slug: p.slug, name: p.name })),
      },
      null,
      2,
    ),
  );

  if (!confirm) {
    console.log("Dry run only. Re-run with --confirm to archive demo/sample ACTIVE products.");
    return;
  }

  if (!targets.length) {
    console.log("Nothing to archive.");
    return;
  }

  const result = await prisma.product.updateMany({
    where: { id: { in: targets.map((p) => p.id) }, status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });
  console.log(JSON.stringify({ archivedCount: result.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
