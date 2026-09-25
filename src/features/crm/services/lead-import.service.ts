import { utils, read } from "xlsx";
import { runLeadIntakeAdapter } from "@/features/crm/lead-intake/run-intake-adapter";
import { csvLeadImportAdapter, type CsvLeadImportRow } from "@/features/crm/lead-intake/adapters/csv-row.adapter";
import { LeadIntakeValidationError } from "@/features/crm/lead-intake.types";

export const LEAD_IMPORT_TEMPLATE_FILENAME = "LeadImportTemplate.csv";

export const LEAD_IMPORT_COLUMNS = [
  "Contact Name",
  "Phone",
  "Email",
  "Company",
  "Source",
  "Source Ref",
  "Message",
  "Notes",
] as const;

export type LeadImportPreviewRow = CsvLeadImportRow & {
  status: "OK" | "Invalid";
  statusMessage: string | null;
};

export type LeadImportPreview = {
  rows: LeadImportPreviewRow[];
  okCount: number;
  invalidCount: number;
};

export type LeadImportResult = {
  created: number;
  duplicate: number;
  failed: number;
  errors: { rowNumber: number; message: string }[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function mapRow(raw: Record<string, unknown>, rowNumber: number): CsvLeadImportRow {
  const byHeader: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    byHeader[normalizeHeader(key)] = value;
  }

  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = byHeader[normalizeHeader(name)];
      if (value != null && String(value).trim()) return String(value).trim();
    }
    return "";
  };

  return {
    rowNumber,
    contactName: pick("Contact Name", "contact name", "name"),
    phone: pick("Phone", "phone", "sdt"),
    email: pick("Email", "email"),
    companyName: pick("Company", "company"),
    source: pick("Source", "source") || "MANUAL",
    sourceRef: pick("Source Ref", "source ref", "sourceRef"),
    message: pick("Message", "message"),
    note: pick("Notes", "notes", "note"),
  };
}

export function parseLeadImportWorkbook(buffer: Buffer): LeadImportPreview {
  const workbook = read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], okCount: 0, invalidCount: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: LeadImportPreviewRow[] = jsonRows.map((raw, index) => {
    const mapped = mapRow(raw, index + 2);
    try {
      csvLeadImportAdapter.normalizeInboundLead(mapped, {
        adapterKey: "csv-import",
      });
      return { ...mapped, status: "OK", statusMessage: null };
    } catch (err) {
      const message =
        err instanceof LeadIntakeValidationError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không hợp lệ";
      return { ...mapped, status: "Invalid", statusMessage: message };
    }
  });

  const okCount = rows.filter((row) => row.status === "OK").length;
  return {
    rows,
    okCount,
    invalidCount: rows.length - okCount,
  };
}

export async function importLeadRows(rows: CsvLeadImportRow[]): Promise<LeadImportResult> {
  let created = 0;
  let duplicate = 0;
  let failed = 0;
  const errors: { rowNumber: number; message: string }[] = [];

  for (const row of rows) {
    try {
      const result = await runLeadIntakeAdapter(csvLeadImportAdapter, row);
      if (!result) {
        failed += 1;
        errors.push({ rowNumber: row.rowNumber, message: "CRM lead table unavailable" });
        continue;
      }
      if (result.created) created += 1;
      else duplicate += 1;
    } catch (err) {
      failed += 1;
      errors.push({
        rowNumber: row.rowNumber,
        message: err instanceof Error ? err.message : "Import failed",
      });
    }
  }

  return { created, duplicate, failed, errors };
}

export function buildLeadImportTemplateCsv(): string {
  const header = LEAD_IMPORT_COLUMNS.join(",");
  const sample = [
    "Nguyen Van A",
    "0901234567",
    "a@example.com",
    "Cong ty ABC",
    "MANUAL",
    "offline-001",
    "Can bao gia ao thun",
    "",
  ].join(",");
  return `${header}\n${sample}\n`;
}
