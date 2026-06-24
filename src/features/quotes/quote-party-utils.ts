/** Build a single-line customer address from CRM fields. */
import { formatCustomerAddressPreview } from "@/features/crm/customer-address";

export function formatCustomerAddress(customer: {
  addressLine1?: string | null;
  wardNameSnapshot?: string | null;
  provinceNameSnapshot?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
}): string {
  return formatCustomerAddressPreview(customer);
}

export type CustomerSnapshotInput = {
  legalName?: string | null;
  name: string;
  taxCode?: string | null;
  addressLine1?: string | null;
  wardNameSnapshot?: string | null;
  provinceNameSnapshot?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

export type ContactSnapshotInput = {
  fullName: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
};

/** Map CRM customer to quote snapshot fields (company block). */
export function customerToQuoteSnapshots(customer: CustomerSnapshotInput) {
  return {
    customerCompanySnapshot: customer.legalName?.trim() || customer.name.trim(),
    customerTaxCodeSnapshot: customer.taxCode?.trim() || null,
    customerAddressSnapshot: formatCustomerAddress(customer) || null,
    customerPhoneSnapshot: customer.phone?.trim() || null,
    customerEmailSnapshot: customer.email?.trim() || null,
  };
}

/** Map CRM contact to quote contact snapshot fields. */
export function contactToQuoteSnapshots(
  contact: ContactSnapshotInput,
  customerFallback?: { phone?: string | null; email?: string | null },
) {
  return {
    customerContactNameSnapshot: contact.fullName.trim(),
    customerContactTitleSnapshot: contact.title?.trim() || null,
    customerPhoneSnapshot:
      contact.phone?.trim() || customerFallback?.phone?.trim() || null,
    customerEmailSnapshot:
      contact.email?.trim() || customerFallback?.email?.trim() || null,
  };
}
