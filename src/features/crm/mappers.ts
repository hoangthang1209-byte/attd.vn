import { Prisma, type CRMActivityType, type LeadPriority, type LeadSource, type LeadStatus } from "@prisma/client";
import type {
  CrmActivityRecord,
  CrmContactRecord,
  CrmCustomerRecord,
  CrmLeadNoteRecord,
  CrmLeadRecord,
  CrmProductInterestRecord,
} from "@/features/crm/types";

export function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export function mapLeadRow(row: {
  id: string;
  code?: string | null;
  fullName: string;
  contactName?: string | null;
  companyName?: string | null;
  phone: string;
  email: string | null;
  zalo?: string | null;
  company: string | null;
  source: LeadSource;
  sourceDetail?: string | null;
  demand?: string | null;
  status: LeadStatus;
  priority?: LeadPriority;
  message: string | null;
  note?: string | null;
  followUpAt: Date | null;
  nextFollowUpAt?: Date | null;
  estimatedValue?: Prisma.Decimal | null;
  assignedTo?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  convertedAt?: Date | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  createdAt: Date;
  updatedAt: Date;
  notes?: { id: string; leadId: string; content: string; createdAt: Date }[];
  activities?: Parameters<typeof mapActivityRow>[0][];
  productInterests?: Parameters<typeof mapProductInterestRow>[0][];
  customer?: Parameters<typeof mapCustomerRow>[0] | null;
}): CrmLeadRecord {
  return {
    id: row.id,
    code: row.code ?? null,
    fullName: row.fullName,
    contactName: row.contactName ?? null,
    companyName: row.companyName ?? null,
    phone: row.phone,
    email: row.email,
    zalo: row.zalo ?? null,
    company: row.company,
    source: row.source,
    sourceDetail: row.sourceDetail ?? null,
    demand: row.demand ?? null,
    status: row.status,
    priority: row.priority ?? "NORMAL",
    message: row.message,
    note: row.note ?? null,
    followUpAt: row.followUpAt?.toISOString() ?? null,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    estimatedValue: decimalToString(row.estimatedValue),
    assignedTo: row.assignedTo ?? null,
    customerId: row.customerId ?? null,
    contactId: row.contactId ?? null,
    convertedAt: row.convertedAt?.toISOString() ?? null,
    landingPage: row.landingPage ?? null,
    utmSource: row.utmSource ?? null,
    utmMedium: row.utmMedium ?? null,
    utmCampaign: row.utmCampaign ?? null,
    referrer: row.referrer ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes?.map(
      (note): CrmLeadNoteRecord => ({
        id: note.id,
        leadId: note.leadId,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      })
    ),
    activities: row.activities?.map(mapActivityRow),
    productInterests: row.productInterests?.map(mapProductInterestRow),
    customer: row.customer ? mapCustomerRow(row.customer) : null,
  };
}

export function mapActivityRow(row: {
  id: string;
  leadId: string | null;
  customerId: string | null;
  contactId: string | null;
  type: CRMActivityType;
  title: string;
  content: string | null;
  outcome: string | null;
  nextFollowUpAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CrmActivityRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    customerId: row.customerId,
    contactId: row.contactId,
    type: row.type,
    title: row.title,
    content: row.content,
    outcome: row.outcome,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapProductInterestRow(row: {
  id: string;
  leadId: string | null;
  customerId: string | null;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string | null;
  quantity: number | null;
  unit: string | null;
  requirementNote: string | null;
  serviceNeeds: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): CrmProductInterestRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    customerId: row.customerId,
    productId: row.productId,
    variantId: row.variantId,
    productNameSnapshot: row.productNameSnapshot,
    quantity: row.quantity,
    unit: row.unit,
    requirementNote: row.requirementNote,
    serviceNeeds:
      row.serviceNeeds && typeof row.serviceNeeds === "object" && !Array.isArray(row.serviceNeeds)
        ? (row.serviceNeeds as Record<string, boolean>)
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapContactRow(row: {
  id: string;
  customerId: string;
  fullName: string;
  title: string | null;
  department?: string | null;
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
    department: row.department ?? null,
    phone: row.phone,
    email: row.email,
    zalo: row.zalo,
    isPrimary: row.isPrimary,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapCustomerRow(row: {
  id: string;
  code: string;
  type: CrmCustomerRecord["type"];
  name: string;
  legalName: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  provinceId?: string | null;
  wardId?: string | null;
  provinceNameSnapshot?: string | null;
  wardNameSnapshot?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  status: CrmCustomerRecord["status"];
  note: string | null;
  internalNote?: string | null;
  billingNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  contacts?: Parameters<typeof mapContactRow>[0][];
  leads?: Parameters<typeof mapLeadRow>[0][];
  activities?: Parameters<typeof mapActivityRow>[0][];
  productInterests?: Parameters<typeof mapProductInterestRow>[0][];
}): CrmCustomerRecord {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    name: row.name,
    legalName: row.legalName,
    taxCode: row.taxCode,
    phone: row.phone,
    email: row.email,
    website: row.website,
    address: row.address,
    province: row.province,
    district: row.district,
    provinceId: row.provinceId ?? null,
    wardId: row.wardId ?? null,
    provinceNameSnapshot: row.provinceNameSnapshot ?? null,
    wardNameSnapshot: row.wardNameSnapshot ?? null,
    addressLine1: row.addressLine1 ?? null,
    addressLine2: row.addressLine2 ?? null,
    status: row.status,
    note: row.note,
    internalNote: row.internalNote ?? null,
    billingNote: row.billingNote ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    contacts: row.contacts?.map(mapContactRow),
    leads: row.leads?.map(mapLeadRow),
    activities: row.activities?.map(mapActivityRow),
    productInterests: row.productInterests?.map(mapProductInterestRow),
  };
}

export const LEAD_DETAIL_INCLUDE = {
  notes: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const } },
  productInterests: { orderBy: { createdAt: "desc" as const } },
  customer: true,
} satisfies Prisma.LeadInclude;

export const CUSTOMER_DETAIL_INCLUDE = {
  contacts: { orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }] },
  leads: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const } },
  productInterests: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.CustomerInclude;
