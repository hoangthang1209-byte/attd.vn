import { prisma } from "@/lib/prisma";
import { MaterialValidationError } from "@/features/materials/material-decimal";

export type MaterialSupplierLinkRecord = {
  id: string;
  materialId: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  supplierShortName: string | null;
  contactName: string | null;
  phone: string | null;
  supplierMaterialCode: string | null;
  supplierMaterialName: string | null;
  isPreferred: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

const linkInclude = {
  supplier: {
    select: {
      supplierCode: true,
      name: true,
      shortName: true,
      contactName: true,
      phone: true,
      isActive: true,
    },
  },
} as const;

function mapLink(
  row: {
    id: string;
    materialId: string;
    supplierId: string;
    supplierMaterialCode: string | null;
    supplierMaterialName: string | null;
    isPreferred: boolean;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    supplier: {
      supplierCode: string;
      name: string;
      shortName: string | null;
      contactName: string | null;
      phone: string | null;
      isActive: boolean;
    };
  },
): MaterialSupplierLinkRecord {
  return {
    id: row.id,
    materialId: row.materialId,
    supplierId: row.supplierId,
    supplierCode: row.supplier.supplierCode,
    supplierName: row.supplier.name,
    supplierShortName: row.supplier.shortName,
    contactName: row.supplier.contactName,
    phone: row.supplier.phone,
    supplierMaterialCode: row.supplierMaterialCode,
    supplierMaterialName: row.supplierMaterialName,
    isPreferred: row.isPreferred,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMaterialSupplierLinks(
  materialId: string,
): Promise<MaterialSupplierLinkRecord[]> {
  const rows = await prisma.materialSupplierLink.findMany({
    where: { materialId },
    include: linkInclude,
    orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapLink);
}

export async function createMaterialSupplierLink(
  materialId: string,
  input: {
    supplierId: string;
    supplierMaterialCode?: string | null;
    supplierMaterialName?: string | null;
    isPreferred?: boolean;
    note?: string | null;
  },
): Promise<MaterialSupplierLinkRecord> {
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) throw new MaterialValidationError("Không tìm thấy vật tư.");

  const supplier = await prisma.materialSupplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new MaterialValidationError("Không tìm thấy nhà cung cấp.");
  if (!supplier.isActive) throw new MaterialValidationError("Nhà cung cấp đã ngừng sử dụng.");

  const existing = await prisma.materialSupplierLink.findUnique({
    where: { materialId_supplierId: { materialId, supplierId: input.supplierId } },
  });
  if (existing) throw new MaterialValidationError("Nhà cung cấp đã được liên kết với vật tư này.");

  const row = await prisma.$transaction(async (tx) => {
    if (input.isPreferred) {
      await tx.materialSupplierLink.updateMany({
        where: { materialId },
        data: { isPreferred: false },
      });
    }

    return tx.materialSupplierLink.create({
      data: {
        materialId,
        supplierId: input.supplierId,
        supplierMaterialCode: input.supplierMaterialCode?.trim() || null,
        supplierMaterialName: input.supplierMaterialName?.trim() || null,
        isPreferred: input.isPreferred ?? false,
        note: input.note?.trim() || null,
      },
      include: linkInclude,
    });
  });

  return mapLink(row);
}

export async function updateMaterialSupplierLink(
  materialId: string,
  linkId: string,
  input: {
    supplierMaterialCode?: string | null;
    supplierMaterialName?: string | null;
    isPreferred?: boolean;
    note?: string | null;
  },
): Promise<MaterialSupplierLinkRecord> {
  const existing = await prisma.materialSupplierLink.findFirst({
    where: { id: linkId, materialId },
  });
  if (!existing) throw new MaterialValidationError("Không tìm thấy liên kết nhà cung cấp.");

  const row = await prisma.$transaction(async (tx) => {
    if (input.isPreferred) {
      await tx.materialSupplierLink.updateMany({
        where: { materialId },
        data: { isPreferred: false },
      });
    }

    return tx.materialSupplierLink.update({
      where: { id: linkId },
      data: {
        ...(input.supplierMaterialCode !== undefined
          ? { supplierMaterialCode: input.supplierMaterialCode?.trim() || null }
          : {}),
        ...(input.supplierMaterialName !== undefined
          ? { supplierMaterialName: input.supplierMaterialName?.trim() || null }
          : {}),
        ...(input.isPreferred !== undefined ? { isPreferred: input.isPreferred } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
      include: linkInclude,
    });
  });

  return mapLink(row);
}

export async function deleteMaterialSupplierLink(materialId: string, linkId: string): Promise<void> {
  const existing = await prisma.materialSupplierLink.findFirst({
    where: { id: linkId, materialId },
  });
  if (!existing) throw new MaterialValidationError("Không tìm thấy liên kết nhà cung cấp.");

  await prisma.materialSupplierLink.delete({ where: { id: linkId } });
}

export type SupplierMaterialLinkRecord = {
  linkId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  isPreferred: boolean;
  supplierMaterialCode: string | null;
};

export async function listMaterialsForSupplier(supplierId: string): Promise<SupplierMaterialLinkRecord[]> {
  const rows = await prisma.materialSupplierLink.findMany({
    where: { supplierId },
    include: {
      material: { select: { id: true, materialCode: true, name: true, unit: true } },
    },
    orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    linkId: row.id,
    materialId: row.material.id,
    materialCode: row.material.materialCode,
    materialName: row.material.name,
    unit: row.material.unit,
    isPreferred: row.isPreferred,
    supplierMaterialCode: row.supplierMaterialCode,
  }));
}

export async function getPreferredSupplierLinksForMaterials(
  materialIds: string[],
): Promise<Map<string, MaterialSupplierLinkRecord>> {
  const map = new Map<string, MaterialSupplierLinkRecord>();
  if (materialIds.length === 0) return map;

  const rows = await prisma.materialSupplierLink.findMany({
    where: { materialId: { in: materialIds }, isPreferred: true },
    include: linkInclude,
  });
  for (const row of rows) {
    map.set(row.materialId, mapLink(row));
  }
  return map;
}
