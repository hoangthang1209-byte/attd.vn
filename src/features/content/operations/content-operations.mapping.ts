import { buildMonthGrid, buildWeekDays, type MonthCell } from "@/features/content/editorial/editorial-calendar";
import { getTopicProgressPercent, topicWorkspaceHref } from "@/features/content/editorial/editorial-ux";
import {
  OPERATIONS_PIPELINE_COLUMNS,
  type ActivityEventInput,
  type ActivityGroup,
  type CampaignHealth,
  type ClusterLeaf,
  type ClusterNode,
  type EditorWorkload,
  type HealthMetric,
  type KnowledgeCoverageSummary,
  type MediaCoverageSummary,
  type OperationsDeepLink,
  type OperationsFilters,
  type OperationsPipelineColumnKey,
  type OperationsPipelineSummaryEntry,
  type OperationsTopicInput,
  type OpsTopicCard,
  type OwnerWorkload,
  type PublishInbox,
  type PublishInboxGroups,
  type PublishInboxItem,
  type PublishOpsStats,
  type PublishQueueItemLike,
  type PublishQueueSummary,
  type QueueHealth,
  type RefreshCampaign,
  type RefreshInbox,
  type RefreshInboxCard,
  type RefreshReasonKey,
  type ReviewerWorkload,
  type ReviewInbox,
  type ReviewInboxGroupKey,
  type ReviewInboxGroups,
  type ReviewInboxItem,
  type ReviewQueueItemLike,
  type ReviewQueueSummary,
  type SeoOpsSummary,
} from "@/features/content/operations/content-operations.types";

/**
 * Sprint 17.0 — Content Operations Command Center.
 *
 * Pure, display-only mapping functions. No Prisma import, no fetch, no
 * writes, no scheduling. Every function here is a deterministic reshape of
 * data the caller already fetched — Topic / Brief / Writing / Review /
 * Publish / Media / Knowledge semantics are read, never changed.
 */

const REFRESH_STALE_DAYS = 180;
const LOW_MEDIA_SCORE_THRESHOLD = 50;

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function emptyColumnCounts(): Record<OperationsPipelineColumnKey, number> {
  const out = {} as Record<OperationsPipelineColumnKey, number>;
  for (const col of OPERATIONS_PIPELINE_COLUMNS) out[col.key] = 0;
  return out;
}

export function isBlockedTopic(topic: Pick<OperationsTopicInput, "status">): boolean {
  return topic.status === "PAUSED" || topic.status === "REJECTED";
}

/**
 * Planning-only stage for the operations board (no workflow changes).
 * Extends the editorial calendar's pipeline with a dedicated QA column when a
 * Writing Draft QA signal is available.
 */
export function getOperationsPipelineColumn(
  topic: Pick<OperationsTopicInput, "status" | "targetUrl" | "qaFailed">,
): OperationsPipelineColumnKey {
  if (topic.status === "PUBLISHED") return "published";
  if (topic.status === "REVIEW") return topic.targetUrl ? "ready" : "review";
  if (topic.status === "DRAFTING") {
    if (topic.targetUrl) return "ready";
    if (topic.qaFailed === true) return "qa";
    return "writing";
  }
  if (topic.status === "APPROVED" || topic.status === "BRIEF_READY") return "brief";
  // IDEA, RESEARCHING, PAUSED, REJECTED (ARCHIVED is filtered out by callers).
  return "ideas";
}

function isOverdue(topic: Pick<OperationsTopicInput, "dueDate" | "status">, now: Date): boolean {
  if (!topic.dueDate) return false;
  if (topic.status === "PUBLISHED" || topic.status === "ARCHIVED") return false;
  return startOfDay(new Date(topic.dueDate)).getTime() < startOfDay(now).getTime();
}

function computeRefreshSignal(
  topic: OperationsTopicInput,
  now: Date,
): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (topic.publishedAt) {
    const days = daysBetween(new Date(topic.publishedAt), now);
    if (days > REFRESH_STALE_DAYS) reasons.push(`Đã xuất bản ${days} ngày`);
  }
  if ((topic.questionsCount ?? 0) === 0) reasons.push("Thiếu FAQ");
  if (!topic.ctaText?.trim() && !topic.ctaType?.trim()) reasons.push("Thiếu CTA");
  if (!topic.metaTitle?.trim() || !topic.metaDescription?.trim()) reasons.push("Thiếu meta");
  if (!topic.mediaBundleId) reasons.push("Thiếu bộ hình");
  if (topic.mediaPlanScore != null && topic.mediaPlanScore < LOW_MEDIA_SCORE_THRESHOLD) {
    reasons.push("Điểm media thấp");
  }
  return { flagged: reasons.length > 0, reasons };
}

/** Single-topic → display card. The one place flags/progress/href are derived. */
export function mapToOpsTopicCard(topic: OperationsTopicInput, now: Date = new Date()): OpsTopicCard {
  const missingCta = !topic.ctaText?.trim() && !topic.ctaType?.trim();
  const missingMeta = !topic.metaTitle?.trim() || !topic.metaDescription?.trim();
  const missingMedia = !topic.mediaBundleId || topic.mediaPlanStatus === "CRITICAL";
  const missingFaq = (topic.questionsCount ?? 0) === 0;
  const overdue = isOverdue(topic, now);
  const needsRefresh = topic.status === "PUBLISHED" && computeRefreshSignal(topic, now).flagged;

  return {
    id: topic.id,
    title: topic.title,
    keyword: topic.primaryKeyword,
    slug: topic.slug,
    campaignId: topic.strategyId,
    campaign: topic.strategyName,
    clusterId: topic.clusterId,
    cluster: topic.clusterName,
    owner: topic.assignedTo,
    priority: topic.priority,
    status: topic.status,
    progressPercent: getTopicProgressPercent(topic.status),
    dueDate: topic.dueDate,
    publishedAt: topic.publishedAt,
    pipelineColumn: getOperationsPipelineColumn(topic),
    blocked: isBlockedTopic(topic),
    href: topicWorkspaceHref(topic.id),
    flags: { missingCta, missingMeta, missingMedia, missingFaq, overdue, needsRefresh },
  };
}

export function mapToOpsTopicCards(topics: OperationsTopicInput[], now: Date = new Date()): OpsTopicCard[] {
  return topics.map((t) => mapToOpsTopicCard(t, now));
}

/** Excludes ARCHIVED — archived topics are terminal and out of the active board. */
export function groupTopicsByOperationsPipeline(
  topics: OperationsTopicInput[],
  now: Date = new Date(),
): Record<OperationsPipelineColumnKey, OpsTopicCard[]> {
  const groups = {} as Record<OperationsPipelineColumnKey, OpsTopicCard[]>;
  for (const col of OPERATIONS_PIPELINE_COLUMNS) groups[col.key] = [];
  for (const topic of topics) {
    if (topic.status === "ARCHIVED") continue;
    groups[getOperationsPipelineColumn(topic)].push(mapToOpsTopicCard(topic, now));
  }
  return groups;
}

export function buildOperationsPipelineSummary(
  kanban: Record<OperationsPipelineColumnKey, OpsTopicCard[]>,
): OperationsPipelineSummaryEntry[] {
  return OPERATIONS_PIPELINE_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    count: kanban[col.key].length,
    topicIds: kanban[col.key].map((c) => c.id),
  }));
}

export function buildContentHealthMetrics(
  cards: OpsTopicCard[],
  reviewSummary?: Pick<ReviewQueueSummary, "inReviewCount" | "changesRequestedCount">,
  publishSummary?: Pick<PublishQueueSummary, "readyCount" | "scheduledCount">,
): HealthMetric[] {
  const metrics: HealthMetric[] = [
    {
      id: "missingCta",
      label: "Thiếu CTA",
      count: cards.filter((c) => c.flags.missingCta).length,
      hrefFilter: "missingCta",
    },
    {
      id: "missingMeta",
      label: "Thiếu Meta",
      count: cards.filter((c) => c.flags.missingMeta).length,
      hrefFilter: "missingMeta",
    },
    {
      id: "missingMedia",
      label: "Thiếu hình ảnh",
      count: cards.filter((c) => c.flags.missingMedia).length,
      hrefFilter: "missingMedia",
    },
    {
      id: "missingFaq",
      label: "Thiếu FAQ",
      count: cards.filter((c) => c.flags.missingFaq).length,
      hrefFilter: "missingFaq",
    },
    {
      id: "overdue",
      label: "Quá hạn",
      count: cards.filter((c) => c.flags.overdue).length,
      hrefFilter: "overdue",
    },
    {
      id: "blocked",
      label: "Tạm dừng / Từ chối",
      count: cards.filter((c) => c.blocked).length,
      hrefFilter: "blocked",
    },
    {
      id: "needsRefresh",
      label: "Cần làm mới",
      count: cards.filter((c) => c.flags.needsRefresh).length,
      hrefFilter: "needsRefresh",
    },
  ];
  if (reviewSummary) {
    metrics.push({
      id: "reviewBacklog",
      label: "Hàng đợi kiểm duyệt",
      count: reviewSummary.inReviewCount + reviewSummary.changesRequestedCount,
      hrefFilter: null,
    });
  }
  if (publishSummary) {
    metrics.push({
      id: "publishQueue",
      label: "Hàng đợi xuất bản",
      count: publishSummary.readyCount + publishSummary.scheduledCount,
      hrefFilter: null,
    });
  }
  return metrics;
}

/**
 * Published topics only. Recently published items are excluded unless they
 * are missing a required editorial signal (CTA / meta / media / FAQ / media
 * score) — age alone only qualifies past `REFRESH_STALE_DAYS`.
 */
export function buildRefreshQueue(topics: OperationsTopicInput[], now: Date = new Date()): OpsTopicCard[] {
  const flagged = topics
    .filter((t) => t.status === "PUBLISHED")
    .map((t) => ({ topic: t, signal: computeRefreshSignal(t, now) }))
    .filter((entry) => entry.signal.flagged);

  flagged.sort((a, b) => {
    if (b.signal.reasons.length !== a.signal.reasons.length) {
      return b.signal.reasons.length - a.signal.reasons.length;
    }
    const aTime = a.topic.publishedAt ? new Date(a.topic.publishedAt).getTime() : 0;
    const bTime = b.topic.publishedAt ? new Date(b.topic.publishedAt).getTime() : 0;
    return aTime - bTime;
  });

  return flagged.map((entry) => mapToOpsTopicCard(entry.topic, now));
}

export function aggregateByOwner(cards: OpsTopicCard[]): OwnerWorkload[] {
  const map = new Map<string, OwnerWorkload>();
  for (const card of cards) {
    const owner = card.owner?.trim() || "Chưa gán";
    if (!map.has(owner)) {
      map.set(owner, { owner, total: 0, overdueCount: 0, blockedCount: 0, byColumn: emptyColumnCounts() });
    }
    const entry = map.get(owner)!;
    entry.total += 1;
    if (card.flags.overdue) entry.overdueCount += 1;
    if (card.blocked) entry.blockedCount += 1;
    entry.byColumn[card.pipelineColumn] += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function aggregateByCampaign(cards: OpsTopicCard[]): CampaignHealth[] {
  const map = new Map<string, CampaignHealth>();
  for (const card of cards) {
    if (!map.has(card.campaignId)) {
      map.set(card.campaignId, {
        id: card.campaignId,
        name: card.campaign,
        total: 0,
        publishedCount: 0,
        overdueCount: 0,
        progressPercent: 0,
      });
    }
    const entry = map.get(card.campaignId)!;
    entry.total += 1;
    if (card.status === "PUBLISHED") entry.publishedCount += 1;
    if (card.flags.overdue) entry.overdueCount += 1;
  }
  for (const entry of map.values()) {
    entry.progressPercent = entry.total > 0 ? Math.round((entry.publishedCount / entry.total) * 100) : 0;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function buildClusterTree(cards: OpsTopicCard[]): ClusterNode[] {
  const campaignNames = new Map<string, string>();
  const campaignClusters = new Map<string, Map<string, ClusterLeaf>>();

  for (const card of cards) {
    campaignNames.set(card.campaignId, card.campaign);
    if (!campaignClusters.has(card.campaignId)) campaignClusters.set(card.campaignId, new Map());
    const clusterMap = campaignClusters.get(card.campaignId)!;
    if (!clusterMap.has(card.clusterId)) {
      clusterMap.set(card.clusterId, {
        clusterId: card.clusterId,
        clusterName: card.cluster,
        total: 0,
        byColumn: emptyColumnCounts(),
      });
    }
    const leaf = clusterMap.get(card.clusterId)!;
    leaf.total += 1;
    leaf.byColumn[card.pipelineColumn] += 1;
  }

  return [...campaignClusters.entries()]
    .map(([campaignId, clusterMap]) => {
      const clusters = [...clusterMap.values()].sort((a, b) => b.total - a.total);
      return {
        campaignId,
        campaignName: campaignNames.get(campaignId) ?? campaignId,
        total: clusters.reduce((sum, c) => sum + c.total, 0),
        clusters,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function filterOperationsTopics(cards: OpsTopicCard[], filters: OperationsFilters): OpsTopicCard[] {
  return cards.filter((card) => {
    if (filters.status && card.status !== filters.status) return false;
    if (filters.campaignId && card.campaignId !== filters.campaignId) return false;
    if (filters.clusterId && card.clusterId !== filters.clusterId) return false;
    if (filters.owner && (card.owner ?? "") !== filters.owner) return false;
    if (filters.priority && card.priority !== filters.priority) return false;
    if (filters.pipelineColumn && card.pipelineColumn !== filters.pipelineColumn) return false;
    if (filters.needsRefresh && !card.flags.needsRefresh) return false;
    if (filters.missingCta && !card.flags.missingCta) return false;
    if (filters.missingMeta && !card.flags.missingMeta) return false;
    if (filters.missingMedia && !card.flags.missingMedia) return false;
    if (filters.missingFaq && !card.flags.missingFaq) return false;
    if (filters.overdue && !card.flags.overdue) return false;
    if (filters.blocked && !card.blocked) return false;
    if (filters.publishMonth) {
      const anchor = card.publishedAt ?? card.dueDate;
      if (!anchor) return false;
      const [y, m] = filters.publishMonth.split("-").map(Number);
      const d = new Date(anchor);
      if (!y || !m || d.getFullYear() !== y || d.getMonth() + 1 !== m) return false;
    }
    return true;
  });
}

export function searchOperationsTopics(cards: OpsTopicCard[], query: string): OpsTopicCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.keyword.toLowerCase().includes(q) ||
      (c.slug ?? "").toLowerCase().includes(q),
  );
}

/** Reuses the editorial calendar's month/week grid builders (display-only). */
export function groupCalendarByPublishTarget(
  topics: OperationsTopicInput[],
  view: "month" | "week",
  anchor: Date = new Date(),
): MonthCell[] {
  const active = topics.filter((t) => t.status !== "ARCHIVED");
  if (view === "week") return buildWeekDays(anchor, active);
  return buildMonthGrid(anchor.getFullYear(), anchor.getMonth(), active);
}

export function buildReviewQueueSummary(reviews: ReviewQueueItemLike[]): ReviewQueueSummary {
  return {
    total: reviews.length,
    inReviewCount: reviews.filter((r) => r.status === "IN_REVIEW").length,
    changesRequestedCount: reviews.filter((r) => r.status === "CHANGES_REQUESTED").length,
    approvedCount: reviews.filter((r) => r.status === "APPROVED").length,
    blockingIssuesTotal: reviews.reduce((sum, r) => sum + r.blockingIssues, 0),
    items: reviews.slice(0, 20),
  };
}

export function buildPublishQueueSummary(input: {
  ready: PublishQueueItemLike[];
  scheduled: PublishQueueItemLike[];
}): PublishQueueSummary {
  return {
    readyCount: input.ready.length,
    scheduledCount: input.scheduled.length,
    readyItems: input.ready.slice(0, 20),
    scheduledItems: input.scheduled.slice(0, 20),
  };
}

export function buildSeoOpsSummary(topics: OperationsTopicInput[]): SeoOpsSummary {
  const active = topics.filter((t) => t.status !== "ARCHIVED");
  return {
    totalTopics: active.length,
    missingMetaTitle: active.filter((t) => !t.metaTitle?.trim()).length,
    missingMetaDescription: active.filter((t) => !t.metaDescription?.trim()).length,
    missingSlug: active.filter((t) => !t.slug?.trim()).length,
    missingPrimaryKeyword: active.filter((t) => !t.primaryKeyword?.trim()).length,
  };
}

export function buildMediaCoverageSummary(topics: OperationsTopicInput[]): MediaCoverageSummary {
  const active = topics.filter((t) => t.status !== "ARCHIVED");
  const scored = active.filter((t) => t.mediaPlanScore != null);
  const averageScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, t) => sum + (t.mediaPlanScore ?? 0), 0) / scored.length)
      : null;
  return {
    totalTopics: active.length,
    missingBundle: active.filter((t) => !t.mediaBundleId).length,
    criticalStatus: active.filter((t) => t.mediaPlanStatus === "CRITICAL").length,
    averageScore,
  };
}

export function buildKnowledgeCoverageSummary(topics: OperationsTopicInput[]): KnowledgeCoverageSummary {
  const active = topics.filter((t) => t.status !== "ARCHIVED");
  const withBriefApproved = active.filter((t) => Boolean(t.briefApprovedAt)).length;
  return {
    totalTopics: active.length,
    withBriefApproved,
    missingBrief: active.length - withBriefApproved,
  };
}

/** Dedupe repeated activity text and sort newest-first (mirrors editorial-ux's activity grouping). */
export function groupOperationsActivity(events: ActivityEventInput[]): ActivityGroup[] {
  const map = new Map<string, ActivityGroup>();
  for (const item of events) {
    const existing = map.get(item.text);
    if (existing) {
      existing.count += 1;
      if (new Date(item.at).getTime() > new Date(existing.at).getTime()) existing.at = item.at;
    } else {
      map.set(item.text, { key: item.text, text: item.text, count: 1, at: item.at });
    }
  }
  return [...map.values()].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ---------------------------------------------------------------------------
// Sprint 17.1 — Operational Queues & Audit Foundation.
//
// Everything below stays a pure reshape: no Prisma import, no fetch, no
// writes. Servers assemble `ReviewInboxItem[]` / `PublishInboxItem[]` /
// `OperationsTopicInput[]` from existing governed tables and hand them to
// these builders.
// ---------------------------------------------------------------------------

export function buildQueueHealth(input: {
  total: number;
  blocked: number;
  overdue: number;
  waiting: number;
  completedToday: number;
}): QueueHealth {
  return { ...input };
}

const REVIEW_OVERDUE_WAIT_DAYS = 3;
const RECENTLY_SUBMITTED_HOURS = 24;

/**
 * Groups are additive triage buckets (Gmail-style) rather than a partition —
 * a review can be both `high_priority` and `overdue` at once.
 */
export function buildReviewInbox(items: ReviewInboxItem[], now: Date = new Date()): ReviewInbox {
  const groups: ReviewInboxGroups = {
    high_priority: [],
    waiting_today: [],
    overdue: [],
    recently_submitted: [],
  };

  for (const item of items) {
    if (item.priority === "HIGH" || item.priority === "CRITICAL") groups.high_priority.push(item);
    if (item.waitingDays <= 0) groups.waiting_today.push(item);
    if (item.waitingDays > REVIEW_OVERDUE_WAIT_DAYS) groups.overdue.push(item);
    const createdMs = now.getTime() - new Date(item.createdAt).getTime();
    if (createdMs >= 0 && createdMs <= RECENTLY_SUBMITTED_HOURS * 60 * 60 * 1000) {
      groups.recently_submitted.push(item);
    }
  }

  for (const key of Object.keys(groups) as ReviewInboxGroupKey[]) {
    groups[key].sort((a, b) => b.waitingDays - a.waitingDays);
  }

  const blocked = items.filter((i) => i.status === "REJECTED" || i.status === "SUPERSEDED").length;
  const waiting = items.filter((i) => i.status === "IN_REVIEW" || i.status === "CHANGES_REQUESTED").length;
  const completedToday = items.filter(
    (i) => i.status === "APPROVED" && isSameCalendarDay(new Date(i.updatedAt), now),
  ).length;

  return {
    groups,
    items,
    health: buildQueueHealth({
      total: items.length,
      blocked,
      overdue: groups.overdue.length,
      waiting,
      completedToday,
    }),
  };
}

export function buildReviewerWorkload(
  reviews: Array<Pick<ReviewInboxItem, "assignedReviewerId" | "status" | "blockingIssues">>,
): ReviewerWorkload[] {
  const map = new Map<string, ReviewerWorkload>();
  for (const review of reviews) {
    const reviewerId = review.assignedReviewerId?.trim() || "Chưa gán";
    if (!map.has(reviewerId)) {
      map.set(reviewerId, {
        reviewerId,
        total: 0,
        inReviewCount: 0,
        changesRequestedCount: 0,
        approvedCount: 0,
        blockingIssuesTotal: 0,
      });
    }
    const entry = map.get(reviewerId)!;
    entry.total += 1;
    if (review.status === "IN_REVIEW") entry.inReviewCount += 1;
    if (review.status === "CHANGES_REQUESTED") entry.changesRequestedCount += 1;
    if (review.status === "APPROVED") entry.approvedCount += 1;
    entry.blockingIssuesTotal += review.blockingIssues;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/**
 * Buckets a flat publish-queue item list. Failed items are recognized either
 * by an explicit `status: "FAILED"` (ContentPublishEvent) or a non-null
 * `errorMessage`; everything else buckets off BlogPostStatus + `modified`.
 */
export function buildPublishInbox(items: PublishInboxItem[], now: Date = new Date()): PublishInbox {
  const groups: PublishInboxGroups = {
    ready_today: [],
    scheduled: [],
    failed: [],
    waiting: [],
    published_today: [],
  };

  for (const item of items) {
    if (item.status === "FAILED" || item.errorMessage) {
      groups.failed.push(item);
      continue;
    }
    if (item.status === "SCHEDULED") {
      groups.scheduled.push(item);
      continue;
    }
    if (item.status === "PUBLISHED") {
      if (item.publishedAt && isSameCalendarDay(new Date(item.publishedAt), now)) {
        groups.published_today.push(item);
      }
      continue;
    }
    if (item.modified) {
      groups.waiting.push(item);
      continue;
    }
    groups.ready_today.push(item);
  }

  groups.scheduled.sort(
    (a, b) => (a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0),
  );
  groups.failed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  groups.published_today.sort(
    (a, b) => (b.publishedAt ? new Date(b.publishedAt).getTime() : 0) - (a.publishedAt ? new Date(a.publishedAt).getTime() : 0),
  );

  return { groups };
}

export function buildPublishOpsStats(groups: PublishInboxGroups): PublishOpsStats {
  return {
    readyCount: groups.ready_today.length,
    scheduledCount: groups.scheduled.length,
    failedCount: groups.failed.length,
    publishedTodayCount: groups.published_today.length,
    waitingCount: groups.waiting.length,
  };
}

/** Vietnamese labels for the machine-readable refresh reason keys — UI-only lookup. */
export const REFRESH_REASON_LABELS: Record<RefreshReasonKey, string> = {
  outdated: "Nội dung cũ",
  missing_cta: "Thiếu CTA",
  missing_faq: "Thiếu FAQ",
  missing_hero: "Thiếu ảnh bìa",
  missing_links: "Thiếu internal link",
  missing_images: "Thiếu hình ảnh",
  low_seo: "SEO yếu",
};

/** Ordered worst → least severe; also drives the numeric severity weight below. */
const REFRESH_REASON_ORDER: RefreshReasonKey[] = [
  "outdated",
  "missing_cta",
  "missing_faq",
  "missing_hero",
  "missing_links",
  "missing_images",
  "low_seo",
];

function computeRefreshReasons(topic: OperationsTopicInput, now: Date): RefreshReasonKey[] {
  const reasons: RefreshReasonKey[] = [];
  if (topic.publishedAt) {
    const days = daysBetween(new Date(topic.publishedAt), now);
    if (days > REFRESH_STALE_DAYS) reasons.push("outdated");
  }
  if (!topic.ctaText?.trim() && !topic.ctaType?.trim()) reasons.push("missing_cta");
  if ((topic.questionsCount ?? 0) === 0) reasons.push("missing_faq");
  if (!topic.mediaBundleId) reasons.push("missing_hero");
  if ((topic.internalLinkCount ?? 0) === 0) reasons.push("missing_links");
  if (
    topic.mediaBundleId &&
    (topic.mediaPlanStatus === "CRITICAL" ||
      (topic.mediaPlanScore != null && topic.mediaPlanScore < LOW_MEDIA_SCORE_THRESHOLD))
  ) {
    reasons.push("missing_images");
  }
  if (!topic.metaTitle?.trim() || !topic.metaDescription?.trim()) reasons.push("low_seo");
  return reasons;
}

function refreshSeverity(reasons: RefreshReasonKey[]): number {
  return reasons.reduce((sum, reason) => sum + (REFRESH_REASON_ORDER.length - REFRESH_REASON_ORDER.indexOf(reason)), 0);
}

/**
 * Published topics only, each annotated with machine-readable reason keys
 * (`outdated`, `missing_cta`, …) — the UI is responsible for localizing the
 * keys into chips. Sorted worst-first (severity), then oldest-first (age).
 */
export function buildRefreshInbox(topics: OperationsTopicInput[], now: Date = new Date()): RefreshInbox {
  const items: RefreshInboxCard[] = topics
    .filter((t) => t.status === "PUBLISHED")
    .map((topic) => {
      const reasons = computeRefreshReasons(topic, now);
      const ageDays = topic.publishedAt ? daysBetween(new Date(topic.publishedAt), now) : null;
      return {
        ...mapToOpsTopicCard(topic, now),
        reasons,
        severity: refreshSeverity(reasons),
        ageDays,
      };
    })
    .filter((card) => card.reasons.length > 0);

  items.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return (b.ageDays ?? 0) - (a.ageDays ?? 0);
  });

  return { items };
}

export function buildRefreshCampaigns(cards: RefreshInboxCard[]): RefreshCampaign[] {
  const map = new Map<string, RefreshCampaign>();
  for (const card of cards) {
    if (!map.has(card.campaignId)) {
      map.set(card.campaignId, { campaignId: card.campaignId, campaign: card.campaign, total: 0, reasonCounts: {} });
    }
    const entry = map.get(card.campaignId)!;
    entry.total += 1;
    for (const reason of card.reasons) {
      entry.reasonCounts[reason] = (entry.reasonCounts[reason] ?? 0) + 1;
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function buildEditorWorkload(
  topics: OpsTopicCard[],
  reviews: Array<Pick<ReviewInboxItem, "assignedReviewerId">>,
): EditorWorkload[] {
  const map = new Map<string, EditorWorkload>();
  const ensure = (owner: string): EditorWorkload => {
    if (!map.has(owner)) {
      map.set(owner, { owner, draftingCount: 0, reviewCount: 0, overdueCount: 0, total: 0 });
    }
    return map.get(owner)!;
  };

  for (const topic of topics) {
    const entry = ensure(topic.owner?.trim() || "Chưa gán");
    entry.total += 1;
    if (topic.pipelineColumn === "writing" || topic.pipelineColumn === "qa") entry.draftingCount += 1;
    if (topic.pipelineColumn === "review") entry.reviewCount += 1;
    if (topic.flags.overdue) entry.overdueCount += 1;
  }
  for (const review of reviews) {
    const entry = ensure(review.assignedReviewerId?.trim() || "Chưa gán");
    entry.reviewCount += 1;
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Pure helper backing the calendar range query — anchor is publishedAt ?? dueDate, inclusive bounds. */
export function filterOpsTopicsByDateRange(
  topics: OperationsTopicInput[],
  range: { from: string; to: string },
): OperationsTopicInput[] {
  const fromTime = new Date(range.from).getTime();
  const toTime = new Date(range.to).getTime();
  return topics.filter((topic) => {
    const anchor = topic.publishedAt ?? topic.dueDate;
    if (!anchor) return false;
    const time = new Date(anchor).getTime();
    return time >= fromTime && time <= toTime;
  });
}

const HEALTH_FILTER_KEYS = new Set([
  "missingCta",
  "missingMeta",
  "missingMedia",
  "missingFaq",
  "overdue",
  "blocked",
  "needsRefresh",
]);

const INBOX_SCOPES = new Set(["review", "publish", "refresh", "calendar", "kanban"]);

/**
 * Builds a deep-linkable `path` + `query` for the operations center from a
 * single filter key, e.g. `"review:overdue"` → `?inbox=review&group=overdue`,
 * `"missingCta"` → `?inbox=kanban&filter=missingCta`.
 */
export function buildDeepLink(filterKey: string): OperationsDeepLink {
  const path = "/admin/content/operations";
  const [scope, group] = filterKey.split(":");

  if (INBOX_SCOPES.has(scope)) {
    const query: Record<string, string> = { inbox: scope };
    if (group) query.group = group;
    return { path, query };
  }

  if (HEALTH_FILTER_KEYS.has(scope)) {
    return { path, query: { inbox: "kanban", filter: scope } };
  }

  return { path, query: { inbox: "kanban" } };
}
