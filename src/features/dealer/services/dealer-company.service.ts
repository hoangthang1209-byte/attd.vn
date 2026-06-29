import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateDealerCompanyCode } from "@/features/dealer/dealer-code";
import {
  DealerValidationError,
  normalizeOptionalString,
} from "@/features/dealer/dealer-validation";
import type {
  ApproveDealerCompanyInput,
  CreateDealerCompanyInput,
  DealerCompanyRecord,
  UpdateDealerCompanyInput,
} from "@/features/dealer/types";
import { ensureDefaultPriceGroups } from "@/features/pricing/services/price-group.service";

const COMPANY_INCLUDE = {
  customer: { select: { id: true, code: true, name: true } },
  priceGroup: { select: { id: true, code: true, name: true } },
  _count: { select: { users: true } },
} satisfies Prisma.DealerCompanyInclude;

type CompanyRow = Prisma.DealerCompanyGetPayload<{ include: typeof COMPANY_INCLUDE }>;

function mapCompany(row: CompanyRow): DealerCompanyRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    legalName: row.legalName,
    taxCode: row.taxCode,
    email: row.email,
    phone: row.phone,
    website: row.website,
    address: row.address,
    city: row.city,
    country: row.country,
    type: row.type,
    status: row.status,
    level: row.level,
    customerId: row.customerId,
    priceGroupId: row.priceGroupId,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customer: row.customer,
    priceGroup: row.priceGroup,
    userCount: row._count.users,
  };
}

export type ListDealerCompaniesParams = {
  search?: string;
  status?: Prisma.EnumDealerCompanyStatusFilter["equals"];
  type?: Prisma.EnumDealerCompanyTypeFilter["equals"];
  level?: Prisma.EnumDealerLevelFilter["equals"];
  limit?: number;
};

export async function listDealerCompanies(
  params: ListDealerCompaniesParams = {},
): Promise<{ companies: DealerCompanyRecord[]; total: number }> {
  const where: Prisma.DealerCompanyWhereInput = {};
  const search = params.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { taxCode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.level) where.level = params.level;

  const limit = Math.min(200, Math.max(1, params.limit ?? 100));

  const [rows, total] = await Promise.all([
    prisma.dealerCompany.findMany({
      where,
      include: COMPANY_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.dealerCompany.count({ where }),
  ]);

  return { companies: rows.map(mapCompany), total };
}

export async function getDealerCompanyById(id: string): Promise<DealerCompanyRecord | null> {
  const row = await prisma.dealerCompany.findUnique({
    where: { id },
    include: COMPANY_INCLUDE,
  });
  return row ? mapCompany(row) : null;
}

export async function createDealerCompany(
  input: CreateDealerCompanyInput,
): Promise<DealerCompanyRecord> {
  const name = input.name.trim();
  if (!name) {
    throw new DealerValidationError("Tên công ty là bắt buộc.");
  }

  const code = await generateDealerCompanyCode();

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.dealerCompany.create({
      data: {
        code,
        name,
        legalName: normalizeOptionalString(input.legalName),
        taxCode: normalizeOptionalString(input.taxCode),
        email: normalizeOptionalString(input.email),
        phone: normalizeOptionalString(input.phone),
        website: normalizeOptionalString(input.website),
        address: normalizeOptionalString(input.address),
        city: normalizeOptionalString(input.city),
        country: normalizeOptionalString(input.country) ?? "Vietnam",
        type: input.type ?? "DEALER",
        level: input.level ?? "STANDARD",
        notes: normalizeOptionalString(input.notes),
      },
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: created.id,
        type: "CREATED",
        title: "Tạo hồ sơ đại lý",
        description: `Mã đại lý ${created.code}`,
      },
    });

    return created;
  });

  return mapCompany(row);
}

export async function updateDealerCompany(
  id: string,
  input: UpdateDealerCompanyInput,
): Promise<DealerCompanyRecord> {
  const existing = await prisma.dealerCompany.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const data: Prisma.DealerCompanyUpdateInput = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new DealerValidationError("Tên công ty là bắt buộc.");
    data.name = name;
  }
  if (input.legalName !== undefined) data.legalName = normalizeOptionalString(input.legalName);
  if (input.taxCode !== undefined) data.taxCode = normalizeOptionalString(input.taxCode);
  if (input.email !== undefined) data.email = normalizeOptionalString(input.email);
  if (input.phone !== undefined) data.phone = normalizeOptionalString(input.phone);
  if (input.website !== undefined) data.website = normalizeOptionalString(input.website);
  if (input.address !== undefined) data.address = normalizeOptionalString(input.address);
  if (input.city !== undefined) data.city = normalizeOptionalString(input.city);
  if (input.country !== undefined) data.country = normalizeOptionalString(input.country) ?? "Vietnam";
  if (input.type !== undefined) data.type = input.type;
  if (input.level !== undefined) data.level = input.level;
  if (input.notes !== undefined) data.notes = normalizeOptionalString(input.notes);
  if (input.status !== undefined) data.status = input.status;

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerCompany.update({
      where: { id },
      data,
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: id,
        type: "UPDATED",
        title: "Cập nhật hồ sơ đại lý",
      },
    });

    return updated;
  });

  return mapCompany(row);
}

async function resolveDefaultDealerPriceGroupId(): Promise<string | null> {
  await ensureDefaultPriceGroups();
  const group = await prisma.priceGroup.findFirst({
    where: { code: "DEALER_PRICE", isActive: true },
    select: { id: true },
  });
  return group?.id ?? null;
}

export async function approveDealerCompany(
  id: string,
  input: ApproveDealerCompanyInput = {},
): Promise<DealerCompanyRecord> {
  const existing = await prisma.dealerCompany.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }
  if (existing.status === "APPROVED") {
    throw new DealerValidationError("Đại lý đã được duyệt.");
  }

  let priceGroupId = input.priceGroupId ?? existing.priceGroupId;
  if (!priceGroupId) {
    priceGroupId = await resolveDefaultDealerPriceGroupId();
  }
  if (priceGroupId) {
    const group = await prisma.priceGroup.findFirst({
      where: { id: priceGroupId, isActive: true },
    });
    if (!group) {
      throw new DealerValidationError("Nhóm giá không hợp lệ hoặc đã ngừng hoạt động.");
    }
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerCompany.update({
      where: { id },
      data: {
        status: "APPROVED",
        level: input.level ?? existing.level,
        priceGroupId,
        approvedAt: new Date(),
        approvedBy: normalizeOptionalString(input.approvedBy),
        rejectedAt: null,
        rejectionReason: null,
      },
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: id,
        type: "APPROVED",
        title: "Duyệt đại lý",
        description: input.approvedBy ? `Duyệt bởi ${input.approvedBy}` : undefined,
        metadata: priceGroupId ? { priceGroupId } : undefined,
      },
    });

    if (priceGroupId && priceGroupId !== existing.priceGroupId) {
      await tx.dealerActivity.create({
        data: {
          dealerCompanyId: id,
          type: "PRICE_GROUP_ASSIGNED",
          title: "Gán nhóm giá khi duyệt",
          metadata: { priceGroupId },
        },
      });
    }

    return updated;
  });

  return mapCompany(row);
}

export async function rejectDealerCompany(
  id: string,
  reason: string,
): Promise<DealerCompanyRecord> {
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    throw new DealerValidationError("Lý do từ chối là bắt buộc.");
  }

  const existing = await prisma.dealerCompany.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerCompany.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: trimmedReason,
        approvedAt: null,
        approvedBy: null,
      },
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: id,
        type: "REJECTED",
        title: "Từ chối đại lý",
        description: trimmedReason,
      },
    });

    return updated;
  });

  return mapCompany(row);
}

export async function linkDealerCompanyToCustomer(
  id: string,
  customerId: string,
): Promise<DealerCompanyRecord> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, code: true, name: true },
  });
  if (!customer) {
    throw new DealerValidationError("Không tìm thấy khách hàng CRM.");
  }

  const existing = await prisma.dealerCompany.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerCompany.update({
      where: { id },
      data: { customerId },
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: id,
        type: "CRM_LINKED",
        title: "Liên kết khách hàng CRM",
        description: `${customer.code} — ${customer.name}`,
        metadata: { customerId },
      },
    });

    return updated;
  });

  return mapCompany(row);
}

export async function assignDealerPriceGroup(
  id: string,
  priceGroupId: string,
): Promise<DealerCompanyRecord> {
  const group = await prisma.priceGroup.findFirst({
    where: { id: priceGroupId, isActive: true },
    select: { id: true, code: true, name: true },
  });
  if (!group) {
    throw new DealerValidationError("Nhóm giá không hợp lệ hoặc đã ngừng hoạt động.");
  }

  const existing = await prisma.dealerCompany.findUnique({ where: { id } });
  if (!existing) {
    throw new DealerValidationError("Không tìm thấy đại lý.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.dealerCompany.update({
      where: { id },
      data: { priceGroupId },
      include: COMPANY_INCLUDE,
    });

    await tx.dealerActivity.create({
      data: {
        dealerCompanyId: id,
        type: "PRICE_GROUP_ASSIGNED",
        title: "Gán nhóm giá",
        description: `${group.code} — ${group.name}`,
        metadata: { priceGroupId },
      },
    });

    return updated;
  });

  return mapCompany(row);
}
