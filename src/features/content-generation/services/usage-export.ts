/**
 * Sprint 18.1 — admin-only usage export shape (CSV/JSON), pure/no-prisma.
 * The DB-backed row fetch (`getUsageExportRows`) lives in
 * usage-ledger.service.ts; this module only defines the row shape and the
 * two serialization formats so both the API route and the unit tests share
 * one source of truth for column order/naming.
 */

export type UsageExportRow = {
  id: string;
  requestedBy: string | null;
  provider: string;
  model: string;
  status: string;
  proposalStatus: string | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export const USAGE_EXPORT_CSV_HEADERS = [
  "id",
  "requestedBy",
  "provider",
  "model",
  "totalTokens",
  "estimatedCostUsd",
  "status",
  "proposalStatus",
  "createdAt",
  "startedAt",
  "completedAt",
] as const;

export type UsageExportCsvHeader = (typeof USAGE_EXPORT_CSV_HEADERS)[number];

function fieldValue(row: UsageExportRow, header: UsageExportCsvHeader): string {
  switch (header) {
    case "id":
      return row.id;
    case "requestedBy":
      return row.requestedBy ?? "";
    case "provider":
      return row.provider;
    case "model":
      return row.model;
    case "totalTokens":
      return row.totalTokens != null ? String(row.totalTokens) : "";
    case "estimatedCostUsd":
      return row.estimatedCostUsd != null ? String(row.estimatedCostUsd) : "";
    case "status":
      return row.status;
    case "proposalStatus":
      return row.proposalStatus ?? "";
    case "createdAt":
      return row.createdAt.toISOString();
    case "startedAt":
      return row.startedAt ? row.startedAt.toISOString() : "";
    case "completedAt":
      return row.completedAt ? row.completedAt.toISOString() : "";
    default:
      return "";
  }
}

/** Escapes a single CSV field per RFC 4180 (quotes doubled, wrapped only when needed). */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** JSON export — plain array of rows with ISO-string dates, safe to `JSON.stringify` directly. */
export function buildUsageExportJson(rows: readonly UsageExportRow[]): Array<Record<string, string>> {
  return rows.map((row) =>
    Object.fromEntries(USAGE_EXPORT_CSV_HEADERS.map((header) => [header, fieldValue(row, header)])),
  );
}

/** CSV export — header row + one row per generation, CRLF-free (uses `\n`). */
export function buildUsageExportCsv(rows: readonly UsageExportRow[]): string {
  const lines = [USAGE_EXPORT_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(USAGE_EXPORT_CSV_HEADERS.map((header) => csvEscape(fieldValue(row, header))).join(","));
  }
  return lines.join("\n");
}
