/**
 * Cleans demo polo gallery + variant color images.
 * Only uses images already in this product's gallery — never unrelated product URLs.
 * Run: npx tsx scripts/seed-demo-polo-color-images.ts
 */
import { prisma } from "../src/lib/prisma";

const DEMO_SLUG = "ao-polo-the-thao-pique-pro-demo";

const GALLERY_IMAGES = [
  {
    imageUrl:
      "https://res.cloudinary.com/dcgi9n5rw/image/upload/v1782186844/attd/products/eaovxhwrciqthvfv4wqo.jpg",
    altText: "Áo polo — Trắng",
    sortOrder: 0,
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dcgi9n5rw/image/upload/v1782186840/attd/products/dwg9s12xbz9u10xwo6b4.jpg",
    altText: "Áo polo — Navy",
    sortOrder: 1,
  },
];

const COLOR_IMAGE_MAP: Record<string, string> = {
  Trắng: GALLERY_IMAGES[0].imageUrl,
  Navy: GALLERY_IMAGES[1].imageUrl,
};

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
    },
  });

  if (!product) {
    console.error(`Product not found: ${DEMO_SLUG}`);
    process.exit(1);
  }

  const allowedUrls = new Set(GALLERY_IMAGES.map((img) => img.imageUrl));

  for (const img of product.images) {
    if (!allowedUrls.has(img.imageUrl)) {
      await prisma.productImage.delete({ where: { id: img.id } });
      console.log(`Removed unrelated gallery image: ${img.imageUrl}`);
    }
  }

  const existingUrls = new Set(
    (
      await prisma.productImage.findMany({
        where: { productId: product.id },
        select: { imageUrl: true },
      })
    ).map((row) => row.imageUrl),
  );

  for (const img of GALLERY_IMAGES) {
    if (!existingUrls.has(img.imageUrl)) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: img.imageUrl,
          altText: img.altText,
          sortOrder: img.sortOrder,
        },
      });
      console.log(`Added gallery image: ${img.altText}`);
    }
  }

  let cleared = 0;
  let updated = 0;

  for (const variant of product.variants) {
    const colorLabel =
      variant.colorName ??
      variant.optionValues.find((ov) => {
        const opt = ov.optionValue.option;
        const slug = opt.slug.toLowerCase();
        const name = opt.name.toLowerCase();
        return slug.includes("mau") || slug.includes("color") || name.includes("màu");
      })?.optionValue.label;

    const mappedUrl = colorLabel ? COLOR_IMAGE_MAP[colorLabel] : undefined;
    const nextUrl = mappedUrl && allowedUrls.has(mappedUrl) ? mappedUrl : null;

    if (variant.imageUrl !== nextUrl) {
      if (variant.imageUrl && !allowedUrls.has(variant.imageUrl)) {
        cleared += 1;
      } else if (nextUrl) {
        updated += 1;
      }
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { imageUrl: nextUrl },
      });
    }
  }

  console.log(`Cleared ${cleared} unrelated variant image(s); set ${updated} polo color image(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
