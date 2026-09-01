import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BUILTIN_COST_LIBRARY,
  isCostLibraryCategory,
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
}): CostLibraryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CostLibraryCategory,
    defaultUnitCost: row.defaultUnitCost.toNumber(),
    defaultQuantityFactor: row.defaultQuantityFactor.toNumber(),
    defaultNote: row.defaultNote ?? undefined,
    description: row.description ?? undefined,
  };
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
  const customRows = await prisma.pricingCostLibraryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const customItems = customRows.map(mapDbRow);
  return [...BUILTIN_COST_LIBRARY, ...customItems];
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
