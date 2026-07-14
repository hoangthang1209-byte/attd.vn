import "server-only";

import type { SeoStrategyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertStrategyTransition } from "@/features/content/seo/seo-status-transitions";

export type SeoStrategyListItem = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: SeoStrategyStatus;
  startDate: string | null;
  endDate: string | null;
  ownerId: string | null;
  sortOrder: number;
  clusterCount: number;
  topicCount: number;
  publishedCount: number;
  approvedCount: number;
  overdueCount: number;
  createdAt: string;
  updatedAt: string;
};

function mapStrategy(row: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: SeoStrategyStatus;
  startDate: Date | null;
  endDate: Date | null;
  ownerId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { clusters: number };
}): Omit<SeoStrategyListItem, "topicCount" | "publishedCount" | "approvedCount" | "overdueCount"> {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    ownerId: row.ownerId,
    sortOrder: row.sortOrder,
    clusterCount: row._count?.clusters ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function enrichStrategyCounts(strategyId: string): Promise<{
  topicCount: number;
  publishedCount: number;
  approvedCount: number;
  overdueCount: number;
}> {
  const now = new Date();
  const [topicCount, publishedCount, approvedCount, overdueCount] = await Promise.all([
    prisma.seoTopic.count({ where: { cluster: { strategyId } } }),
    prisma.seoTopic.count({ where: { cluster: { strategyId }, status: "PUBLISHED" } }),
    prisma.seoTopic.count({
      where: { cluster: { strategyId }, status: { in: ["APPROVED", "BRIEF_READY"] } },
    }),
    prisma.seoTopic.count({
      where: {
        cluster: { strategyId },
        dueDate: { lt: now },
        status: { notIn: ["PUBLISHED", "ARCHIVED", "REJECTED"] },
      },
    }),
  ]);
  return { topicCount, publishedCount, approvedCount, overdueCount };
}

export async function listSeoStrategies(params?: {
  search?: string;
  status?: SeoStrategyStatus;
}): Promise<SeoStrategyListItem[]> {
  const rows = await prisma.seoStrategy.findMany({
    where: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.search?.trim()
        ? {
            OR: [
              { name: { contains: params.search.trim(), mode: "insensitive" } },
              { code: { contains: params.search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { clusters: true } } },
  });

  return Promise.all(
    rows.map(async (row) => {
      const counts = await enrichStrategyCounts(row.id);
      return { ...mapStrategy(row), ...counts };
    }),
  );
}

export async function getSeoStrategyById(id: string): Promise<SeoStrategyListItem | null> {
  const row = await prisma.seoStrategy.findUnique({
    where: { id },
    include: { _count: { select: { clusters: true } } },
  });
  if (!row) return null;
  const counts = await enrichStrategyCounts(row.id);
  return { ...mapStrategy(row), ...counts };
}

export async function createSeoStrategy(input: {
  name: string;
  code?: string | null;
  description?: string | null;
  status?: SeoStrategyStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  ownerId?: string | null;
  sortOrder?: number;
}): Promise<SeoStrategyListItem> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên chiến lược là bắt buộc.");

  const code = input.code?.trim() || null;
  if (code) {
    const dup = await prisma.seoStrategy.findUnique({ where: { code } });
    if (dup) throw new Error("Mã chiến lược đã tồn tại.");
  }

  const row = await prisma.seoStrategy.create({
    data: {
      name,
      code,
      description: input.description?.trim() || null,
      status: input.status ?? "DRAFT",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      ownerId: input.ownerId ?? null,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { _count: { select: { clusters: true } } },
  });
  return { ...mapStrategy(row), topicCount: 0, publishedCount: 0, approvedCount: 0, overdueCount: 0 };
}

export async function updateSeoStrategy(
  id: string,
  input: Partial<{
    name: string;
    code: string | null;
    description: string | null;
    status: SeoStrategyStatus;
    startDate: Date | null;
    endDate: Date | null;
    ownerId: string | null;
    sortOrder: number;
  }>,
): Promise<SeoStrategyListItem> {
  const existing = await prisma.seoStrategy.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy chiến lược SEO.");

  if (input.status && input.status !== existing.status) {
    assertStrategyTransition(existing.status, input.status);
  }

  if (input.code) {
    const dup = await prisma.seoStrategy.findUnique({ where: { code: input.code } });
    if (dup && dup.id !== id) throw new Error("Mã chiến lược đã tồn tại.");
  }

  const row = await prisma.seoStrategy.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: { _count: { select: { clusters: true } } },
  });
  const counts = await enrichStrategyCounts(id);
  return { ...mapStrategy(row), ...counts };
}

export async function archiveSeoStrategy(id: string): Promise<void> {
  await updateSeoStrategy(id, { status: "ARCHIVED" });
}

export async function deleteSeoStrategy(id: string): Promise<void> {
  const existing = await prisma.seoStrategy.findUnique({
    where: { id },
    include: { clusters: { include: { _count: { select: { topics: true } } } } },
  });
  if (!existing) throw new Error("Không tìm thấy chiến lược SEO.");

  const topicCount = existing.clusters.reduce((sum, c) => sum + c._count.topics, 0);
  if (topicCount > 0) {
    throw new Error(
      `Không thể xóa chiến lược có ${topicCount} chủ đề. Hãy lưu trữ thay vì xóa.`,
    );
  }
  await prisma.seoStrategy.delete({ where: { id } });
}
