/**
 * Print deployment readiness report.
 * Usage: npx tsx scripts/deployment-readiness.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  buildDeploymentReadinessReport,
  formatReadinessReport,
} from "../src/lib/deploymentReadiness";

const prisma = new PrismaClient();

async function main() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        images: {
          select: { id: true, imageUrl: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);

  const report = buildDeploymentReadinessReport({
    products,
    categorySlugs: categories.map((c) => c.slug),
  });

  console.log(formatReadinessReport(report));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
