import { MaterialType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MATERIAL_TYPES } from "@/features/orders/production-pack-labels";
import { ProductionPackValidationError } from "@/features/orders/production-pack.service";
import type { ProductMaterialRecord } from "@/features/products/product-material.types";

function mapProductMaterial(row: {
  id: string;
  productId: string;
  variantId: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode: string | null;
  unit: string;
  consumptionPerUnit: Prisma.Decimal;
  wastagePercent: Prisma.Decimal;
  note: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProductMaterialRecord {
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    materialType: row.materialType,
    materialName: row.materialName,
    materialCode: row.materialCode,
    unit: row.unit,
    consumptionPerUnit: row.consumptionPerUnit.toFixed(),
    wastagePercent: row.wastagePercent.toFixed(),
    note: row.note,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProductMaterials(productId: string): Promise<ProductMaterialRecord[]> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ProductionPackValidationError("Không tìm thấy sản phẩm.");

  const rows = await prisma.productMaterialRequirement.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapProductMaterial);
}

export type UpsertProductMaterialInput = {
  variantId?: string | null;
  materialType: MaterialType;
  materialName: string;
  materialCode?: string | null;
  unit: string;
  consumptionPerUnit: number | string;
  wastagePercent?: number | string;
  note?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

function validateMaterialInput(input: UpsertProductMaterialInput) {
  if (!MATERIAL_TYPES.includes(input.materialType)) {
    throw new ProductionPackValidationError("Loại nguyên phụ liệu không hợp lệ.");
  }
  const name = input.materialName?.trim();
  const unit = input.unit?.trim();
  if (!name) throw new ProductionPackValidationError("Tên nguyên phụ liệu là bắt buộc.");
  if (!unit) throw new ProductionPackValidationError("Đơn vị là bắt buộc.");
  const consumption = new Prisma.Decimal(input.consumptionPerUnit);
  if (consumption.lt(0)) {
    throw new ProductionPackValidationError("Định mức phải lớn hơn hoặc bằng 0.");
  }
  const wastage = new Prisma.Decimal(input.wastagePercent ?? 0);
  if (wastage.lt(0) || wastage.gt(100)) {
    throw new ProductionPackValidationError("Hao hụt phải từ 0 đến 100%.");
  }
  return { name, unit, consumption, wastage };
}

export async function createProductMaterial(
  productId: string,
  input: UpsertProductMaterialInput,
): Promise<ProductMaterialRecord> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ProductionPackValidationError("Không tìm thấy sản phẩm.");

  const { name, unit, consumption, wastage } = validateMaterialInput(input);

  if (input.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, productId },
    });
    if (!variant) throw new ProductionPackValidationError("Biến thể không thuộc sản phẩm này.");
  }

  const row = await prisma.productMaterialRequirement.create({
    data: {
      productId,
      variantId: input.variantId ?? null,
      materialType: input.materialType,
      materialName: name,
      materialCode: input.materialCode?.trim() || null,
      unit,
      consumptionPerUnit: consumption,
      wastagePercent: wastage,
      note: input.note?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
  });
  return mapProductMaterial(row);
}

export async function updateProductMaterial(
  productId: string,
  materialId: string,
  input: Partial<UpsertProductMaterialInput>,
): Promise<ProductMaterialRecord> {
  const existing = await prisma.productMaterialRequirement.findUnique({ where: { id: materialId } });
  if (!existing || existing.productId !== productId) {
    throw new ProductionPackValidationError("Không tìm thấy dòng định mức.");
  }

  const merged: UpsertProductMaterialInput = {
    variantId: input.variantId !== undefined ? input.variantId : existing.variantId,
    materialType: input.materialType ?? existing.materialType,
    materialName: input.materialName ?? existing.materialName,
    materialCode: input.materialCode !== undefined ? input.materialCode : existing.materialCode,
    unit: input.unit ?? existing.unit,
    consumptionPerUnit: input.consumptionPerUnit ?? existing.consumptionPerUnit.toString(),
    wastagePercent: input.wastagePercent ?? existing.wastagePercent.toString(),
    note: input.note !== undefined ? input.note : existing.note,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    isActive: input.isActive ?? existing.isActive,
  };
  const { name, unit, consumption, wastage } = validateMaterialInput(merged);

  const row = await prisma.productMaterialRequirement.update({
    where: { id: materialId },
    data: {
      variantId: merged.variantId ?? null,
      materialType: merged.materialType,
      materialName: name,
      materialCode: merged.materialCode?.trim() || null,
      unit,
      consumptionPerUnit: consumption,
      wastagePercent: wastage,
      note: merged.note?.trim() || null,
      sortOrder: merged.sortOrder ?? 0,
      isActive: merged.isActive ?? true,
    },
  });
  return mapProductMaterial(row);
}

export async function deleteProductMaterial(productId: string, materialId: string) {
  const existing = await prisma.productMaterialRequirement.findUnique({ where: { id: materialId } });
  if (!existing || existing.productId !== productId) {
    throw new ProductionPackValidationError("Không tìm thấy dòng định mức.");
  }

  const used = await prisma.orderItemMaterialRequirement.count({
    where: { sourceProductMaterialRequirementId: materialId },
  });
  if (used > 0) {
    await prisma.productMaterialRequirement.update({
      where: { id: materialId },
      data: { isActive: false },
    });
    return { deactivated: true as const };
  }

  await prisma.productMaterialRequirement.delete({ where: { id: materialId } });
  return { deactivated: false as const };
}
