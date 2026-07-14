import {
  getMediaBundleById,
  listMediaBundles,
} from "@/features/media/services/media-bundle.service";
import { discoverMediaAssets } from "@/features/media/services/media-discovery.service";
import type {
  AiRetrievedFact,
  AiRetrievalOmittedBucket,
  AiRetrievalPolicy,
  AiRetrievalRequest,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAuthorityRank } from "@/features/ai-retrieval/ai-authority";
import { resolveEffectiveMaxVisibility } from "@/features/ai-retrieval/ai-retrieval-policy";

export async function retrieveMediaFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];
  const maxVisibility = resolveEffectiveMaxVisibility(policy, request.purpose);
  const publicOnly = maxVisibility === "PUBLIC" || request.purpose === "PUBLIC_OUTPUT";
  const facts: AiRetrievedFact[] = [];
  const limit = Math.min(request.maxItems ?? policy.maxItems, 15);

  const includeBundles =
    !request.sourceTypes ||
    request.sourceTypes.includes("MEDIA_BUNDLE") ||
    (request.mediaBundleIds?.length ?? 0) > 0;
  const includeAssets =
    (!request.sourceTypes || request.sourceTypes.includes("MEDIA_ASSET")) &&
    request.includeMedia !== false;

  if (includeBundles) {
    const list = await listMediaBundles({
      search: request.query || undefined,
      isActive: true,
      limit,
    });

    const bundleIds = [
      ...new Set([
        ...(request.mediaBundleIds ?? []),
        ...list.map((b) => b.id),
      ]),
    ].slice(0, limit);

    for (const bundleId of bundleIds) {
      const bundle = await getMediaBundleById(bundleId);
      if (!bundle) {
        bump("media_bundle_not_found");
        continue;
      }

      const privateAssets = bundle.slots.some((slot) =>
        slot.assets.some((a) => a.visibility !== "PUBLIC")
      );
      if (publicOnly && privateAssets) {
        bump("media_bundle_has_private_assets");
      }

      facts.push({
        id: `bundle-${bundle.id}`,
        sourceType: "MEDIA_BUNDLE",
        sourceId: bundle.id,
        title: bundle.name,
        summary: bundle.description,
        content: null,
        structuredData: {
          code: bundle.code,
          contentType: bundle.contentType,
          status: bundle.status,
          health: bundle.health.status,
          slotCount: bundle.slots.length,
          slotNames: bundle.slots.map((s) => s.label || s.slotType),
        },
        visibility: publicOnly ? "PUBLIC" : "INTERNAL",
        publicOutputAllowed: !(publicOnly && privateAssets),
        claimStatus: "FACT",
        confidence: 0.8,
        sourceName: "Media Bundle",
        adminRoute: `/admin/content/media-bundles/${bundle.id}`,
        authoritativeDomain: "general",
        authorityRank: getAuthorityRank("MEDIA_BUNDLE", "general"),
        authorityReason: "Explicit Media Bundle",
        approvedAt: null,
        stale: false,
        matchedOn: request.mediaBundleIds?.includes(bundle.id)
          ? ["entity_scope"]
          : ["bundle_search"],
        relevanceScore: request.mediaBundleIds?.includes(bundle.id) ? 30 : 12,
        warnings: privateAssets && publicOnly ? ["bundle_contains_non_public_assets"] : [],
        relatedMediaBundleIds: [bundle.id],
        relatedMediaAssetIds: bundle.slots.flatMap((s) => s.assets.map((a) => a.id)),
      });
    }
  }

  if (includeAssets && request.query.trim()) {
    const discovery = await discoverMediaAssets({
      query: request.query,
      visibility: "PUBLIC",
      limit: Math.min(10, limit),
    });

    for (const result of discovery) {
      const asset = result.asset;
      if (publicOnly && asset.visibility !== "PUBLIC") {
        bump("private_media_asset_excluded");
        continue;
      }

      facts.push({
        id: `media-${asset.id}`,
        sourceType: "MEDIA_ASSET",
        sourceId: asset.id,
        title: asset.title ?? asset.altText ?? "Media asset",
        summary: asset.altText ?? null,
        content: null,
        structuredData: {
          url: asset.url ?? null,
          thumbnailUrl: asset.thumbnailUrl ?? null,
          seoScore: asset.seoScore ?? null,
          seoReadinessStatus: asset.seoReadinessStatus ?? null,
          contentSuitabilities: asset.contentSuitabilities ?? [],
          subjectTerms: asset.subjectTerms ?? [],
          library: asset.library?.code ?? null,
          role: asset.role?.code ?? null,
        },
        visibility: "PUBLIC",
        publicOutputAllowed: true,
        claimStatus: "FACT",
        confidence: 0.75,
        sourceName: "Media Library",
        adminRoute: `/admin/media?asset=${asset.id}`,
        authorityRank: getAuthorityRank("MEDIA_ASSET", "general"),
        authorityReason: "DAM discovery (PUBLIC only)",
        stale: false,
        matchedOn: result.matchedOn,
        relevanceScore: result.score,
        warnings: [],
        relatedMediaAssetIds: [asset.id],
      });
    }
  }

  void policy;
  return {
    facts,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings,
  };
}
