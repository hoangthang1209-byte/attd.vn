import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  generateMasterCode,
  ProductionMasterValidationError,
} from "@/features/production-master/production-master.errors";
import { getProductionMaterialUsageCount } from "@/features/production-master/production-master-usage";

const INCLUDE = { supplier: { select: { id: true, code: true, name: true } } } satisfies Prisma.ProductionMaterialInclude;

export async function listProductionMaterials(input?: {
  search?: string;
  activeOnly?: boolean;
  inactiveOnly?: boolean;
  category?: string;
}) {
  const where: Prisma.ProductionMaterialWhereInput = {};
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
      { composition: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.productionMaterial.findMany({
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

export async function getProductionMaterial(id: string) {
  const item = await prisma.productionMaterial.findUnique({ where: { id }, include: INCLUDE });
  if (!item) return null;
  const usage = await getProductionMaterialUsageCount(id);
  return {
    ...item,
    usageCount: usage.bomCount,
    usageBreakdown: { techPackBom: usage.bomCount },
  };
}

export async function createProductionMaterial(input: {
  name: string;
  category?: string;
  composition?: string | null;
  gsm?: string | null;
  width?: string | null;
  supplierId?: string | null;
  defaultColor?: string | null;
  notes?: string | null;
  isActive?: boolean;
}) {
  const name = input.name?.trim();
  if (!name) throw new ProductionMasterValidationError("Tên vật liệu là bắt buộc.");
  const code = await generateMasterCode("PM", "productionMaterial");
  return prisma.productionMaterial.create({
    data: {
      code,
      name,
      category: (input.category as never) ?? "OTHER",
      composition: input.composition?.trim() || null,
      gsm: input.gsm?.trim() || null,
      width: input.width?.trim() || null,
      supplierId: input.supplierId || null,
      defaultColor: input.defaultColor?.trim() || null,
      notes: input.notes?.trim() || null,
      isActive: input.isActive ?? true,
    },
    include: INCLUDE,
  });
}

export async function updateProductionMaterial(
  id: string,
  input: Partial<{
    name: string;
    category: string;
    composition: string | null;
    gsm: string | null;
    width: string | null;
    supplierId: string | null;
    defaultColor: string | null;
    notes: string | null;
    isActive: boolean;
  }>,
) {
  const existing = await prisma.productionMaterial.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy vật liệu.");
  return prisma.productionMaterial.update({
    where: { id },
    data: {
      name: input.name?.trim() ?? undefined,
      category: input.category as never,
      composition: input.composition,
      gsm: input.gsm,
      width: input.width,
      supplierId: input.supplierId,
      defaultColor: input.defaultColor,
      notes: input.notes,
      isActive: input.isActive,
    },
    include: INCLUDE,
  });
}

export { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
