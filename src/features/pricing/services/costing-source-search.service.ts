import { Prisma, type CostingSourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_COST_LIBRARY,
  costLibraryItemMatchesTokens,
  mergeCostLibraryCatalog,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import {
  COSTING_SOURCE_SEARCH_LIMIT,
  CostingSourcePriceValidationError,
  tokenizeSearchQuery,
  type CostingSourceSearchHit,
} from "@/features/pricing/costing-source-price";

export async function searchCostingSources(input: {
  kind: CostingSourceType;
  query?: string;
  take?: number;
}): Promise<CostingSourceSearchHit[]> {
  const take = Math.min(Math.max(input.take ?? COSTING_SOURCE_SEARCH_LIMIT, 1), COSTING_SOURCE_SEARCH_LIMIT);
  const tokens = tokenizeSearchQuery(input.query ?? "");

  if (input.kind === "PRODUCTION_MATERIAL") {
    const where: Prisma.ProductionMaterialWhereInput = { isActive: true };
    if (tokens.length > 0) {
      where.AND = tokens.map((token) => ({
        OR: [
          { code: { contains: token, mode: "insensitive" as const } },
          { name: { contains: token, mode: "insensitive" as const } },
          { composition: { contains: token, mode: "insensitive" as const } },
          { gsm: { contains: token, mode: "insensitive" as const } },
        ],
      }));
    }
    const rows = await prisma.productionMaterial.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        composition: true,
        gsm: true,
        category: true,
      },
      orderBy: [{ name: "asc" }, { code: "asc" }],
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      type: "PRODUCTION_MATERIAL" as const,
      name: row.name,
      code: row.code,
      composition: row.composition,
      gsm: row.gsm,
      category: row.category,
    }));
  }

  if (input.kind === "PRODUCTION_TRIM") {
    const where: Prisma.ProductionTrimWhereInput = { isActive: true };
    if (tokens.length > 0) {
      where.AND = tokens.map((token) => ({
        OR: [
          { code: { contains: token, mode: "insensitive" as const } },
          { name: { contains: token, mode: "insensitive" as const } },
          { notes: { contains: token, mode: "insensitive" as const } },
        ],
      }));
    }
    const rows = await prisma.productionTrim.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
      orderBy: [{ name: "asc" }, { code: "asc" }],
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      type: "PRODUCTION_TRIM" as const,
      name: row.name,
      code: row.code,
      category: row.category,
    }));
  }

  const dbRows = await prisma.pricingCostLibraryItem.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      defaultUnitCost: true,
      defaultQuantityFactor: true,
      defaultNote: true,
      description: true,
      legacyBuiltinId: true,
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const dbItems: CostLibraryItem[] = dbRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as CostLibraryItem["category"],
    defaultUnitCost: row.defaultUnitCost.toNumber(),
    defaultQuantityFactor: row.defaultQuantityFactor.toNumber(),
    defaultNote: row.defaultNote ?? undefined,
    description: row.description ?? undefined,
    legacyBuiltinId: row.legacyBuiltinId,
  }));
  const merged = mergeCostLibraryCatalog(dbItems, BUILTIN_COST_LIBRARY).filter((item) =>
    costLibraryItemMatchesTokens(item, tokens),
  );
  return merged.slice(0, take).map((item) => ({
    id: item.id,
    type: "COST_LIBRARY" as const,
    name: item.name,
    category: item.category,
  }));
}

export function parseCostingSourceSearchKind(value: string | null): CostingSourceType {
  if (value === "PRODUCTION_MATERIAL" || value === "PRODUCTION_TRIM" || value === "COST_LIBRARY") {
    return value;
  }
  throw new CostingSourcePriceValidationError("Loại nguồn tìm kiếm không hợp lệ.", "INVALID_SEARCH_KIND");
}
