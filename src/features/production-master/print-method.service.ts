import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateMasterCode,
  ProductionMasterValidationError,
} from "@/features/production-master/production-master.errors";

import { getPrintMethodUsageCount } from "@/features/production-master/production-master-usage";

export async function listPrintMethods(input?: {
  search?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  category?: string;
}) {
  const where: Prisma.PrintMethodWhereInput = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.inactiveOnly) where.isActive = false;
  if (input?.category?.trim()) {
    where.category = input.category.trim() as never;
  }
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.printMethod.findMany({
    where,
    include: {
      _count: { select: { artworkPlacements: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return {
    items: items.map(({ _count, ...item }) => ({
      ...item,
      usageCount: _count.artworkPlacements,
    })),
  };
}

export async function getPrintMethod(id: string) {
  const item = await prisma.printMethod.findUnique({ where: { id } });
  if (!item) return null;
  const usage = await getPrintMethodUsageCount(id);
  return {
    ...item,
    usageCount: usage.placementCount,
    usageBreakdown: { artworkPlacements: usage.placementCount },
  };
}

export async function createPrintMethod(input: {
  name: string;
  category?: string;
  description?: string | null;
  isActive?: boolean;
}) {
  const name = input.name?.trim();
  if (!name) throw new ProductionMasterValidationError("Tên công nghệ in là bắt buộc.");
  const code = await generateMasterCode("PR", "printMethod");
  return prisma.printMethod.create({
    data: {
      code,
      name,
      category: (input.category as never) ?? "OTHER",
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updatePrintMethod(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    description: string | null;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.printMethod.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy công nghệ in.");
  return prisma.printMethod.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      category: input.category as never,
      description: input.description,
      isActive: input.isActive,
    },
  });
}

export { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
