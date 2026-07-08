import "server-only";

import type { ManufacturingVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidImageSrc } from "@/lib/imagePaths";
import { MANUFACTURING_MEDIA_ROLE_PRIORITY } from "@/lib/manufacturing/manufacturing.constants";
import type { QuoteManufacturingEvidenceItem } from "@/features/quotes/types";

export const QUOTE_MANUFACTURING_TARGET_TYPE = "QUOTE";
export const QUOTE_MANUFACTURING_ROLE = "PDF_EVIDENCE";
export const QUOTE_MANUFACTURING_MAX_SELECTED = 4;

const QUOTE_DOCUMENT_VISIBILITIES: ManufacturingVisibility[] = ["PUBLIC", "DEALER_ONLY"];

const quoteManufacturingAssetInclude = {
  category: { select: { id: true, name: true, slug: true } },
  media: {
    include: {
      mediaAsset: {
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          mimeType: true,
          altText: true,
          title: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  displayLocations: {
    include: { displayLocation: { select: { key: true, name: true } } },
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
} satisfies Prisma.ManufacturingAssetInclude;

type QuoteManufacturingAssetRow = Prisma.ManufacturingAssetGetPayload<{
  include: typeof quoteManufacturingAssetInclude;
}>;

export type QuoteManufacturingEvidenceSelection = {
  assetId: string;
  sortOrder?: number;
};

export class QuoteManufacturingEvidenceValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "QuoteManufacturingEvidenceValidationError";
  }
}

function roleRank(role: string): number {
  const index = MANUFACTURING_MEDIA_ROLE_PRIORITY.findIndex((item) => item === role);
  return index >= 0 ? index : MANUFACTURING_MEDIA_ROLE_PRIORITY.length;
}

function selectPdfImage(asset: QuoteManufacturingAssetRow) {
  return [...asset.media]
    .sort((a, b) => {
      const roleDiff = roleRank(a.role) - roleRank(b.role);
      if (roleDiff !== 0) return roleDiff;
      return a.sortOrder - b.sortOrder;
    })
    .find((media) => {
      const mediaAsset = media.mediaAsset;
      const src = mediaAsset.thumbnailUrl || mediaAsset.url;
      return mediaAsset.mimeType.toLowerCase().startsWith("image/") && isValidImageSrc(src);
    });
}

function mapQuoteManufacturingAsset(
  asset: QuoteManufacturingAssetRow,
  sortOrder = asset.priority,
): QuoteManufacturingEvidenceItem | null {
  const media = selectPdfImage(asset);
  if (!media) return null;

  const imageUrl = media.mediaAsset.thumbnailUrl || media.mediaAsset.url;
  return {
    id: asset.id,
    title: asset.title,
    description: asset.description ?? "",
    categoryName: asset.category?.name ?? null,
    categorySlug: asset.category?.slug ?? null,
    visibility: asset.visibility,
    featured: asset.featured,
    priority: asset.priority,
    imageUrl,
    alt: media.altText ?? media.mediaAsset.altText ?? media.mediaAsset.title ?? asset.title,
    displayLocationKeys: asset.displayLocations.map((item) => item.displayLocation.key),
    sortOrder,
  };
}

function dedupeEvidenceItems(items: QuoteManufacturingEvidenceItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function assertQuoteExists(quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true } });
  if (!quote) throw new QuoteManufacturingEvidenceValidationError("Không tìm thấy báo giá.");
}

export async function getSelectedManufacturingAssetsForQuotePdf(
  quoteId: string,
): Promise<QuoteManufacturingEvidenceItem[]> {
  const selected = await prisma.manufacturingRelation.findMany({
    where: {
      targetType: QUOTE_MANUFACTURING_TARGET_TYPE,
      targetId: quoteId,
      role: QUOTE_MANUFACTURING_ROLE,
      asset: {
        status: "PUBLISHED",
        visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
      },
    },
    include: {
      asset: { include: quoteManufacturingAssetInclude },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const selectedItems = selected
    .map((relation) => mapQuoteManufacturingAsset(relation.asset, relation.sortOrder))
    .filter((item): item is QuoteManufacturingEvidenceItem => Boolean(item));

  return dedupeEvidenceItems(selectedItems).slice(0, QUOTE_MANUFACTURING_MAX_SELECTED);
}

export async function getManufacturingAssetsForQuotePdf(
  quoteId: string,
): Promise<QuoteManufacturingEvidenceItem[]> {
  const selectedItems = await getSelectedManufacturingAssetsForQuotePdf(quoteId);
  if (selectedItems.length > 0) return selectedItems;

  const fallbackRows = await prisma.manufacturingAssetDisplayLocation.findMany({
    where: {
      displayLocation: { key: "quote-pdf", active: true },
      asset: {
        status: "PUBLISHED",
        visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
      },
    },
    include: {
      asset: { include: quoteManufacturingAssetInclude },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: QUOTE_MANUFACTURING_MAX_SELECTED,
  });

  return dedupeEvidenceItems(
    fallbackRows
      .map((row) => mapQuoteManufacturingAsset(row.asset, row.sortOrder))
      .filter((item): item is QuoteManufacturingEvidenceItem => Boolean(item)),
  ).slice(0, QUOTE_MANUFACTURING_MAX_SELECTED);
}

export async function listAvailableManufacturingAssetsForQuotePicker(): Promise<
  QuoteManufacturingEvidenceItem[]
> {
  const assets = await prisma.manufacturingAsset.findMany({
    where: {
      status: "PUBLISHED",
      visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
    },
    include: quoteManufacturingAssetInclude,
    orderBy: [{ featured: "desc" }, { priority: "asc" }, { updatedAt: "desc" }],
    take: 120,
  });

  return assets
    .map((asset) => mapQuoteManufacturingAsset(asset))
    .filter((item): item is QuoteManufacturingEvidenceItem => Boolean(item));
}

export async function getSuggestedManufacturingAssetsForQuote(
  quoteId: string,
): Promise<QuoteManufacturingEvidenceItem[]> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      items: {
        select: {
          productId: true,
        },
      },
    },
  });
  if (!quote) return [];

  const productIds = quote.items
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));
  const productRows = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true },
      })
    : [];
  const categoryIds = [...new Set(productRows.map((product) => product.categoryId).filter(Boolean))];

  const relationWhere: Prisma.ManufacturingRelationWhereInput[] = [
    ...(productIds.length ? [{ targetType: "PRODUCT", targetId: { in: productIds } }] : []),
    ...(categoryIds.length
      ? [{ targetType: "PRODUCT_CATEGORY", targetId: { in: categoryIds } }]
      : []),
  ];

  const [relationRows, fallbackRows] = await Promise.all([
    relationWhere.length
      ? prisma.manufacturingRelation.findMany({
          where: {
            OR: relationWhere,
            asset: {
              status: "PUBLISHED",
              visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
            },
          },
          include: { asset: { include: quoteManufacturingAssetInclude } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 12,
        })
      : Promise.resolve([]),
    prisma.manufacturingAssetDisplayLocation.findMany({
      where: {
        displayLocation: { key: "quote-pdf", active: true },
        asset: {
          status: "PUBLISHED",
          visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
        },
      },
      include: { asset: { include: quoteManufacturingAssetInclude } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 8,
    }),
  ]);

  return dedupeEvidenceItems([
    ...relationRows
      .map((relation) => mapQuoteManufacturingAsset(relation.asset, relation.sortOrder))
      .filter((item): item is QuoteManufacturingEvidenceItem => Boolean(item)),
    ...fallbackRows
      .map((row) => mapQuoteManufacturingAsset(row.asset, row.sortOrder))
      .filter((item): item is QuoteManufacturingEvidenceItem => Boolean(item)),
  ]).slice(0, 8);
}

export async function updateQuoteManufacturingEvidence(
  quoteId: string,
  selections: QuoteManufacturingEvidenceSelection[],
): Promise<QuoteManufacturingEvidenceItem[]> {
  await assertQuoteExists(quoteId);

  const normalized = selections
    .map((selection, index) => ({
      assetId: selection.assetId.trim(),
      sortOrder: Number.isFinite(Number(selection.sortOrder))
        ? Number(selection.sortOrder)
        : index * 10,
    }))
    .filter((selection) => selection.assetId);

  const seen = new Set<string>();
  const unique = normalized.filter((selection) => {
    if (seen.has(selection.assetId)) return false;
    seen.add(selection.assetId);
    return true;
  });

  if (unique.length > QUOTE_MANUFACTURING_MAX_SELECTED) {
    throw new QuoteManufacturingEvidenceValidationError(
      `Chỉ nên chọn tối đa ${QUOTE_MANUFACTURING_MAX_SELECTED} minh chứng cho PDF.`,
    );
  }

  const assets = unique.length
    ? await prisma.manufacturingAsset.findMany({
        where: {
          id: { in: unique.map((selection) => selection.assetId) },
          status: "PUBLISHED",
          visibility: { in: QUOTE_DOCUMENT_VISIBILITIES },
        },
        include: quoteManufacturingAssetInclude,
      })
    : [];

  if (assets.length !== unique.length) {
    throw new QuoteManufacturingEvidenceValidationError(
      "Một hoặc nhiều minh chứng không hợp lệ hoặc chưa được phép đưa vào PDF.",
    );
  }

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const missingMedia = unique.find((selection) => {
    const asset = assetById.get(selection.assetId);
    return !asset || !selectPdfImage(asset);
  });
  if (missingMedia) {
    throw new QuoteManufacturingEvidenceValidationError(
      "Minh chứng đưa vào PDF cần có ảnh hợp lệ từ MediaAsset.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.manufacturingRelation.deleteMany({
      where: {
        targetType: QUOTE_MANUFACTURING_TARGET_TYPE,
        targetId: quoteId,
        role: QUOTE_MANUFACTURING_ROLE,
      },
    });

    if (unique.length > 0) {
      await tx.manufacturingRelation.createMany({
        data: unique.map((selection) => ({
          assetId: selection.assetId,
          targetType: QUOTE_MANUFACTURING_TARGET_TYPE,
          targetId: quoteId,
          role: QUOTE_MANUFACTURING_ROLE,
          sortOrder: selection.sortOrder,
        })),
      });
    }
  });

  return getManufacturingAssetsForQuotePdf(quoteId);
}
