import { prisma } from "@/lib/prisma";
import type { CrmContactRecord } from "@/features/crm/types";

function mapContact(row: {
  id: string;
  customerId: string;
  fullName: string;
  title: string | null;
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
