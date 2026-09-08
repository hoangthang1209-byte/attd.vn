import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_COST_LIBRARY,
  findBuiltinCostLibraryById,
  isCostLibraryCategory,
  mergeCostLibraryCatalog,
  normalizeCostLibraryName,
  type CostLibraryCategory,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";

export class CostLibraryValidationError extends Error {
  readonly code: string;
  readonly existingItem?: CostLibraryItem;

  constructor(message: string, code: string, existingItem?: CostLibraryItem) {
    super(message);
    this.name = "CostLibraryValidationError";
    this.code = code;
    this.existingItem = existingItem;
  }
}

function mapDbRow(row: {
  id: string;
  name: string;
  category: string;
  defaultUnitCost: Prisma.Decimal;
  defaultQuantityFactor: Prisma.Decimal;
  defaultNote: string | null;
  description: string | null;
  legacyBuiltinId?: string | null;
}): CostLibraryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CostLibraryCategory,
    defaultUnitCost: row.defaultUnitCost.toNumber(),
    defaultQuantityFactor: row.defaultQuantityFactor.toNumber(),
    defaultNote: row.defaultNote ?? undefined,
    description: row.description ?? undefined,
    legacyBuiltinId: row.legacyBuiltinId ?? undefined,
  };
}

/**
 * Promote one in-code builtin into a durable PricingCostLibraryItem.
 * Mutation-only. Idempotent under concurrent unique races.
 * Does not overwrite customized defaultUnitCost.
 */
export async function promoteBuiltinCostLibraryItem(builtinId: string): Promise<string> {
  const builtin = findBuiltinCostLibraryById(builtinId);
  if (!builtin) {
    throw new CostLibraryValidationError("Không tìm thấy mục cost library mặc định.", "NOT_FOUND");
  }

  const existingByLegacy = await prisma.pricingCostLibraryItem.findUnique({
    where: { legacyBuiltinId: builtin.id },
    select: { id: true },
  });
  if (existingByLegacy) return existingByLegacy.id;

  const nameNormalized = normalizeCostLibraryName(builtin.name);
  const existingByName = await prisma.pricingCostLibraryItem.findUnique({
    where: {
      nameNormalized_category: {
        nameNormalized,
        category: builtin.category,
      },
    },
  });
  if (existingByName) {
    if (!existingByName.legacyBuiltinId) {
      try {
        await prisma.pricingCostLibraryItem.update({
          where: { id: existingByName.id },
          data: { legacyBuiltinId: builtin.id },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          const raced = await prisma.pricingCostLibraryItem.findUnique({
            where: { legacyBuiltinId: builtin.id },
            select: { id: true },
          });
          if (raced) return raced.id;
        } else {
          throw err;
        }
      }
    }
    return existingByName.id;
  }

  try {
    const created = await prisma.pricingCostLibraryItem.create({
      data: {
        name: builtin.name,
        nameNormalized,
        category: builtin.category,
        defaultUnitCost: builtin.defaultUnitCost,
        defaultQuantityFactor: builtin.defaultQuantityFactor ?? 1,
        defaultNote: builtin.defaultNote ?? null,
        description: builtin.description ?? null,
        legacyBuiltinId: builtin.id,
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") {
      throw err;
    }
    const racedLegacy = await prisma.pricingCostLibraryItem.findUnique({
      where: { legacyBuiltinId: builtin.id },
      select: { id: true },
    });
    if (racedLegacy) return racedLegacy.id;
    const racedName = await prisma.pricingCostLibraryItem.findUnique({
      where: {
        nameNormalized_category: {
          nameNormalized,
          category: builtin.category,
        },
      },
      select: { id: true },
    });
    if (racedName) return racedName.id;
    throw err;
  }
}

/** Read-only: resolve a DB cuid, stamped legacyBuiltinId, or matching name. Does not write. */
export async function findCostLibraryDbIdReadOnly(itemId: string): Promise<string | null> {
  const id = itemId.trim();
  if (!id) return null;

  const byId = await prisma.pricingCostLibraryItem.findUnique({
    where: { id },
    select: { id: true },
  });
  if (byId) return byId.id;

  const byLegacy = await prisma.pricingCostLibraryItem.findUnique({
    where: { legacyBuiltinId: id },
    select: { id: true },
  });
  if (byLegacy) return byLegacy.id;

  const builtin = findBuiltinCostLibraryById(id);
  if (!builtin) return null;

  const byName = await prisma.pricingCostLibraryItem.findUnique({
    where: {
      nameNormalized_category: {
        nameNormalized: normalizeCostLibraryName(builtin.name),
        category: builtin.category,
      },
    },
    select: { id: true },
  });
  return byName?.id ?? null;
}

export async function isKnownCostLibrarySource(itemId: string): Promise<boolean> {
  const id = itemId.trim();
  if (!id) return false;
  if (findBuiltinCostLibraryById(id)) return true;
  const byId = await prisma.pricingCostLibraryItem.findUnique({
    where: { id },
    select: { id: true },
  });
  return Boolean(byId);
}

/** Mutation-only: DB id, or promote a builtin id to a real row. */
export async function resolveCostLibraryItemIdForMutation(itemId: string): Promise<string> {
  const id = itemId.trim();
  if (!id) {
    throw new CostLibraryValidationError("Cost library item không hợp lệ.", "NOT_FOUND");
  }
  const existing = await findCostLibraryDbIdReadOnly(id);
  if (existing) {
    const builtin = findBuiltinCostLibraryById(id);
    if (builtin) {
      const row = await prisma.pricingCostLibraryItem.findUnique({
        where: { id: existing },
        select: { legacyBuiltinId: true },
      });
      if (row && !row.legacyBuiltinId) {
        try {
          await prisma.pricingCostLibraryItem.update({
            where: { id: existing },
            data: { legacyBuiltinId: builtin.id },
          });
        } catch (err) {
          if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) {
            throw err;
          }
        }
      }
    }
    return existing;
  }
  if (findBuiltinCostLibraryById(id)) {
    return promoteBuiltinCostLibraryItem(id);
  }
  throw new CostLibraryValidationError("Không tìm thấy mục cost library.", "NOT_FOUND");
}

export function findBuiltinCostLibraryItem(
  name: string,
  category: CostLibraryCategory,
): CostLibraryItem | null {
  const normalized = normalizeCostLibraryName(name);
  return (
    BUILTIN_COST_LIBRARY.find(
      (item) =>
        item.category === category && normalizeCostLibraryName(item.name) === normalized,
    ) ?? null
  );
}

export async function listCostLibraryItems(): Promise<CostLibraryItem[]> {
  const dbRows = await prisma.pricingCostLibraryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return mergeCostLibraryCatalog(dbRows.map(mapDbRow), BUILTIN_COST_LIBRARY);
}

export type CreateCostLibraryItemInput = {
  name: string;
  category: CostLibraryCategory;
  defaultUnitCost: number;
  defaultNote?: string | null;
  defaultQuantityFactor?: number;
  createdByUserId?: string | null;
};

export async function createCostLibraryItem(input: CreateCostLibraryItemInput): Promise<CostLibraryItem> {
  const name = input.name.trim();
  if (!name) throw new CostLibraryValidationError("Tên chi phí là bắt buộc.", "NAME_REQUIRED");
  if (!isCostLibraryCategory(input.category)) {
    throw new CostLibraryValidationError("Loại chi phí không hợp lệ.", "INVALID_CATEGORY");
  }
  if (!Number.isFinite(input.defaultUnitCost) || input.defaultUnitCost < 0) {
    throw new CostLibraryValidationError("Cost mặc định phải >= 0.", "INVALID_COST");
  }

  const nameNormalized = normalizeCostLibraryName(name);
  const builtinMatch = findBuiltinCostLibraryItem(name, input.category);
  if (builtinMatch) {
    throw new CostLibraryValidationError(
      `Chi phí "${builtinMatch.name}" đã có trong thư viện mặc định.`,
      "DUPLICATE_BUILTIN",
      builtinMatch,
    );
  }

  const existing = await prisma.pricingCostLibraryItem.findUnique({
    where: {
      nameNormalized_category: {
        nameNormalized,
        category: input.category,
      },
    },
  });
  if (existing) {
    const mapped = mapDbRow(existing);
    throw new CostLibraryValidationError(
      `Chi phí "${mapped.name}" đã có trong thư viện.`,
      "DUPLICATE",
      mapped,
    );
  }

  const created = await prisma.pricingCostLibraryItem.create({
    data: {
      name,
      nameNormalized,
      category: input.category,
      defaultUnitCost: input.defaultUnitCost,
      defaultQuantityFactor: input.defaultQuantityFactor ?? 1,
      defaultNote: input.defaultNote?.trim() || null,
      description: null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });

  return mapDbRow(created);
}

export function findCostLibraryItemById(
  items: CostLibraryItem[],
  itemId: string,
): CostLibraryItem | undefined {
  return items.find((item) => item.id === itemId);
}
