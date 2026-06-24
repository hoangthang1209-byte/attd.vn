import { prisma } from "@/lib/prisma";
import {
  validateCrmEmail,
  validateCrmPhone,
} from "@/features/crm/crm-validation";
import type { CrmContactRecord, UpdateContactInput } from "@/features/crm/types";

function mapContact(row: {
  id: string;
  customerId: string;
  fullName: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  isPrimary: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CrmContactRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    fullName: row.fullName,
    title: row.title,
    department: row.department,
    phone: row.phone,
    email: row.email,
    zalo: row.zalo,
    isPrimary: row.isPrimary,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCustomerContacts(customerId: string): Promise<CrmContactRecord[]> {
  const rows = await prisma.contact.findMany({
    where: { customerId },
    orderBy: [{ isPrimary: "desc" }, { fullName: "asc" }],
  });
  return rows.map(mapContact);
}

export async function getContactById(contactId: string): Promise<CrmContactRecord | null> {
  const row = await prisma.contact.findUnique({ where: { id: contactId } });
  return row ? mapContact(row) : null;
}

export async function validateContactBelongsToCustomer(
  customerId: string,
  contactId: string,
): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { customerId: true },
  });
  return contact?.customerId === customerId;
}

export async function updateContact(
  customerId: string,
  contactId: string,
  input: UpdateContactInput,
): Promise<CrmContactRecord | null> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
  });
  if (!existing) {
    throw new Error("Người liên hệ không thuộc khách hàng đã chọn.");
  }

  if (input.fullName !== undefined && !input.fullName.trim()) {
    throw new Error("Họ tên người liên hệ là bắt buộc.");
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.contact.updateMany({
        where: { customerId },
        data: { isPrimary: false },
      });
    }

    return tx.contact.update({
      where: { id: contactId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
        ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
        ...(input.department !== undefined ? { department: input.department?.trim() || null } : {}),
        ...(input.phone !== undefined ? { phone: validateCrmPhone(input.phone) } : {}),
        ...(input.email !== undefined ? { email: validateCrmEmail(input.email) } : {}),
        ...(input.zalo !== undefined ? { zalo: input.zalo?.trim() || null } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
      },
    });
  });

  return mapContact(row);
}

export async function deleteContact(customerId: string, contactId: string): Promise<boolean> {
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, customerId },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Người liên hệ không thuộc khách hàng đã chọn.");
  }

  await prisma.contact.delete({ where: { id: contactId } });
  return true;
}
