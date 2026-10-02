import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildProductCostingTemplate,
  type ProductCostingRequirementDraft,
  type ProductCostingSourcePrice,
  type ProductCostingTemplate,
} from "@/features/pricing/product-costing-template";

const SOURCE_PRICE_SELECT = {
  id: true,
  supplierId: true,
  unitPrice: true,
  unit: true,
  supplier: { select: { name: true, isActive: true } },
} satisfies Prisma.CostingSourcePriceSelect;

const INVENTORY_MATERIAL_SOURCE_SELECT = {
  id: true,
  materialCode: true,
  productionMaterial: {
    select: {
      id: true,
      code: true,
      name: true,
      supplierId: true,
      costingSourcePrices: {
        where: { isActive: true },
        select: SOURCE_PRICE_SELECT,
        orderBy: { updatedAt: "desc" as const },
      },
    },
  },
  productionTrim: {
    select: {
      id: true,
      code: true,
      name: true,
      supplierId: true,
      costingSourcePrices: {
        where: { isActive: true },
        select: SOURCE_PRICE_SELECT,
        orderBy: { updatedAt: "desc" as const },
      },
    },
  },
} satisfies Prisma.MaterialSelect;

function mapPrices(
  rows: Array<{
    id: string;
    supplierId: string;
    unitPrice: Prisma.Decimal;
    unit: string;
    supplier: { name: string; isActive: boolean };
  }>,
): ProductCostingSourcePrice[] {
  return rows
    .filter((row) => row.supplier.isActive)
    .map((row) => ({
      id: row.id,
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      unitPrice: row.unitPrice.toNumber(),
      unit: row.unit,
    }));
}

export async function getProductCostingTemplate(input: {
  productId: string;
  variantId?: string | null;
  quantity: number;
}): Promise<ProductCostingTemplate> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) {
    return {
      lines: [],
      warnings: ["Không tìm thấy sản phẩm."],
      requirementCount: 0,
    };
  }

  const rows = await prisma.productMaterialRequirement.findMany({
    where: {
      productId: input.productId,
      isActive: true,
      ...(input.variantId
        ? { OR: [{ variantId: null }, { variantId: input.variantId }] }
        : { variantId: null }),
    },
    include: {
      material: { select: INVENTORY_MATERIAL_SOURCE_SELECT },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const missingCodes = [...new Set(
    rows
      .filter((row) => !row.materialId && row.materialCode?.trim())
      .map((row) => row.materialCode!.trim()),
  )];
  const [fallbackMaterials, fallbackProductionMaterials, fallbackProductionTrims] = missingCodes.length
    ? await Promise.all([
        prisma.material.findMany({
          where: { materialCode: { in: missingCodes }, isActive: true },
          select: INVENTORY_MATERIAL_SOURCE_SELECT,
        }),
        prisma.productionMaterial.findMany({
          where: { code: { in: missingCodes }, isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            supplierId: true,
            costingSourcePrices: {
              where: { isActive: true },
              select: SOURCE_PRICE_SELECT,
              orderBy: { updatedAt: "desc" },
            },
          },
        }),
        prisma.productionTrim.findMany({
          where: { code: { in: missingCodes }, isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            supplierId: true,
            costingSourcePrices: {
              where: { isActive: true },
              select: SOURCE_PRICE_SELECT,
              orderBy: { updatedAt: "desc" },
            },
          },
        }),
      ])
    : [[], [], []] as const;
  const fallbackByCode = new Map(fallbackMaterials.map((material) => [material.materialCode, material]));
  const productionMaterialByCode = new Map(fallbackProductionMaterials.map((material) => [material.code, material]));
  const productionTrimByCode = new Map(fallbackProductionTrims.map((material) => [material.code, material]));

  const drafts: ProductCostingRequirementDraft[] = rows.map((row) => {
    const code = row.materialCode?.trim() ?? "";
    const inventoryMaterial = row.material ?? (code ? fallbackByCode.get(code) ?? null : null);
    const materialSource = inventoryMaterial?.productionMaterial ?? (code ? productionMaterialByCode.get(code) ?? null : null);
    const trimSource = inventoryMaterial?.productionTrim ?? (code ? productionTrimByCode.get(code) ?? null : null);
    const source = materialSource
      ? {
          type: "PRODUCTION_MATERIAL" as const,
          id: materialSource.id,
          code: materialSource.code,
          name: materialSource.name,
          defaultSupplierId: materialSource.supplierId,
          prices: mapPrices(materialSource.costingSourcePrices),
        }
      : trimSource
        ? {
            type: "PRODUCTION_TRIM" as const,
            id: trimSource.id,
            code: trimSource.code,
            name: trimSource.name,
            defaultSupplierId: trimSource.supplierId,
            prices: mapPrices(trimSource.costingSourcePrices),
          }
        : null;

    return {
      id: row.id,
      materialId: row.materialId,
      variantId: row.variantId,
      materialType: row.materialType,
      materialName: row.materialName,
      materialCode: row.materialCode,
      unit: row.unit,
      consumptionPerUnit: row.consumptionPerUnit.toNumber(),
      wastagePercent: row.wastagePercent.toNumber(),
      note: row.note,
      sortOrder: row.sortOrder,
      source,
    };
  });

  return buildProductCostingTemplate(
    drafts,
    Math.max(1, Math.round(input.quantity)),
    input.variantId,
  );
}
