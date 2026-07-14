import "server-only";

import { prisma } from "@/lib/prisma";
import { planMediaContentCoverage } from "@/features/media/services/media-coverage.service";
import { createMediaBundle } from "@/features/media/services/media-bundle.service";
import { mapSeoContentTypeToBundleType } from "@/features/content/seo/seo-media-mapping";
import { updateSeoTopic } from "@/features/content/services/seo-topic.service";

export async function checkTopicMediaCoverage(topicId: string) {
  const topic = await prisma.seoTopic.findUnique({
    where: { id: topicId },
    include: {
      keywords: true,
      cluster: { select: { name: true, targetAudience: true, businessGoals: true } },
    },
  });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");

  const bundleContentType = mapSeoContentTypeToBundleType(topic.contentType);
  const keywordTerms = topic.keywords.map((k) => k.keyword);

  const plan = await planMediaContentCoverage({
    contentType: bundleContentType,
    query: `${topic.title} ${topic.primaryKeyword}`,
    subjectTerms: keywordTerms.slice(0, 8),
    useCaseTerms: topic.targetAudience,
    industryTerms: topic.cluster.businessGoals,
  });

  await updateSeoTopic(topicId, {
    mediaPlanScore: plan.overallScore,
    mediaPlanStatus: plan.overallStatus,
  });

  return plan;
}

export async function createDraftBundleFromTopic(topicId: string) {
  const topic = await prisma.seoTopic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error("Không tìm thấy chủ đề SEO.");

  const contentType = mapSeoContentTypeToBundleType(topic.contentType);
  const bundle = await createMediaBundle({
    name: `Bundle: ${topic.title.slice(0, 80)}`,
    contentType,
    query: topic.primaryKeyword,
    description: `Tạo từ chủ đề SEO — ${topic.title}`,
    applyPreset: true,
  });

  await updateSeoTopic(topicId, { mediaBundleId: bundle.id });
  return bundle;
}

export async function linkTopicMediaBundle(topicId: string, mediaBundleId: string | null) {
  if (mediaBundleId) {
    const bundle = await prisma.mediaBundle.findUnique({ where: { id: mediaBundleId } });
    if (!bundle) throw new Error("Không tìm thấy bộ media.");
  }
  return updateSeoTopic(topicId, { mediaBundleId });
}

export async function getSeoDashboardSummary() {
  const now = new Date();
  const [
    activeStrategies,
    totalTopics,
    approvedTopics,
    briefReadyTopics,
    draftingTopics,
    reviewTopics,
    publishedTopics,
    overdueTopics,
    missingMediaTopics,
    noTargetUrlTopics,
  ] = await Promise.all([
    prisma.seoStrategy.count({ where: { status: "ACTIVE" } }),
    prisma.seoTopic.count(),
    prisma.seoTopic.count({ where: { status: "APPROVED" } }),
    prisma.seoTopic.count({ where: { status: "BRIEF_READY" } }),
    prisma.seoTopic.count({ where: { status: "DRAFTING" } }),
    prisma.seoTopic.count({ where: { status: "REVIEW" } }),
    prisma.seoTopic.count({ where: { status: "PUBLISHED" } }),
    prisma.seoTopic.count({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["PUBLISHED", "ARCHIVED", "REJECTED"] },
      },
    }),
    prisma.seoTopic.count({
      where: {
        OR: [{ mediaBundleId: null }, { mediaPlanStatus: { in: ["CRITICAL", "INSUFFICIENT"] } }],
        status: { notIn: ["PUBLISHED", "ARCHIVED"] },
      },
    }),
    prisma.seoTopic.count({
      where: { targetUrl: null, status: { notIn: ["PUBLISHED", "ARCHIVED"] } },
    }),
  ]);

  const priorityTopics = await prisma.seoTopic.findMany({
    where: { status: { notIn: ["PUBLISHED", "ARCHIVED"] }, priority: { in: ["HIGH", "CRITICAL"] } },
    orderBy: [{ priority: "desc" }, { businessValue: "desc" }],
    take: 10,
    include: { cluster: { select: { name: true, strategy: { select: { name: true } } } } },
  });

  const upcomingDue = await prisma.seoTopic.findMany({
    where: {
      dueDate: { gte: now },
      status: { notIn: ["PUBLISHED", "ARCHIVED", "REJECTED"] },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
    include: { cluster: { select: { name: true } } },
  });

  const clusterSummary = await prisma.seoTopicCluster.findMany({
    where: { isActive: true },
    include: {
      strategy: { select: { name: true } },
      topics: { select: { status: true, businessValue: true, mediaPlanStatus: true } },
    },
    take: 50,
  });

  const clusterCoverage = clusterSummary.map((cluster) => {
    const total = cluster.topics.length;
    const published = cluster.topics.filter((t) => t.status === "PUBLISHED").length;
    const inProgress = cluster.topics.filter((t) =>
      ["DRAFTING", "REVIEW", "BRIEF_READY", "APPROVED"].includes(t.status),
    ).length;
    const avgBusiness =
      total > 0
        ? Math.round(cluster.topics.reduce((s, t) => s + t.businessValue, 0) / total)
        : 0;
    const missingMedia = cluster.topics.filter(
      (t) => !t.mediaPlanStatus || ["CRITICAL", "INSUFFICIENT"].includes(t.mediaPlanStatus),
    ).length;
    return {
      id: cluster.id,
      name: cluster.name,
      strategyName: cluster.strategy.name,
      total,
      published,
      inProgress,
      missing: total - published - inProgress,
      avgBusinessValue: avgBusiness,
      missingMedia,
    };
  });

  return {
    counts: {
      activeStrategies,
      totalTopics,
      approvedTopics,
      briefReadyTopics,
      draftingTopics,
      reviewTopics,
      publishedTopics,
      overdueTopics,
      missingMediaTopics,
      noTargetUrlTopics,
    },
    priorityTopics,
    upcomingDue,
    clusterCoverage,
  };
}
