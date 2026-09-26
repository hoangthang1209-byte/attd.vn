import type { LeadSource, LeadStatus } from "@prisma/client";
import type { CreateProductInterestInput, CrmLeadRecord } from "@/features/crm/types";

/** Intake channel — how the lead entered the normalized pipeline. */
export type LeadIntakeChannel = "WEBSITE" | "GMAIL" | "MANUAL" | "OTHER";

export type NormalizedLeadIntakeInput = {
  channel: LeadIntakeChannel;
  source: LeadSource;
  sourceRef?: string | null;
  receivedAt?: Date | null;
  contactName?: string | null;
  companyName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  zalo?: string | null;
  message?: string | null;
  demand?: string | null;
  note?: string | null;
  status?: LeadStatus;
  priority?: import("@prisma/client").LeadPriority;
  nextFollowUpAt?: Date | null;
  estimatedValue?: number | null;
  assignedSalesId?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  sourceDetail?: string | null;
  intakeMetadata?: Record<string, unknown> | null;
  productInterests?: CreateProductInterestInput[];
  productInterest?: CreateProductInterestInput | null;
  /** Preserve legacy dual-write id (e.g. DealerLead id). */
  leadId?: string;
};

export type LeadIntakeResult = {
  lead: CrmLeadRecord;
  created: boolean;
  matchedBy: "source_ref" | "new";
};

export class LeadIntakeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadIntakeValidationError";
  }
}
