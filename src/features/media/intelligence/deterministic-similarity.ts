import { prisma } from "@/lib/prisma";
import type { SimilarityProvider } from "@/features/media/intelligence/provider-interfaces";
import type { SimilarAssetHit } from "@/features/media/intelligence/intelligence.types";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

/**
 * Deterministic similarity: hash, duplicate links, shared terms/role/bundle.
 * No embeddings.
 */
export class DeterministicSimilarityProvider implements SimilarityProvider {
  async findSimilar(input: {
    mediaAssetId: string;
    limit?: number;
  }): Promise<SimilarAssetHit[]> {
    const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: input.mediaAssetId },
      select: {
        id: true,
        contentHash: true,
        duplicateOfId: true,
        subjectTerms: true,
        roleId: true,
        libraryId: true,
        visibility: true,
      },
    });
    if (!asset) return [];

    const hits = new Map<string, SimilarAssetHit>();

    const push = (
      row: {
        id: string;
        title: string | null;
        altText: string | null;
        url: string;
        thumbnailUrl: string | null;
        visibility: string;
      },
      relation: SimilarAssetHit["relation"],
      score: number,
    ) => {
      if (row.id === asset.id) return;
      if (row.visibility === "PRIVATE") return;
      const url = getPublicMediaUrl(row.url);
      if (!url) return;
      const existing = hits.get(row.id);
      if (existing && existing.score >= score) return;
      hits.set(row.id, {
        mediaAssetId: row.id,
        title: row.title,
        altText: row.altText,
        url,
        thumbnailUrl: row.thumbnailUrl ? getPublicMediaUrl(row.thumbnailUrl) : null,
        relation,
        score,
      });
    };

    if (asset.contentHash) {
      const sameHash = await prisma.mediaAsset.findMany({
        where: { contentHash: asset.contentHash, id: { not: asset.id } },
        select: {
          id: true,
          title: true,
          altText: true,
          url: true,
          thumbnailUrl: true,
          visibility: true,
        },
        take: 8,
      });
      for (const row of sameHash) push(row, "SAME_HASH", 100);
    }

    if (asset.duplicateOfId) {
      const parent = await prisma.mediaAsset.findUnique({
        where: { id: asset.duplicateOfId },
        select: {
          id: true,
          title: true,
          altText: true,
          url: true,
          thumbnailUrl: true,
          visibility: true,
        },
      });
      if (parent) push(parent, "DUPLICATE", 95);
    }

    const children = await prisma.mediaAsset.findMany({
      where: { duplicateOfId: asset.id },
      select: {
        id: true,
        title: true,
        altText: true,
        url: true,
        thumbnailUrl: true,
        visibility: true,
      },
      take: 8,
    });
    for (const row of children) push(row, "DUPLICATE", 90);

    if (asset.subjectTerms.length) {
      const sameSubject = await prisma.mediaAsset.findMany({
        where: {
          id: { not: asset.id },
          subjectTerms: { hasSome: asset.subjectTerms.slice(0, 6) },
          visibility: { not: "PRIVATE" },
        },
        select: {
          id: true,
          title: true,
          altText: true,
          url: true,
          thumbnailUrl: true,
          visibility: true,
        },
        take: 12,
        orderBy: { seoScore: "desc" },
      });
      for (const row of sameSubject) push(row, "SAME_PRODUCT", 70);
    }

    if (asset.roleId) {
      const sameRole = await prisma.mediaAsset.findMany({
        where: {
          id: { not: asset.id },
          roleId: asset.roleId,
          visibility: { not: "PRIVATE" },
        },
        select: {
          id: true,
          title: true,
          altText: true,
          url: true,
          thumbnailUrl: true,
          visibility: true,
        },
        take: 8,
        orderBy: { seoScore: "desc" },
      });
      for (const row of sameRole) push(row, "SAME_ROLE", 55);
    }

    const bundleLinks = await prisma.mediaBundleSlotAsset.findMany({
      where: { mediaAssetId: asset.id },
      select: { mediaBundleSlotId: true },
    });
    if (bundleLinks.length) {
      const slotIds = bundleLinks.map((row) => row.mediaBundleSlotId);
      const peers = await prisma.mediaBundleSlotAsset.findMany({
        where: {
          mediaBundleSlotId: { in: slotIds },
          mediaAssetId: { not: asset.id },
        },
        include: {
          mediaAsset: {
            select: {
              id: true,
              title: true,
              altText: true,
              url: true,
              thumbnailUrl: true,
              visibility: true,
            },
          },
        },
        take: 12,
      });
      for (const row of peers) push(row.mediaAsset, "SAME_BUNDLE", 65);
    }

    return [...hits.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const defaultSimilarityProvider = new DeterministicSimilarityProvider();
