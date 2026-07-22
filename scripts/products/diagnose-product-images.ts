import { PrismaClient } from "@prisma/client";
import { scanProductImageHealth } from "../../src/features/products/product-image-health";

const prisma = new PrismaClient();

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const checkRemote = hasFlag("--check-remote");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      featuredImage: true,
      gallery: true,
      images: { select: { imageUrl: true } },
      variants: { select: { imageUrl: true } },
      options: { select: { values: { select: { imageUrl: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const findings = [];
  for (const product of products) {
    const result = await scanProductImageHealth(
      {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        featuredImage: product.featuredImage,
        gallery: product.gallery,
        images: product.images,
        variants: product.variants,
        optionValues: product.options.flatMap((option) => option.values),
      },
      { checkRemote, timeoutMs: 4000 },
    );
    findings.push(...result);
  }

  const actionable = findings.filter((finding) => finding.status !== "OK" && finding.status !== "MISSING");
  const byStatus = actionable.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.status] = (acc[finding.status] ?? 0) + 1;
    return acc;
  }, {});

  const byProduct = new Map<string, { status: string; findings: typeof actionable }>();
  for (const finding of actionable) {
    const bucket = byProduct.get(finding.slug) ?? { status: "", findings: [] };
    bucket.status = bucket.status || finding.status;
    bucket.findings.push(finding);
    byProduct.set(finding.slug, bucket);
  }

  const report = {
    options: { checkRemote },
    totalProductsScanned: products.length,
    productsOk: products.length - byProduct.size,
    productsWithIssues: byProduct.size,
    summaryByStatus: byStatus,
    affectedProducts: [...byProduct.entries()].map(([slug, detail]) => ({
      slug,
      findings: detail.findings.map((finding) => ({
        fieldPath: finding.fieldPath,
        originalUrl: finding.originalUrl,
        normalizedUrl: finding.normalizedUrl,
        status: finding.status,
        reason: finding.reason,
        suggestedAction: finding.suggestedAction,
        httpStatus: finding.httpStatus,
      })),
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
