import "server-only";

import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { createSeoTopic } from "@/features/content/services/seo-topic.service";
import { createSeoStrategy, listSeoStrategies } from "@/features/content/services/seo-strategy.service";
import { createSeoCluster, listSeoClusters } from "@/features/content/services/seo-cluster.service";
import { addSeoKeywords } from "@/features/content/services/seo-keyword.service";
import { normalizeSeoKeyword } from "@/features/content/seo/seo-keyword-normalize";
import {
  CONTENT_LAUNCH_ARTICLE,
  CONTENT_LAUNCH_BRIEF_TEMPLATE,
  CONTENT_LAUNCH_FACT_POLICY,
  CONTENT_LAUNCH_POLO_BUNDLE_CODE,
  CONTENT_LAUNCH_QA_CHECKS,
  CONTENT_LAUNCH_QUESTION_KEYWORDS,
  CONTENT_LAUNCH_SECONDARY_KEYWORDS,
} from "@/features/content/launch/content-launch.constants";

export type SetupFirstArticleResult = {
  created: boolean;
  reused: boolean;
  topicId: string;
  topicTitle: string;
  topicStatus: string;
  topicHref: string;
  strategyId: string;
  strategyName: string;
  clusterId: string;
  clusterName: string;
  keywordsAdded: number;
  keywordsSkipped: number;
  matchingExistingBlogs: Array<{
    id: string;
    title: string;
    status: string;
    slug: string | null;
  }>;
  links: {
    topic: string;
    strategy: string;
    cluster: string;
    mediaBundles: string;
  };
  notes: string[];
};

async function resolveLaunchStrategyAndCluster(): Promise<{
  strategyId: string;
  strategyName: string;
  clusterId: string;
  clusterName: string;
  createdStrategy: boolean;
  createdCluster: boolean;
}> {
  const strategies = await listSeoStrategies({});
  let strategy =
    strategies.find((s) =>
      s.name.toLowerCase().includes(CONTENT_LAUNCH_ARTICLE.strategyNameHint.toLowerCase()),
    ) ??
    strategies.find((s) => s.status === "ACTIVE") ??
    strategies[0] ??
    null;

  let createdStrategy = false;
  if (!strategy) {
    strategy = await createSeoStrategy({
      name: CONTENT_LAUNCH_ARTICLE.strategyNameHint,
      description: "Chiến lược kích hoạt Content Revenue Launch — không auto-publish.",
      status: "ACTIVE",
    });
    createdStrategy = true;
  }

  const clusters = await listSeoClusters({ strategyId: strategy.id, activeOnly: true });
  let cluster =
    clusters.find((c) => c.code === CONTENT_LAUNCH_ARTICLE.clusterCode) ??
    clusters.find((c) =>
      c.name.toLowerCase().includes("polo") && c.name.toLowerCase().includes("đồng phục"),
    ) ??
    clusters.find((c) => c.name.toLowerCase().includes("polo")) ??
    null;

  let createdCluster = false;
  if (!cluster) {
    cluster = await createSeoCluster({
      strategyId: strategy.id,
      name: CONTENT_LAUNCH_ARTICLE.clusterNameHint,
      code: CONTENT_LAUNCH_ARTICLE.clusterCode,
      slug: toSlug(CONTENT_LAUNCH_ARTICLE.clusterNameHint),
      description: "Cụm chủ đề launch: áo polo đồng phục công ty.",
      pillarTopic: CONTENT_LAUNCH_ARTICLE.title,
      targetAudience: ["doanh nghiệp", "phòng hành chính", "brand manager"],
      businessGoals: ["SEO content revenue", "lead generation"],
      isActive: true,
    });
    createdCluster = true;
  }

  return {
    strategyId: strategy.id,
    strategyName: strategy.name,
    clusterId: cluster.id,
    clusterName: cluster.name,
    createdStrategy,
    createdCluster,
  };
}

async function findExistingLaunchTopic(primaryKeyword: string) {
  const normalized = normalizeSeoKeyword(primaryKeyword);
  const topics = await prisma.seoTopic.findMany({
    where: {
      OR: [
        { primaryKeyword: { equals: primaryKeyword, mode: "insensitive" } },
        { title: { equals: CONTENT_LAUNCH_ARTICLE.title, mode: "insensitive" } },
        { slug: toSlug(CONTENT_LAUNCH_ARTICLE.title) },
      ],
    },
    include: {
      cluster: { include: { strategy: { select: { id: true, name: true } } } },
    },
    take: 10,
  });

  const exact = topics.find(
    (t) => normalizeSeoKeyword(t.primaryKeyword) === normalized,
  );
  return exact ?? topics[0] ?? null;
}

async function findMatchingBlogs() {
  const slug = toSlug(CONTENT_LAUNCH_ARTICLE.title);
  const blogs = await prisma.blogPost.findMany({
    where: {
      OR: [
        { title: { contains: "polo đồng phục", mode: "insensitive" } },
        { title: { contains: CONTENT_LAUNCH_ARTICLE.title, mode: "insensitive" } },
        { slug },
        { slug: { contains: "polo-dong-phuc", mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, status: true, slug: true },
    take: 10,
  });
  return blogs;
}

export async function setupFirstLaunchArticle(): Promise<SetupFirstArticleResult> {
  const notes: string[] = [];
  const { strategyId, strategyName, clusterId, clusterName, createdStrategy, createdCluster } =
    await resolveLaunchStrategyAndCluster();

  if (createdStrategy) notes.push(`Đã tạo Strategy: ${strategyName}`);
  if (createdCluster) notes.push(`Đã tạo Cluster: ${clusterName}`);

  const existing = await findExistingLaunchTopic(CONTENT_LAUNCH_ARTICLE.primaryKeyword);
  let topicId: string;
  let topicTitle: string;
  let topicStatus: string;
  let created = false;
  let reused = false;

  if (existing) {
    reused = true;
    topicId = existing.id;
    topicTitle = existing.title;
    topicStatus = existing.status;
    notes.push("Tái sử dụng Topic đã tồn tại — không tạo trùng.");
  } else {
    const poloBundle = await prisma.mediaBundle.findUnique({
      where: { code: CONTENT_LAUNCH_POLO_BUNDLE_CODE },
      select: { id: true },
    });

    const { topic } = await createSeoTopic({
      clusterId,
      title: CONTENT_LAUNCH_ARTICLE.title,
      primaryKeyword: CONTENT_LAUNCH_ARTICLE.primaryKeyword,
      searchIntent: CONTENT_LAUNCH_ARTICLE.searchIntent,
      contentType: CONTENT_LAUNCH_ARTICLE.contentType,
      funnelStage: CONTENT_LAUNCH_ARTICLE.funnelStage,
      status: CONTENT_LAUNCH_ARTICLE.status,
      description: CONTENT_LAUNCH_ARTICLE.description,
      slug: toSlug(CONTENT_LAUNCH_ARTICLE.title),
      allowDuplicate: false,
    });

    if (poloBundle) {
      await prisma.seoTopic.update({
        where: { id: topic.id },
        data: { mediaBundleId: poloBundle.id },
      });
      notes.push(`Đã liên kết Media Bundle ${CONTENT_LAUNCH_POLO_BUNDLE_CODE}.`);
    }

    topicId = topic.id;
    topicTitle = topic.title;
    topicStatus = topic.status;
    created = true;
    notes.push("Đã tạo Topic IDEA — chưa approve, chưa tạo Blog.");
  }

  const keywordResult = await addSeoKeywords({
    topicId,
    keywords: [
      {
        keyword: CONTENT_LAUNCH_ARTICLE.primaryKeyword,
        keywordType: "PRIMARY",
        searchIntent: "COMMERCIAL",
        source: "content-launch-seed",
        priority: 100,
        notes: "Editorial suggestion — no fabricated volume/KD/CPC",
      },
      ...CONTENT_LAUNCH_SECONDARY_KEYWORDS.map((keyword, index) => ({
        keyword,
        keywordType: "SECONDARY" as const,
        searchIntent: "COMMERCIAL" as const,
        source: "content-launch-seed",
        priority: 80 - index,
        notes: "Editorial suggestion only",
      })),
      ...CONTENT_LAUNCH_QUESTION_KEYWORDS.map((keyword, index) => ({
        keyword,
        keywordType: "QUESTION" as const,
        searchIntent: "INFORMATIONAL" as const,
        source: "content-launch-seed",
        priority: 50 - index,
        notes: "Editorial question suggestion only",
      })),
    ],
  });

  const matchingExistingBlogs = await findMatchingBlogs();
  if (matchingExistingBlogs.length) {
    notes.push(
      `Phát hiện ${matchingExistingBlogs.length} Blog liên quan — không tạo Blog mới; dùng update flow khi handoff.`,
    );
  }

  notes.push("Không auto-approve Topic/Brief/sections/Blog.");
  notes.push("Không auto-publish.");

  return {
    created,
    reused,
    topicId,
    topicTitle,
    topicStatus,
    topicHref: `/admin/content/seo-topics/${topicId}`,
    strategyId,
    strategyName,
    clusterId,
    clusterName,
    keywordsAdded: keywordResult.created,
    keywordsSkipped: keywordResult.skipped,
    matchingExistingBlogs,
    links: {
      topic: `/admin/content/seo-topics/${topicId}`,
      strategy: `/admin/content/seo-strategies/${strategyId}`,
      cluster: `/admin/content/seo-strategies/${strategyId}`,
      mediaBundles: "/admin/content/media-bundles",
    },
    notes,
  };
}

export async function getFirstLaunchArticleSnapshot() {
  const existing = await findExistingLaunchTopic(CONTENT_LAUNCH_ARTICLE.primaryKeyword);
  const matchingExistingBlogs = await findMatchingBlogs();

  let briefId: string | null = null;
  let briefApproved = false;
  let contextBuildId: string | null = null;
  let contextStatus: string | null = null;
  let writingPlanId: string | null = null;
  let writingDraftId: string | null = null;
  let reviewSessionId: string | null = null;
  let reviewStatus: string | null = null;
  let handoffId: string | null = null;
  let blogPostId: string | null = null;
  let blogStatus: string | null = null;

  if (existing) {
    const brief = await prisma.seoContentBrief.findUnique({
      where: { topicId: existing.id },
      select: { id: true, approvedAt: true },
    });
    briefId = brief?.id ?? null;
    briefApproved = Boolean(brief?.approvedAt);

    const context = await prisma.contentContextBuild.findFirst({
      where: { topicId: existing.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    contextBuildId = context?.id ?? null;
    contextStatus = context?.status ?? null;

    const plan = await prisma.writingPlanRecord.findFirst({
      where: { topicId: existing.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    writingPlanId = plan?.id ?? null;

    const draft = writingPlanId
      ? await prisma.writingDraftRecord.findFirst({
          where: { writingPlanId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;
    writingDraftId = draft?.id ?? null;

    if (writingDraftId) {
      const review = await prisma.contentReviewSession.findFirst({
        where: { writingDraftId },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });
      reviewSessionId = review?.id ?? null;
      reviewStatus = review?.status ?? null;

      const handoff = await prisma.contentHandoffRecord.findFirst({
        where: { writingDraftId, targetType: "BLOG_POST" },
        orderBy: { createdAt: "desc" },
        select: { id: true, targetEntityId: true, status: true },
      });
      handoffId = handoff?.id ?? null;
      if (handoff?.targetEntityId) {
        const blog = await prisma.blogPost.findUnique({
          where: { id: handoff.targetEntityId },
          select: { id: true, status: true },
        });
        blogPostId = blog?.id ?? null;
        blogStatus = blog?.status ?? null;
      }
    }
  }

  return {
    topicId: existing?.id ?? null,
    topicTitle: existing?.title ?? null,
    topicStatus: existing?.status ?? null,
    topicHref: existing ? `/admin/content/seo-topics/${existing.id}` : null,
    strategyId: existing?.cluster.strategy.id ?? null,
    strategyName: existing?.cluster.strategy.name ?? null,
    clusterId: existing?.clusterId ?? null,
    clusterName: existing?.cluster.name ?? null,
    briefId,
    briefApproved,
    contextBuildId,
    contextStatus,
    writingPlanId,
    writingDraftId,
    reviewSessionId,
    reviewStatus,
    handoffId,
    blogPostId,
    blogStatus,
    blogHref: blogPostId ? `/admin/blog/${blogPostId}` : null,
    matchingExistingBlogs,
    keywordSuggestions: {
      primary: CONTENT_LAUNCH_ARTICLE.primaryKeyword,
      secondary: CONTENT_LAUNCH_SECONDARY_KEYWORDS,
      questions: CONTENT_LAUNCH_QUESTION_KEYWORDS,
    },
    briefTemplate: CONTENT_LAUNCH_BRIEF_TEMPLATE,
    factPolicy: CONTENT_LAUNCH_FACT_POLICY,
    qaPresetChecks: CONTENT_LAUNCH_QA_CHECKS,
  };
}
