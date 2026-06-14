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

export type CrmLeadReminders = {
  dueToday: number;
  overdue: number;
};

export type CreateCrmLeadInput = {
  fullName: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  source: LeadSource;
  message?: string | null;
  status?: LeadStatus;
  followUpAt?: Date | null;
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
