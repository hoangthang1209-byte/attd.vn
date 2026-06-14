import type { LeadSource, LeadStatus } from "@prisma/client";

export type CrmLeadRecord = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: LeadSource;
  status: LeadStatus;
  message: string | null;
  followUpAt: string | null;
  estimatedValue: string | null;
  landingPage: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: CrmLeadNoteRecord[];
};

export type CrmLeadNoteRecord = {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
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
  fullName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  source: LeadSource;
  message?: string | null;
  status?: LeadStatus;
  followUpAt?: Date | null;
  estimatedValue?: number | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
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
  "QUOTING",
  "NEGOTIATING",
  "WON",
  "LOST",
];

export const CRM_LEAD_SOURCES: LeadSource[] = [
  "CONTACT",
  "DEALER",
  "OEM",
  "SOURCING",
  "LANDING_PAGE",
];
