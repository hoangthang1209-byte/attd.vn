import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";

export function minimalCustomerRecord(input: {
  id: string;
  name: string;
  code: string;
}): CrmCustomerRecord {
  return {
    id: input.id,
    code: input.code,
    name: input.name,
    legacyType: "BUSINESS",
    customerTypeId: null,
    customerType: null,
    legalName: null,
    taxCode: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    province: null,
    district: null,
    provinceId: null,
    wardId: null,
    provinceNameSnapshot: null,
    wardNameSnapshot: null,
    addressLine1: null,
    addressLine2: null,
    representativeName: null,
    representativeSalutation: null,
    representativeTitle: null,
    authorizationDocumentNo: null,
    status: "ACTIVE",
    note: null,
    internalNote: null,
    billingNote: null,
    createdAt: "",
    updatedAt: "",
  };
}

export function pickQuickCreateContact(
  customer: CrmCustomerRecord,
  contactFullName: string,
): CrmContactRecord | null {
  if (!contactFullName.trim()) return null;
  const trimmed = contactFullName.trim();
  return (
    customer.contacts?.find((c) => c.fullName === trimmed) ??
    customer.contacts?.find((c) => c.isPrimary) ??
    customer.contacts?.[0] ??
    null
  );
}

export function buildQuickCreateCustomerPayload(input: {
  name: string;
  taxCode?: string;
  phone?: string;
  email?: string;
  contactFullName?: string;
  contactPhone?: string;
  contactEmail?: string;
  legacyType?: "BUSINESS" | "RETAIL" | "OTHER";
}) {
  const contactName = input.contactFullName?.trim() ?? "";
  return {
    type: input.legacyType ?? "BUSINESS",
    name: input.name.trim(),
    taxCode: input.taxCode?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    primaryContact: contactName
      ? {
          fullName: contactName,
          phone: input.contactPhone?.trim() || input.phone?.trim() || null,
          email: input.contactEmail?.trim() || input.email?.trim() || null,
        }
      : null,
  };
}
