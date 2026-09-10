import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildMaterialSpecLabel,
  materialLibraryCategoryLabel,
  materialLibraryTypeLabel,
  summarizeActiveSourcePrices,
  type MaterialLibraryKind,
  type MaterialLibraryListItem,
} from "@/features/production-master/material-library";
import {
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_TRIM_CATEGORIES,
} from "@/features/production-master/production-master-labels";

export type MaterialLibraryListInput = {
  search?: string;
  kind?: MaterialLibraryKind | "all";
  status?: "all" | "active" | "inactive";
  category?: string;
  priceStatus?: "all" | "has_price" | "no_price";
  sort?: "updated" | "name" | "code";
  take?: number;
};

const PRICE_INCLUDE = {
  where: {
    isActive: true,
    supplier: { isActive: true },
  },
  select: {
    unitPrice: true,
    unit: true,
    supplierId: true,
  },
} satisfies Prisma.ProductionMaterial$costingSourcePricesArgs;

function applySearchMaterial(q: string): Prisma.ProductionMaterialWhereInput {
  return {
    OR: [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { composition: { contains: q, mode: "insensitive" } },
      { gsm: { contains: q, mode: "insensitive" } },
    ],
  };
}

function applySearchTrim(q: string): Prisma.ProductionTrimWhereInput {
  return {
    OR: [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ],
  };
}

function toMaterialItem(row: {
  id: string;
  code: string;
  name: string;
  category: string;
  composition: string | null;
  gsm: string | null;
  width: string | null;
  isActive: boolean;
  updatedAt: Date;
  supplier: { name: string } | null;
  costingSourcePrices: Array<{ unitPrice: Prisma.Decimal | number; unit: string; supplierId: string }>;
  _count: { bomItems: number };
}): MaterialLibraryListItem {
  const prices = row.costingSourcePrices.map((price) => ({
    unitPrice: Number(price.unitPrice),
    unit: price.unit,
  }));
  return {
    id: row.id,
    kind: "material",
    sourceType: "PRODUCTION_MATERIAL",
    code: row.code,
    name: row.name,
    category: row.category,
    categoryLabel: materialLibraryCategoryLabel("material", row.category),
    typeLabel: materialLibraryTypeLabel("material"),
    composition: row.composition,
    gsm: row.gsm,
    width: row.width,
    specLabel: buildMaterialSpecLabel(row),
    defaultSupplierName: row.supplier?.name ?? null,
    isActive: row.isActive,
    usageCount: row._count.bomItems,
    updatedAt: row.updatedAt.toISOString(),
    priceSummary: summarizeActiveSourcePrices(prices),
    detailPath: `/admin/production-materials/${row.id}`,
  };
}

function toTrimItem(row: {
  id: string;
  code: string;
  name: string;
  category: string;
  isActive: boolean;
  updatedAt: Date;
  supplier: { name: string } | null;
  costingSourcePrices: Array<{ unitPrice: Prisma.Decimal | number; unit: string; supplierId: string }>;
  _count: { bomItems: number };
}): MaterialLibraryListItem {
  const prices = row.costingSourcePrices.map((price) => ({
    unitPrice: Number(price.unitPrice),
    unit: price.unit,
  }));
  return {
    id: row.id,
    kind: "trim",
    sourceType: "PRODUCTION_TRIM",
    code: row.code,
    name: row.name,
    category: row.category,
    categoryLabel: materialLibraryCategoryLabel("trim", row.category),
    typeLabel: materialLibraryTypeLabel("trim"),
    composition: null,
    gsm: null,
    width: null,
    specLabel: "—",
    defaultSupplierName: row.supplier?.name ?? null,
    isActive: row.isActive,
    usageCount: row._count.bomItems,
    updatedAt: row.updatedAt.toISOString(),
    priceSummary: summarizeActiveSourcePrices(prices),
    detailPath: `/admin/trims/${row.id}`,
  };
}

export async function listMaterialLibrary(
  input: MaterialLibraryListInput = {},
): Promise<{ items: MaterialLibraryListItem[] }> {
  const kind = input.kind ?? "all";
  const status = input.status ?? "all";
  const priceStatus = input.priceStatus ?? "all";
  const sort = input.sort ?? "updated";
  const take = Math.min(Math.max(input.take ?? 200, 1), 400);
  const search = input.search?.trim() || "";
  const category = input.category?.trim() || "";

  const materialWhere: Prisma.ProductionMaterialWhereInput = {};
  const trimWhere: Prisma.ProductionTrimWhereInput = {};
  if (status === "active") {
    materialWhere.isActive = true;
    trimWhere.isActive = true;
  } else if (status === "inactive") {
    materialWhere.isActive = false;
    trimWhere.isActive = false;
  }
  const isMaterialCategory = (PRODUCTION_MATERIAL_CATEGORIES as string[]).includes(category);
  const isTrimCategory = (PRODUCTION_TRIM_CATEGORIES as string[]).includes(category);
  if (category && isMaterialCategory) {
    materialWhere.category = category as never;
  }
  if (category && isTrimCategory) {
    trimWhere.category = category as never;
  }
  if (search) {
    materialWhere.AND = [...(Array.isArray(materialWhere.AND) ? materialWhere.AND : []), applySearchMaterial(search)];
    trimWhere.AND = [...(Array.isArray(trimWhere.AND) ? trimWhere.AND : []), applySearchTrim(search)];
  }

  const includeMaterials = kind !== "trim" && (!category || isMaterialCategory);
  const includeTrims = kind !== "material" && (!category || isTrimCategory);

  const [materials, trims] = await Promise.all([
    includeMaterials
      ? prisma.productionMaterial.findMany({
          where: materialWhere,
          include: {
            supplier: { select: { id: true, code: true, name: true } },
            costingSourcePrices: PRICE_INCLUDE,
            _count: { select: { bomItems: true } },
          },
          orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
          take,
        })
      : Promise.resolve([]),
    includeTrims
      ? prisma.productionTrim.findMany({
          where: trimWhere,
          include: {
            supplier: { select: { id: true, code: true, name: true } },
            costingSourcePrices: PRICE_INCLUDE,
            _count: { select: { bomItems: true } },
          },
          orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
          take,
        })
      : Promise.resolve([]),
  ]);

  let items: MaterialLibraryListItem[] = [
    ...materials.map(toMaterialItem),
    ...trims.map(toTrimItem),
  ];

  if (priceStatus === "has_price") {
    items = items.filter((item) => item.priceSummary.activeCount > 0);
  } else if (priceStatus === "no_price") {
    items = items.filter((item) => item.priceSummary.activeCount === 0);
  }

  items.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (sort === "name") return a.name.localeCompare(b.name, "vi");
    if (sort === "code") return a.code.localeCompare(b.code, "vi");
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return { items: items.slice(0, take) };
}
