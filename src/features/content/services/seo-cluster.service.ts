import "server-only";

import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

export type SeoClusterListItem = {
  id: string;
  strategyId: string;
  parentId: string | null;
  code: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  pillarTopic: string | null;
  targetAudience: string[];
  businessGoals: string[];
  sortOrder: number;
  isActive: boolean;
  topicCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
};

function mapCluster(row: {
  id: string;
  strategyId: string;
  parentId: string | null;
  code: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  pillarTopic: string | null;
  targetAudience: string[];
  businessGoals: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { topics: number; children: number };
}): SeoClusterListItem {
  return {
    id: row.id,
    strategyId: row.strategyId,
    parentId: row.parentId,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    pillarTopic: row.pillarTopic,
    targetAudience: row.targetAudience,
    businessGoals: row.businessGoals,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    topicCount: row._count?.topics ?? 0,
    childCount: row._count?.children ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSeoClusters(params: {
  strategyId?: string;
  parentId?: string | null;
  activeOnly?: boolean;
}): Promise<SeoClusterListItem[]> {
  const rows = await prisma.seoTopicCluster.findMany({
    where: {
      ...(params.strategyId ? { strategyId: params.strategyId } : {}),
      ...(params.parentId !== undefined ? { parentId: params.parentId } : {}),
      ...(params.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { topics: true, children: true } } },
  });
  return rows.map(mapCluster);
}

export async function getSeoClusterById(id: string): Promise<SeoClusterListItem | null> {
  const row = await prisma.seoTopicCluster.findUnique({
    where: { id },
    include: { _count: { select: { topics: true, children: true } } },
  });
  return row ? mapCluster(row) : null;
}

export async function createSeoCluster(input: {
  strategyId: string;
  name: string;
  parentId?: string | null;
  code?: string | null;
  slug?: string | null;
  description?: string | null;
  pillarTopic?: string | null;
  targetAudience?: string[];
  businessGoals?: string[];
  sortOrder?: number;
  isActive?: boolean;
}): Promise<SeoClusterListItem> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên cụm chủ đề là bắt buộc.");

  const strategy = await prisma.seoStrategy.findUnique({ where: { id: input.strategyId } });
  if (!strategy) throw new Error("Không tìm thấy chiến lược SEO.");

  if (input.parentId) {
    const parent = await prisma.seoTopicCluster.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.strategyId !== input.strategyId) {
      throw new Error("Cụm cha không hợp lệ.");
    }
    if (parent.parentId) {
      throw new Error("Chỉ hỗ trợ tối đa 2 cấp cụm chủ đề.");
    }
  }

  const row = await prisma.seoTopicCluster.create({
    data: {
      strategyId: input.strategyId,
      parentId: input.parentId ?? null,
      name,
      code: input.code?.trim() || null,
      slug: input.slug?.trim() || toSlug(name) || null,
      description: input.description?.trim() || null,
      pillarTopic: input.pillarTopic?.trim() || null,
      targetAudience: input.targetAudience ?? [],
      businessGoals: input.businessGoals ?? [],
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    include: { _count: { select: { topics: true, children: true } } },
  });
  return mapCluster(row);
}

export async function updateSeoCluster(
  id: string,
  input: Partial<{
    name: string;
    parentId: string | null;
    code: string | null;
    slug: string | null;
    description: string | null;
    pillarTopic: string | null;
    targetAudience: string[];
    businessGoals: string[];
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<SeoClusterListItem> {
  const existing = await prisma.seoTopicCluster.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy cụm chủ đề.");

  if (input.parentId === id) throw new Error("Cụm không thể là cha của chính nó.");

  if (input.parentId) {
    const parent = await prisma.seoTopicCluster.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.strategyId !== existing.strategyId) {
      throw new Error("Cụm cha không hợp lệ.");
    }
    if (parent.parentId) throw new Error("Chỉ hỗ trợ tối đa 2 cấp cụm chủ đề.");
  }

  const row = await prisma.seoTopicCluster.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
      ...(input.slug !== undefined ? { slug: input.slug?.trim() || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.pillarTopic !== undefined
        ? { pillarTopic: input.pillarTopic?.trim() || null }
        : {}),
      ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
      ...(input.businessGoals !== undefined ? { businessGoals: input.businessGoals } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { _count: { select: { topics: true, children: true } } },
  });
  return mapCluster(row);
}

export async function deleteSeoCluster(id: string): Promise<void> {
  const existing = await prisma.seoTopicCluster.findUnique({
    where: { id },
    include: { _count: { select: { topics: true, children: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy cụm chủ đề.");
  if (existing._count.topics > 0) {
    throw new Error("Không thể xóa cụm đang có chủ đề. Hãy vô hiệu hóa hoặc di chuyển chủ đề trước.");
  }
  if (existing._count.children > 0) {
    throw new Error("Không thể xóa cụm đang có cụm con.");
  }
  await prisma.seoTopicCluster.delete({ where: { id } });
}
