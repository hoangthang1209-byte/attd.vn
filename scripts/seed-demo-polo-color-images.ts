/**
 * One-off: gallery images + color-representative variant imageUrl for demo polo.
 * Run: npx tsx scripts/seed-demo-polo-color-images.ts
 */
import { prisma } from "../src/lib/prisma";

const DEMO_SLUG = "ao-polo-the-thao-pique-pro-demo";

/** Existing valid URLs already used in ATTD product/media storage. */
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
  {
    imageUrl:
      "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/-o-thun-regular-tr-n-mau-32-GnOVv7bBYEghC9YYRfaFk30r3Ls6Qk.jpg",
    altText: "Áo polo — Đen",
    sortOrder: 2,
  },
];

const COLOR_IMAGE_MAP: Record<string, string> = {
  Trắng: GALLERY_IMAGES[0].imageUrl,
  Navy: GALLERY_IMAGES[1].imageUrl,
  Đen: GALLERY_IMAGES[2].imageUrl,
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

  if (product.images.length === 0) {
    await prisma.productImage.createMany({
      data: GALLERY_IMAGES.map((img) => ({
        productId: product.id,
        imageUrl: img.imageUrl,
        altText: img.altText,
        sortOrder: img.sortOrder,
      })),
    });
    console.log(`Created ${GALLERY_IMAGES.length} gallery image(s).`);
  }

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

    if (!colorLabel) continue;

    const imageUrl = COLOR_IMAGE_MAP[colorLabel];
    if (!imageUrl || variant.imageUrl === imageUrl) continue;

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { imageUrl },
    });
    updated += 1;
  }

  console.log(`Updated ${updated} variant imageUrl(s) for ${DEMO_SLUG}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
