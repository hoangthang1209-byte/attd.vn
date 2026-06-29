import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DealerValidationError,
  normalizeDealerEmail,
  normalizeOptionalString,
} from "@/features/dealer/dealer-validation";
import type {
  CreateDealerUserInput,
  DealerUserRecord,
  UpdateDealerUserInput,
} from "@/features/dealer/types";

function mapUser(row: {
  id: string;
  dealerCompanyId: string;
  name: string;
  email: string;
  phone: string | null;
  role: DealerUserRecord["role"];
  status: DealerUserRecord["status"];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): DealerUserRecord {
  return {
    id: row.id,
    dealerCompanyId: row.dealerCompanyId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDealerUsers(
  dealerCompanyId: string,
): Promise<{ users: DealerUserRecord[]; total: number }> {
  const company = await prisma.dealerCompany.findUnique({
    where: { id: dealerCompanyId },
    select: { id: true },
  });
  if (!company) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const rows = await prisma.dealerUser.findMany({
    where: { dealerCompanyId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return { users: rows.map(mapUser), total: rows.length };
}

export async function createDealerUser(
  dealerCompanyId: string,
  input: CreateDealerUserInput,
): Promise<DealerUserRecord> {
  const company = await prisma.dealerCompany.findUnique({
    where: { id: dealerCompanyId },
    select: { id: true },
  });
  if (!company) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new DealerValidationError("Tên người dùng là bắt buộc.");
  }

  const email = normalizeDealerEmail(input.email);

  const duplicate = await prisma.dealerUser.findUnique({ where: { email } });
  if (duplicate) {
    throw new DealerValidationError("Email đã được sử dụng bởi người dùng đại lý khác.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.dealerUser.create({
      data: {
        dealerCompanyId,
        name,
        email,
        phone: normalizeOptionalString(input.phone),
        role: input.role ?? "VIEWER",
        status: input.status ?? "INVITED",
      },
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId,
        dealerUserId: created.id,
        type: "USER_ADDED",
        title: "Thêm người dùng đại lý",
        description: `${created.name} (${created.email})`,
        metadata: { role: created.role },
      },
    });

    return created;
  });

  return mapUser(row);
}

export async function updateDealerUser(
  id: string,
  input: UpdateDealerUserInput,
): Promise<DealerUserRecord> {
  const existing = await prisma.dealerUser.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy người dùng đại lý.");
  }

  const data: Prisma.DealerUserUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new DealerValidationError("Tên người dùng là bắt buộc.");
    data.name = name;
  }
  if (input.email !== undefined) {
    const email = normalizeDealerEmail(input.email);
    if (email !== existing.email) {
      const duplicate = await prisma.dealerUser.findUnique({ where: { email } });
      if (duplicate) {
        throw new DealerValidationError("Email đã được sử dụng bởi người dùng đại lý khác.");
      }
    }
    data.email = email;
  }
  if (input.phone !== undefined) data.phone = normalizeOptionalString(input.phone);
  if (input.role !== undefined) data.role = input.role;
  if (input.status !== undefined) data.status = input.status;

  const row = await prisma.dealerUser.update({ where: { id }, data });
  return mapUser(row);
}

export async function disableDealerUser(id: string): Promise<DealerUserRecord> {
  const existing = await prisma.dealerUser.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy người dùng đại lý.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerUser.update({
      where: { id },
      data: { status: "DISABLED" },
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: existing.dealerCompanyId,
        dealerUserId: id,
        type: "UPDATED",
        title: "Vô hiệu người dùng đại lý",
        description: updated.email,
      },
    });

    return updated;
  });

  return mapUser(row);
}
