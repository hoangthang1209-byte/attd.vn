import { prisma } from "@/lib/prisma";
import { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";

export async function mergeProductionSuppliers(sourceId: string, targetSupplierId: string) {
  if (sourceId === targetSupplierId) {
    throw new ProductionMasterValidationError("Không thể gộp nhà cung cấp với chính nó.");
  }

  const [source, target] = await Promise.all([
    prisma.productionSupplier.findUnique({ where: { id: sourceId } }),
    prisma.productionSupplier.findUnique({ where: { id: targetSupplierId } }),
  ]);

  if (!source) throw new ProductionMasterValidationError("Không tìm thấy nhà cung cấp nguồn.");
  if (!target) throw new ProductionMasterValidationError("Không tìm thấy nhà cung cấp đích.");

  const bomUpdated = await prisma.techPackBomItem.updateMany({
    where: { supplierId: sourceId },
    data: { supplierId: targetSupplierId },
  });

  const materialUpdated = await prisma.productionMaterial.updateMany({
    where: { supplierId: sourceId },
    data: { supplierId: targetSupplierId },
  });

  const trimUpdated = await prisma.productionTrim.updateMany({
    where: { supplierId: sourceId },
    data: { supplierId: targetSupplierId },
  });

  const mergeNote = `Đã gộp vào ${target.code} - ${target.name}.`;
  const notes = source.notes?.trim()
    ? `${source.notes.trim()}\n${mergeNote}`
    : mergeNote;

  await prisma.productionSupplier.update({
    where: { id: sourceId },
    data: { isActive: false, notes },
  });

  return {
    bomUpdated: bomUpdated.count,
    materialUpdated: materialUpdated.count,
    trimUpdated: trimUpdated.count,
    target,
  };
}
