import { prisma } from "@/lib/prisma";
import { generateSalesRepresentativeCode } from "@/features/sales/sales-code";
import type {
  CreateSalesRepresentativeInput,
  SalesRepresentativeRecord,
  UpdateSalesRepresentativeInput,
} from "@/features/sales/types";

export class SalesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesValidationError";
  }
}

function mapRow(row: {
  id: string;
  code: string;
  fullName: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  address: string | null;
  avatarMediaAssetId: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SalesRepresentativeRecord {
  return {
    id: row.id,
    code: row.code,
    fullName: row.fullName,
    title: row.title,
    phone: row.phone,
    email: row.email,
    zalo: row.zalo,
    address: row.address,
    avatarMediaAssetId: row.avatarMediaAssetId,
    avatarUrl: row.avatarUrl,
    isActive: row.isActive,
    isDefault: row.isDefault,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSalesRepresentatives(params?: {
  search?: string;
  activeOnly?: boolean;
  limit?: number;
}): Promise<{ salesReps: SalesRepresentativeRecord[]; total: number }> {
  const where: { isActive?: boolean; OR?: Array<Record<string, unknown>> } = {};
  if (params?.activeOnly) where.isActive = true;
  const search = params?.search?.trim();
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const limit = Math.min(200, Math.max(1, params?.limit ?? 100));
  const [rows, total] = await Promise.all([
    prisma.salesRepresentative.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { fullName: "asc" }],
      take: limit,
    }),
    prisma.salesRepresentative.count({ where }),
  ]);

  return { salesReps: rows.map(mapRow), total };
}

export async function getSalesRepresentative(
  id: string,
): Promise<SalesRepresentativeRecord | null> {
  const row = await prisma.salesRepresentative.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function getDefaultSalesRepresentative(): Promise<SalesRepresentativeRecord | null> {
  const row = await prisma.salesRepresentative.findFirst({
    where: { isActive: true, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });
  if (row) return mapRow(row);
  const fallback = await prisma.salesRepresentative.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return fallback ? mapRow(fallback) : null;
}

export async function createSalesRepresentative(
  input: CreateSalesRepresentativeInput,
): Promise<SalesRepresentativeRecord> {
  const fullName = input.fullName.trim();
  if (!fullName) throw new SalesValidationError("Tên nhân viên là bắt buộc.");

  const code = await generateSalesRepresentativeCode();

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.salesRepresentative.updateMany({ data: { isDefault: false } });
    }

    const created = await tx.salesRepresentative.create({
      data: {
        code,
        fullName,
        title: input.title?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        zalo: input.zalo?.trim() || null,
        address: input.address?.trim() || null,
        avatarMediaAssetId: input.avatarMediaAssetId ?? null,
        avatarUrl: input.avatarUrl?.trim() || null,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        note: input.note?.trim() || null,
      },
    });

    return mapRow(created);
  });
}

export async function updateSalesRepresentative(
  id: string,
  input: UpdateSalesRepresentativeInput,
): Promise<SalesRepresentativeRecord | null> {
  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.salesRepresentative.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await tx.salesRepresentative.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
        ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
        ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
        ...(input.zalo !== undefined ? { zalo: input.zalo?.trim() || null } : {}),
        ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
        ...(input.avatarMediaAssetId !== undefined
          ? { avatarMediaAssetId: input.avatarMediaAssetId }
          : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl?.trim() || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      },
    });

    return mapRow(updated);
  });
}

export async function setDefaultSalesRepresentative(
  id: string,
): Promise<SalesRepresentativeRecord | null> {
  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.$transaction(async (tx) => {
    await tx.salesRepresentative.updateMany({ data: { isDefault: false } });
    const updated = await tx.salesRepresentative.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    });
    return mapRow(updated);
  });
}

export async function toggleSalesRepresentativeActive(
  id: string,
): Promise<SalesRepresentativeRecord | null> {
  const existing = await prisma.salesRepresentative.findUnique({ where: { id } });
  if (!existing) return null;

  const updated = await prisma.salesRepresentative.update({
    where: { id },
    data: {
      isActive: !existing.isActive,
      ...(existing.isActive ? { isDefault: false } : {}),
    },
  });

  return mapRow(updated);
}

export function salesRepToQuoteSnapshots(rep: SalesRepresentativeRecord) {
  return {
    salesRepresentativeId: rep.id,
    salesName: rep.fullName,
    salesTitleSnapshot: rep.title,
    salesPhone: rep.phone,
    salesEmail: rep.email,
    salesAddress: rep.address,
  };
}
