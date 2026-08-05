import "server-only";

import { prisma } from "@/lib/prisma";
import { listContentReviews } from "@/features/content/services/content-review.service";
import { listPublishingQueue } from "@/features/content/services/content-publishing.service";
import { SEO_TOPIC_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import {
  OPERATIONS_PIPELINE_COLUMNS,
  type ContentOperationsCommandCenter,
  type OperationsTopicInput,
  type OpsTopicCard,
  type PublishQueueItemLike,
  type ReviewQueueItemLike,
} from "@/features/content/operations/content-operations.types";
import {
  aggregateByCampaign,
  aggregateByOwner,
  buildClusterTree,
  buildContentHealthMetrics,
  buildKnowledgeCoverageSummary,
  buildMediaCoverageSummary,
  buildOperationsPipelineSummary,
  buildPublishQueueSummary,
  buildRefreshQueue,
  buildReviewQueueSummary,
  buildSeoOpsSummary,
  groupOperationsActivity,
  groupTopicsByOperationsPipeline,
} from "@/features/content/operations/content-operations.mapping";

const TOPIC_CAP = 800;
const ACTIVITY_SAMPLE = 30;

type TopicRow = Awaited<ReturnType<typeof fetchTopicRows>>[number];

function fetchTopicRows(limit: number) {
  return prisma.seoTopic.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      primaryKeyword: true,
      status: true,
      priority: true,
      assignedTo: true,
      dueDate: true,
      publishedAt: true,
      updatedAt: true,
      targetUrl: true,
      existingUrl: true,
      mediaBundleId: true,
      mediaPlanScore: true,
      mediaPlanStatus: true,
      cluster: {
        select: {
          id: true,
          name: true,
          strategyId: true,
          strategy: { select: { id: true, name: true } },
        },
      },
      brief: {
        select: {
          approvedAt: true,
          ctaText: true,
          ctaType: true,
          metaTitle: true,
          metaDescription: true,
          outline: true,
          questions: true,
          wordCountMax: true,
        },
      },
    },
  });
}

/**
 * Cheap, bounded QA signal join: only the DRAFTING slice of the loaded topics
 * is looked up, and only the latest Writing Draft per plan is inspected.
 * Returns null status when no draft exists yet — never inferred.
 */
async function loadQaFailedByTopicId(topicIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (topicIds.length === 0) return result;

  const plans = await prisma.writingPlanRecord.findMany({
    where: { topicId: { in: topicIds } },
    select: { id: true, topicId: true },
  });
  if (plans.length === 0) return result;

  const drafts = await prisma.writingDraftRecord.findMany({
    where: { writingPlanId: { in: plans.map((p) => p.id) } },
    orderBy: [{ writingPlanId: "asc" }, { version: "desc" }],
    select: { writingPlanId: true, status: true },
  });

  const latestStatusByPlan = new Map<string, string>();
  for (const draft of drafts) {
    if (!latestStatusByPlan.has(draft.writingPlanId)) {
      latestStatusByPlan.set(draft.writingPlanId, draft.status);
    }
  }

  for (const plan of plans) {
    const status = latestStatusByPlan.get(plan.id);
    if (status) result.set(plan.topicId, status === "QA_FAILED");
  }
  return result;
}

function toJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function mapTopicRow(row: TopicRow, qaFailedByTopicId: Map<string, boolean>): OperationsTopicInput {
  return {
    id: row.id,
    title: row.title,
    primaryKeyword: row.primaryKeyword,
    slug: row.slug ?? null,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assignedTo,
    dueDate: row.dueDate?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    targetUrl: row.targetUrl,
    existingUrl: row.existingUrl,
    mediaBundleId: row.mediaBundleId,
    mediaPlanScore: row.mediaPlanScore,
    mediaPlanStatus: row.mediaPlanStatus,
    clusterId: row.cluster.id,
    clusterName: row.cluster.name,
    strategyId: row.cluster.strategyId,
    strategyName: row.cluster.strategy.name,
    briefApprovedAt: row.brief?.approvedAt?.toISOString() ?? null,
    ctaText: row.brief?.ctaText ?? null,
    ctaType: row.brief?.ctaType ?? null,
    metaTitle: row.brief?.metaTitle ?? null,
    metaDescription: row.brief?.metaDescription ?? null,
    outlineCount: toJsonArray(row.brief?.outline).length,
    questionsCount: toJsonArray(row.brief?.questions).length,
    wordCountMax: row.brief?.wordCountMax ?? null,
    qaFailed: row.status === "DRAFTING" ? qaFailedByTopicId.get(row.id) ?? null : null,
  };
}

async function loadReviewQueue(): Promise<ReviewQueueItemLike[]> {
  const rows = await listContentReviews({ take: 50 });
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    topicId: row.topicId,
    topicTitle: row.topicTitle,
    blockingIssues: row.blockingIssues,
    assignedReviewerId: row.assignedReviewerId,
    updatedAt: row.updatedAt.toISOString(),
    readyForHandoff: row.readyForHandoff,
  }));
}

async function loadPublishQueue(): Promise<{ ready: PublishQueueItemLike[]; scheduled: PublishQueueItemLike[] }> {
  const [ready, scheduled] = await Promise.all([
    listPublishingQueue({ take: 30 }),
    listPublishingQueue({ kind: "scheduled", take: 30 }),
  ]);
  const toItem = (row: { id: string; title: string; slug: string; status: string; updatedAt: Date; scheduledAt?: Date | null }): PublishQueueItemLike => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
  return {
    ready: (ready as Array<Parameters<typeof toItem>[0]>).map(toItem),
    scheduled: (scheduled as Array<Parameters<typeof toItem>[0]>).map(toItem),
  };
}

/**
 * Read-only operational cockpit aggregate. Never mutates Topic / Brief /
 * Writing / Review / Publish / Media / Knowledge state, never triggers AI,
 * and never runs a migration. Pure reshape of existing Prisma data through
 * the pure mapping module.
 */
export async function getContentOperationsCommandCenter(
  options?: { limit?: number },
): Promise<ContentOperationsCommandCenter> {
  const limit = Math.min(options?.limit ?? TOPIC_CAP, TOPIC_CAP);
  const now = new Date();

  const rows = await fetchTopicRows(limit);
  const draftingTopicIds = rows.filter((r) => r.status === "DRAFTING").map((r) => r.id);
  const qaFailedByTopicId = await loadQaFailedByTopicId(draftingTopicIds);
  const topics: OperationsTopicInput[] = rows.map((row) => mapTopicRow(row, qaFailedByTopicId));

  const [reviewItems, publishQueueRaw] = await Promise.all([
    loadReviewQueue().catch(() => [] as ReviewQueueItemLike[]),
    loadPublishQueue().catch(() => ({ ready: [] as PublishQueueItemLike[], scheduled: [] as PublishQueueItemLike[] })),
  ]);

  const kanban = groupTopicsByOperationsPipeline(topics, now);
  const pipeline = buildOperationsPipelineSummary(kanban);
  const activeCards: OpsTopicCard[] = OPERATIONS_PIPELINE_COLUMNS.flatMap((col) => kanban[col.key]);

  const reviewQueue = buildReviewQueueSummary(reviewItems);
  const publishQueue = buildPublishQueueSummary(publishQueueRaw);
  const health = buildContentHealthMetrics(activeCards, reviewQueue, publishQueue);
  const refreshQueue = buildRefreshQueue(topics, now);
  const owners = aggregateByOwner(activeCards);
  const campaigns = aggregateByCampaign(activeCards);
  const clusters = buildClusterTree(activeCards);
  const seoOps = buildSeoOpsSummary(topics);
  const mediaCoverage = buildMediaCoverageSummary(topics);
  const knowledgeCoverage = buildKnowledgeCoverageSummary(topics);

  const activityEvents = [...rows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, ACTIVITY_SAMPLE)
    .map((row) => ({
      at: row.updatedAt.toISOString(),
      text: `${SEO_TOPIC_STATUS_LABELS[row.status]}: ${row.title}`,
    }));
  const activity = groupOperationsActivity(activityEvents);

  const owners_ = new Set<string>();
  const campaignsMeta = new Map<string, string>();
  const clustersMeta = new Map<string, string>();
  for (const topic of topics) {
    if (topic.assignedTo) owners_.add(topic.assignedTo);
    campaignsMeta.set(topic.strategyId, topic.strategyName);
    clustersMeta.set(topic.clusterId, topic.clusterName);
  }

  return {
    generatedAt: now.toISOString(),
    pipeline,
    kanban,
    calendar: {
      month: { year: now.getFullYear(), month: now.getMonth() },
      week: { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() },
    },
    health,
    refreshQueue,
    owners,
    campaigns,
    clusters,
    reviewQueue,
    publishQueue,
    seoOps,
    mediaCoverage,
    knowledgeCoverage,
    activity,
    topics: activeCards,
    filtersMeta: {
      owners: [...owners_].sort(),
      campaigns: [...campaignsMeta.entries()].map(([id, name]) => ({ id, name })),
      clusters: [...clustersMeta.entries()].map(([id, name]) => ({ id, name })),
    },
  };
}
