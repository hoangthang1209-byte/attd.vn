import { prisma } from "@/lib/prisma";
import { getSeoTopicById } from "@/features/content/services/seo-topic.service";
import type {
  AiRetrievedFact,
  AiRetrievalOmittedBucket,
  AiRetrievalPolicy,
  AiRetrievalRequest,
} from "@/features/ai-retrieval/ai-retrieval-types";
import { getAuthorityRank } from "@/features/ai-retrieval/ai-authority";

type SeoKeywordLite = {
  keyword?: string;
  keywordType?: string;
  type?: string;
  searchVolume?: number | null;
  keywordDifficulty?: unknown;
  difficulty?: unknown;
  cpc?: unknown;
};

type SeoBriefLite = {
  id: string;
  workingTitle?: string | null;
  valueProposition?: string | null;
  audienceNotes?: string | null;
  outline?: unknown;
  ctaText?: string | null;
  approvedAt?: string | Date | null;
  approvedBy?: string | null;
  entities?: string[];
  requiredSections?: string[];
};

function asBrief(value: unknown): SeoBriefLite | null {
  if (!value || typeof value !== "object") return null;
  const brief = value as SeoBriefLite;
  if (!brief.id) return null;
  return brief;
}

function asKeywords(value: unknown[]): SeoKeywordLite[] {
  return value.filter((item): item is SeoKeywordLite => item != null && typeof item === "object");
}

/**
 * SEO adapter — never fabricates search volume / KD / CPC.
 * Missing metrics remain absent (null) and are clearly marked.
 */
export async function retrieveSeoFacts(
  request: AiRetrievalRequest,
  policy: AiRetrievalPolicy
): Promise<{ facts: AiRetrievedFact[]; omitted: AiRetrievalOmittedBucket[]; warnings: string[] }> {
  const omittedMap = new Map<string, number>();
  const bump = (reason: string) => omittedMap.set(reason, (omittedMap.get(reason) ?? 0) + 1);
  const warnings: string[] = [];
  const facts: AiRetrievedFact[] = [];
  const limit = Math.min(request.maxItems ?? policy.maxItems, 15);
  const q = request.query.trim();

  const includeTopic =
    !request.sourceTypes ||
    request.sourceTypes.includes("SEO_TOPIC") ||
    (request.seoTopicIds?.length ?? 0) > 0;
  const includeBrief =
    !request.sourceTypes || request.sourceTypes.includes("SEO_BRIEF");

  if (!includeTopic) {
    return { facts, omitted: [], warnings };
  }

  const topicIds = [...(request.seoTopicIds ?? [])];

  if (topicIds.length === 0 && q) {
    const matched = await prisma.seoTopic.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { primaryKeyword: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true },
      take: limit,
    });
    topicIds.push(...matched.map((t) => t.id));
  }

  for (const topicId of [...new Set(topicIds)].slice(0, limit)) {
    const topic = await getSeoTopicById(topicId);
    if (!topic) {
      bump("seo_topic_not_found");
      continue;
    }

    const keywords = asKeywords(topic.keywords);
    const keywordMetrics = keywords.map((kw) => {
      const searchVolume = kw.searchVolume ?? null;
      const difficulty = kw.keywordDifficulty ?? kw.difficulty ?? null;
      const cpc = kw.cpc ?? null;
      return {
        keyword: kw.keyword ?? "",
        type: kw.keywordType ?? kw.type ?? null,
        searchVolume,
        keywordDifficulty: difficulty,
        cpc,
        metricsPresent: searchVolume != null || difficulty != null || cpc != null,
      };
    });

    const missingMetrics = keywordMetrics.filter((k) => !k.metricsPresent).length;
    if (missingMetrics > 0) {
      warnings.push(`seo_metrics_absent:${topic.id}:${missingMetrics}`);
    }

    facts.push({
      id: `seo-topic-${topic.id}`,
      sourceType: "SEO_TOPIC",
      sourceId: topic.id,
      title: topic.title,
      summary: topic.description,
      content: null,
      structuredData: {
        primaryKeyword: topic.primaryKeyword,
        searchIntent: topic.searchIntent,
        contentType: topic.contentType,
        funnelStage: topic.funnelStage,
        priority: topic.priority,
        status: topic.status,
        strategyName: topic.strategyName,
        clusterName: topic.clusterName,
        businessValue: topic.businessValue,
        relevanceScore: topic.relevanceScore,
        opportunityScore: topic.opportunityScore,
        confidenceScore: topic.confidenceScore,
        targetAudience: topic.targetAudience,
        mediaBundleId: topic.mediaBundleId,
        mediaBundleName: topic.mediaBundleName,
        keywords: keywordMetrics,
        fabricatedMetrics: false,
      },
      visibility: "INTERNAL",
      publicOutputAllowed: false,
      claimStatus: "FACT",
      confidence: topic.confidenceScore != null ? topic.confidenceScore / 100 : 0.7,
      sourceName: "SEO Topic",
      adminRoute: `/admin/content/seo-topics/${topic.id}`,
      authorityRank: getAuthorityRank("SEO_TOPIC", "general"),
      authorityReason: "SEO planning master",
      approvedAt: null,
      stale: false,
      matchedOn: request.seoTopicIds?.includes(topic.id) ? ["entity_scope"] : ["seo_search"],
      relevanceScore: request.seoTopicIds?.includes(topic.id) ? 28 : 14,
      warnings: missingMetrics > 0 ? ["search_volume_kd_cpc_absent_where_null"] : [],
      relatedMediaBundleIds: topic.mediaBundleId ? [topic.mediaBundleId] : [],
      relatedEntityIds: [topic.strategyId, topic.clusterId],
    });

    const brief = asBrief(topic.brief);
    if (includeBrief && brief) {
      const outlineText = Array.isArray(brief.outline)
        ? brief.outline.map(String).join("\n")
        : typeof brief.outline === "string"
          ? brief.outline
          : "";
      const approvedAt =
        brief.approvedAt instanceof Date
          ? brief.approvedAt.toISOString()
          : typeof brief.approvedAt === "string"
            ? brief.approvedAt
            : null;

      facts.push({
        id: `seo-brief-${brief.id}`,
        sourceType: "SEO_BRIEF",
        sourceId: brief.id,
        title: brief.workingTitle || `Brief: ${topic.title}`,
        summary: brief.valueProposition?.slice(0, 200) ?? null,
        content: [brief.valueProposition, brief.audienceNotes, outlineText, brief.ctaText]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 1500),
        structuredData: {
          topicId: topic.id,
          approvedAt,
          approvedBy: brief.approvedBy ?? null,
          entities: brief.entities ?? [],
          requiredSections: brief.requiredSections ?? [],
          ctaText: brief.ctaText ?? null,
        },
        visibility: "INTERNAL",
        publicOutputAllowed: false,
        claimStatus: "FACT",
        confidence: 0.8,
        sourceName: "SEO Content Brief",
        adminRoute: `/admin/content/seo-topics/${topic.id}`,
        authorityRank: getAuthorityRank("SEO_BRIEF", "general"),
        authorityReason: "SEO brief",
        approvedAt,
        stale: false,
        matchedOn: ["seo_brief"],
        relevanceScore: 18,
        warnings: [],
        relatedEntityIds: [topic.id],
        relatedMediaBundleIds: topic.mediaBundleId ? [topic.mediaBundleId] : [],
      });
    }
  }

  return {
    facts,
    omitted: [...omittedMap.entries()].map(([reason, count]) => ({ reason, count })),
    warnings: [...new Set(warnings)],
  };
}
