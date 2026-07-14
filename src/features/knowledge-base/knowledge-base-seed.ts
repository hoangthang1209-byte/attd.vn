import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDashboardKpis } from "@/features/knowledge-base/knowledge-base-completeness-checklist";
import { calculateKnowledgeCompleteness } from "@/features/knowledge-base/knowledge-base-utils";
import {
  buildKnowledgeEntrySnapshot,
  createKnowledgeEntryVersion,
} from "@/features/knowledge-base/knowledge-base-version.service";

export const DEFAULT_KNOWLEDGE_CATEGORIES = [
  {
    name: "Thông tin công ty",
    slug: "company",
    description: "Thông tin nền tảng về ATTD, định vị, năng lực, thương hiệu.",
    sortOrder: 1,
  },
  {
    name: "Sản phẩm & chất liệu",
    slug: "products-materials",
    description: "Dữ liệu về sản phẩm, chất liệu, form áo, màu sắc, size, ứng dụng.",
    sortOrder: 2,
  },
  {
    name: "Sản xuất & OEM",
    slug: "manufacturing-oem",
    description: "Năng lực sản xuất, OEM, quy trình, MOQ, lead time, QC.",
    sortOrder: 3,
  },
  {
    name: "Bán sỉ & đại lý",
    slug: "wholesale-dealer",
    description: "Chính sách bán sỉ, đại lý, nguồn hàng, hỗ trợ đối tác.",
    sortOrder: 4,
  },
  {
    name: "Chính sách & quy trình",
    slug: "policies-processes",
    description: "Quy trình đặt hàng, thanh toán, giao hàng, đổi trả, bảo hành.",
    sortOrder: 5,
  },
  {
    name: "Case study & khách hàng",
    slug: "case-studies",
    description: "Dự án thực tế, khách hàng, ứng dụng sản phẩm.",
    sortOrder: 6,
  },
  {
    name: "FAQ & tư vấn",
    slug: "faq-advisory",
    description: "Câu hỏi thường gặp và nội dung tư vấn bán hàng.",
    sortOrder: 7,
  },
  {
    name: "Brand voice & SEO context",
    slug: "brand-seo",
    description: "Giọng thương hiệu, positioning, thông điệp SEO, cụm chủ đề ưu tiên.",
    sortOrder: 8,
  },
] as const;

export async function ensureDefaultKnowledgeCategories() {
  for (const category of DEFAULT_KNOWLEDGE_CATEGORIES) {
    await prisma.knowledgeBaseCategory.upsert({
      where: { slug: category.slug },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });
  }
}

export async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const category = await prisma.knowledgeBaseCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
  return category?.id ?? null;
}

export type KnowledgeBaseListParams = {
  search?: string;
  categoryId?: string;
  type?: string;
  status?: string;
  usageScope?: string;
  priority?: string;
  visibility?: string;
  claimStatus?: string;
  domain?: string;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

function mapEntry(
  entry: Prisma.KnowledgeBaseEntryGetPayload<{
    include: {
      category: { select: { id: true; name: true; slug: true } };
      source: { select: { id: true; name: true; url: true; type: true; note: true } };
    };
  }>
) {
  return {
    ...entry,
    structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
    verifiedAt: entry.verifiedAt?.toISOString() ?? null,
    approvedAt: entry.approvedAt?.toISOString() ?? null,
    lastVerifiedAt: entry.lastVerifiedAt?.toISOString() ?? null,
    nextReviewAt: entry.nextReviewAt?.toISOString() ?? null,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: entry.category,
    source: entry.source ?? null,
  };
}

const entryInclude = {
  category: { select: { id: true, name: true, slug: true } },
  source: { select: { id: true, name: true, url: true, type: true, note: true } },
} as const;

export async function listKnowledgeBaseEntries(params: KnowledgeBaseListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
  const where: Prisma.KnowledgeBaseEntryWhereInput = {};

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.type) where.type = params.type as Prisma.KnowledgeBaseEntryWhereInput["type"];
  if (params.status) where.status = params.status as Prisma.KnowledgeBaseEntryWhereInput["status"];
  if (params.priority) where.priority = params.priority as Prisma.KnowledgeBaseEntryWhereInput["priority"];
  if (params.visibility) where.visibility = params.visibility as Prisma.KnowledgeBaseEntryWhereInput["visibility"];
  if (params.claimStatus) where.claimStatus = params.claimStatus as Prisma.KnowledgeBaseEntryWhereInput["claimStatus"];
  if (params.domain?.trim()) where.domain = params.domain.trim();
  if (params.verifiedOnly) where.isVerified = true;
  if (params.usageScope) where.usageScope = { has: params.usageScope };
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
      { aliases: { has: q } },
      { domain: { contains: q, mode: "insensitive" } },
    ];
  }

  const [entries, total] = await Promise.all([
    prisma.knowledgeBaseEntry.findMany({
      where,
      include: entryInclude,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.knowledgeBaseEntry.count({ where }),
  ]);

  return { entries: entries.map(mapEntry), total, page, pageSize };
}

export async function getKnowledgeBaseEntryById(id: string) {
  const entry = await prisma.knowledgeBaseEntry.findUnique({
    where: { id },
    include: entryInclude,
  });
  return entry ? mapEntry(entry) : null;
}

export async function createKnowledgeBaseEntry(
  data: Prisma.KnowledgeBaseEntryUncheckedCreateInput
) {
  const entry = await prisma.knowledgeBaseEntry.create({
    data: {
      ...data,
      verifiedAt: data.isVerified ? new Date() : null,
    },
    include: entryInclude,
  });
  return mapEntry(entry);
}

export async function updateKnowledgeBaseEntry(
  id: string,
  data: Prisma.KnowledgeBaseEntryUncheckedUpdateInput
) {
  const existing = await prisma.knowledgeBaseEntry.findUnique({ where: { id } });
  if (!existing) throw new Error("ENTRY_NOT_FOUND");

  const isVerified = typeof data.isVerified === "boolean" ? data.isVerified : existing.isVerified;
  const now = new Date();
  const wasVerified = existing.isVerified;
  const becomingVerified = isVerified && !wasVerified;
  const nextVersion = becomingVerified ? existing.version + 1 : existing.version;

  const entry = await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: {
      ...data,
      version: nextVersion,
      verifiedAt:
        isVerified && !existing.verifiedAt
          ? now
          : isVerified
            ? existing.verifiedAt ?? now
            : null,
      lastVerifiedAt: isVerified ? now : existing.lastVerifiedAt,
      approvedAt:
        typeof data.approvedBy === "string" && data.approvedBy.trim()
          ? existing.approvedAt ?? now
          : data.approvedAt === null
            ? null
            : existing.approvedAt,
    },
    include: entryInclude,
  });

  if (becomingVerified) {
    const snapshot = buildKnowledgeEntrySnapshot({
      title: entry.title,
      summary: entry.summary,
      content: entry.content,
      structuredData: entry.structuredData,
      type: entry.type,
      status: entry.status,
      visibility: entry.visibility,
      claimStatus: entry.claimStatus,
      confidence: entry.confidence,
      tags: entry.tags,
      aliases: entry.aliases,
      version: entry.version,
      isVerified: entry.isVerified,
      evidenceUrl: entry.evidenceUrl,
      approvedBy: entry.approvedBy,
      approvedAt: entry.approvedAt,
    });
    await createKnowledgeEntryVersion({
      entryId: entry.id,
      version: entry.version,
      snapshot,
      approvedBy: entry.approvedBy,
      approvedAt: entry.approvedAt,
      changeNote: "Auto-snapshot on verification",
    });
  }

  return mapEntry(entry);
}

export async function deleteKnowledgeBaseEntry(id: string) {
  await prisma.knowledgeBaseEntry.delete({ where: { id } });
}

export async function listKnowledgeBaseCategories() {
  const categories = await prisma.knowledgeBaseCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { entries: true } } },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    entryCount: category._count.entries,
  }));
}

export async function createKnowledgeBaseCategory(data: {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}) {
  const category = await prisma.knowledgeBaseCategory.create({ data });
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function updateKnowledgeBaseCategory(
  id: string,
  data: Prisma.KnowledgeBaseCategoryUpdateInput
) {
  const category = await prisma.knowledgeBaseCategory.update({ where: { id }, data });
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function deleteKnowledgeBaseCategory(id: string) {
  const count = await prisma.knowledgeBaseEntry.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new Error("CATEGORY_HAS_ENTRIES");
  }
  await prisma.knowledgeBaseCategory.delete({ where: { id } });
}

export async function getKnowledgeBaseKpisFromDb() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    totalEntries,
    activeEntries,
    verifiedEntries,
    draftEntries,
    highPriorityEntries,
    allEntries,
    entriesAddedThisWeek,
    lastImport,
  ] = await Promise.all([
      prisma.knowledgeBaseEntry.count(),
      prisma.knowledgeBaseEntry.count({ where: { status: "ACTIVE" } }),
      prisma.knowledgeBaseEntry.count({ where: { isVerified: true } }),
      prisma.knowledgeBaseEntry.count({ where: { status: "DRAFT" } }),
      prisma.knowledgeBaseEntry.count({ where: { priority: "HIGH" } }),
      prisma.knowledgeBaseEntry.findMany({
        select: {
          title: true,
          summary: true,
          content: true,
          structuredData: true,
          tags: true,
          categoryId: true,
          type: true,
          isVerified: true,
        },
      }),
      prisma.knowledgeBaseEntry.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.knowledgeBaseImportJob.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, fileName: true },
      }),
    ]);

  const scoredEntries = allEntries.map((entry) => ({
    isVerified: entry.isVerified,
    completenessScore: calculateKnowledgeCompleteness({
      ...entry,
      structuredData: (entry.structuredData as Record<string, unknown> | null) ?? null,
    }),
  }));

  const dashboardKpis = computeDashboardKpis(scoredEntries);
  const aiReadyScore = dashboardKpis.aiReadyPercent;

  return {
    totalEntries,
    activeEntries,
    verifiedEntries,
    draftEntries,
    highPriorityEntries,
    aiReadyScore,
    verifiedPercent: dashboardKpis.verifiedPercent,
    aiReadyPercent: dashboardKpis.aiReadyPercent,
    missingDataCount: dashboardKpis.missingDataCount,
    lastImportAt: lastImport?.createdAt.toISOString() ?? null,
    lastImportFilename: lastImport?.fileName ?? null,
    entriesAddedThisWeek,
  };
}
