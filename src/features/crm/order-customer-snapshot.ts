import type { CreateManualOrderInput } from "@/features/orders/order.types";
import { formatCustomerAddressPreview } from "@/features/crm/customer-address";
import { normalizeWebsiteUrl } from "@/features/crm/crm-validation";

export type CrmCustomerSnapshotSource = {
  code: string;
  name: string;
  legalName?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  wardNameSnapshot?: string | null;
  provinceNameSnapshot?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
};

export type CrmContactSnapshotSource = {
  fullName: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function customerToOrderSnapshots(customer: CrmCustomerSnapshotSource) {
  const customerAddress = formatCustomerAddressPreview(customer);
  return {
    customerCode: customer.code?.trim() || null,
    customerCompanyName: customer.name.trim(),
    customerNameSnapshot: customer.name.trim(),
    customerLegalNameSnapshot: customer.legalName?.trim() || null,
    customerTaxCode: customer.taxCode?.trim() || null,
    customerPhoneSnapshot: customer.phone?.trim() || null,
    customerEmailSnapshot: customer.email?.trim() || null,
    customerWebsiteSnapshot: normalizeWebsiteUrl(customer.website),
    customerProvinceNameSnapshot:
      customer.provinceNameSnapshot?.trim() || customer.province?.trim() || null,
    customerWardNameSnapshot: customer.wardNameSnapshot?.trim() || null,
    customerAddressLine1Snapshot:
      customer.addressLine1?.trim() || customer.address?.trim() || null,
    customerAddress: customerAddress || null,
  };
}

export function contactToOrderSnapshots(contact: CrmContactSnapshotSource) {
  return {
    contactName: contact.fullName.trim(),
    contactTitle: contact.title?.trim() || null,
    contactDepartment: contact.department?.trim() || null,
    contactPhone: contact.phone?.trim() || null,
    contactEmail: contact.email?.trim() || null,
  };
}

type SnapshotField = keyof ReturnType<typeof customerToOrderSnapshots>;

function fillMissingString(
  current: string | null | undefined,
  fallback: string | null | undefined,
): string | null | undefined {
  if (current?.trim()) return current.trim();
  return fallback ?? current;
}

export function enrichOrderInputFromCrmSnapshots(
  input: CreateManualOrderInput,
  customer: CrmCustomerSnapshotSource,
  contact?: CrmContactSnapshotSource | null,
): CreateManualOrderInput {
  const customerSnapshots = customerToOrderSnapshots(customer);
  const enriched: CreateManualOrderInput = { ...input };

  (Object.keys(customerSnapshots) as SnapshotField[]).forEach((key) => {
    const current = enriched[key as keyof CreateManualOrderInput] as string | null | undefined;
    const fallback = customerSnapshots[key];
    const next = fillMissingString(current, fallback);
    if (next !== undefined) {
      (enriched as Record<string, unknown>)[key] = next;
    }
  });

  if (contact) {
    const contactSnapshots = contactToOrderSnapshots(contact);
    enriched.contactName = fillMissingString(enriched.contactName, contactSnapshots.contactName) ?? enriched.contactName;
    enriched.contactTitle = fillMissingString(enriched.contactTitle, contactSnapshots.contactTitle) ?? enriched.contactTitle;
    enriched.contactDepartment = fillMissingString(
      enriched.contactDepartment,
      contactSnapshots.contactDepartment,
    ) ?? enriched.contactDepartment;
    enriched.contactPhone = fillMissingString(enriched.contactPhone, contactSnapshots.contactPhone) ?? enriched.contactPhone;
    enriched.contactEmail = fillMissingString(enriched.contactEmail, contactSnapshots.contactEmail) ?? enriched.contactEmail;
  }

  return enriched;
}
