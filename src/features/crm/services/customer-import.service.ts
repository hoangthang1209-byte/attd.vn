import { utils, write } from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCustomer } from "@/features/crm/services/crm-customer.service";
import {
  normalizeWebsiteUrl,
  validateCrmEmail,
  validateCrmPhone,
  validateCrmTaxCode,
} from "@/features/crm/crm-validation";
import type { CreateCustomerInput } from "@/features/crm/types";

export const CUSTOMER_IMPORT_TEMPLATE_FILENAME = "CustomerImportTemplate.xlsx";

export const CUSTOMER_IMPORT_COLUMNS = [
  "Company Name",
  "Customer Code",
  "Tax Code",
  "Contact Name",
  "Phone",
  "Email",
  "Address",
  "Province",
  "Website",
  "Notes",
] as const;

export type CustomerImportStatus = "OK" | "Duplicate" | "Missing Name" | "Invalid";

export type CustomerImportRow = {
  rowNumber: number;
  companyName: string;
  customerCode: string;
  taxCode: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  website: string;
  notes: string;
  status: CustomerImportStatus;
  errors: string[];
};

export type CustomerImportSummary = {
  total: number;
  ok: number;
  duplicates: number;
  missingName: number;
  invalid: number;
};

export type CustomerImportPreview = {
  rows: CustomerImportRow[];
  summary: CustomerImportSummary;
};

export type CustomerImportResult = {
  summary: {
    imported: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    rowNumber: number;
    companyName: string;
    reason: string;
  }>;
};

type ParsedRow = Omit<CustomerImportRow, "status" | "errors">;

const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  "company name": "companyName",
  "customer code": "customerCode",
  "tax code": "taxCode",
  "contact name": "contactName",
  phone: "phone",
  email: "email",
  address: "address",
  province: "province",
  website: "website",
  notes: "notes",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => cellToString(cell) === "");
}

function summarize(rows: CustomerImportRow[]): CustomerImportSummary {
  return {
    total: rows.length,
    ok: rows.filter((row) => row.status === "OK").length,
    duplicates: rows.filter((row) => row.status === "Duplicate").length,
    missingName: rows.filter((row) => row.status === "Missing Name").length,
    invalid: rows.filter((row) => row.status === "Invalid").length,
  };
}

function requireWorkbookFile(file: File | null): void {
  if (!file) {
    throw new Error("Vui lòng chọn file Excel.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Chỉ hỗ trợ file .xlsx.");
  }
}

export function buildCustomerImportTemplate(): Buffer {
  const worksheet = utils.aoa_to_sheet([[...CUSTOMER_IMPORT_COLUMNS]]);
  worksheet["!cols"] = CUSTOMER_IMPORT_COLUMNS.map((column) => ({
    wch: Math.max(14, column.length + 4),
  }));
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Customers");
  return Buffer.from(write(workbook, { bookType: "xlsx", type: "buffer" }));
}

export async function parseCustomerImportFile(file: File | null): Promise<ParsedRow[]> {
  requireWorkbookFile(file);
  const xlsx = await import("xlsx");
  const buffer = Buffer.from(await file!.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("File Excel không có worksheet.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = xlsx.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, blankrows: false });
  const headerRow = matrix.find((row) => !isEmptyRow(row));
  if (!headerRow) {
    throw new Error("Worksheet trống.");
  }

  const headerIndex = new Map<keyof ParsedRow, number>();
  headerRow.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key) headerIndex.set(key, index);
  });

  if (!headerIndex.has("companyName")) {
    throw new Error("Thiếu cột bắt buộc Company Name.");
  }

  const headerPosition = matrix.indexOf(headerRow);
  const rows: ParsedRow[] = [];
  for (let index = headerPosition + 1; index < matrix.length; index += 1) {
    const rawRow = matrix[index] ?? [];
    if (isEmptyRow(rawRow)) continue;
    const rowNumber = index + 1;
    const get = (key: keyof ParsedRow) => {
      const columnIndex = headerIndex.get(key);
      return columnIndex === undefined ? "" : cellToString(rawRow[columnIndex]);
    };

    rows.push({
      rowNumber,
      companyName: get("companyName"),
      customerCode: get("customerCode"),
      taxCode: get("taxCode"),
      contactName: get("contactName"),
      phone: get("phone"),
      email: get("email"),
      address: get("address"),
      province: get("province"),
      website: get("website"),
      notes: get("notes"),
    });
  }

  if (rows.length === 0) {
    throw new Error("Worksheet không có dòng dữ liệu.");
  }

  return rows;
}

async function existingDuplicate(row: ParsedRow): Promise<string | null> {
  if (row.taxCode) {
    const existingTax = await prisma.customer.findFirst({
      where: { taxCode: { equals: row.taxCode, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingTax) return "Trùng mã số thuế trong hệ thống.";
  }

  if (row.companyName) {
    const existingName = await prisma.customer.findFirst({
      where: { name: { equals: row.companyName, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingName) return "Trùng tên công ty trong hệ thống.";
  }

  return null;
}

function duplicateKey(value: string): string {
  return value.trim().toLowerCase();
}

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  if (!row.companyName) errors.push("Thiếu tên công ty.");

  try {
    validateCrmEmail(row.email);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Email không hợp lệ.");
  }

  try {
    validateCrmPhone(row.phone);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Số điện thoại không hợp lệ.");
  }

  try {
    validateCrmTaxCode(row.taxCode);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Mã số thuế không hợp lệ.");
  }

  return errors;
}

export async function previewCustomerImportRows(rows: ParsedRow[]): Promise<CustomerImportPreview> {
  const taxCodeCounts = new Map<string, number>();
  const companyNameCounts = new Map<string, number>();

  rows.forEach((row) => {
    if (row.taxCode) {
      const key = duplicateKey(row.taxCode);
      taxCodeCounts.set(key, (taxCodeCounts.get(key) ?? 0) + 1);
    }
    if (row.companyName) {
      const key = duplicateKey(row.companyName);
      companyNameCounts.set(key, (companyNameCounts.get(key) ?? 0) + 1);
    }
  });

  const previewRows: CustomerImportRow[] = [];
  for (const row of rows) {
    const errors = validateRow(row);
    const duplicateErrors: string[] = [];

    if (row.taxCode && (taxCodeCounts.get(duplicateKey(row.taxCode)) ?? 0) > 1) {
      duplicateErrors.push("Trùng mã số thuế trong file.");
    }
    if (row.companyName && (companyNameCounts.get(duplicateKey(row.companyName)) ?? 0) > 1) {
      duplicateErrors.push("Trùng tên công ty trong file.");
    }

    const existing = errors.length === 0 ? await existingDuplicate(row) : null;
    if (existing) duplicateErrors.push(existing);

    let status: CustomerImportStatus = "OK";
    if (!row.companyName) status = "Missing Name";
    else if (errors.length > 0) status = "Invalid";
    else if (duplicateErrors.length > 0) status = "Duplicate";

    previewRows.push({
      ...row,
      status,
      errors: [...errors, ...duplicateErrors],
    });
  }

  return { rows: previewRows, summary: summarize(previewRows) };
}

function rowToCreateInput(row: CustomerImportRow): CreateCustomerInput {
  const primaryContact =
    row.contactName || row.phone || row.email
      ? {
          fullName: row.contactName || row.companyName,
          phone: row.phone || null,
          email: row.email || null,
        }
      : undefined;

  return {
    name: row.companyName,
    legalName: row.companyName,
    taxCode: row.taxCode || null,
    phone: row.phone || null,
    email: row.email || null,
    website: row.website ? normalizeWebsiteUrl(row.website) : null,
    address: row.address || null,
    addressLine1: row.address || null,
    province: row.province || null,
    provinceNameSnapshot: row.province || null,
    note: [
      row.customerCode ? `Customer Code: ${row.customerCode}` : "",
      row.notes,
    ].filter(Boolean).join("\n") || null,
    primaryContact,
  };
}

function safeImportError(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return "Dữ liệu bị trùng trong hệ thống.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Không thể import dòng này.";
}

export async function importCustomerRows(rows: ParsedRow[]): Promise<CustomerImportResult> {
  const preview = await previewCustomerImportRows(rows);
  const result: CustomerImportResult = {
    summary: { imported: 0, skipped: 0, errors: 0 },
    errors: [],
  };

  for (const row of preview.rows) {
    if (row.status === "Duplicate" || row.status === "Missing Name") {
      result.summary.skipped += 1;
      continue;
    }

    if (row.status === "Invalid") {
      result.summary.errors += 1;
      result.errors.push({
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        reason: row.errors.join(" "),
      });
      continue;
    }

    try {
      await createCustomer(rowToCreateInput(row));
      result.summary.imported += 1;
    } catch (err) {
      const reason = safeImportError(err);
      if (reason.includes("đã tồn tại") || reason.includes("bị trùng")) {
        result.summary.skipped += 1;
      } else {
        result.summary.errors += 1;
        result.errors.push({
          rowNumber: row.rowNumber,
          companyName: row.companyName,
          reason,
        });
      }
    }
  }

  return result;
}
