import { prisma } from "@/lib/prisma";
import { generateMaterialSupplierCode } from "@/features/materials/material-code";
import { MaterialValidationError } from "@/features/materials/material-decimal";

export type MaterialSupplierRecord = {
  id: string;
  supplierCode: string;
  name: string;
  shortName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  note: string | null;
  isActive: boolean;
  sortOrder: number;
  materialCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaterialSupplierInput = {
  name: string;
  shortName?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  note?: string | null;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateMaterialSupplierInput = Partial<CreateMaterialSupplierInput>;

function mapRow(
  row: {
    id: string;
    supplierCode: string;
    name: string;
    shortName: string | null;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxCode: string | null;
    note: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  },
  materialCount = 0,
): MaterialSupplierRecord {
  return {
    id: row.id,
    supplierCode: row.supplierCode,
    name: row.name,
    shortName: row.shortName,
    contactName: row.contactName,
    phone: row.phone,
    email: row.email,
    address: row.address,
    taxCode: row.taxCode,
    note: row.note,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    materialCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMaterialSuppliers(params?: {
  activeOnly?: boolean;
  search?: string;
}) {
  const search = params?.search?.trim();
  const where: {
    isActive?: boolean;
    OR?: Array<Record<string, unknown>>;
  } = {};
  if (params?.activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { supplierCode: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { shortName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.materialSupplier.findMany({
    where,
    include: { _count: { select: { materialLinks: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    suppliers: rows.map((row) => mapRow(row, row._count.materialLinks)),
    total: rows.length,
  };
}

export async function getMaterialSupplierById(id: string): Promise<MaterialSupplierRecord | null> {
  const row = await prisma.materialSupplier.findUnique({
    where: { id },
    include: { _count: { select: { materialLinks: true } } },
  });
  return row ? mapRow(row, row._count.materialLinks) : null;
}

export async function createMaterialSupplier(
  input: CreateMaterialSupplierInput,
): Promise<MaterialSupplierRecord> {
  const name = input.name.trim();
  if (!name) throw new MaterialValidationError("Tên nhà cung cấp là bắt buộc.");

  const supplierCode = await generateMaterialSupplierCode();
  const row = await prisma.materialSupplier.create({
    data: {
      supplierCode,
      name,
      shortName: input.shortName?.trim() || null,
      contactName: input.contactName?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      taxCode: input.taxCode?.trim() || null,
      note: input.note?.trim() || null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
    include: { _count: { select: { materialLinks: true } } },
  });
  return mapRow(row, row._count.materialLinks);
}

export async function updateMaterialSupplier(
  id: string,
  input: UpdateMaterialSupplierInput,
): Promise<MaterialSupplierRecord> {
  const existing = await prisma.materialSupplier.findUnique({ where: { id } });
  if (!existing) throw new MaterialValidationError("Không tìm thấy nhà cung cấp.");

  const row = await prisma.materialSupplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.shortName !== undefined ? { shortName: input.shortName?.trim() || null } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName?.trim() || null } : {}),
      ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.address !== undefined ? { address: input.address?.trim() || null } : {}),
      ...(input.taxCode !== undefined ? { taxCode: input.taxCode?.trim() || null } : {}),
      ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
    include: { _count: { select: { materialLinks: true } } },
  });
  return mapRow(row, row._count.materialLinks);
}

export async function resolveMaterialSupplierSnapshot(supplierId: string | null | undefined) {
  if (!supplierId) {
    return { supplierId: null, supplierNameSnapshot: null };
  }
  const supplier = await prisma.materialSupplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new MaterialValidationError("Nhà cung cấp không hợp lệ.");
  if (!supplier.isActive) {
    throw new MaterialValidationError("Nhà cung cấp đã ngừng sử dụng.");
  }
  return {
    supplierId: supplier.id,
    supplierNameSnapshot: supplier.name,
  };
}

export async function getPreferredSupplierIdForMaterials(
  materialIds: string[],
): Promise<string | null> {
  const ids = [...new Set(materialIds.filter(Boolean))];
  if (ids.length === 0) return null;

  const links = await prisma.materialSupplierLink.findMany({
    where: { materialId: { in: ids }, isPreferred: true },
    select: { materialId: true, supplierId: true },
  });

  if (links.length !== ids.length) return null;
  const supplierIds = new Set(links.map((l) => l.supplierId));
  if (supplierIds.size !== 1) return null;
  return links[0]?.supplierId ?? null;
}
