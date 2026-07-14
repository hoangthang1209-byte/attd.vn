import "server-only";

import type { SeoInternalLinkStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSeoKeyword } from "@/features/content/seo/seo-keyword-normalize";

function keywordOverlapScore(a: string, b: string): number {
  const ta = new Set(normalizeSeoKeyword(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeSeoKeyword(b).split(/\s+/).filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared;
}

export async function suggestInternalLinksForTopic(topicId: string) {
  const source = await prisma.seoTopic.findUnique({
    where: { id: topicId },
    include: {
      cluster: { select: { id: true, parentId: true, strategyId: true } },
      keywords: { select: { keyword: true, keywordType: true } },
    },
  });
  if (!source) throw new Error("Không tìm thấy chủ đề SEO.");

  const candidates = await prisma.seoTopic.findMany({
    where: {
      id: { not: topicId },
      cluster: { strategyId: source.cluster.strategyId },
      status: { not: "ARCHIVED" },
    },
    include: {
      cluster: { select: { id: true, parentId: true } },
      keywords: { select: { keyword: true, keywordType: true } },
    },
    take: 200,
  });

  const suggestions: Array<{
    targetTopicId: string;
    targetTitle: string;
    relevanceScore: number;
    anchorText: string;
    context: string;
  }> = [];

  for (const target of candidates) {
    let score = 0;
    const reasons: string[] = [];

    if (target.clusterId === source.clusterId) {
      score += 10;
      reasons.push("same_cluster");
    } else if (
      target.cluster.parentId === source.cluster.id ||
      source.cluster.parentId === target.cluster.id ||
      (source.cluster.parentId &&
        target.cluster.parentId &&
        source.cluster.parentId === target.cluster.parentId)
    ) {
      score += 7;
      reasons.push("related_cluster");
    }

    const primaryOverlap = keywordOverlapScore(source.primaryKeyword, target.primaryKeyword);
    if (primaryOverlap >= 2) {
      score += 8;
      reasons.push("primary_keyword_overlap");
    } else if (primaryOverlap === 1) {
      score += 4;
      reasons.push("supporting_keyword_overlap");
    }

    for (const sk of source.keywords) {
      for (const tk of target.keywords) {
        if (normalizeSeoKeyword(sk.keyword) === normalizeSeoKeyword(tk.keyword)) {
          score += sk.keywordType === "PRIMARY" || tk.keywordType === "PRIMARY" ? 4 : 2;
          reasons.push("shared_keyword");
        }
      }
    }

    if (target.status === "PUBLISHED") {
      score += 3;
      reasons.push("published_target");
    }

    if (source.funnelStage === "AWARENESS" && target.funnelStage === "CONSIDERATION") {
      score += 2;
      reasons.push("funnel_complement");
    }

    if (score < 8) continue;

    suggestions.push({
      targetTopicId: target.id,
      targetTitle: target.title,
      relevanceScore: Math.min(100, score),
      anchorText: target.primaryKeyword,
      context: reasons.join(", "),
    });
  }

  suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

  let created = 0;
  for (const s of suggestions.slice(0, 15)) {
    try {
      await prisma.seoInternalLinkOpportunity.upsert({
        where: {
          sourceTopicId_targetTopicId: {
            sourceTopicId: topicId,
            targetTopicId: s.targetTopicId,
          },
        },
        create: {
          sourceTopicId: topicId,
          targetTopicId: s.targetTopicId,
          anchorText: s.anchorText,
          context: s.context,
          relevanceScore: s.relevanceScore,
          status: "SUGGESTED",
        },
        update: {
          relevanceScore: s.relevanceScore,
          context: s.context,
        },
      });
      created += 1;
    } catch {
      // skip duplicates
    }
  }

  return prisma.seoInternalLinkOpportunity.findMany({
    where: { sourceTopicId: topicId },
    include: { targetTopic: { select: { id: true, title: true, status: true, targetUrl: true } } },
    orderBy: { relevanceScore: "desc" },
  });
}

export async function updateInternalLinkOpportunity(
  id: string,
  input: {
    status?: SeoInternalLinkStatus;
    anchorText?: string | null;
    context?: string | null;
  },
) {
  return prisma.seoInternalLinkOpportunity.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.anchorText !== undefined ? { anchorText: input.anchorText } : {}),
      ...(input.context !== undefined ? { context: input.context } : {}),
    },
  });
}

export async function listInternalLinksForTopic(topicId: string) {
  const [from, to] = await Promise.all([
    prisma.seoInternalLinkOpportunity.findMany({
      where: { sourceTopicId: topicId },
      include: { targetTopic: { select: { id: true, title: true, status: true, targetUrl: true } } },
      orderBy: { relevanceScore: "desc" },
    }),
    prisma.seoInternalLinkOpportunity.findMany({
      where: { targetTopicId: topicId },
      include: { sourceTopic: { select: { id: true, title: true, status: true, targetUrl: true } } },
      orderBy: { relevanceScore: "desc" },
    }),
  ]);
  return { from, to };
}
