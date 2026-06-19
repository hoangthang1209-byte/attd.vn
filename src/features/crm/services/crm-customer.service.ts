import type { CustomerStatus, CustomerType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateCustomerCode } from "@/features/crm/crm-code";
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

export async function listCustomers(
  params: ListCustomersParams = {}
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
  if (!name) return null;

  try {
    const code = await generateCustomerCode();

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          code,
          type: input.type ?? "BUSINESS",
          name,
          legalName: input.legalName?.trim() || null,
          taxCode: input.taxCode?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          website: input.website?.trim() || null,
          address: input.address?.trim() || null,
          province: input.province?.trim() || null,
          district: input.district?.trim() || null,
          status: input.status ?? "PROSPECT",
          note: input.note?.trim() || null,
        },
      });

      if (input.primaryContact?.fullName?.trim()) {
        await tx.contact.create({
          data: {
            customerId: created.id,
            fullName: input.primaryContact.fullName.trim(),
            title: input.primaryContact.title?.trim() || null,
            phone: input.primaryContact.phone?.trim() || null,
            email: input.primaryContact.email?.trim() || null,
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
    return null;
  }
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<CreateCustomerInput, "primaryContact">>
): Promise<CrmCustomerRecord | null> {
  try {
    await prisma.customer.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.legalName !== undefined ? { legalName: data.legalName?.trim() || null } : {}),
        ...(data.taxCode !== undefined ? { taxCode: data.taxCode?.trim() || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.website !== undefined ? { website: data.website?.trim() || null } : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(data.province !== undefined ? { province: data.province?.trim() || null } : {}),
        ...(data.district !== undefined ? { district: data.district?.trim() || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
      },
    });
    return getCustomerById(id);
  } catch {
    return null;
  }
}

export async function createContact(input: {
  customerId: string;
  fullName: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  isPrimary?: boolean;
  note?: string | null;
}) {
  const fullName = input.fullName.trim();
  if (!fullName) return null;

  try {
    const contact = await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.contact.updateMany({
          where: { customerId: input.customerId },
          data: { isPrimary: false },
        });
      }

      return tx.contact.create({
        data: {
          customerId: input.customerId,
          fullName,
          title: input.title?.trim() || null,
          phone: input.phone?.trim() || null,
          email: input.email?.trim() || null,
          zalo: input.zalo?.trim() || null,
          isPrimary: input.isPrimary ?? false,
          note: input.note?.trim() || null,
        },
      });
    });

    return getCustomerById(input.customerId);
  } catch (err) {
    console.error("[CRM] createContact failed:", err);
    return null;
  }
}

export async function setPrimaryContact(
  customerId: string,
  contactId: string
): Promise<CrmCustomerRecord | null> {
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
  input: { type?: Parameters<typeof createCRMActivity>[0]["type"]; title: string; content?: string }
) {
  return createCRMActivity({
    customerId,
    type: input.type,
    title: input.title,
    content: input.content,
  });
}
