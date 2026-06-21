import type {
  Material,
  MaterialType,
  MaterialWarehouseBalance,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMaterialCode } from "@/features/materials/material-code";
import { MATERIAL_TYPES } from "@/features/materials/material-labels";
import { MaterialValidationError } from "@/features/materials/material-decimal";

export type MaterialRecord = Material & {
  warehouseBalance: MaterialWarehouseBalance | null;
};

export type ListMaterialsInput = {
  search?: string;
  materialType?: MaterialType;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
};

function mapMaterial(row: Material & { warehouseBalance: MaterialWarehouseBalance | null }): MaterialRecord {
  return row;
}

export async function listMaterials(input: ListMaterialsInput = {}) {
  const where: Prisma.MaterialWhereInput = {};
  if (input.activeOnly) where.isActive = true;
  if (input.materialType) where.materialType = input.materialType;
  if (input.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { materialCode: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const [materials, total] = await Promise.all([
    prisma.material.findMany({
      where,
      include: { warehouseBalance: true },
      orderBy: [{ sortOrder: "asc" }, { materialCode: "asc" }],
      take: input.limit ?? 100,
      skip: input.offset ?? 0,
    }),
    prisma.material.count({ where }),
  ]);

  return { materials: materials.map(mapMaterial), total };
}

export async function getMaterial(id: string): Promise<MaterialRecord | null> {
  const row = await prisma.material.findUnique({
    where: { id },
    include: { warehouseBalance: true },
  });
  return row ? mapMaterial(row) : null;
}

export type CreateMaterialInput = {
  name: string;
  materialType: MaterialType;
  unit: string;
  description?: string | null;
  specification?: string | null;
  defaultSupplierName?: string | null;
  reorderPoint?: number | string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export async function createMaterial(input: CreateMaterialInput): Promise<MaterialRecord> {
  const name = input.name?.trim();
  const unit = input.unit?.trim();
  if (!name) throw new MaterialValidationError("Tên vật tư là bắt buộc.");
  if (!unit) throw new MaterialValidationError("Đơn vị là bắt buộc.");
  if (!MATERIAL_TYPES.includes(input.materialType)) {
    throw new MaterialValidationError("Loại vật tư không hợp lệ.");
  }

  const materialCode = await generateMaterialCode();
  const row = await prisma.material.create({
    data: {
      materialCode,
      name,
      materialType: input.materialType,
      unit,
      description: input.description?.trim() || null,
      specification: input.specification?.trim() || null,
      defaultSupplierName: input.defaultSupplierName?.trim() || null,
      reorderPoint: input.reorderPoint != null ? input.reorderPoint : null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive !== false,
    },
    include: { warehouseBalance: true },
  });
  return mapMaterial(row);
}

export type UpdateMaterialInput = Partial<CreateMaterialInput> & {
  materialCode?: string;
};

async function materialHasReferences(materialId: string): Promise<boolean> {
  const [bom, orderBom, purchase, allocation, adjustments] = await Promise.all([
    prisma.productMaterialRequirement.count({ where: { materialId } }),
    prisma.orderItemMaterialRequirement.count({ where: { materialId } }),
    prisma.purchaseRequestItem.count({ where: { materialId } }),
    prisma.orderMaterialAllocation.count({ where: { materialId } }),
    prisma.materialStockAdjustment.count({ where: { materialId } }),
  ]);
  return bom + orderBom + purchase + allocation + adjustments > 0;
}

export async function updateMaterial(id: string, input: UpdateMaterialInput): Promise<MaterialRecord> {
  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) throw new MaterialValidationError("Không tìm thấy vật tư.");

  if (input.materialCode && input.materialCode !== existing.materialCode) {
    const referenced = await materialHasReferences(id);
    if (referenced) {
      throw new MaterialValidationError("Không thể đổi mã vật tư khi đã có dữ liệu liên quan.");
    }
  }

  const row = await prisma.material.update({
    where: { id },
    data: {
      ...(input.materialCode ? { materialCode: input.materialCode.trim() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.materialType ? { materialType: input.materialType } : {}),
      ...(input.unit !== undefined ? { unit: input.unit.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.specification !== undefined ? { specification: input.specification?.trim() || null } : {}),
      ...(input.defaultSupplierName !== undefined
        ? { defaultSupplierName: input.defaultSupplierName?.trim() || null }
        : {}),
      ...(input.reorderPoint !== undefined
        ? { reorderPoint: input.reorderPoint != null ? input.reorderPoint : null }
        : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    include: { warehouseBalance: true },
  });
  return mapMaterial(row);
}

export async function deactivateMaterial(id: string): Promise<MaterialRecord> {
  return updateMaterial(id, { isActive: false });
}

export async function activateMaterial(id: string): Promise<MaterialRecord> {
  return updateMaterial(id, { isActive: true });
}

export function resolveMaterialSnapshotsFromMaster(material: Material) {
  return {
    materialId: material.id,
    materialCode: material.materialCode,
    materialName: material.name,
    materialCodeSnapshot: material.materialCode,
    materialNameSnapshot: material.name,
    unitSnapshot: material.unit,
    unit: material.unit,
    materialType: material.materialType,
  };
}
