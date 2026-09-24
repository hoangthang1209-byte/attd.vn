import type { LeadSource } from "@prisma/client";
import type { LeadInboundAdapter } from "@/features/crm/lead-intake/adapter.types";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";
import { sanitizeSourceRef } from "@/features/crm/lead-intake.utils";
import { isValidIntakeSource } from "@/features/crm/services/lead-intake.service";

export type CsvLeadImportRow = {
  rowNumber: number;
  contactName: string;
  phone: string;
  email: string;
  companyName: string;
  source: string;
  sourceRef: string;
  message: string;
  note: string;
};

export const csvLeadImportAdapter: LeadInboundAdapter<CsvLeadImportRow> = {
  adapterKey: "csv-import",
  normalizeInboundLead(row, context) {
    const contactName = row.contactName.trim();
    const phone = row.phone.trim();
    const email = row.email.trim();

    if (!contactName && !phone && !email) {
      throw new LeadIntakeValidationError(`Dòng ${row.rowNumber}: thiếu thông tin liên hệ.`);
    }

    const sourceRaw = row.source.trim() || "MANUAL";
    if (!isValidIntakeSource(sourceRaw)) {
      throw new LeadIntakeValidationError(`Dòng ${row.rowNumber}: nguồn không hợp lệ.`);
    }

    const sourceRef =
      sanitizeSourceRef(row.sourceRef) ||
      sanitizeSourceRef(`csv:${row.rowNumber}:${phone || email || contactName}`);

    return {
      channel: "CSV_IMPORT",
      source: sourceRaw as LeadSource,
      sourceRef,
      receivedAt: context.receivedAt ?? new Date(),
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      companyName: row.companyName.trim() || null,
      message: row.message.trim() || null,
      note: row.note.trim() || null,
      intakeMetadata: {
        adapterKey: "csv-import",
        importRowNumber: row.rowNumber,
      },
    };
  },
};
