import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateMasterCode,
  ProductionMasterValidationError,
} from "@/features/production-master/production-master.errors";

import { getProductionTrimUsageCount } from "@/features/production-master/production-master-usage";

const INCLUDE = { supplier: { select: { id: true, code: true, name: true } } } satisfies Prisma.ProductionTrimInclude;

export async function listProductionTrims(input?: {
  search?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  category?: string;
}) {
  const where: Prisma.ProductionTrimWhereInput = {};
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
    ];
  }
  const items = await prisma.productionTrim.findMany({
    where,
    include: {
      ...INCLUDE,
      _count: { select: { bomItems: true } },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return {
    items: items.map(({ _count, ...item }) => ({
      ...item,
      usageCount: _count.bomItems,
    })),
  };
}

export async function getProductionTrim(id: string) {
  const item = await prisma.productionTrim.findUnique({ where: { id }, include: INCLUDE });
  if (!item) return null;
  const usage = await getProductionTrimUsageCount(id);
  return {
    ...item,
    usageCount: usage.bomCount,
    usageBreakdown: { techPackBom: usage.bomCount },
  };
}

export async function createProductionTrim(input: {
  name: string;
  category?: string;
  supplierId?: string | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  const name = input.name?.trim();
  if (!name) throw new ProductionMasterValidationError("Tên phụ liệu là bắt buộc.");
  const code = await generateMasterCode("PT", "productionTrim");
  return prisma.productionTrim.create({
    data: {
      code,
      name,
      category: (input.category as never) ?? "OTHER",
      supplierId: input.supplierId || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive ?? true,
    },
    include: INCLUDE,
  });
}

export async function updateProductionTrim(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    supplierId: string | null;
    notes: string | null;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.productionTrim.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy phụ liệu.");
  return prisma.productionTrim.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      category: input.category as never,
      supplierId: input.supplierId,
      notes: input.notes,
      isActive: input.isActive,
    },
    include: INCLUDE,
  });
}

export { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
