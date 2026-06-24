import type { CustomerStatus, CustomerType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCustomerAddressSnapshots } from "@/features/administrative/administrative.service";
import { generateCustomerCode } from "@/features/crm/crm-code";
import {
  validateCrmEmail,
  validateCrmPhone,
  validateCrmTaxCode,
  normalizeWebsiteUrl,
} from "@/features/crm/crm-validation";
import {
  CUSTOMER_DETAIL_INCLUDE,
  mapCustomerRow,
} from "@/features/crm/mappers";
import { createCRMActivity } from "@/features/crm/services/crm-activity.service";
import {
  CRM_CUSTOMER_STATUSES,
  CRM_CUSTOMER_TYPES,
  type CreateCustomerInput,
  type CrmCustomerRecord,
} from "@/features/crm/types";

export type ListCustomersParams = {
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  limit?: number;
};

async function buildCustomerWriteData(
  input: Partial<CreateCustomerInput>,
  options?: { requireName?: boolean },
) {
  const data: Prisma.CustomerUpdateInput = {};

  if (input.type !== undefined) data.type = input.type;
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name && options?.requireName) {
      throw new Error("Tên khách hàng là bắt buộc.");
    }
    if (name) data.name = name;
  }
  if (input.legalName !== undefined) data.legalName = input.legalName?.trim() || null;
  if (input.taxCode !== undefined) data.taxCode = validateCrmTaxCode(input.taxCode);
  if (input.phone !== undefined) data.phone = validateCrmPhone(input.phone);
  if (input.email !== undefined) data.email = validateCrmEmail(input.email);
  if (input.website !== undefined) data.website = normalizeWebsiteUrl(input.website);
  if (input.address !== undefined) data.address = input.address?.trim() || null;
  if (input.province !== undefined) data.province = input.province?.trim() || null;
  if (input.district !== undefined) data.district = input.district?.trim() || null;
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1?.trim() || null;
  if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2?.trim() || null;
  if (input.note !== undefined) data.note = input.note?.trim() || null;
  if (input.internalNote !== undefined) data.internalNote = input.internalNote?.trim() || null;
  if (input.billingNote !== undefined) data.billingNote = input.billingNote?.trim() || null;
  if (input.status !== undefined) data.status = input.status;

  if (
    input.provinceId !== undefined ||
    input.wardId !== undefined ||
    input.provinceNameSnapshot !== undefined ||
    input.wardNameSnapshot !== undefined
  ) {
    const snapshots = await resolveCustomerAddressSnapshots({
      provinceId: input.provinceId,
      wardId: input.wardId,
      provinceNameSnapshot: input.provinceNameSnapshot,
      wardNameSnapshot: input.wardNameSnapshot,
    });

    if (input.provinceId !== undefined) {
      data.provinceRef = input.provinceId
        ? { connect: { id: input.provinceId } }
        : { disconnect: true };
      data.provinceNameSnapshot = snapshots.provinceNameSnapshot;
    } else if (input.provinceNameSnapshot !== undefined) {
      data.provinceNameSnapshot = snapshots.provinceNameSnapshot;
    }

    if (input.wardId !== undefined) {
      data.wardRef = input.wardId ? { connect: { id: input.wardId } } : { disconnect: true };
      data.wardNameSnapshot = snapshots.wardNameSnapshot;
      if (input.provinceId === undefined && snapshots.provinceNameSnapshot) {
        data.provinceNameSnapshot = snapshots.provinceNameSnapshot;
      }
    } else if (input.wardNameSnapshot !== undefined) {
      data.wardNameSnapshot = snapshots.wardNameSnapshot;
    }
  }

  return data;
}

export async function listCustomers(
  params: ListCustomersParams = {},
): Promise<{ customers: CrmCustomerRecord[]; total: number }> {
  const where: Prisma.CustomerWhereInput = {};
  const search = params.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { taxCode: { contains: search, mode: "insensitive" } },
      { addressLine1: { contains: search, mode: "insensitive" } },
      { provinceNameSnapshot: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;

  const limit = Math.min(200, Math.max(1, params.limit ?? 100));

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return { customers: rows.map(mapCustomerRow), total };
}

export async function getCustomerById(id: string): Promise<CrmCustomerRecord | null> {
  const row = await prisma.customer.findUnique({
    where: { id },
    include: CUSTOMER_DETAIL_INCLUDE,
  });
  return row ? mapCustomerRow(row) : null;
}

export async function createCustomer(input: CreateCustomerInput): Promise<CrmCustomerRecord | null> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Tên khách hàng là bắt buộc.");
  }

  const taxCode = validateCrmTaxCode(input.taxCode);
  if (taxCode) {
    const duplicateTax = await prisma.customer.findFirst({
      where: { taxCode: { equals: taxCode, mode: "insensitive" } },
    });
    if (duplicateTax) {
      throw new Error("Mã số thuế đã tồn tại trong hệ thống.");
    }
  }

  const duplicateName = await prisma.customer.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (duplicateName) {
    throw new Error("Tên khách hàng đã tồn tại trong hệ thống.");
  }

  try {
    const code = await generateCustomerCode();
    const writeData = await buildCustomerWriteData(input);

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          code,
          type: input.type ?? "BUSINESS",
          name,
          status: input.status ?? "PROSPECT",
          legalName: input.legalName?.trim() || null,
          taxCode,
          phone: validateCrmPhone(input.phone),
          email: validateCrmEmail(input.email),
          website: normalizeWebsiteUrl(input.website),
          address: input.address?.trim() || null,
          province: input.province?.trim() || null,
          district: input.district?.trim() || null,
          addressLine1: input.addressLine1?.trim() || null,
          addressLine2: input.addressLine2?.trim() || null,
          note: input.note?.trim() || null,
          internalNote: input.internalNote?.trim() || null,
          billingNote: input.billingNote?.trim() || null,
          provinceId: input.provinceId ?? null,
          wardId: input.wardId ?? null,
          provinceNameSnapshot:
            (writeData.provinceNameSnapshot as string | undefined) ??
            input.provinceNameSnapshot?.trim() ??
            null,
          wardNameSnapshot:
            (writeData.wardNameSnapshot as string | undefined) ??
            input.wardNameSnapshot?.trim() ??
            null,
        },
      });

      if (input.primaryContact?.fullName?.trim()) {
        await tx.contact.create({
          data: {
            customerId: created.id,
            fullName: input.primaryContact.fullName.trim(),
            title: input.primaryContact.title?.trim() || null,
            department: input.primaryContact.department?.trim() || null,
            phone: validateCrmPhone(input.primaryContact.phone),
            email: validateCrmEmail(input.primaryContact.email),
            zalo: input.primaryContact.zalo?.trim() || null,
            isPrimary: true,
            note: input.primaryContact.note?.trim() || null,
          },
        });
      }

      await tx.cRMActivity.create({
        data: {
          customerId: created.id,
          type: "NOTE",
          title: "Tạo khách hàng mới",
        },
      });

      return created;
    });

    return getCustomerById(customer.id);
  } catch (err) {
    console.error("[CRM] createCustomer failed:", err);
    if (err instanceof Error && err.message) {
      throw err;
    }
    return null;
  }
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<CreateCustomerInput, "primaryContact">>,
): Promise<CrmCustomerRecord | null> {
  try {
    const patch = await buildCustomerWriteData(data);
    if (Object.keys(patch).length === 0) return getCustomerById(id);

    await prisma.customer.update({
      where: { id },
      data: patch,
    });
    return getCustomerById(id);
  } catch (err) {
    if (err instanceof Error) throw err;
    return null;
  }
}

export async function createContact(input: {
  customerId: string;
  fullName: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  isPrimary?: boolean;
  note?: string | null;
}) {
  const fullName = input.fullName.trim();
  if (!fullName) {
    throw new Error("Họ tên người liên hệ là bắt buộc.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.contact.updateMany({
          where: { customerId: input.customerId },
          data: { isPrimary: false },
        });
      }

      await tx.contact.create({
        data: {
          customerId: input.customerId,
          fullName,
          title: input.title?.trim() || null,
          department: input.department?.trim() || null,
          phone: validateCrmPhone(input.phone),
          email: validateCrmEmail(input.email),
          zalo: input.zalo?.trim() || null,
          isPrimary: input.isPrimary ?? false,
          note: input.note?.trim() || null,
        },
      });
    });

    return getCustomerById(input.customerId);
  } catch (err) {
    console.error("[CRM] createContact failed:", err);
    if (err instanceof Error) throw err;
    return null;
  }
}

export async function setPrimaryContact(
  customerId: string,
  contactId: string,
): Promise<CrmCustomerRecord | null> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
    select: { id: true },
  });
  if (!contact) {
    throw new Error("Người liên hệ không thuộc khách hàng đã chọn.");
  }

  try {
    await prisma.$transaction([
      prisma.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      }),
      prisma.contact.update({
        where: { id: contactId },
        data: { isPrimary: true },
      }),
    ]);
    return getCustomerById(customerId);
  } catch {
    return null;
  }
}

export function isValidCustomerType(value: string): value is CustomerType {
  return CRM_CUSTOMER_TYPES.includes(value as CustomerType);
}

export function isValidCustomerStatus(value: string): value is CustomerStatus {
  return CRM_CUSTOMER_STATUSES.includes(value as CustomerStatus);
}

export async function addCustomerActivity(
  customerId: string,
  input: { type?: Parameters<typeof createCRMActivity>[0]["type"]; title: string; content?: string },
) {
  return createCRMActivity({
    customerId,
    type: input.type,
    title: input.title,
    content: input.content,
  });
}
