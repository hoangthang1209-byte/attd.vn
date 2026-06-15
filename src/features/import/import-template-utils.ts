/**
 * Shared import template utilities for all bulk import modules in ATTD CMS.
 *
 * Convention: Any future bulk import module must include:
 * 1. Template download
 * 2. Required field notes in the UI
 * 3. Example rows (realistic B2B data)
 * 4. Validation preview
 * 5. Error report export
 */

export type ImportTemplateDefinition = {
  id: string;
  /** Vietnamese label shown in the UI */
  label: string;
  /** File name without extension */
  fileName: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  /** Required column keys for UI display */
  requiredFields?: string[];
};

// ─── CSV utilities ────────────────────────────────────────────────────────────

export function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function createCsvTemplate(headers: string[], rows: Record<string, string>[]): string {
  const lines: string[] = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export function downloadCsvResponse(fileName: string, csvContent: string): Response {
  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function downloadXlsxResponse(
  fileName: string,
  headers: string[],
  rows: Record<string, string>[]
): Promise<Response> {
  const XLSX = await import("xlsx");
  const data = rows.map((row) => {
    const item: Record<string, string> = {};
    for (const h of headers) item[h] = row[h] ?? "";
    return item;
  });
  const sheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
