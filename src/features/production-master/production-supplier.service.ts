import { Prisma, SupplierCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateMasterCode,
  ProductionMasterValidationError,
} from "@/features/production-master/production-master.errors";
import { parseSupplierCategory } from "@/features/patterns/pattern-supplier-snapshots";

import { getProductionSupplierUsageCount } from "@/features/production-master/production-master-usage";

export async function listProductionSuppliers(input?: {
  search?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  category?: string;
}) {
  const where: Prisma.ProductionSupplierWhereInput = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.inactiveOnly) where.isActive = false;
  const category = parseSupplierCategory(input?.category);
  if (category) where.category = category;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { contact: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.productionSupplier.findMany({
    where,
    include: {
      _count: {
        select: {
          bomItems: true,
          materials: true,
          trims: true,
          patterns: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return {
    items: items.map(({ _count, ...item }) => ({
      ...item,
      usageCount: _count.bomItems + _count.materials + _count.trims + _count.patterns,
      patternCount: _count.patterns,
    })),
  };
}

export async function getProductionSupplier(id: string) {
  const item = await prisma.productionSupplier.findUnique({ where: { id } });
  if (!item) return null;
  const usage = await getProductionSupplierUsageCount(id);
  return {
    ...item,
    usageCount: usage.total,
    usageBreakdown: {
      techPackBom: usage.bomCount,
      materialCount: usage.materialCount,
      trimCount: usage.trimCount,
      patternCount: usage.patternCount,
    },
  };
}

export async function createProductionSupplier(input: {
  name: string;
  category?: SupplierCategory;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  const name = input.name?.trim();
  if (!name) throw new ProductionMasterValidationError("Tên nhà cung cấp là bắt buộc.");
  const code = await generateMasterCode("PS", "productionSupplier");
  return prisma.productionSupplier.create({
    data: {
      code,
      name,
      category: input.category ?? SupplierCategory.GENERAL,
      contact: input.contact?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateProductionSupplier(
  id: string,
  input: Partial<{
    name: string;
    category: SupplierCategory;
    contact: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.productionSupplier.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy nhà cung cấp.");
  return prisma.productionSupplier.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      category: input.category,
      contact: input.contact,
      email: input.email,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
      isActive: input.isActive,
    },
  });
}

export { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
