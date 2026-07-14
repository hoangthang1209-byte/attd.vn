import { prisma } from "@/lib/prisma";

export type MediaReferenceType =
  | "PRODUCT"
  | "BLOG"
  | "QUOTE"
  | "ORDER"
  | "MANUFACTURING"
  | "HOMEPAGE"
  | "TECH_PACK"
  | "SALES"
  | "OTHER";

export type MediaReference = {
  type: MediaReferenceType;
  entityId: string;
  entityCode?: string | null;
  entityTitle: string;
  field?: string | null;
  route?: string | null;
  referenceMode: "RELATION" | "URL_MATCH";
};

function refKey(ref: MediaReference): string {
  return `${ref.type}:${ref.entityId}:${ref.field ?? ""}:${ref.referenceMode}`;
}

function dedupe(refs: MediaReference[]): MediaReference[] {
  const seen = new Set<string>();
  const out: MediaReference[] = [];
  for (const ref of refs) {
    const key = refKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

/**
 * Resolve where a MediaAsset is used.
 * Explicit Prisma FK relations first; exact URL matches only on known string fields.
 * Collection membership is NOT a usage reference.
 */
export async function resolveMediaReferences(assetId: string): Promise<MediaReference[]> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { id: true, url: true, thumbnailUrl: true },
  });
  if (!asset) return [];

  const urls = [asset.url, asset.thumbnailUrl].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  const [
    quoteItems,
    orderItems,
    manufacturing,
    homepageOem,
    homepagePathways,
    salesReps,
    productionFiles,
    qcEvidence,
    deliveryProofs,
    productsFeatured,
    productsGallery,
    productImages,
    blogFeatured,
    blogOg,
    techPackAssets,
  ] = await Promise.all([
    prisma.quoteItem.findMany({
      where: { designMediaAssetId: assetId },
      select: {
        id: true,
        productNameSnapshot: true,
        quoteId: true,
        quote: { select: { quoteNo: true } },
      },
      take: 50,
    }),
    prisma.orderItem.findMany({
      where: { designMediaAssetId: assetId },
      select: {
        id: true,
        productNameSnapshot: true,
        orderId: true,
        order: { select: { orderNo: true } },
      },
      take: 50,
    }),
    prisma.manufacturingMedia.findMany({
      where: { mediaAssetId: assetId },
      select: {
        id: true,
        role: true,
        assetId: true,
        asset: { select: { title: true, slug: true } },
      },
      take: 50,
    }),
    prisma.homepageSettings.findMany({
      where: { oemMediaAssetId: assetId },
      select: { id: true },
      take: 10,
    }),
    prisma.homepageSourcingPathway.findMany({
      where: { mediaAssetId: assetId },
      select: { id: true, title: true },
      take: 50,
    }),
    prisma.salesRepresentative.findMany({
      where: { avatarMediaAssetId: assetId },
      select: { id: true, fullName: true },
      take: 50,
    }),
    prisma.orderProductionFile.findMany({
      where: { mediaAssetId: assetId },
      select: {
        id: true,
        title: true,
        orderId: true,
        order: { select: { orderNo: true } },
      },
      take: 50,
    }),
    prisma.orderQcEvidence.findMany({
      where: { mediaAssetId: assetId },
      select: {
        id: true,
        title: true,
        orderId: true,
        order: { select: { orderNo: true } },
      },
      take: 50,
    }),
    prisma.orderDeliveryProof.findMany({
      where: { mediaAssetId: assetId },
      select: {
        id: true,
        title: true,
        orderId: true,
        order: { select: { orderNo: true } },
      },
      take: 50,
    }),
    urls.length
      ? prisma.product.findMany({
          where: { featuredImage: { in: urls } },
          select: { id: true, name: true, productCode: true, slug: true },
          take: 50,
        })
      : Promise.resolve([]),
    urls.length
      ? prisma.product.findMany({
          where: { gallery: { hasSome: urls } },
          select: { id: true, name: true, productCode: true, slug: true },
          take: 50,
        })
      : Promise.resolve([]),
    urls.length
      ? prisma.productImage.findMany({
          where: { imageUrl: { in: urls } },
          select: {
            id: true,
            productId: true,
            product: { select: { name: true, productCode: true, slug: true } },
          },
          take: 50,
        })
      : Promise.resolve([]),
    urls.length
      ? prisma.blogPost.findMany({
          where: { featuredImageUrl: { in: urls } },
          select: { id: true, title: true, slug: true },
          take: 50,
        })
      : Promise.resolve([]),
    urls.length
      ? prisma.blogPost.findMany({
          where: { ogImageUrl: { in: urls } },
          select: { id: true, title: true, slug: true },
          take: 50,
        })
      : Promise.resolve([]),
    urls.length
      ? prisma.techPackAsset.findMany({
          where: { previewUrl: { in: urls } },
          select: {
            id: true,
            title: true,
            techPackId: true,
            techPack: { select: { code: true, title: true } },
          },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const refs: MediaReference[] = [];

  for (const item of quoteItems) {
    refs.push({
      type: "QUOTE",
      entityId: item.quoteId,
      entityCode: item.quote.quoteNo,
      entityTitle: item.productNameSnapshot || item.quote.quoteNo || "Báo giá",
      field: "designMediaAssetId",
      route: `/admin/quotes/${item.quoteId}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of orderItems) {
    refs.push({
      type: "ORDER",
      entityId: item.orderId,
      entityCode: item.order.orderNo,
      entityTitle: item.productNameSnapshot || item.order.orderNo || "Đơn hàng",
      field: "designMediaAssetId",
      route: `/admin/orders/${item.orderId}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of manufacturing) {
    refs.push({
      type: "MANUFACTURING",
      entityId: item.assetId,
      entityCode: item.asset.slug,
      entityTitle: item.asset.title,
      field: `role:${item.role}`,
      route: `/admin/manufacturing-library/${item.assetId}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of homepageOem) {
    refs.push({
      type: "HOMEPAGE",
      entityId: item.id,
      entityTitle: "Homepage OEM",
      field: "oemMediaAssetId",
      route: "/admin/settings/homepage",
      referenceMode: "RELATION",
    });
  }

  for (const item of homepagePathways) {
    refs.push({
      type: "HOMEPAGE",
      entityId: item.id,
      entityTitle: item.title || "Sourcing pathway",
      field: "mediaAssetId",
      route: "/admin/settings/homepage",
      referenceMode: "RELATION",
    });
  }

  for (const item of salesReps) {
    refs.push({
      type: "SALES",
      entityId: item.id,
      entityTitle: item.fullName,
      field: "avatarMediaAssetId",
      route: `/admin/crm/sales/${item.id}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of productionFiles) {
    if (!item.orderId) continue;
    refs.push({
      type: "ORDER",
      entityId: item.orderId,
      entityCode: item.order?.orderNo,
      entityTitle: item.title || item.order?.orderNo || "File sản xuất",
      field: "orderProductionFile",
      route: `/admin/orders/${item.orderId}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of qcEvidence) {
    refs.push({
      type: "ORDER",
      entityId: item.orderId,
      entityCode: item.order.orderNo,
      entityTitle: item.title || "QC evidence",
      field: "orderQcEvidence",
      route: `/admin/orders/${item.orderId}`,
      referenceMode: "RELATION",
    });
  }

  for (const item of deliveryProofs) {
    refs.push({
      type: "ORDER",
      entityId: item.orderId,
      entityCode: item.order.orderNo,
      entityTitle: item.title || "Delivery proof",
      field: "orderDeliveryProof",
      route: `/admin/orders/${item.orderId}`,
      referenceMode: "RELATION",
    });
  }

  for (const product of productsFeatured) {
    refs.push({
      type: "PRODUCT",
      entityId: product.id,
      entityCode: product.productCode,
      entityTitle: product.name,
      field: "featuredImage",
      route: `/admin/products/${product.id}/edit`,
      referenceMode: "URL_MATCH",
    });
  }

  for (const product of productsGallery) {
    refs.push({
      type: "PRODUCT",
      entityId: product.id,
      entityCode: product.productCode,
      entityTitle: product.name,
      field: "gallery",
      route: `/admin/products/${product.id}/edit`,
      referenceMode: "URL_MATCH",
    });
  }

  for (const image of productImages) {
    refs.push({
      type: "PRODUCT",
      entityId: image.productId,
      entityCode: image.product.productCode,
      entityTitle: image.product.name,
      field: "ProductImage.imageUrl",
      route: `/admin/products/${image.productId}/edit`,
      referenceMode: "URL_MATCH",
    });
  }

  for (const post of blogFeatured) {
    refs.push({
      type: "BLOG",
      entityId: post.id,
      entityCode: post.slug,
      entityTitle: post.title,
      field: "featuredImageUrl",
      route: `/admin/blog/${post.id}`,
      referenceMode: "URL_MATCH",
    });
  }

  for (const post of blogOg) {
    refs.push({
      type: "BLOG",
      entityId: post.id,
      entityCode: post.slug,
      entityTitle: post.title,
      field: "ogImageUrl",
      route: `/admin/blog/${post.id}`,
      referenceMode: "URL_MATCH",
    });
  }

  for (const asset of techPackAssets) {
    refs.push({
      type: "TECH_PACK",
      entityId: asset.techPackId,
      entityCode: asset.techPack.code,
      entityTitle: asset.title || asset.techPack.title || "Tech Pack",
      field: "previewUrl",
      route: `/admin/tech-pack/${asset.techPackId}`,
      referenceMode: "URL_MATCH",
    });
  }

  return dedupe(refs);
}

/**
 * Batch reference counts for currently loaded Media Library cards.
 * Avoids N+1 by querying only the provided asset IDs.
 */
export async function countMediaReferencesBatch(
  assetIds: string[],
): Promise<Record<string, number>> {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];
  const counts: Record<string, number> = Object.fromEntries(uniqueIds.map((id) => [id, 0]));
  if (!uniqueIds.length) return counts;

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, url: true, thumbnailUrl: true },
  });
  const urlToAssetIds = new Map<string, string[]>();
  for (const asset of assets) {
    for (const url of [asset.url, asset.thumbnailUrl]) {
      if (!url) continue;
      const list = urlToAssetIds.get(url) ?? [];
      list.push(asset.id);
      urlToAssetIds.set(url, list);
    }
  }
  const urls = [...urlToAssetIds.keys()];

  const bump = (assetId: string, amount = 1) => {
    counts[assetId] = (counts[assetId] ?? 0) + amount;
  };

  const [
    quoteGroups,
    orderGroups,
    manufacturingGroups,
    homepageOem,
    homepagePathways,
    salesReps,
    productionFiles,
    qcEvidence,
    deliveryProofs,
  ] = await Promise.all([
    prisma.quoteItem.groupBy({
      by: ["designMediaAssetId"],
      where: { designMediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["designMediaAssetId"],
      where: { designMediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.manufacturingMedia.groupBy({
      by: ["mediaAssetId"],
      where: { mediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.homepageSettings.groupBy({
      by: ["oemMediaAssetId"],
      where: { oemMediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.homepageSourcingPathway.groupBy({
      by: ["mediaAssetId"],
      where: { mediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.salesRepresentative.groupBy({
      by: ["avatarMediaAssetId"],
      where: { avatarMediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.orderProductionFile.groupBy({
      by: ["mediaAssetId"],
      where: { mediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.orderQcEvidence.groupBy({
      by: ["mediaAssetId"],
      where: { mediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
    prisma.orderDeliveryProof.groupBy({
      by: ["mediaAssetId"],
      where: { mediaAssetId: { in: uniqueIds } },
      _count: { _all: true },
    }),
  ]);

  for (const row of quoteGroups) {
    if (row.designMediaAssetId) bump(row.designMediaAssetId, row._count._all);
  }
  for (const row of orderGroups) {
    if (row.designMediaAssetId) bump(row.designMediaAssetId, row._count._all);
  }
  for (const row of manufacturingGroups) bump(row.mediaAssetId, row._count._all);
  for (const row of homepageOem) {
    if (row.oemMediaAssetId) bump(row.oemMediaAssetId, row._count._all);
  }
  for (const row of homepagePathways) {
    if (row.mediaAssetId) bump(row.mediaAssetId, row._count._all);
  }
  for (const row of salesReps) {
    if (row.avatarMediaAssetId) bump(row.avatarMediaAssetId, row._count._all);
  }
  for (const row of productionFiles) bump(row.mediaAssetId, row._count._all);
  for (const row of qcEvidence) bump(row.mediaAssetId, row._count._all);
  for (const row of deliveryProofs) bump(row.mediaAssetId, row._count._all);

  if (urls.length) {
    const [featured, gallery, productImages, blogFeatured, blogOg, techPack] = await Promise.all([
      prisma.product.findMany({
        where: { featuredImage: { in: urls } },
        select: { featuredImage: true },
      }),
      prisma.product.findMany({
        where: { gallery: { hasSome: urls } },
        select: { gallery: true },
      }),
      prisma.productImage.findMany({
        where: { imageUrl: { in: urls } },
        select: { imageUrl: true },
      }),
      prisma.blogPost.findMany({
        where: { featuredImageUrl: { in: urls } },
        select: { featuredImageUrl: true },
      }),
      prisma.blogPost.findMany({
        where: { ogImageUrl: { in: urls } },
        select: { ogImageUrl: true },
      }),
      prisma.techPackAsset.findMany({
        where: { previewUrl: { in: urls } },
        select: { previewUrl: true },
      }),
    ]);

    for (const row of featured) {
      if (!row.featuredImage) continue;
      for (const id of urlToAssetIds.get(row.featuredImage) ?? []) bump(id);
    }
    for (const row of gallery) {
      for (const url of row.gallery) {
        for (const id of urlToAssetIds.get(url) ?? []) bump(id);
      }
    }
    for (const row of productImages) {
      for (const id of urlToAssetIds.get(row.imageUrl) ?? []) bump(id);
    }
    for (const row of blogFeatured) {
      if (!row.featuredImageUrl) continue;
      for (const id of urlToAssetIds.get(row.featuredImageUrl) ?? []) bump(id);
    }
    for (const row of blogOg) {
      if (!row.ogImageUrl) continue;
      for (const id of urlToAssetIds.get(row.ogImageUrl) ?? []) bump(id);
    }
    for (const row of techPack) {
      if (!row.previewUrl) continue;
      for (const id of urlToAssetIds.get(row.previewUrl) ?? []) bump(id);
    }
  }

  return counts;
}
