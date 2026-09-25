import type { LeadSource } from "@prisma/client";
import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { sanitizeSourceRef } from "@/features/crm/lead-intake.utils";
import { isValidIntakeSource } from "@/features/crm/services/lead-intake.service";

export type GenericWebhookLeadPayload = {
  source?: string | null;
  sourceRef?: string | null;
  contactName?: string | null;
  fullName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  zalo?: string | null;
  message?: string | null;
  note?: string | null;
  assignedSalesId?: string | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  referrer?: string | null;
  sourceDetail?: string | null;
  intakeMetadata?: Record<string, unknown> | null;
  receivedAt?: string | null;
};

function parseReceivedAt(value: string | null | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new LeadIntakeValidationError("receivedAt không hợp lệ.");
  }
  return date;
}

export const webhookGenericAdapter: LeadInboundAdapter<GenericWebhookLeadPayload> = {
  adapterKey: "webhook-generic",
  normalizeInboundLead(payload, context) {
    return normalizeGenericWebhookLead(payload, context, "webhook-generic");
  },
};

function normalizeGenericWebhookLead(
  payload: GenericWebhookLeadPayload,
  context: import("@/features/crm/lead-intake/adapter.types").LeadInboundAdapterContext,
  adapterKey: "webhook-generic" | "webhook-partner"
) {
  const sourceRaw = payload.source?.trim() || "OTHER";
  if (!isValidIntakeSource(sourceRaw)) {
    throw new LeadIntakeValidationError("source không hợp lệ.");
  }

  const sourceRef = sanitizeSourceRef(payload.sourceRef);
  if (!sourceRef) {
    throw new LeadIntakeValidationError("sourceRef là bắt buộc cho webhook intake.");
  }

  const phone = payload.phone?.trim();
  const email = payload.email?.trim();
  if (!phone && !email) {
    throw new LeadIntakeValidationError("Cần ít nhất phone hoặc email.");
  }

  return {
    channel: "WEBHOOK" as const,
    source: sourceRaw as LeadSource,
    sourceRef,
    receivedAt: parseReceivedAt(payload.receivedAt) ?? context.receivedAt ?? new Date(),
    contactName: payload.contactName?.trim() || payload.fullName?.trim() || null,
    fullName: payload.fullName?.trim() || null,
    companyName: payload.companyName?.trim() || null,
    phone: phone || null,
    email: email || null,
    zalo: payload.zalo?.trim() || null,
    message: payload.message?.trim() || null,
    note: payload.note?.trim() || null,
    assignedSalesId: payload.assignedSalesId?.trim() || null,
    landingPage: payload.landingPage?.trim() || null,
    utmSource: payload.utmSource?.trim() || null,
    utmMedium: payload.utmMedium?.trim() || null,
    utmCampaign: payload.utmCampaign?.trim() || null,
    referrer: payload.referrer?.trim() || null,
    sourceDetail: payload.sourceDetail?.trim() || null,
    intakeMetadata: {
      ...(payload.intakeMetadata ?? {}),
      adapterKey,
    },
  };
}

export const webhookPartnerAdapter: LeadInboundAdapter<GenericWebhookLeadPayload> = {
  adapterKey: "webhook-partner",
  normalizeInboundLead(payload, context) {
    return normalizeGenericWebhookLead(payload, context, "webhook-partner");
  },
};
