import { prisma } from "@/lib/prisma";
import { ProductionMasterValidationError } from "@/features/production-master/production-master.errors";
import {
  isProductionMaterialReferenced,
  isProductionTrimReferenced,
  isProductionSupplierReferenced,
  isPrintMethodReferenced,
} from "@/features/production-master/production-master-usage";

export async function archiveOrDeleteProductionMaterial(id: string) {
  const existing = await prisma.productionMaterial.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy vật liệu.");
  if (await isProductionMaterialReferenced(id)) {
    await prisma.productionMaterial.update({ where: { id }, data: { isActive: false } });
    return { action: "archived" as const };
  }
  await prisma.productionMaterial.delete({ where: { id } });
  return { action: "deleted" as const };
}

export async function archiveOrDeleteProductionTrim(id: string) {
  const existing = await prisma.productionTrim.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy phụ liệu.");
  if (await isProductionTrimReferenced(id)) {
    await prisma.productionTrim.update({ where: { id }, data: { isActive: false } });
    return { action: "archived" as const };
  }
  await prisma.productionTrim.delete({ where: { id } });
  return { action: "deleted" as const };
}

export async function archiveOrDeleteProductionSupplier(id: string) {
  const existing = await prisma.productionSupplier.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy nhà cung cấp.");
  if (await isProductionSupplierReferenced(id)) {
    await prisma.productionSupplier.update({ where: { id }, data: { isActive: false } });
    return { action: "archived" as const };
  }
  await prisma.productionSupplier.delete({ where: { id } });
  return { action: "deleted" as const };
}

export async function archiveOrDeletePrintMethod(id: string) {
  const existing = await prisma.printMethod.findUnique({ where: { id } });
  if (!existing) throw new ProductionMasterValidationError("Không tìm thấy công nghệ in.");
  if (await isPrintMethodReferenced(id)) {
    await prisma.printMethod.update({ where: { id }, data: { isActive: false } });
    return { action: "archived" as const };
  }
  await prisma.printMethod.delete({ where: { id } });
  return { action: "deleted" as const };
}
