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
  assignedEmployeeId?: string | null;
  assignedAt?: Date | null;
  assignmentSource?: string | null;
  lastInboundAt?: Date | null;
  assignedEmployee?: { id: string; fullName: string; employeeCode: string } | null;
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
  inboundEvents?: Array<{
    id: string;
    source: LeadSource;
    channel: string;
    externalId: string | null;
    receivedAt: Date;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    note: string | null;
    dueAt: Date | null;
    completedAt: Date | null;
    outcome: string | null;
    owner?: { id: string; fullName: string } | null;
  }>;
  assignmentHistory?: Array<{
    id: string;
    fromEmployeeId: string | null;
    toEmployeeId: string | null;
    actorId: string | null;
    reason: string | null;
    createdAt: Date;
    fromEmployee?: { fullName: string } | null;
    toEmployee?: { fullName: string } | null;
  }>;
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
    assignedEmployeeId: row.assignedEmployeeId ?? null,
    assignedAt: row.assignedAt?.toISOString() ?? null,
    assignmentSource: row.assignmentSource ?? null,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    assignedEmployee: row.assignedEmployee
      ? {
          id: row.assignedEmployee.id,
          fullName: row.assignedEmployee.fullName,
          employeeCode: row.assignedEmployee.employeeCode,
        }
      : null,
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
    inboundEvents: row.inboundEvents?.map((event) => ({
      id: event.id,
      source: event.source,
      channel: event.channel,
      externalId: event.externalId,
      receivedAt: event.receivedAt.toISOString(),
    })),
    tasks: row.tasks?.map((task) => ({
      id: task.id,
      title: task.title,
      note: task.note,
      dueAt: task.dueAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      outcome: task.outcome,
      owner: task.owner ? { id: task.owner.id, fullName: task.owner.fullName } : null,
    })),
    assignmentHistory: row.assignmentHistory?.map((event) => ({
      id: event.id,
      fromEmployeeId: event.fromEmployeeId,
      toEmployeeId: event.toEmployeeId,
      fromEmployeeName: event.fromEmployee?.fullName ?? null,
      toEmployeeName: event.toEmployee?.fullName ?? null,
      actorId: event.actorId,
      reason: event.reason,
      createdAt: event.createdAt.toISOString(),
    })),
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
  legacyType: CrmCustomerRecord["legacyType"];
  customerTypeId?: string | null;
  customerType?: { id: string; code: string; name: string; isActive: boolean } | null;
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
  representativeName?: string | null;
  representativeSalutation?: CrmCustomerRecord["representativeSalutation"];
  representativeTitle?: string | null;
  authorizationDocumentNo?: string | null;
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
    legacyType: row.legacyType,
    customerTypeId: row.customerTypeId ?? null,
    customerType: row.customerType
      ? {
          id: row.customerType.id,
          code: row.customerType.code,
          name: row.customerType.name,
          isActive: row.customerType.isActive,
        }
      : null,
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
    representativeName: row.representativeName ?? null,
    representativeSalutation: row.representativeSalutation ?? null,
    representativeTitle: row.representativeTitle ?? null,
    authorizationDocumentNo: row.authorizationDocumentNo ?? null,
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
  assignedEmployee: { select: { id: true, fullName: true, employeeCode: true } },
  tasks: {
    orderBy: [{ completedAt: "asc" as const }, { dueAt: "asc" as const }, { createdAt: "desc" as const }],
    take: 50,
    include: { owner: { select: { id: true, fullName: true } } },
  },
  inboundEvents: {
    orderBy: { receivedAt: "desc" as const },
    take: 50,
  },
  assignmentHistory: {
    orderBy: { createdAt: "desc" as const },
    take: 50,
    include: {
      fromEmployee: { select: { fullName: true } },
      toEmployee: { select: { fullName: true } },
    },
  },
} satisfies Prisma.LeadInclude;

export const CUSTOMER_LIST_INCLUDE = {
  customerType: {
    select: { id: true, code: true, name: true, isActive: true },
  },
} satisfies Prisma.CustomerInclude;

export const CUSTOMER_DETAIL_INCLUDE = {
  customerType: {
    select: { id: true, code: true, name: true, isActive: true },
  },
  contacts: { orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }] },
  leads: { orderBy: { createdAt: "desc" as const } },
  activities: { orderBy: { createdAt: "desc" as const } },
  productInterests: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.CustomerInclude;
