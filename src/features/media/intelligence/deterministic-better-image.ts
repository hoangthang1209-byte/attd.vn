import { prisma } from "@/lib/prisma";
import type { BetterImageProvider } from "@/features/media/intelligence/provider-interfaces";
import type { BetterImageCandidate } from "@/features/media/intelligence/intelligence.types";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";
import { defaultSimilarityProvider } from "@/features/media/intelligence/deterministic-similarity";

/**
 * Surfaces a better alternative when a newer/higher-SEO peer exists.
 * Never replaces automatically.
 */
export class DeterministicBetterImageProvider implements BetterImageProvider {
  async findBetter(input: {
    mediaAssetId: string;
    context?: { sectionHeading?: string; intent?: string };
  }): Promise<BetterImageCandidate | null> {
    void input.context;
    const current = await prisma.mediaAsset.findUnique({
      where: { id: input.mediaAssetId },
      select: {
        id: true,
        title: true,
        seoScore: true,
        width: true,
        height: true,
        altText: true,
        createdAt: true,
        visibility: true,
        subjectTerms: true,
        roleId: true,
      },
    });
    if (!current || current.visibility === "PRIVATE") return null;

    const similar = await defaultSimilarityProvider.findSimilar({
      mediaAssetId: current.id,
      limit: 16,
    });
    if (!similar.length) return null;

    const peerIds = similar.map((hit) => hit.mediaAssetId);
    const peers = await prisma.mediaAsset.findMany({
      where: {
        id: { in: peerIds },
        visibility: "PUBLIC",
        aiProcessingStatus: { notIn: ["QUEUED", "PROCESSING"] },
      },
      select: {
        id: true,
        title: true,
        url: true,
        thumbnailUrl: true,
        seoScore: true,
        width: true,
        height: true,
        altText: true,
        createdAt: true,
      },
    });

    const currentScore = composite(current);
    let best: BetterImageCandidate | null = null;

    for (const peer of peers) {
      const score = composite(peer);
      if (score < currentScore + 8) continue;
      const newer = peer.createdAt > current.createdAt;
      const reasonParts: string[] = [];
      if (peer.seoScore > current.seoScore) reasonParts.push("SEO cao hơn");
      if ((peer.width ?? 0) > (current.width ?? 0)) reasonParts.push("độ phân giải tốt hơn");
      if (peer.altText && !current.altText) reasonParts.push("đã có alt");
      if (newer) reasonParts.push("mới hơn");
      if (!reasonParts.length) reasonParts.push("điểm tổng hợp cao hơn");

      const url = getPublicMediaUrl(peer.url);
      if (!url) continue;

      const candidate: BetterImageCandidate = {
        mediaAssetId: peer.id,
        title: peer.title,
        url,
        thumbnailUrl: peer.thumbnailUrl ? getPublicMediaUrl(peer.thumbnailUrl) : null,
        score,
        currentScore,
        reason: reasonParts.join(", "),
      };
      if (!best || candidate.score > best.score) best = candidate;
    }

    return best;
  }
}

function composite(asset: {
  seoScore: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
}): number {
  const minDim = Math.min(asset.width ?? 0, asset.height ?? 0);
  const res = minDim >= 1600 ? 20 : minDim >= 1200 ? 14 : minDim >= 800 ? 8 : 2;
  const alt = asset.altText?.trim() ? 10 : 0;
  return asset.seoScore + res + alt;
}

export const defaultBetterImageProvider = new DeterministicBetterImageProvider();
