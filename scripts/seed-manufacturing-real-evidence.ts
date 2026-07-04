import { PrismaClient, type ManufacturingMediaRole } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_BLUEPRINTS = [
  { title: "Minh chứng sản xuất", slug: "manufacturing-production-evidence", category: "production" },
  { title: "Kiểm tra chất lượng", slug: "manufacturing-qc-evidence", category: "qc" },
  { title: "Đóng gói đơn hàng", slug: "manufacturing-packing-evidence", category: "packing" },
  { title: "Kho hàng ATTD", slug: "manufacturing-warehouse-evidence", category: "warehouse" },
  { title: "Quy trình in logo", slug: "manufacturing-printing-evidence", category: "printing" },
  { title: "Bàn giao và giao hàng", slug: "manufacturing-delivery-evidence", category: "delivery" },
] as const;

const DISPLAY_LOCATION_KEYS = ["dealer-landing", "product-detail", "homepage"] as const;

function mediaRoleForMime(mimeType: string, index: number): ManufacturingMediaRole {
  if (mimeType.toLowerCase().startsWith("video/")) return "VIDEO";
  if (index === 0) return "THUMBNAIL";
  if (index === 1) return "EVIDENCE";
  return "PROCESS";
}

async function main() {
  const mediaAssets = await prisma.mediaAsset.findMany({
    where: {
      OR: [
        { mimeType: { startsWith: "image/" } },
        { mimeType: { startsWith: "video/" } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: SAMPLE_BLUEPRINTS.length,
  });

  if (mediaAssets.length === 0) {
    console.log("No MediaAsset records found. Manufacturing evidence seed skipped.");
    return;
  }

  const [categories, displayLocations] = await Promise.all([
    prisma.manufacturingCategory.findMany({
      where: { slug: { in: SAMPLE_BLUEPRINTS.map((item) => item.category) } },
    }),
    prisma.manufacturingDisplayLocation.findMany({
      where: { key: { in: [...DISPLAY_LOCATION_KEYS] } },
    }),
  ]);

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const locationByKey = new Map(displayLocations.map((location) => [location.key, location]));

  let seeded = 0;
  for (const [index, blueprint] of SAMPLE_BLUEPRINTS.entries()) {
    const mediaAsset = mediaAssets[index % mediaAssets.length];
    const category = categoryBySlug.get(blueprint.category);
    if (!mediaAsset || !category) continue;

    const asset = await prisma.manufacturingAsset.upsert({
      where: { slug: blueprint.slug },
      update: {
        title: blueprint.title,
        categoryId: category.id,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        featured: index < 3,
        priority: (index + 1) * 10,
        publishedAt: new Date(),
      },
      create: {
        title: blueprint.title,
        slug: blueprint.slug,
        description: "Minh chứng sản xuất dùng MediaAsset thật từ thư viện media.",
        categoryId: category.id,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        featured: index < 3,
        priority: (index + 1) * 10,
        publishedAt: new Date(),
      },
    });

    await prisma.manufacturingMedia.deleteMany({ where: { assetId: asset.id } });
    await prisma.manufacturingMedia.create({
      data: {
        assetId: asset.id,
        mediaAssetId: mediaAsset.id,
        role: mediaRoleForMime(mediaAsset.mimeType, index),
        caption: blueprint.title,
        altText: mediaAsset.altText ?? blueprint.title,
        sortOrder: 0,
      },
    });

    await prisma.manufacturingAssetDisplayLocation.deleteMany({
      where: { assetId: asset.id },
    });
    for (const [locationIndex, key] of DISPLAY_LOCATION_KEYS.entries()) {
      const displayLocation = locationByKey.get(key);
      if (!displayLocation) continue;
      await prisma.manufacturingAssetDisplayLocation.create({
        data: {
          assetId: asset.id,
          displayLocationId: displayLocation.id,
          sortOrder: (index + 1) * 10 + locationIndex,
        },
      });
    }

    seeded += 1;
  }

  console.log(`Manufacturing real evidence seed complete: ${seeded} asset(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
