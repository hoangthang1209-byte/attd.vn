import type { SeoTopicPriority, SeoTopicStatus } from "@prisma/client";

/**
 * Sprint 17.0 — Content Operations Command Center.
 *
 * Pure display types only. This module never imports Prisma client runtime,
 * never fetches data, and never mutates Topic / Brief / Writing / Review /
 * Publish / Media / Knowledge state. It only reshapes existing SeoTopic-based
 * data (plus optional review / publish summaries) into read-only view models.
 */

export const OPERATIONS_PIPELINE_COLUMNS = [
  { key: "ideas", label: "Ý tưởng" },
  { key: "brief", label: "Brief" },
  { key: "writing", label: "Đang viết" },
  { key: "qa", label: "QA" },
  { key: "review", label: "Kiểm duyệt" },
  { key: "ready", label: "Sẵn sàng" },
  { key: "published", label: "Đã xuất bản" },
] as const;

export type OperationsPipelineColumnKey = (typeof OPERATIONS_PIPELINE_COLUMNS)[number]["key"];

/** Raw, read-only shape the server service assembles from Prisma before mapping. */
export type OperationsTopicInput = {
  id: string;
  title: string;
  primaryKeyword: string;
  slug: string | null;
  status: SeoTopicStatus;
  priority: SeoTopicPriority;
  assignedTo: string | null;
  dueDate: string | null;
  publishedAt: string | null;
  updatedAt: string;
  targetUrl: string | null;
  existingUrl: string | null;
  mediaBundleId: string | null;
  mediaPlanScore: number | null;
  mediaPlanStatus: string | null;
  clusterId: string;
  clusterName: string;
  strategyId: string;
  strategyName: string;
  briefApprovedAt: string | null;
  ctaText: string | null;
  ctaType: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  outlineCount: number;
  questionsCount: number;
  wordCountMax: number | null;
  /**
   * True/false only when a real Writing Draft QA signal was joined; null when
   * no draft exists yet or the join was skipped. Never inferred.
   */
  qaFailed: boolean | null;
};

export type OpsTopicCardFlags = {
  missingCta: boolean;
  missingMeta: boolean;
  missingMedia: boolean;
  missingFaq: boolean;
  overdue: boolean;
  needsRefresh: boolean;
};

export type OpsTopicCard = {
  id: string;
  title: string;
  keyword: string;
  slug: string | null;
  campaignId: string;
  campaign: string;
  clusterId: string;
  cluster: string;
  owner: string | null;
  priority: SeoTopicPriority;
  status: SeoTopicStatus;
  progressPercent: number;
  dueDate: string | null;
  publishedAt: string | null;
  pipelineColumn: OperationsPipelineColumnKey;
  /** PAUSED or REJECTED — display-only badge, never a workflow transition. */
  blocked: boolean;
  href: string;
  flags: OpsTopicCardFlags;
};

export type OperationsPipelineSummaryEntry = {
  key: OperationsPipelineColumnKey;
  label: string;
  count: number;
  topicIds: string[];
};

export type HealthMetric = {
  id: string;
  label: string;
  count: number;
  /** Filter key the client applies in-page; null when there is no 1:1 topic filter. */
  hrefFilter: string | null;
};

export type OwnerWorkload = {
  owner: string;
  total: number;
  overdueCount: number;
  blockedCount: number;
  byColumn: Record<OperationsPipelineColumnKey, number>;
};

export type CampaignHealth = {
  id: string;
  name: string;
  total: number;
  publishedCount: number;
  overdueCount: number;
  progressPercent: number;
};

export type ClusterLeaf = {
  clusterId: string;
  clusterName: string;
  total: number;
  byColumn: Record<OperationsPipelineColumnKey, number>;
};

export type ClusterNode = {
  campaignId: string;
  campaignName: string;
  total: number;
  clusters: ClusterLeaf[];
};

export type OperationsFilters = {
  status?: SeoTopicStatus;
  campaignId?: string;
  clusterId?: string;
  owner?: string;
  priority?: SeoTopicPriority;
  /** YYYY-MM, matched against publishedAt ?? dueDate. */
  publishMonth?: string;
  pipelineColumn?: OperationsPipelineColumnKey;
  needsRefresh?: boolean;
  missingCta?: boolean;
  missingMeta?: boolean;
  missingMedia?: boolean;
  missingFaq?: boolean;
  overdue?: boolean;
  blocked?: boolean;
};

export type ReviewQueueItemLike = {
  id: string;
  status: string;
  topicId: string | null;
  topicTitle: string | null;
  blockingIssues: number;
  assignedReviewerId: string | null;
  updatedAt: string;
  readyForHandoff: boolean;
};

export type ReviewQueueSummary = {
  total: number;
  inReviewCount: number;
  changesRequestedCount: number;
  approvedCount: number;
  blockingIssuesTotal: number;
  items: ReviewQueueItemLike[];
};

export type PublishQueueItemLike = {
  id: string;
  title: string;
  slug: string;
  status: string;
  scheduledAt: string | null;
  updatedAt: string;
};

export type PublishQueueSummary = {
  readyCount: number;
  scheduledCount: number;
  readyItems: PublishQueueItemLike[];
  scheduledItems: PublishQueueItemLike[];
};

export type SeoOpsSummary = {
  totalTopics: number;
  missingMetaTitle: number;
  missingMetaDescription: number;
  missingSlug: number;
  missingPrimaryKeyword: number;
};

export type MediaCoverageSummary = {
  totalTopics: number;
  missingBundle: number;
  criticalStatus: number;
  averageScore: number | null;
};

export type KnowledgeCoverageSummary = {
  totalTopics: number;
  withBriefApproved: number;
  missingBrief: number;
};

export type ActivityGroup = {
  key: string;
  text: string;
  count: number;
  at: string;
};

export type ActivityEventInput = {
  at: string;
  text: string;
};

export type FiltersMeta = {
  owners: string[];
  campaigns: Array<{ id: string; name: string }>;
  clusters: Array<{ id: string; name: string }>;
};

/** Top-level, read-only payload served by GET /api/content/operations/summary. */
export type ContentOperationsCommandCenter = {
  generatedAt: string;
  pipeline: OperationsPipelineSummaryEntry[];
  kanban: Record<OperationsPipelineColumnKey, OpsTopicCard[]>;
  calendar: {
    month: { year: number; month: number };
    week: { year: number; month: number; day: number };
  };
  health: HealthMetric[];
  refreshQueue: OpsTopicCard[];
  owners: OwnerWorkload[];
  campaigns: CampaignHealth[];
  clusters: ClusterNode[];
  reviewQueue: ReviewQueueSummary;
  publishQueue: PublishQueueSummary;
  seoOps: SeoOpsSummary;
  mediaCoverage: MediaCoverageSummary;
  knowledgeCoverage: KnowledgeCoverageSummary;
  activity: ActivityGroup[];
  topics: OpsTopicCard[];
  filtersMeta: FiltersMeta;
};
