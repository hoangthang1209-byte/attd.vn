import { prisma } from "@/lib/prisma";

export async function getProductionMaterialUsageCount(id: string) {
  const bomCount = await prisma.techPackBomItem.count({ where: { materialId: id } });
  return { bomCount };
}

export async function getProductionTrimUsageCount(id: string) {
  const bomCount = await prisma.techPackBomItem.count({ where: { trimId: id } });
  return { bomCount };
}

export async function getProductionSupplierUsageCount(id: string) {
  const [bomCount, materialCount, trimCount, patternCount] = await Promise.all([
    prisma.techPackBomItem.count({ where: { supplierId: id } }),
    prisma.productionMaterial.count({ where: { supplierId: id } }),
    prisma.productionTrim.count({ where: { supplierId: id } }),
    prisma.pattern.count({ where: { patternSupplierId: id } }),
  ]);
  return {
    bomCount,
    materialCount,
    trimCount,
    patternCount,
    total: bomCount + materialCount + trimCount + patternCount,
  };
}

export async function getPrintMethodUsageCount(id: string) {
  const placementCount = await prisma.techPackArtworkPlacement.count({ where: { printMethodId: id } });
  return { placementCount };
}

export async function isProductionMaterialReferenced(id: string) {
  const { bomCount } = await getProductionMaterialUsageCount(id);
  return bomCount > 0;
}

export async function isProductionTrimReferenced(id: string) {
  const { bomCount } = await getProductionTrimUsageCount(id);
  return bomCount > 0;
}

export async function isProductionSupplierReferenced(id: string) {
  const { total } = await getProductionSupplierUsageCount(id);
  return total > 0;
}

export async function isPrintMethodReferenced(id: string) {
  const { placementCount } = await getPrintMethodUsageCount(id);
  return placementCount > 0;
}
