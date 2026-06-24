import type {
  CRMActivityType,
  CustomerStatus,
  CustomerType,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "@prisma/client";

export type CrmLeadNoteRecord = {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
};

export type CrmActivityRecord = {
  id: string;
  leadId: string | null;
  customerId: string | null;
  contactId: string | null;
  type: CRMActivityType;
  title: string;
  content: string | null;
  outcome: string | null;
  nextFollowUpAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmProductInterestRecord = {
  id: string;
  leadId: string | null;
  customerId: string | null;
  productId: string | null;
  variantId: string | null;
  productNameSnapshot: string | null;
  quantity: number | null;
  unit: string | null;
  requirementNote: string | null;
  serviceNeeds: Record<string, boolean> | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmLeadRecord = {
  id: string;
  code: string | null;
  fullName: string;
  contactName: string | null;
  companyName: string | null;
  phone: string;
  email: string | null;
  zalo: string | null;
  company: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  demand: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  message: string | null;
  note: string | null;
  followUpAt: string | null;
  nextFollowUpAt: string | null;
  estimatedValue: string | null;
  assignedTo: string | null;
  customerId: string | null;
  contactId: string | null;
  convertedAt: string | null;
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: CrmLeadNoteRecord[];
  activities?: CrmActivityRecord[];
  productInterests?: CrmProductInterestRecord[];
  customer?: CrmCustomerRecord | null;
};

export type CrmContactRecord = {
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
  createdAt: string;
  updatedAt: string;
};

export type CrmCustomerRecord = {
  id: string;
  code: string;
  type: CustomerType;
  name: string;
  legalName: string | null;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  provinceId: string | null;
  wardId: string | null;
  provinceNameSnapshot: string | null;
  wardNameSnapshot: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  status: CustomerStatus;
  note: string | null;
  internalNote: string | null;
  billingNote: string | null;
  createdAt: string;
  updatedAt: string;
  contacts?: CrmContactRecord[];
  leads?: CrmLeadRecord[];
  activities?: CrmActivityRecord[];
  productInterests?: CrmProductInterestRecord[];
};

export type CrmOverviewMetrics = {
  newLeads: number;
  leadsNeedCare: number;
  leadsNeedPricing: number;
  prospectCustomers: number;
  activeCustomers: number;
  recentLeads: CrmLeadRecord[];
  recentActivities: CrmActivityRecord[];
};

export type CrmLeadKpis = Record<LeadStatus, number>;

export type CrmLeadValueKpis = {
  pipelineTotal: string | null;
  wonTotal: string | null;
};

export type CrmLeadReminders = {
  dueToday: number;
  overdue: number;
  dueTodayLeads: CrmLeadRecord[];
  overdueLeads: CrmLeadRecord[];
};

export type CreateCrmLeadInput = {
  id?: string;
  fullName?: string;
  contactName?: string | null;
  companyName?: string | null;
  phone?: string;
  email?: string | null;
  zalo?: string | null;
  company?: string | null;
  source?: LeadSource;
  sourceDetail?: string | null;
  demand?: string | null;
  message?: string | null;
  note?: string | null;
  status?: LeadStatus;
  priority?: LeadPriority;
  followUpAt?: Date | null;
  nextFollowUpAt?: Date | null;
  estimatedValue?: number | null;
  assignedTo?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  productInterest?: CreateProductInterestInput | null;
  productInterests?: CreateProductInterestInput[];
};

export type CreateProductInterestInput = {
  productId?: string | null;
  variantId?: string | null;
  productNameSnapshot?: string | null;
  quantity?: number | null;
  unit?: string | null;
  requirementNote?: string | null;
  serviceNeeds?: Record<string, boolean> | null;
};

export type CreateCustomerInput = {
  type?: CustomerType;
  name: string;
  legalName?: string | null;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  province?: string | null;
  district?: string | null;
  provinceId?: string | null;
  wardId?: string | null;
  provinceNameSnapshot?: string | null;
  wardNameSnapshot?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  status?: CustomerStatus;
  note?: string | null;
  internalNote?: string | null;
  billingNote?: string | null;
  primaryContact?: {
    fullName: string;
    title?: string | null;
    department?: string | null;
    phone?: string | null;
    email?: string | null;
    zalo?: string | null;
    note?: string | null;
  } | null;
};

export type CreateContactInput = {
  customerId: string;
  fullName: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  isPrimary?: boolean;
  note?: string | null;
};

export type UpdateContactInput = {
  fullName?: string;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  isPrimary?: boolean;
  note?: string | null;
};

export type ListCrmLeadsResult = {
  leads: CrmLeadRecord[];
  total: number;
  kpis: CrmLeadKpis;
  valueKpis: CrmLeadValueKpis;
  reminders: CrmLeadReminders;
  error?: string;
};

export const CRM_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "NEED_PRICING",
  "QUOTED",
  "QUOTING",
  "NEGOTIATING",
  "WON",
  "LOST",
  "NOT_FIT",
];

export const CRM_LEAD_PRIORITIES: LeadPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export const CRM_LEAD_SOURCES: LeadSource[] = [
  "WEBSITE",
  "ZALO",
  "FACEBOOK",
  "PHONE",
  "REFERRAL",
  "OLD_CUSTOMER",
  "DIRECT",
  "OTHER",
  "CONTACT",
  "DEALER",
  "OEM",
  "SOURCING",
  "LANDING_PAGE",
  "PRODUCT_INQUIRY",
];

export const CRM_CUSTOMER_TYPES: CustomerType[] = [
  "DEALER",
  "AGENCY",
  "PRINTER",
  "EVENT_COMPANY",
  "BUSINESS",
  "RETAIL",
  "SUPPLIER",
  "OTHER",
];

export const CRM_CUSTOMER_STATUSES: CustomerStatus[] = [
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "VIP",
  "BLACKLISTED",
];

export const CRM_ACTIVITY_TYPES: CRMActivityType[] = [
  "CALL",
  "ZALO",
  "EMAIL",
  "MEETING",
  "NOTE",
  "FOLLOW_UP",
  "QUOTE_REQUEST",
  "SAMPLE_REQUEST",
  "STATUS_CHANGE",
];
