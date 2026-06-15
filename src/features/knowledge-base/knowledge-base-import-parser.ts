export type ParsedImportFile = {
  headers: string[];
  rows: Record<string, string>[];
  filename: string;
};

export function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseJsonImport(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = JSON.parse(text) as unknown;
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) return { headers: [], rows: [] };

  const rows = items.map((item) => flattenObject(item));
  const headerSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((key) => headerSet.add(key));
  }
  return { headers: [...headerSet], rows };
}

function flattenObject(value: unknown, prefix = ""): Record<string, string> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    return prefix ? { [prefix]: String(value) } : {};
  }

  const result: Record<string, string> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
      Object.assign(result, flattenObject(nested, path));
    } else if (Array.isArray(nested)) {
      result[path] = nested.map(String).join("\n");
    } else if (nested != null) {
      result[path] = String(nested);
    }
  }
  return result;
}

export async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (json.length === 0) return { headers: [], rows: [] };

  const rows = json.map((item) => {
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(item)) {
      row[String(key)] = value == null ? "" : String(value);
    }
    return row;
  });

  const headers = Object.keys(rows[0] ?? {});
  return { headers, rows };
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const { headers, rows } = parseCsvText(text);
    return { headers, rows, filename: file.name };
  }

  if (extension === "json") {
    const text = await file.text();
    const { headers, rows } = parseJsonImport(text);
    return { headers, rows, filename: file.name };
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const { headers, rows } = await parseXlsxBuffer(buffer);
    return { headers, rows, filename: file.name };
  }

  throw new Error("Định dạng không hỗ trợ. Dùng .xlsx, .csv hoặc .json");
}

export function generateCsvContent(headers: string[], rows: Record<string, string>[]): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export async function generateXlsxBuffer(headers: string[], rows: Record<string, string>[]): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const data = rows.map((row) => {
    const item: Record<string, string> = {};
    for (const header of headers) {
      item[header] = row[header] ?? "";
    }
    return item;
  });
  const sheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return output;
}
