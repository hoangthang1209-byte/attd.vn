import "server-only";

import type {
  Prisma,
  SeoContentType,
  SeoFunnelStage,
  SeoSearchIntent,
  SeoTargetEntityType,
  SeoTopicPriority,
  SeoTopicStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { assertTopicTransition } from "@/features/content/seo/seo-status-transitions";
import { clampSeoScore, normalizePrimaryKeyword } from "@/features/content/seo/seo-score-utils";

const TOPIC_INCLUDE = {
  cluster: {
    select: {
      id: true,
      name: true,
      strategyId: true,
      strategy: { select: { id: true, name: true } },
    },
  },
  mediaBundle: { select: { id: true, name: true, status: true } },
  brief: true,
  keywords: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] as const },
  _count: { select: { internalLinksFrom: true, internalLinksTo: true } },
} satisfies Prisma.SeoTopicInclude;

export type SeoTopicDetail = {
  id: string;
  clusterId: string;
  clusterName: string;
  strategyId: string;
  strategyName: string;
  title: string;
  slug: string | null;
  description: string | null;
  primaryKeyword: string;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  priority: SeoTopicPriority;
  status: SeoTopicStatus;
  targetAudience: string[];
  businessValue: number;
  relevanceScore: number;
  opportunityScore: number;
  confidenceScore: number;
  targetEntityType: SeoTargetEntityType;
  targetEntityId: string | null;
  targetUrl: string | null;
  existingUrl: string | null;
  canonicalUrl: string | null;
  notes: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  publishedAt: string | null;
  mediaBundleId: string | null;
  mediaBundleName: string | null;
  mediaPlanScore: number | null;
  mediaPlanStatus: string | null;
  keywordCount: number;
  internalLinkCount: number;
  createdAt: string;
  updatedAt: string;
  brief: unknown;
  keywords: unknown[];
};

function mapTopic(row: Prisma.SeoTopicGetPayload<{ include: typeof TOPIC_INCLUDE }>): SeoTopicDetail {
  return {
    id: row.id,
    clusterId: row.clusterId,
    clusterName: row.cluster.name,
    strategyId: row.cluster.strategyId,
    strategyName: row.cluster.strategy.name,
    title: row.title,
    slug: row.slug,
    description: row.description,
    primaryKeyword: row.primaryKeyword,
    searchIntent: row.searchIntent,
    contentType: row.contentType,
    funnelStage: row.funnelStage,
    priority: row.priority,
    status: row.status,
    targetAudience: row.targetAudience,
    businessValue: row.businessValue,
    relevanceScore: row.relevanceScore,
    opportunityScore: row.opportunityScore,
    confidenceScore: row.confidenceScore,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId,
    targetUrl: row.targetUrl,
    existingUrl: row.existingUrl,
    canonicalUrl: row.canonicalUrl,
    notes: row.notes,
    assignedTo: row.assignedTo,
    dueDate: row.dueDate?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    mediaBundleId: row.mediaBundleId,
    mediaBundleName: row.mediaBundle?.name ?? null,
    mediaPlanScore: row.mediaPlanScore,
    mediaPlanStatus: row.mediaPlanStatus,
    keywordCount: row.keywords.length,
    internalLinkCount: row._count.internalLinksFrom + row._count.internalLinksTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    brief: row.brief,
    keywords: row.keywords,
  };
}

export type SeoTopicListFilters = {
  strategyId?: string;
  clusterId?: string;
  status?: SeoTopicStatus | SeoTopicStatus[];
  searchIntent?: SeoSearchIntent;
  contentType?: SeoContentType;
  funnelStage?: SeoFunnelStage;
  priority?: SeoTopicPriority;
  assignedTo?: string;
  hasTargetUrl?: boolean;
  hasBundle?: boolean;
  mediaPlanStatus?: string;
  overdue?: boolean;
  search?: string;
  quickView?: string;
};

function buildTopicWhere(filters: SeoTopicListFilters): Prisma.SeoTopicWhereInput {
  const now = new Date();
  const where: Prisma.SeoTopicWhereInput = {};

  if (filters.strategyId) where.cluster = { strategyId: filters.strategyId };
  if (filters.clusterId) where.clusterId = filters.clusterId;
  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
  }
  if (filters.searchIntent) where.searchIntent = filters.searchIntent;
  if (filters.contentType) where.contentType = filters.contentType;
  if (filters.funnelStage) where.funnelStage = filters.funnelStage;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assignedTo) where.assignedTo = filters.assignedTo;
  if (filters.hasTargetUrl === true) where.targetUrl = { not: null };
  if (filters.hasTargetUrl === false) where.targetUrl = null;
  if (filters.hasBundle === true) where.mediaBundleId = { not: null };
  if (filters.hasBundle === false) where.mediaBundleId = null;
  if (filters.mediaPlanStatus) where.mediaPlanStatus = filters.mediaPlanStatus;
  if (filters.overdue) {
    where.dueDate = { lt: now };
    where.status = { notIn: ["PUBLISHED", "ARCHIVED", "REJECTED"] };
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { primaryKeyword: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }

  switch (filters.quickView) {
    case "idea":
      where.status = "IDEA";
      break;
    case "approved":
      where.status = "APPROVED";
      break;
    case "brief":
      where.status = { in: ["APPROVED", "BRIEF_READY"] };
      break;
    case "drafting":
      where.status = "DRAFTING";
      break;
    case "review":
      where.status = "REVIEW";
      break;
    case "published":
      where.status = "PUBLISHED";
      break;
    case "overdue":
      where.dueDate = { lt: now };
      where.status = { notIn: ["PUBLISHED", "ARCHIVED", "REJECTED"] };
      break;
    case "missing-media":
      where.OR = [{ mediaBundleId: null }, { mediaPlanStatus: { in: ["CRITICAL", "INSUFFICIENT"] } }];
      break;
  }

  return where;
}

export async function listSeoTopics(filters: SeoTopicListFilters = {}): Promise<SeoTopicDetail[]> {
  const rows = await prisma.seoTopic.findMany({
    where: buildTopicWhere(filters),
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: TOPIC_INCLUDE,
    take: 500,
  });
  return rows.map(mapTopic);
}

export async function getSeoTopicById(id: string): Promise<SeoTopicDetail | null> {
  const row = await prisma.seoTopic.findUnique({ where: { id }, include: TOPIC_INCLUDE });
  return row ? mapTopic(row) : null;
}

export type DuplicateTopicMatch = {
  id: string;
  title: string;
  primaryKeyword: string;
  clusterName: string;
  strategyName: string;
  matchType: "exact_keyword" | "similar_title";
};

export async function findDuplicateTopics(input: {
  strategyId: string;
  clusterId?: string;
  primaryKeyword: string;
  title?: string;
  excludeTopicId?: string;
}): Promise<DuplicateTopicMatch[]> {
  const normalized = normalizePrimaryKeyword(input.primaryKeyword);
  const topics = await prisma.seoTopic.findMany({
    where: {
      cluster: { strategyId: input.strategyId },
      ...(input.excludeTopicId ? { id: { not: input.excludeTopicId } } : {}),
    },
    include: {
      cluster: { select: { name: true, strategy: { select: { name: true } } } },
    },
    take: 200,
  });

  const matches: DuplicateTopicMatch[] = [];
  for (const topic of topics) {
    if (normalizePrimaryKeyword(topic.primaryKeyword) === normalized) {
      matches.push({
        id: topic.id,
        title: topic.title,
        primaryKeyword: topic.primaryKeyword,
        clusterName: topic.cluster.name,
        strategyName: topic.cluster.strategy.name,
        matchType: "exact_keyword",
      });
    }
  }
  return matches;
}

function assertPublishedRequirements(input: {
  status: SeoTopicStatus;
  targetEntityType: SeoTargetEntityType;
  targetUrl: string | null;
  targetEntityId: string | null;
}): void {
  if (input.status !== "PUBLISHED") return;
  if (input.targetEntityType === "NONE") {
    throw new Error("Không thể xuất bản chủ đề khi chưa liên kết nội dung đích.");
  }
  if (!input.targetUrl?.trim() && !input.targetEntityId?.trim()) {
    throw new Error("Chủ đề xuất bản cần URL đích hoặc thực thể liên kết.");
  }
}

export async function createSeoTopic(input: {
  clusterId: string;
  title: string;
  primaryKeyword: string;
  searchIntent: SeoSearchIntent;
  contentType: SeoContentType;
  funnelStage: SeoFunnelStage;
  slug?: string | null;
  description?: string | null;
  priority?: SeoTopicPriority;
  status?: SeoTopicStatus;
  targetAudience?: string[];
  businessValue?: number;
  relevanceScore?: number;
  opportunityScore?: number;
  confidenceScore?: number;
  assignedTo?: string | null;
  dueDate?: Date | null;
  allowDuplicate?: boolean;
}): Promise<{ topic: SeoTopicDetail; duplicates: DuplicateTopicMatch[] }> {
  const title = input.title.trim();
  const primaryKeyword = input.primaryKeyword.trim();
  if (!title || !primaryKeyword) throw new Error("Tiêu đề và từ khóa chính là bắt buộc.");

  const cluster = await prisma.seoTopicCluster.findUnique({
    where: { id: input.clusterId },
    select: { id: true, strategyId: true },
  });
  if (!cluster) throw new Error("Không tìm thấy cụm chủ đề.");

  const duplicates = await findDuplicateTopics({
    strategyId: cluster.strategyId,
    primaryKeyword,
    title,
  });
  if (duplicates.some((d) => d.matchType === "exact_keyword") && !input.allowDuplicate) {
    const err = new Error("Từ khóa chính đã tồn tại trong chiến lược này.");
    (err as Error & { duplicates: DuplicateTopicMatch[] }).duplicates = duplicates;
    throw err;
  }

  const row = await prisma.seoTopic.create({
    data: {
      clusterId: input.clusterId,
      title,
      slug: input.slug?.trim() || toSlug(title) || null,
      description: input.description?.trim() || null,
      primaryKeyword,
      searchIntent: input.searchIntent,
      contentType: input.contentType,
      funnelStage: input.funnelStage,
      priority: input.priority ?? "NORMAL",
      status: input.status ?? "IDEA",
      targetAudience: input.targetAudience ?? [],
      businessValue: clampSeoScore(input.businessValue),
      relevanceScore: clampSeoScore(input.relevanceScore),
      opportunityScore: clampSeoScore(input.opportunityScore),
      confidenceScore: clampSeoScore(input.confidenceScore),
      assignedTo: input.assignedTo ?? null,
      dueDate: input.dueDate ?? null,
    },
    include: TOPIC_INCLUDE,
  });

  return { topic: mapTopic(row), duplicates };
}

export async function updateSeoTopic(
  id: string,
  input: Partial<{
    title: string;
    slug: string | null;
    description: string | null;
    primaryKeyword: string;
    searchIntent: SeoSearchIntent;
    contentType: SeoContentType;
    funnelStage: SeoFunnelStage;
    priority: SeoTopicPriority;
    status: SeoTopicStatus;
    targetAudience: string[];
    businessValue: number;
    relevanceScore: number;
    opportunityScore: number;
    confidenceScore: number;
    targetEntityType: SeoTargetEntityType;
    targetEntityId: string | null;
    targetUrl: string | null;
    existingUrl: string | null;
    canonicalUrl: string | null;
    notes: string | null;
    assignedTo: string | null;
    dueDate: Date | null;
    publishedAt: Date | null;
    mediaBundleId: string | null;
    mediaPlanScore: number | null;
    mediaPlanStatus: string | null;
    clusterId: string;
    allowDuplicate: boolean;
  }>,
): Promise<SeoTopicDetail> {
  const existing = await prisma.seoTopic.findUnique({
    where: { id },
    include: { cluster: { select: { strategyId: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy chủ đề SEO.");

  if (input.status && input.status !== existing.status) {
    assertTopicTransition(existing.status, input.status);
  }

  if (input.primaryKeyword && !input.allowDuplicate) {
    const duplicates = await findDuplicateTopics({
      strategyId: existing.cluster.strategyId,
      primaryKeyword: input.primaryKeyword,
      excludeTopicId: id,
    });
    if (duplicates.some((d) => d.matchType === "exact_keyword")) {
      throw new Error("Từ khóa chính đã tồn tại trong chiến lược này.");
    }
  }

  const nextStatus = input.status ?? existing.status;
  const nextEntityType = input.targetEntityType ?? existing.targetEntityType;
  const nextTargetUrl = input.targetUrl !== undefined ? input.targetUrl : existing.targetUrl;
  const nextTargetEntityId =
    input.targetEntityId !== undefined ? input.targetEntityId : existing.targetEntityId;

  assertPublishedRequirements({
    status: nextStatus,
    targetEntityType: nextEntityType,
    targetUrl: nextTargetUrl,
    targetEntityId: nextTargetEntityId,
  });

  const row = await prisma.seoTopic.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.slug !== undefined ? { slug: input.slug?.trim() || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.primaryKeyword !== undefined
        ? { primaryKeyword: input.primaryKeyword.trim() }
        : {}),
      ...(input.searchIntent !== undefined ? { searchIntent: input.searchIntent } : {}),
      ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
      ...(input.funnelStage !== undefined ? { funnelStage: input.funnelStage } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined
        ? {
            status: input.status,
            ...(input.status === "PUBLISHED" && !existing.publishedAt
              ? { publishedAt: new Date() }
              : {}),
          }
        : {}),
      ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
      ...(input.businessValue !== undefined
        ? { businessValue: clampSeoScore(input.businessValue) }
        : {}),
      ...(input.relevanceScore !== undefined
        ? { relevanceScore: clampSeoScore(input.relevanceScore) }
        : {}),
      ...(input.opportunityScore !== undefined
        ? { opportunityScore: clampSeoScore(input.opportunityScore) }
        : {}),
      ...(input.confidenceScore !== undefined
        ? { confidenceScore: clampSeoScore(input.confidenceScore) }
        : {}),
      ...(input.targetEntityType !== undefined ? { targetEntityType: input.targetEntityType } : {}),
      ...(input.targetEntityId !== undefined ? { targetEntityId: input.targetEntityId } : {}),
      ...(input.targetUrl !== undefined ? { targetUrl: input.targetUrl?.trim() || null } : {}),
      ...(input.existingUrl !== undefined ? { existingUrl: input.existingUrl?.trim() || null } : {}),
      ...(input.canonicalUrl !== undefined
        ? { canonicalUrl: input.canonicalUrl?.trim() || null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
      ...(input.mediaBundleId !== undefined ? { mediaBundleId: input.mediaBundleId } : {}),
      ...(input.mediaPlanScore !== undefined ? { mediaPlanScore: input.mediaPlanScore } : {}),
      ...(input.mediaPlanStatus !== undefined ? { mediaPlanStatus: input.mediaPlanStatus } : {}),
      ...(input.clusterId !== undefined ? { clusterId: input.clusterId } : {}),
    },
    include: TOPIC_INCLUDE,
  });
  return mapTopic(row);
}

export async function bulkUpdateSeoTopics(
  ids: string[],
  input: Partial<{
    status: SeoTopicStatus;
    priority: SeoTopicPriority;
    assignedTo: string | null;
    dueDate: Date | null;
  }>,
): Promise<number> {
  if (!ids.length) return 0;
  const result = await prisma.seoTopic.updateMany({
    where: { id: { in: ids } },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.assignedTo !== undefined ? { assignedTo: input.assignedTo } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    },
  });
  return result.count;
}

export async function deleteSeoTopic(id: string): Promise<void> {
  const existing = await prisma.seoTopic.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy chủ đề SEO.");
  if (existing.status === "PUBLISHED") {
    throw new Error("Không thể xóa chủ đề đã xuất bản. Hãy lưu trữ thay vì xóa.");
  }
  await prisma.seoTopic.delete({ where: { id } });
}

export async function exportSeoTopicsCsv(filters: SeoTopicListFilters = {}): Promise<string> {
  const topics = await listSeoTopics(filters);
  const header = [
    "Strategy",
    "Cluster",
    "Topic",
    "Primary keyword",
    "Secondary keywords",
    "Intent",
    "Content type",
    "Funnel",
    "Priority",
    "Status",
    "Business value",
    "Opportunity score",
    "Target URL",
    "Assignee",
    "Due date",
  ];
  const lines = [header.join(",")];
  for (const t of topics) {
    const secondary = (t.keywords as Array<{ keyword: string; keywordType: string }>)
      .filter((k) => k.keywordType !== "PRIMARY")
      .map((k) => k.keyword)
      .join("; ");
    const row = [
      csvEscape(t.strategyName),
      csvEscape(t.clusterName),
      csvEscape(t.title),
      csvEscape(t.primaryKeyword),
      csvEscape(secondary),
      t.searchIntent,
      t.contentType,
      t.funnelStage,
      t.priority,
      t.status,
      String(t.businessValue),
      String(t.opportunityScore),
      csvEscape(t.targetUrl ?? ""),
      csvEscape(t.assignedTo ?? ""),
      t.dueDate ? t.dueDate.slice(0, 10) : "",
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
