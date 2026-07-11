import type {
  CustomerLegacyType,
  CustomerRepresentativeSalutation,
  CustomerStatus,
} from "@prisma/client";
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
  CUSTOMER_LIST_INCLUDE,
  mapCustomerRow,
} from "@/features/crm/mappers";
import { createCRMActivity } from "@/features/crm/services/crm-activity.service";
import { resolveCustomerTypeId } from "@/features/crm/services/customer-type.service";
import { REPRESENTATIVE_SALUTATION_LABELS } from "@/features/crm/labels";
import {
  CRM_CUSTOMER_LEGACY_TYPES,
  CRM_CUSTOMER_STATUSES,
  type CreateCustomerInput,
  type CrmCustomerRecord,
} from "@/features/crm/types";

export type ListCustomersParams = {
  search?: string;
  customerTypeId?: string;
  unclassified?: boolean;
  legacyType?: CustomerLegacyType;
  status?: CustomerStatus;
  limit?: number;
};

const LEGACY_TYPE_BY_CODE: Record<string, CustomerLegacyType> = {
  BUSINESS: "BUSINESS",
  DEALER: "DEALER",
  AGENCY: "AGENCY",
  PRINT_SHOP: "PRINTER",
  DISTRIBUTOR: "SUPPLIER",
  TRADING: "BUSINESS",
  BRAND: "BUSINESS",
  ORGANIZATION: "EVENT_COMPANY",
  INDIVIDUAL: "RETAIL",
  OTHER: "OTHER",
};

function normalizeOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidRepresentativeSalutation(
  value: string,
): value is CustomerRepresentativeSalutation {
  return value === "MR" || value === "MRS" || value === "MS" || value === "OTHER";
}

async function syncLegacyTypeFromCustomerTypeId(customerTypeId: string | null | undefined) {
  if (!customerTypeId) return undefined;
  const row = await prisma.customerType.findUnique({
    where: { id: customerTypeId },
    select: { code: true },
  });
  if (!row) return undefined;
  return LEGACY_TYPE_BY_CODE[row.code] ?? "OTHER";
}

async function buildCustomerWriteData(
  input: Partial<CreateCustomerInput>,
  options?: { requireName?: boolean },
) {
  const data: Prisma.CustomerUpdateInput = {};

  if (input.legacyType !== undefined) data.legacyType = input.legacyType;
  if (input.customerTypeId !== undefined) {
    if (input.customerTypeId === null) {
      data.customerType = { disconnect: true };
    } else {
      const customerTypeId = await resolveCustomerTypeId(input.customerTypeId);
      data.customerType = customerTypeId ? { connect: { id: customerTypeId } } : { disconnect: true };
      const legacyType = await syncLegacyTypeFromCustomerTypeId(customerTypeId);
      if (legacyType) data.legacyType = legacyType;
    }
  }
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name && options?.requireName) {
      throw new Error("Tên khách hàng là bắt buộc.");
    }
    if (name) data.name = name;
  }
  if (input.legalName !== undefined) data.legalName = normalizeOptionalString(input.legalName);
  if (input.taxCode !== undefined) data.taxCode = validateCrmTaxCode(input.taxCode);
  if (input.phone !== undefined) data.phone = validateCrmPhone(input.phone);
  if (input.email !== undefined) data.email = validateCrmEmail(input.email);
  if (input.website !== undefined) data.website = normalizeWebsiteUrl(input.website);
  if (input.address !== undefined) data.address = normalizeOptionalString(input.address);
  if (input.province !== undefined) data.province = normalizeOptionalString(input.province);
  if (input.district !== undefined) data.district = normalizeOptionalString(input.district);
  if (input.addressLine1 !== undefined) data.addressLine1 = normalizeOptionalString(input.addressLine1);
  if (input.addressLine2 !== undefined) data.addressLine2 = normalizeOptionalString(input.addressLine2);
  if (input.note !== undefined) data.note = normalizeOptionalString(input.note);
  if (input.internalNote !== undefined) data.internalNote = normalizeOptionalString(input.internalNote);
  if (input.billingNote !== undefined) data.billingNote = normalizeOptionalString(input.billingNote);
  if (input.status !== undefined) data.status = input.status;
  if (input.representativeName !== undefined) {
    data.representativeName = normalizeOptionalString(input.representativeName);
  }
  if (input.representativeSalutation !== undefined) {
    data.representativeSalutation = input.representativeSalutation;
  }
  if (input.representativeTitle !== undefined) {
    data.representativeTitle = normalizeOptionalString(input.representativeTitle);
  }
  if (input.authorizationDocumentNo !== undefined) {
    data.authorizationDocumentNo = normalizeOptionalString(input.authorizationDocumentNo);
  }

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
  if (params.unclassified) {
    where.customerTypeId = null;
  } else if (params.customerTypeId) {
    where.customerTypeId = params.customerTypeId;
  }
  if (params.legacyType) where.legacyType = params.legacyType;
  if (params.status) where.status = params.status;

  const limit = Math.min(200, Math.max(1, params.limit ?? 100));

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: CUSTOMER_LIST_INCLUDE,
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
    const defaultBusinessType = await prisma.customerType.findUnique({
      where: { code: "BUSINESS" },
      select: { id: true },
    });
    const customerTypeId =
      input.customerTypeId !== undefined
        ? await resolveCustomerTypeId(input.customerTypeId)
        : defaultBusinessType?.id ?? null;
    const legacyType =
      input.legacyType ??
      (await syncLegacyTypeFromCustomerTypeId(customerTypeId)) ??
      "BUSINESS";

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          code,
          legacyType,
          customerTypeId,
          name,
          status: input.status ?? "PROSPECT",
          legalName: normalizeOptionalString(input.legalName),
          taxCode,
          phone: validateCrmPhone(input.phone),
          email: validateCrmEmail(input.email),
          website: normalizeWebsiteUrl(input.website),
          address: normalizeOptionalString(input.address),
          province: normalizeOptionalString(input.province),
          district: normalizeOptionalString(input.district),
          addressLine1: normalizeOptionalString(input.addressLine1),
          addressLine2: normalizeOptionalString(input.addressLine2),
          note: normalizeOptionalString(input.note),
          internalNote: normalizeOptionalString(input.internalNote),
          billingNote: normalizeOptionalString(input.billingNote),
          representativeName: normalizeOptionalString(input.representativeName),
          representativeSalutation: input.representativeSalutation ?? null,
          representativeTitle: normalizeOptionalString(input.representativeTitle),
          authorizationDocumentNo: normalizeOptionalString(input.authorizationDocumentNo),
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
            title: normalizeOptionalString(input.primaryContact.title),
            department: normalizeOptionalString(input.primaryContact.department),
            phone: validateCrmPhone(input.primaryContact.phone),
            email: validateCrmEmail(input.primaryContact.email),
            zalo: normalizeOptionalString(input.primaryContact.zalo),
            isPrimary: true,
            note: normalizeOptionalString(input.primaryContact.note),
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
          title: normalizeOptionalString(input.title),
          department: normalizeOptionalString(input.department),
          phone: validateCrmPhone(input.phone),
          email: validateCrmEmail(input.email),
          zalo: normalizeOptionalString(input.zalo),
          isPrimary: input.isPrimary ?? false,
          note: normalizeOptionalString(input.note),
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

export function isValidCustomerLegacyType(value: string): value is CustomerLegacyType {
  return CRM_CUSTOMER_LEGACY_TYPES.includes(value as CustomerLegacyType);
}

/** @deprecated Use customer type master data validation */
export const isValidCustomerType = isValidCustomerLegacyType;

export function isValidCustomerStatus(value: string): value is CustomerStatus {
  return CRM_CUSTOMER_STATUSES.includes(value as CustomerStatus);
}

export function isValidRepresentativeSalutationValue(
  value: string,
): value is CustomerRepresentativeSalutation {
  return isValidRepresentativeSalutation(value);
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

export function formatRepresentativeDisplay(customer: {
  representativeSalutation?: CustomerRepresentativeSalutation | null;
  representativeName?: string | null;
  representativeTitle?: string | null;
}): string | null {
  const name = customer.representativeName?.trim();
  if (!name) return null;
  const parts: string[] = [];
  if (customer.representativeSalutation) {
    parts.push(REPRESENTATIVE_SALUTATION_LABELS[customer.representativeSalutation]);
  }
  parts.push(name);
  if (customer.representativeTitle?.trim()) {
    parts.push(`— ${customer.representativeTitle.trim()}`);
  }
  return parts.join(" ");
}
