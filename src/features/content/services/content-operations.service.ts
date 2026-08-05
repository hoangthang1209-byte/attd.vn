import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listContentReviews } from "@/features/content/services/content-review.service";
import { listPublishingQueue } from "@/features/content/services/content-publishing.service";
import { SEO_TOPIC_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import {
  OPERATIONS_PIPELINE_COLUMNS,
  type ContentOperationsCommandCenter,
  type OperationsCalendarRangeResult,
  type OperationsCalendarView,
  type OperationsTopicInput,
  type OpsActivityEvent,
  type OpsTopicCard,
  type PublishInbox,
  type PublishInboxItem,
  type PublishQueueItemLike,
  type RefreshInbox,
  type ReviewInbox,
  type ReviewInboxItem,
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
  buildPublishInbox,
  buildPublishQueueSummary,
  buildRefreshInbox,
  buildRefreshQueue,
  buildReviewInbox,
  buildReviewQueueSummary,
  buildSeoOpsSummary,
  groupOperationsActivity,
  groupTopicsByOperationsPipeline,
  mapToOpsTopicCards,
} from "@/features/content/operations/content-operations.mapping";
import {
  mapDraftVersionEvent,
  mapGenerationEvent,
  mapHandoffEvent,
  mapPublishEvent,
  mapReviewDecisionEvent,
  mergeOpsActivityEvents,
  sortOpsActivityEventsChronological,
} from "@/features/content/operations/content-operations-activity.mapping";

const TOPIC_CAP = 800;
const ACTIVITY_SAMPLE = 30;
const REFRESH_TOPIC_CAP = 2000;
const CALENDAR_RANGE_CAP = 2000;
const ACTIVITY_FEED_DEFAULT_TAKE = 40;
const ACTIVITY_SOURCE_QUERY_TAKE = 120;

type TopicRow = Awaited<ReturnType<typeof fetchTopicRows>>[number];

const TOPIC_SELECT = {
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
} satisfies Prisma.SeoTopicSelect;

function fetchTopicRows(limit: number) {
  return prisma.seoTopic.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: TOPIC_SELECT,
  });
}

/**
 * Sprint 17.1 — targeted, status-scoped fetch for the refresh inbox. Not
 * subject to the 800-row command-center cap: `status: PUBLISHED` is a narrow
 * enough predicate on its own, and this query also joins the internal-link
 * count (bounded to this same row set, not the whole SeoTopic table).
 */
function fetchRefreshTopicRows(limit: number) {
  return prisma.seoTopic.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "asc" }],
    take: limit,
    select: {
      ...TOPIC_SELECT,
      _count: { select: { internalLinksFrom: true, internalLinksTo: true } },
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

// ---------------------------------------------------------------------------
// Sprint 17.1 — Operational Queues & Audit Foundation.
//
// Every function below is `findMany`/`findUnique` only — no `create`,
// `update`, `upsert`, or `delete`. Audit/activity events are derived on read
// from ContentReviewDecision / ContentPublishEvent / ContentHandoffRecord /
// AiGenerationRun / WritingGenerationRun / WritingDraftVersion — there is no
// new event-log table and no migration.
// ---------------------------------------------------------------------------

async function loadReviewInboxItems(filters?: {
  take?: number;
  status?: string;
  assignedReviewerId?: string;
}): Promise<ReviewInboxItem[]> {
  const take = Math.min(filters?.take ?? 100, 200);
  const base = await listContentReviews({
    take,
    status: filters?.status,
    assignedReviewerId: filters?.assignedReviewerId,
  });
  if (base.length === 0) return [];

  const sessions = await prisma.contentReviewSession.findMany({
    where: { id: { in: base.map((b) => b.id) } },
    select: { id: true, startedAt: true, createdAt: true },
  });
  const sessionMetaById = new Map(sessions.map((s) => [s.id, s]));

  const topicIds = [...new Set(base.map((b) => b.topicId).filter((id): id is string => Boolean(id)))];
  const topics = topicIds.length
    ? await prisma.seoTopic.findMany({
        where: { id: { in: topicIds } },
        select: {
          id: true,
          priority: true,
          assignedTo: true,
          cluster: { select: { name: true, strategy: { select: { name: true } } } },
        },
      })
    : [];
  const topicById = new Map(topics.map((t) => [t.id, t]));

  const now = new Date();
  return base.map((row) => {
    const meta = sessionMetaById.get(row.id);
    const topic = row.topicId ? topicById.get(row.topicId) : null;
    const startedAt = meta?.startedAt?.toISOString() ?? null;
    const createdAt = meta?.createdAt?.toISOString() ?? row.updatedAt.toISOString();
    const waitingAnchor = startedAt ?? createdAt;
    const waitingDays = Math.max(0, Math.floor((now.getTime() - new Date(waitingAnchor).getTime()) / 86_400_000));
    return {
      id: row.id,
      status: row.status,
      topicId: row.topicId,
      topicTitle: row.topicTitle,
      blockingIssues: row.blockingIssues,
      assignedReviewerId: row.assignedReviewerId,
      updatedAt: row.updatedAt.toISOString(),
      startedAt,
      createdAt,
      readyForHandoff: row.readyForHandoff,
      priority: topic?.priority ?? null,
      owner: topic?.assignedTo ?? null,
      campaign: topic?.cluster.strategy.name ?? null,
      cluster: topic?.cluster.name ?? null,
      qaScore: row.qaScore,
      waitingDays,
    };
  });
}

/** Wraps/extends `listContentReviews` with topic priority/owner/campaign/cluster and queue-health grouping. */
export async function getOperationsReviewInbox(filters?: {
  take?: number;
  status?: string;
  assignedReviewerId?: string;
}): Promise<ReviewInbox> {
  const items = await loadReviewInboxItems(filters);
  return buildReviewInbox(items);
}

type PublishReadyRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: Date | null;
  contentModifiedAfterHandoff: boolean;
  updatedAt: Date;
};
type PublishRecentRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  lastPublishedAt: Date | null;
  updatedAt: Date;
};
type PublishFailedRow = {
  id: string;
  blogPostId: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

async function loadPublishInboxItems(): Promise<PublishInboxItem[]> {
  const [readyRaw, scheduledRaw, failedRaw, recentRaw] = await Promise.all([
    listPublishingQueue({ take: 60 }) as unknown as Promise<PublishReadyRow[]>,
    listPublishingQueue({ kind: "scheduled", take: 60 }) as unknown as Promise<PublishReadyRow[]>,
    listPublishingQueue({ kind: "failed", take: 30 }) as unknown as Promise<PublishFailedRow[]>,
    listPublishingQueue({ kind: "recent", take: 60 }) as unknown as Promise<PublishRecentRow[]>,
  ]);

  const failedBlogIds = [...new Set(failedRaw.map((f) => f.blogPostId))];
  const failedBlogs = failedBlogIds.length
    ? await prisma.blogPost.findMany({ where: { id: { in: failedBlogIds } }, select: { id: true, title: true, slug: true } })
    : [];
  const failedBlogById = new Map(failedBlogs.map((b) => [b.id, b]));

  const ready: PublishInboxItem[] = readyRaw.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    scheduledAt: null,
    publishedAt: null,
    updatedAt: row.updatedAt.toISOString(),
    errorMessage: null,
    modified: row.contentModifiedAfterHandoff,
  }));

  const scheduled: PublishInboxItem[] = scheduledRaw.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    publishedAt: null,
    updatedAt: row.updatedAt.toISOString(),
    errorMessage: null,
    modified: row.contentModifiedAfterHandoff,
  }));

  const failed: PublishInboxItem[] = failedRaw.map((row) => {
    const blog = failedBlogById.get(row.blogPostId);
    return {
      id: row.id,
      title: blog?.title ?? row.blogPostId,
      slug: blog?.slug ?? "",
      status: "FAILED",
      scheduledAt: null,
      publishedAt: null,
      updatedAt: (row.completedAt ?? row.createdAt).toISOString(),
      errorMessage: row.errorMessage,
      modified: false,
    };
  });

  const published: PublishInboxItem[] = recentRaw.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    scheduledAt: null,
    publishedAt: row.lastPublishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    errorMessage: null,
    modified: false,
  }));

  return [...ready, ...scheduled, ...failed, ...published];
}

/** Every useful publishing-queue kind (ready / scheduled / failed / recent / modified) merged into one bucketed inbox. */
export async function getOperationsPublishInbox(): Promise<PublishInbox> {
  const items = await loadPublishInboxItems();
  return buildPublishInbox(items);
}

/**
 * Published topics with refresh signals. Deliberately not capped by
 * `TOPIC_CAP` — the query is already narrowed by `status: PUBLISHED`.
 */
export async function getOperationsRefreshInbox(options?: { take?: number }): Promise<RefreshInbox> {
  const take = Math.min(options?.take ?? REFRESH_TOPIC_CAP, REFRESH_TOPIC_CAP);
  const rows = await fetchRefreshTopicRows(take);
  const now = new Date();
  const topics: OperationsTopicInput[] = rows.map((row) => ({
    ...mapTopicRow(row, new Map()),
    internalLinkCount: row._count.internalLinksFrom + row._count.internalLinksTo,
  }));
  return buildRefreshInbox(topics, now);
}

/**
 * Server-side range query over `dueDate` / `publishedAt` — intentionally not
 * subject to the 800-row command-center cap. Bounded to `CALENDAR_RANGE_CAP`
 * rows per range with a `truncated` flag instead of a hard stop.
 */
export async function getOperationsCalendarRange(input: {
  from: string;
  to: string;
  view: OperationsCalendarView;
}): Promise<OperationsCalendarRangeResult> {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
    throw new Error("Khoảng thời gian không hợp lệ.");
  }

  const rows = await prisma.seoTopic.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ dueDate: { gte: from, lte: to } }, { publishedAt: { gte: from, lte: to } }],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: CALENDAR_RANGE_CAP + 1,
    select: TOPIC_SELECT,
  });

  const truncated = rows.length > CALENDAR_RANGE_CAP;
  const bounded = truncated ? rows.slice(0, CALENDAR_RANGE_CAP) : rows;

  const draftingTopicIds = bounded.filter((r) => r.status === "DRAFTING").map((r) => r.id);
  const qaFailedByTopicId = await loadQaFailedByTopicId(draftingTopicIds);
  const topics = bounded.map((row) => mapTopicRow(row, qaFailedByTopicId));
  const cards = mapToOpsTopicCards(topics);

  return {
    from: input.from,
    to: input.to,
    view: input.view,
    topics: cards,
    total: cards.length,
    truncated,
  };
}

/** Bounded lookup: WritingPlanRecord → SeoTopic title, used to attach topic context to activity rows. */
async function loadTopicMetaForPlanIds(
  planIds: string[],
): Promise<Map<string, { topicId: string; topicTitle: string }>> {
  const uniquePlanIds = [...new Set(planIds)];
  if (uniquePlanIds.length === 0) return new Map();

  const plans = await prisma.writingPlanRecord.findMany({
    where: { id: { in: uniquePlanIds } },
    select: { id: true, topicId: true },
  });
  const topicIds = [...new Set(plans.map((p) => p.topicId))];
  const topics = topicIds.length
    ? await prisma.seoTopic.findMany({ where: { id: { in: topicIds } }, select: { id: true, title: true } })
    : [];
  const titleByTopicId = new Map(topics.map((t) => [t.id, t.title]));

  const out = new Map<string, { topicId: string; topicTitle: string }>();
  for (const plan of plans) {
    out.set(plan.id, { topicId: plan.topicId, topicTitle: titleByTopicId.get(plan.topicId) ?? "" });
  }
  return out;
}

/**
 * Merges recent rows from six existing governed tables into one activity
 * feed. Every source query is bounded and runs in parallel; topic context is
 * resolved via a handful of additional bounded lookups, not a fan-out per row.
 */
export async function getOperationsActivityFeed(options?: { take?: number }): Promise<OpsActivityEvent[]> {
  const take = Math.min(options?.take ?? ACTIVITY_FEED_DEFAULT_TAKE, 200);
  const fetchTake = Math.min(Math.max(take * 2, ACTIVITY_SOURCE_QUERY_TAKE), 200);

  const [decisions, publishEvents, handoffs, aiRuns, writingRuns, draftVersions] = await Promise.all([
    prisma.contentReviewDecision.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
    prisma.contentPublishEvent.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
    prisma.contentHandoffRecord.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
    prisma.aiGenerationRun.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
    prisma.writingGenerationRun.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
    prisma.writingDraftVersion.findMany({ orderBy: { createdAt: "desc" }, take: fetchTake }),
  ]);

  const reviewSessionIds = [...new Set(decisions.map((d) => d.reviewSessionId))];
  const reviewSessions = reviewSessionIds.length
    ? await prisma.contentReviewSession.findMany({
        where: { id: { in: reviewSessionIds } },
        select: { id: true, writingPlanId: true },
      })
    : [];
  const planIdByReviewSession = new Map(reviewSessions.map((s) => [s.id, s.writingPlanId]));

  const draftIds = [...new Set([...handoffs.map((h) => h.writingDraftId), ...draftVersions.map((v) => v.writingDraftId)])];
  const drafts = draftIds.length
    ? await prisma.writingDraftRecord.findMany({ where: { id: { in: draftIds } }, select: { id: true, writingPlanId: true } })
    : [];
  const planIdByDraftId = new Map(drafts.map((d) => [d.id, d.writingPlanId]));

  const blogIds = [...new Set(publishEvents.map((p) => p.blogPostId))];
  const blogs = blogIds.length
    ? await prisma.blogPost.findMany({
        where: { id: { in: blogIds } },
        select: { id: true, title: true, sourceWritingDraftId: true },
      })
    : [];
  const blogById = new Map(blogs.map((b) => [b.id, b]));
  const blogDraftIds = [...new Set(blogs.map((b) => b.sourceWritingDraftId).filter((id): id is string => Boolean(id)))];
  const blogDrafts = blogDraftIds.length
    ? await prisma.writingDraftRecord.findMany({ where: { id: { in: blogDraftIds } }, select: { id: true, writingPlanId: true } })
    : [];
  const planIdByBlogDraft = new Map(blogDrafts.map((d) => [d.id, d.writingPlanId]));

  const allPlanIds = [
    ...planIdByReviewSession.values(),
    ...planIdByDraftId.values(),
    ...planIdByBlogDraft.values(),
    ...writingRuns.map((r) => r.writingPlanId),
  ];
  const topicMetaByPlanId = await loadTopicMetaForPlanIds(allPlanIds);

  const events: OpsActivityEvent[] = [];

  for (const d of decisions) {
    const planId = planIdByReviewSession.get(d.reviewSessionId);
    const meta = planId ? topicMetaByPlanId.get(planId) : undefined;
    events.push(
      mapReviewDecisionEvent({
        id: d.id,
        reviewSessionId: d.reviewSessionId,
        decisionType: d.decisionType,
        actorId: d.actorId,
        createdAt: d.createdAt.toISOString(),
        topicId: meta?.topicId ?? null,
        topicTitle: meta?.topicTitle ?? null,
      }),
    );
  }

  for (const p of publishEvents) {
    const blog = blogById.get(p.blogPostId);
    const planId = blog?.sourceWritingDraftId ? planIdByBlogDraft.get(blog.sourceWritingDraftId) : undefined;
    const meta = planId ? topicMetaByPlanId.get(planId) : undefined;
    events.push(
      mapPublishEvent({
        id: p.id,
        blogPostId: p.blogPostId,
        blogTitle: blog?.title ?? null,
        action: p.action,
        status: p.status,
        requestedBy: p.requestedBy,
        createdAt: p.createdAt.toISOString(),
        topicId: meta?.topicId ?? null,
      }),
    );
  }

  for (const h of handoffs) {
    const planId = planIdByDraftId.get(h.writingDraftId);
    const meta = planId ? topicMetaByPlanId.get(planId) : undefined;
    events.push(
      mapHandoffEvent({
        id: h.id,
        writingDraftId: h.writingDraftId,
        status: h.status,
        targetEntityId: h.targetEntityId,
        createdAt: h.createdAt.toISOString(),
        topicId: meta?.topicId ?? null,
        topicTitle: meta?.topicTitle ?? null,
      }),
    );
  }

  for (const r of aiRuns) {
    events.push(
      mapGenerationEvent({
        id: r.id,
        status: r.status,
        entityType: r.entityType,
        entityId: r.entityId,
        createdAt: r.createdAt.toISOString(),
        topicId: r.entityType === "SEO_TOPIC" ? r.entityId : null,
        requestedBy: r.requestedBy,
        sourceTable: "AiGenerationRun",
      }),
    );
  }

  for (const r of writingRuns) {
    const meta = topicMetaByPlanId.get(r.writingPlanId);
    events.push(
      mapGenerationEvent({
        id: r.id,
        status: r.status,
        entityType: "WritingPlanRecord",
        entityId: r.writingPlanId,
        createdAt: r.createdAt.toISOString(),
        topicId: meta?.topicId ?? null,
        requestedBy: r.requestedBy,
        sourceTable: "WritingGenerationRun",
      }),
    );
  }

  for (const v of draftVersions) {
    const planId = planIdByDraftId.get(v.writingDraftId);
    const meta = planId ? topicMetaByPlanId.get(planId) : undefined;
    events.push(
      mapDraftVersionEvent({
        id: v.id,
        writingDraftId: v.writingDraftId,
        version: v.version,
        reason: v.reason,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy,
        topicId: meta?.topicId ?? null,
        topicTitle: meta?.topicTitle ?? null,
      }),
    );
  }

  return mergeOpsActivityEvents(events, { take });
}

/** Topic-scoped union of every governed audit source, oldest → newest. */
export async function getTopicOperationsTimeline(topicId: string): Promise<OpsActivityEvent[]> {
  const [topic, plans] = await Promise.all([
    prisma.seoTopic.findUnique({ where: { id: topicId }, select: { title: true } }),
    prisma.writingPlanRecord.findMany({ where: { topicId }, select: { id: true } }),
  ]);
  const topicTitle = topic?.title ?? null;
  const planIds = plans.map((p) => p.id);
  if (planIds.length === 0) return [];

  const drafts = await prisma.writingDraftRecord.findMany({
    where: { writingPlanId: { in: planIds } },
    select: { id: true },
  });
  const draftIds = drafts.map((d) => d.id);

  const reviewSessions = draftIds.length
    ? await prisma.contentReviewSession.findMany({ where: { writingDraftId: { in: draftIds } }, select: { id: true } })
    : [];
  const reviewSessionIds = reviewSessions.map((s) => s.id);

  const blogs = draftIds.length
    ? await prisma.blogPost.findMany({ where: { sourceWritingDraftId: { in: draftIds } }, select: { id: true, title: true } })
    : [];
  const blogIds = blogs.map((b) => b.id);
  const blogTitleById = new Map(blogs.map((b) => [b.id, b.title]));

  const [decisions, draftVersions, handoffs, writingRuns, publishEvents] = await Promise.all([
    reviewSessionIds.length
      ? prisma.contentReviewDecision.findMany({
          where: { reviewSessionId: { in: reviewSessionIds } },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
    draftIds.length
      ? prisma.writingDraftVersion.findMany({
          where: { writingDraftId: { in: draftIds } },
          orderBy: { createdAt: "desc" },
          take: 200,
        })
      : Promise.resolve([]),
    draftIds.length
      ? prisma.contentHandoffRecord.findMany({
          where: { writingDraftId: { in: draftIds } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    prisma.writingGenerationRun.findMany({ where: { writingPlanId: { in: planIds } }, orderBy: { createdAt: "desc" }, take: 100 }),
    blogIds.length
      ? prisma.contentPublishEvent.findMany({ where: { blogPostId: { in: blogIds } }, orderBy: { createdAt: "desc" }, take: 100 })
      : Promise.resolve([]),
  ]);

  const events: OpsActivityEvent[] = [];
  for (const d of decisions) {
    events.push(
      mapReviewDecisionEvent({
        id: d.id,
        reviewSessionId: d.reviewSessionId,
        decisionType: d.decisionType,
        actorId: d.actorId,
        createdAt: d.createdAt.toISOString(),
        topicId,
        topicTitle,
      }),
    );
  }
  for (const v of draftVersions) {
    events.push(
      mapDraftVersionEvent({
        id: v.id,
        writingDraftId: v.writingDraftId,
        version: v.version,
        reason: v.reason,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy,
        topicId,
        topicTitle,
      }),
    );
  }
  for (const h of handoffs) {
    events.push(
      mapHandoffEvent({
        id: h.id,
        writingDraftId: h.writingDraftId,
        status: h.status,
        targetEntityId: h.targetEntityId,
        createdAt: h.createdAt.toISOString(),
        topicId,
        topicTitle,
      }),
    );
  }
  for (const r of writingRuns) {
    events.push(
      mapGenerationEvent({
        id: r.id,
        status: r.status,
        entityType: "WritingPlanRecord",
        entityId: r.writingPlanId,
        createdAt: r.createdAt.toISOString(),
        topicId,
        requestedBy: r.requestedBy,
        sourceTable: "WritingGenerationRun",
      }),
    );
  }
  for (const p of publishEvents) {
    events.push(
      mapPublishEvent({
        id: p.id,
        blogPostId: p.blogPostId,
        blogTitle: blogTitleById.get(p.blogPostId) ?? null,
        action: p.action,
        status: p.status,
        requestedBy: p.requestedBy,
        createdAt: p.createdAt.toISOString(),
        topicId,
      }),
    );
  }

  return sortOpsActivityEventsChronological(events);
}
