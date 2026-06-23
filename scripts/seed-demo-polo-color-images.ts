/**
 * Cleans demo polo gallery + variant/option images.
 * Uses only URLs already on Product.featuredImage / Product.gallery / ProductImage —
 * never hardcoded cross-product assets.
 * Run: npx tsx scripts/seed-demo-polo-color-images.ts
 */
import { prisma } from "../src/lib/prisma";

const DEMO_SLUG = "ao-polo-the-thao-pique-pro-demo";

function isHttpsUrl(url: string): boolean {
  return url.startsWith("https://");
}

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: DEMO_SLUG },
    include: {
      images: true,
      variants: {
        include: {
          optionValues: { include: { optionValue: { include: { option: true } } } },
        },
      },
      options: { include: { values: true } },
    },
  });

  if (!product) {
    console.error(`Product not found: ${DEMO_SLUG}`);
    process.exit(1);
  }

  const authoritativeUrls = [
    ...new Set(
      [product.featuredImage, ...(product.gallery ?? [])]
        .filter((url): url is string => Boolean(url?.trim() && isHttpsUrl(url.trim())))
        .map((url) => url.trim()),
    ),
  ];

  if (authoritativeUrls.length === 0) {
    console.error("No HTTPS polo URLs on product.featuredImage or product.gallery — aborting.");
    process.exit(1);
  }

  const allowedUrls = new Set(authoritativeUrls);

  const removedImages = await prisma.productImage.deleteMany({
    where: { productId: product.id },
  });
  console.log(`Removed ${removedImages.count} ProductImage row(s).`);

  for (let i = 0; i < authoritativeUrls.length; i++) {
    const imageUrl = authoritativeUrls[i];
    await prisma.productImage.create({
      data: {
        productId: product.id,
        imageUrl,
        altText: `Áo polo — ảnh ${i + 1}`,
        sortOrder: i,
      },
    });
    console.log(`Added gallery image ${i + 1}: ${imageUrl}`);
  }

  let clearedVariants = 0;
  for (const variant of product.variants) {
    const nextUrl =
      variant.imageUrl && allowedUrls.has(variant.imageUrl) ? variant.imageUrl : null;
    if (variant.imageUrl !== nextUrl) {
      if (variant.imageUrl) clearedVariants += 1;
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { imageUrl: nextUrl },
      });
    }
  }

  let clearedOptions = 0;
  for (const option of product.options) {
    for (const value of option.values) {
      if (!value.imageUrl) continue;
      const nextUrl = allowedUrls.has(value.imageUrl) ? value.imageUrl : null;
      if (value.imageUrl !== nextUrl) {
        clearedOptions += 1;
        await prisma.productOptionValue.update({
          where: { id: value.id },
          data: { imageUrl: nextUrl },
        });
      }
    }
  }

  console.log(
    `Gallery: ${authoritativeUrls.length} polo image(s). Cleared ${clearedVariants} variant + ${clearedOptions} option image URL(s) outside allowlist.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
