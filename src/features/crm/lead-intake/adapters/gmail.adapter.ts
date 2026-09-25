import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { sanitizeSourceRef } from "@/features/crm/lead-intake.utils";
import type { GmailLeadIntakeInput } from "@/features/crm/services/lead-intake.service";

export const gmailInboundAdapter: LeadInboundAdapter<GmailLeadIntakeInput> = {
  adapterKey: "gmail",
  normalizeInboundLead(input, context) {
    const messageId = sanitizeSourceRef(input.messageId);
    if (!messageId) {
      throw new LeadIntakeValidationError("Gmail message id is required.");
    }

    const receivedAt =
      input.receivedAt instanceof Date
        ? input.receivedAt
        : input.receivedAt
          ? new Date(input.receivedAt)
          : context.receivedAt ?? new Date();

    if (Number.isNaN(receivedAt.getTime())) {
      throw new LeadIntakeValidationError("receivedAt không hợp lệ.");
    }

    const contactName = input.senderName?.trim() || input.senderEmail?.trim() || null;
    const messageParts = [input.subject?.trim(), input.bodySnippet?.trim()].filter(Boolean);

    return {
      channel: "GMAIL",
      source: "GMAIL",
      sourceRef: messageId,
      receivedAt,
      contactName,
      email: input.senderEmail?.trim() || null,
      message: messageParts.length > 0 ? messageParts.join("\n\n") : null,
      assignedSalesId: input.assignedSalesId,
      intakeMetadata: {
        ...(input.intakeMetadata ?? {}),
        gmailThreadId: input.threadId?.trim() || null,
        adapterKey: "gmail",
      },
    };
  },
};
