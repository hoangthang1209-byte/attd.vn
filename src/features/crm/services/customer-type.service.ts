import { prisma } from "@/lib/prisma";
import {
  normalizeCustomerTypeCode,
  type CreateCustomerTypeInput,
  type UpdateCustomerTypeInput,
} from "@/features/crm/customer-type-input";
import type { CustomerTypeRecord } from "@/features/crm/customer-type-types";

function mapRow(row: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { customers: number };
}): CustomerTypeRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    customerCount: row._count?.customers,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCustomerTypes(options?: {
  activeOnly?: boolean;
  includeCounts?: boolean;
}): Promise<CustomerTypeRecord[]> {
  const rows = await prisma.customerType.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: options?.includeCounts ? { _count: { select: { customers: true } } } : undefined,
  });
  return rows.map(mapRow);
}

export async function getCustomerTypeById(id: string): Promise<CustomerTypeRecord | null> {
  const row = await prisma.customerType.findUnique({
    where: { id },
    include: { _count: { select: { customers: true } } },
  });
  return row ? mapRow(row) : null;
}

export async function createCustomerType(input: CreateCustomerTypeInput): Promise<CustomerTypeRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên loại khách hàng là bắt buộc.");

  const code = normalizeCustomerTypeCode(input.code);
  if (!code) throw new Error("Mã loại khách hàng là bắt buộc.");

  const duplicate = await prisma.customerType.findUnique({ where: { code } });
  if (duplicate) throw new Error("Mã loại khách hàng đã tồn tại.");

  const row = await prisma.customerType.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  return mapRow(row);
}

export async function updateCustomerType(
  id: string,
  input: UpdateCustomerTypeInput,
): Promise<CustomerTypeRecord> {
  const existing = await prisma.customerType.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy loại khách hàng.");

  const data: {
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Tên loại khách hàng là bắt buộc.");
    data.name = name;
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  const row = await prisma.customerType.update({ where: { id }, data });
  return mapRow(row);
}

export async function deleteCustomerType(id: string): Promise<void> {
  const existing = await prisma.customerType.findUnique({
    where: { id },
    include: { _count: { select: { customers: true } } },
  });
  if (!existing) throw new Error("Không tìm thấy loại khách hàng.");
  if (existing.isSystem) throw new Error("Không thể xóa loại khách hàng hệ thống.");
  if (existing._count.customers > 0) {
    throw new Error("Không thể xóa loại khách hàng đang được sử dụng.");
  }

  await prisma.customerType.delete({ where: { id } });
}

export async function resolveCustomerTypeId(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const row = await prisma.customerType.findFirst({
    where: { id, isActive: true },
    select: { id: true },
  });
  if (!row) throw new Error("Loại khách hàng không hợp lệ hoặc đã ngưng sử dụng.");
  return row.id;
}
