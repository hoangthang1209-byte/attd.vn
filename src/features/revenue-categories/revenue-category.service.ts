import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildRevenueCategoryPath,
  normalizeRevenueCategoryLookup,
} from "@/features/revenue-categories/revenue-category-display";

export class RevenueCategoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevenueCategoryError";
  }
}

export type RevenueCategoryRecord = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  displayPath: string;
  orderItemCount: number;
  quoteItemCount: number;
  children?: RevenueCategoryRecord[];
};

type CategoryRow = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
};

async function countUsages(categoryId: string) {
  const [orderItemCount, quoteItemCount] = await Promise.all([
    prisma.orderItem.count({ where: { revenueCategoryId: categoryId } }),
    prisma.quoteItem.count({ where: { revenueCategoryId: categoryId } }),
  ]);
  return { orderItemCount, quoteItemCount };
}

type RevenueCategoryPathRow = {
  id: string;
  name: string;
  parentId: string | null;
};

async function buildDisplayPath(categoryId: string): Promise<string> {
  const parts: string[] = [];
  let currentId: string | null = categoryId;
  const guard = new Set<string>();

  while (currentId) {
    if (guard.has(currentId)) break;
    guard.add(currentId);
    const row: RevenueCategoryPathRow | null = await prisma.revenueCategory.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    });
    if (!row) break;
    parts.unshift(row.name);
    currentId = row.parentId;
  }

  return parts.join(" > ");
}

export async function getRevenueCategorySnapshots(categoryId: string) {
  const category = await prisma.revenueCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, code: true, name: true, isActive: true },
  });
  if (!category) {
    throw new RevenueCategoryError("Nhóm doanh thu không tồn tại.");
  }
  if (!category.isActive) {
    throw new RevenueCategoryError("Nhóm doanh thu không còn hoạt động.");
  }
  const displayPath = await buildDisplayPath(category.id);
  return {
    revenueCategoryId: category.id,
    revenueCategoryCodeSnapshot: category.code,
    revenueCategoryNameSnapshot: displayPath,
  };
}

export async function resolveRevenueCategoryByLookup(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const byCode = await prisma.revenueCategory.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  if (byCode) return getRevenueCategorySnapshots(byCode.id);

  if (trimmed.includes(">")) {
    const segments = trimmed.split(">").map((s) => s.trim()).filter(Boolean);
    if (!segments.length) return null;
    const leafName = segments[segments.length - 1]!;
    const candidates = await prisma.revenueCategory.findMany({
      where: { isActive: true, name: { equals: leafName, mode: "insensitive" } },
      select: { id: true },
    });
    for (const candidate of candidates) {
      const path = await buildDisplayPath(candidate.id);
      if (normalizeRevenueCategoryLookup(path) === normalizeRevenueCategoryLookup(trimmed)) {
        return getRevenueCategorySnapshots(candidate.id);
      }
    }
    return null;
  }

  const byName = await prisma.revenueCategory.findMany({
    where: { isActive: true, name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName.length === 1) return getRevenueCategorySnapshots(byName[0]!.id);
  return null;
}

async function assertNoCircularParent(categoryId: string, parentId: string | null) {
  if (!parentId) return;
  if (parentId === categoryId) {
    throw new RevenueCategoryError("Không thể chọn chính nhóm này làm nhóm cha.");
  }
  let currentId: string | null = parentId;
  const guard = new Set<string>();
  while (currentId) {
    if (guard.has(currentId)) break;
    guard.add(currentId);
    if (currentId === categoryId) {
      throw new RevenueCategoryError("Cấu trúc nhóm doanh thu bị vòng lặp.");
    }
    const parent: { parentId: string | null } | null = await prisma.revenueCategory.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = parent?.parentId ?? null;
  }
}

function toRecord(
  row: CategoryRow,
  displayPath: string,
  usage: { orderItemCount: number; quoteItemCount: number },
): RevenueCategoryRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    parentId: row.parentId,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    displayPath,
    orderItemCount: usage.orderItemCount,
    quoteItemCount: usage.quoteItemCount,
  };
}

export async function listRevenueCategories(options?: { activeOnly?: boolean; search?: string }) {
  const rows = await prisma.revenueCategory.findMany({
    where: {
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(options?.search?.trim()
        ? {
            OR: [
              { name: { contains: options.search.trim(), mode: "insensitive" } },
              { code: { contains: options.search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const pathCache = new Map<string, string>();

  function pathFor(id: string): string {
    const cached = pathCache.get(id);
    if (cached) return cached;
    const parts: string[] = [];
    let current: string | null = id;
    const guard = new Set<string>();
    while (current) {
      if (guard.has(current)) break;
      guard.add(current);
      const row = byId.get(current);
      if (!row) break;
      parts.unshift(row.name);
      current = row.parentId;
    }
    const path = parts.join(" > ");
    pathCache.set(id, path);
    return path;
  }

  const usageEntries = await Promise.all(
    rows.map(async (row) => [row.id, await countUsages(row.id)] as const),
  );
  const usageById = new Map(usageEntries);

  const flat = rows.map((row) =>
    toRecord(row, pathFor(row.id), usageById.get(row.id) ?? { orderItemCount: 0, quoteItemCount: 0 }),
  );

  const childrenByParent = new Map<string | null, RevenueCategoryRecord[]>();
  for (const row of flat) {
    const key = row.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(row);
    childrenByParent.set(key, list);
  }

  function buildTree(parentId: string | null): RevenueCategoryRecord[] {
    return (childrenByParent.get(parentId) ?? []).map((row) => ({
      ...row,
      children: buildTree(row.id),
    }));
  }

  return { flat, tree: buildTree(null) };
}

export async function createRevenueCategory(input: {
  code: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  sortOrder?: number;
}) {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) throw new RevenueCategoryError("Mã và tên nhóm doanh thu là bắt buộc.");
  if (input.parentId) await assertNoCircularParent("new", input.parentId);

  const created = await prisma.revenueCategory.create({
    data: {
      code,
      name,
      parentId: input.parentId ?? null,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  const usage = await countUsages(created.id);
  return toRecord(created, await buildDisplayPath(created.id), usage);
}

export async function updateRevenueCategory(
  id: string,
  input: {
    code?: string;
    name?: string;
    parentId?: string | null;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const existing = await prisma.revenueCategory.findUnique({ where: { id } });
  if (!existing) throw new RevenueCategoryError("Không tìm thấy nhóm doanh thu.");

  if (input.parentId !== undefined) {
    await assertNoCircularParent(id, input.parentId);
  }

  const updated = await prisma.revenueCategory.update({
    where: { id },
    data: {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  const usage = await countUsages(updated.id);
  return toRecord(updated, await buildDisplayPath(updated.id), usage);
}

export async function deleteRevenueCategory(id: string) {
  const existing = await prisma.revenueCategory.findUnique({ where: { id } });
  if (!existing) throw new RevenueCategoryError("Không tìm thấy nhóm doanh thu.");
  if (existing.isSystem) {
    throw new RevenueCategoryError("Không thể xóa nhóm doanh thu hệ thống.");
  }

  const usage = await countUsages(id);
  if (usage.orderItemCount > 0 || usage.quoteItemCount > 0) {
    throw new RevenueCategoryError(
      "Nhóm doanh thu đã được sử dụng. Vui lòng ngừng hoạt động thay vì xóa.",
    );
  }

  const childCount = await prisma.revenueCategory.count({ where: { parentId: id } });
  if (childCount > 0) {
    throw new RevenueCategoryError("Không thể xóa nhóm doanh thu còn nhóm con.");
  }

  await prisma.revenueCategory.delete({ where: { id } });
}

export type RevenueCategoryPickerOption = {
  id: string;
  code: string;
  name: string;
  displayPath: string;
  parentId: string | null;
  isActive: boolean;
};

export async function listRevenueCategoryPickerOptions(): Promise<RevenueCategoryPickerOption[]> {
  const { flat } = await listRevenueCategories({ activeOnly: true });
  return flat.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    displayPath: row.displayPath,
    parentId: row.parentId,
    isActive: row.isActive,
  }));
}
