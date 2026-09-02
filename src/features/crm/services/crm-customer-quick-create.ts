import { prisma } from "@/lib/prisma";
import { validateCrmTaxCode } from "@/features/crm/crm-validation";
import { CUSTOMER_LIST_INCLUDE, mapCustomerRow } from "@/features/crm/mappers";
import type { CrmCustomerRecord } from "@/features/crm/types";

export type CustomerQuickCreateMatchInput = {
  name?: string;
  taxCode?: string;
  email?: string;
};

function normalizeNameKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export async function findCustomerQuickCreateMatches(
  input: CustomerQuickCreateMatchInput,
): Promise<CrmCustomerRecord[]> {
  const matches: CrmCustomerRecord[] = [];
  const seen = new Set<string>();

  function push(row: Parameters<typeof mapCustomerRow>[0]) {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    matches.push(mapCustomerRow(row));
  }

  const taxCode = input.taxCode?.trim() ? validateCrmTaxCode(input.taxCode) : null;
  if (taxCode) {
    const row = await prisma.customer.findFirst({
      where: { taxCode: { equals: taxCode, mode: "insensitive" } },
      include: CUSTOMER_LIST_INCLUDE,
    });
    if (row) push(row);
  }

  const name = input.name?.trim();
  if (name) {
    const normalized = normalizeNameKey(name);
    const rows = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { legalName: { equals: name, mode: "insensitive" } },
          { name: { contains: name, mode: "insensitive" } },
        ],
      },
      include: CUSTOMER_LIST_INCLUDE,
      take: 8,
    });
    for (const row of rows) {
      const rowKey = normalizeNameKey(row.name);
      const legalKey = row.legalName ? normalizeNameKey(row.legalName) : "";
      if (
        rowKey === normalized ||
        legalKey === normalized ||
        row.name.toLocaleLowerCase("vi-VN").includes(name.toLocaleLowerCase("vi-VN"))
      ) {
        push(row);
      }
    }
  }

  const email = input.email?.trim().toLowerCase();
  if (email) {
    const customerRows = await prisma.customer.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      include: CUSTOMER_LIST_INCLUDE,
      take: 5,
    });
    for (const row of customerRows) push(row);

    const contactRows = await prisma.contact.findMany({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { customer: { include: CUSTOMER_LIST_INCLUDE } },
      take: 5,
    });
    for (const contact of contactRows) {
      if (contact.customer) push(contact.customer);
    }
  }

  return matches;
}
