import type { DuplicateBehavior, ImportPreviewRow } from "@/features/knowledge-base/knowledge-base-import-types";
import { getEntrySourceInfo } from "@/features/knowledge-base/knowledge-base-source-utils";

export type ImportReportRow = {
  rowNumber: number;
  originalTitle: string;
  normalizedTitle: string;
  category: string;
  type: string;
  status: string;
  priority: string;
  tags: string;
  usageScope: string;
  validationStatus: string;
  validationErrors: string;
  duplicateStatus: string;
  duplicateMatch: string;
  duplicateStrategy: string;
  finalAction: string;
  source: string;
  sourceUrl: string;
};

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function duplicateStatus(row: ImportPreviewRow): string {
  if (row.strongDuplicate) return "Trùng mạnh";
  if (row.duplicateTitle || row.duplicateSlug) return "Trùng";
  if (row.similarTitle) return "Tương tự";
  return "";
}

function inferFinalAction(row: ImportPreviewRow, skipInvalid: boolean): string {
  if (!row.canImport) return skipInvalid ? "invalid" : "skip";
  if (row.duplicateSlug || row.duplicateTitle || row.strongDuplicate || row.similarTitle) {
    return row.duplicateStrategy;
  }
  return "create";
}

export function buildImportReportRows(
  rows: ImportPreviewRow[],
  options?: { skipInvalid?: boolean; duplicateMatchTitles?: Record<number, string> }
): ImportReportRow[] {
  return rows.map((row) => {
    const source = getEntrySourceInfo({
      structuredData: row.structuredData,
      sourceId: row.sourceId ?? null,
      source:
        row.sourceName
          ? {
              id: row.sourceId ?? "",
              name: row.sourceName,
              url: row.sourceUrl,
            }
          : null,
    });

    return {
      rowNumber: row.rowNumber,
      originalTitle: row.title,
      normalizedTitle: row.title.trim(),
      category: row.categoryName ?? "",
      type: row.type,
      status: row.status,
      priority: row.priority,
      tags: row.tags.join("; "),
      usageScope: row.usageScope.join("; "),
      validationStatus: row.canImport ? "valid" : "invalid",
      validationErrors: row.issues.map((i) => i.message).join("; "),
      duplicateStatus: duplicateStatus(row),
      duplicateMatch: options?.duplicateMatchTitles?.[row.rowNumber] ?? row.existingEntryId ?? "",
      duplicateStrategy: row.duplicateStrategy,
      finalAction: inferFinalAction(row, options?.skipInvalid ?? true),
      source: source.name ?? "",
      sourceUrl: source.url ?? "",
    };
  });
}

const REPORT_HEADERS = [
  "rowNumber",
  "originalTitle",
  "normalizedTitle",
  "category",
  "type",
  "status",
  "priority",
  "tags",
  "usageScope",
  "validationStatus",
  "validationErrors",
  "duplicateStatus",
  "duplicateMatch",
  "duplicateStrategy",
  "finalAction",
  "source",
  "sourceUrl",
] as const;

export function exportKnowledgeImportReportCsv(
  rows: ImportPreviewRow[],
  options?: { errorsOnly?: boolean; skipInvalid?: boolean }
): string {
  const reportRows = buildImportReportRows(rows, { skipInvalid: options?.skipInvalid });
  const filtered = options?.errorsOnly
    ? reportRows.filter((r) => r.validationStatus === "invalid" || r.validationErrors)
    : reportRows;

  const lines = [REPORT_HEADERS.join(",")];
  for (const row of filtered) {
    lines.push(
      REPORT_HEADERS.map((key) => escapeCsv(String(row[key as keyof ImportReportRow] ?? ""))).join(",")
    );
  }
  return lines.join("\n");
}

export function downloadImportReportCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
