import { prisma } from "@/lib/prisma";
import type { PriceGroupRecord } from "@/features/pricing/types";

export class PricingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingValidationError";
  }
}

const DEFAULT_PRICE_GROUPS = [
  { code: "DEALER_PRICE", name: "Giá đại lý", isDefault: true },
  { code: "AGENCY_PRICE", name: "Giá agency", isDefault: false },
  { code: "BUSINESS_PRICE", name: "Giá doanh nghiệp", isDefault: false },
  { code: "RETAIL_PRICE", name: "Giá khách lẻ", isDefault: false },
];

function mapPriceGroup(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PriceGroupRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isDefault: row.isDefault,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureDefaultPriceGroups(): Promise<void> {
  const count = await prisma.priceGroup.count();
  if (count > 0) return;

  await prisma.priceGroup.createMany({
    data: DEFAULT_PRICE_GROUPS.map((g) => ({
      code: g.code,
      name: g.name,
      isDefault: g.isDefault,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function getDefaultPriceGroup() {
  await ensureDefaultPriceGroups();
  return prisma.priceGroup.findFirst({
    where: { isDefault: true, isActive: true },
  });
}

export async function listPriceGroups(params?: { activeOnly?: boolean }) {
  await ensureDefaultPriceGroups();
  const rows = await prisma.priceGroup.findMany({
    where: params?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return { priceGroups: rows.map(mapPriceGroup), total: rows.length };
}

export async function createPriceGroup(input: {
  code: string;
  name: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code) throw new PricingValidationError("Mã nhóm là bắt buộc.");
  if (!name) throw new PricingValidationError("Tên nhóm là bắt buộc.");

  const existing = await prisma.priceGroup.findUnique({ where: { code } });
  if (existing) throw new PricingValidationError("Mã nhóm đã tồn tại.");

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.priceGroup.updateMany({ data: { isDefault: false }, where: { isDefault: true } });
    }
    const row = await tx.priceGroup.create({
      data: {
        code,
        name,
        description: input.description?.trim() || null,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
      },
    });
    return mapPriceGroup(row);
  });
}

export async function updatePriceGroup(
  id: string,
  input: {
    code?: string;
    name?: string;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }
) {
  const existing = await prisma.priceGroup.findUnique({ where: { id } });
  if (!existing) throw new PricingValidationError("Không tìm thấy nhóm giá.");

  const code = input.code !== undefined ? input.code.trim().toUpperCase() : existing.code;
  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!code) throw new PricingValidationError("Mã nhóm là bắt buộc.");
  if (!name) throw new PricingValidationError("Tên nhóm là bắt buộc.");

  if (code !== existing.code) {
    const dup = await prisma.priceGroup.findUnique({ where: { code } });
    if (dup) throw new PricingValidationError("Mã nhóm đã tồn tại.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.priceGroup.updateMany({
        data: { isDefault: false },
        where: { isDefault: true, NOT: { id } },
      });
    }
    const row = await tx.priceGroup.update({
      where: { id },
      data: {
        code,
        name,
        description: input.description !== undefined ? (input.description?.trim() || null) : undefined,
        isDefault: input.isDefault,
        isActive: input.isActive,
      },
    });
    return mapPriceGroup(row);
  });
}

export async function getPriceGroupById(id: string) {
  const row = await prisma.priceGroup.findUnique({ where: { id } });
  return row ? mapPriceGroup(row) : null;
}
