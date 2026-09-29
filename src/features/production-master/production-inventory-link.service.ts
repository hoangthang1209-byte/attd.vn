import { prisma } from "@/lib/prisma";
import { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";

export async function validateInventoryMaterialLink(input: {
  inventoryMaterialId: string | null;
  productionMaterialId?: string;
  productionTrimId?: string;
}) {
  if (!input.inventoryMaterialId) return;

  const [material, materialLink, trimLink] = await Promise.all([
    prisma.material.findUnique({
      where: { id: input.inventoryMaterialId },
      select: { id: true, isActive: true },
    }),
    prisma.productionMaterial.findFirst({
      where: {
        inventoryMaterialId: input.inventoryMaterialId,
        ...(input.productionMaterialId ? { id: { not: input.productionMaterialId } } : {}),
      },
      select: { id: true, code: true, name: true },
    }),
    prisma.productionTrim.findFirst({
      where: {
        inventoryMaterialId: input.inventoryMaterialId,
        ...(input.productionTrimId ? { id: { not: input.productionTrimId } } : {}),
      },
      select: { id: true, code: true, name: true },
    }),
  ]);

  if (!material) {
    throw new ProductionMasterValidationError("Không tìm thấy vật tư kho được chọn.");
  }
  if (!material.isActive) {
    throw new ProductionMasterValidationError("Vật tư kho đã ngừng sử dụng.");
  }
  if (materialLink) {
    throw new ProductionMasterValidationError(
      `Vật tư kho đang liên kết với nguyên liệu ${materialLink.code} — ${materialLink.name}.`,
    );
  }
  if (trimLink) {
    throw new ProductionMasterValidationError(
      `Vật tư kho đang liên kết với phụ liệu ${trimLink.code} — ${trimLink.name}.`,
    );
  }
}
