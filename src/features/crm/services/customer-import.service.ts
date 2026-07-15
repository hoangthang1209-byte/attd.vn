import { utils, write } from "xlsx";
import type { CustomerRepresentativeSalutation, CustomerStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCustomer } from "@/features/crm/services/crm-customer.service";
import {
  normalizeWebsiteUrl,
  validateCrmEmail,
  validateCrmPhone,
  validateCrmTaxCode,
} from "@/features/crm/crm-validation";
import {
  CUSTOMER_STATUS_LABELS,
  REPRESENTATIVE_SALUTATION_LABELS,
} from "@/features/crm/labels";
import { CRM_CUSTOMER_STATUSES, type CreateCustomerInput } from "@/features/crm/types";

export const CUSTOMER_IMPORT_TEMPLATE_FILENAME = "CustomerImportTemplate.xlsx";

export const CUSTOMER_IMPORT_COLUMNS = [
  "Company Name",
  "Legal Name",
  "Customer Code",
  "Customer Type",
  "Customer Status",
  "Tax Code",
  "Phone",
  "Email",
  "Website",
  "Address",
  "Address Line 1",
  "Address Line 2",
  "Province",
  "District",
  "Ward",
  "Representative Salutation",
  "Representative Name",
  "Representative Title",
  "Authorization Document No",
  "Contact Name",
  "Contact Position",
  "Contact Department",
  "Contact Phone",
  "Contact Email",
  "Contact Zalo",
  "Contact Notes",
  "Notes",
  "Internal Notes",
  "Billing Notes",
] as const;

export type CustomerImportStatus = "OK" | "Duplicate" | "Missing Name" | "Invalid";

export type CustomerImportRow = {
  rowNumber: number;
  companyName: string;
  legalName: string;
  customerCode: string;
  customerType: string;
  customerStatus: string;
  taxCode: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  province: string;
  district: string;
  ward: string;
  representativeSalutation: string;
  representativeName: string;
  representativeTitle: string;
  authorizationDocumentNo: string;
  contactName: string;
  contactPosition: string;
  contactDepartment: string;
  contactPhone: string;
  contactEmail: string;
  contactZalo: string;
  contactNotes: string;
  notes: string;
  internalNotes: string;
  billingNotes: string;
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
  company: "companyName",
  "legal name": "legalName",
  "customer code": "customerCode",
  "customer type": "customerType",
  "customer status": "customerStatus",
  status: "customerStatus",
  "tax code": "taxCode",
  phone: "phone",
  "company phone": "phone",
  email: "email",
  "company email": "email",
  website: "website",
  address: "address",
  "address line 1": "addressLine1",
  "address line 2": "addressLine2",
  province: "province",
  district: "district",
  ward: "ward",
  "representative salutation": "representativeSalutation",
  "representative name": "representativeName",
  "representative title": "representativeTitle",
  "authorization document no": "authorizationDocumentNo",
  "authorization document number": "authorizationDocumentNo",
  "contact name": "contactName",
  "contact position": "contactPosition",
  "contact title": "contactPosition",
  "contact department": "contactDepartment",
  "contact phone": "contactPhone",
  "contact email": "contactEmail",
  "contact zalo": "contactZalo",
  zalo: "contactZalo",
  "contact notes": "contactNotes",
  "contact note": "contactNotes",
  notes: "notes",
  note: "notes",
  "internal notes": "internalNotes",
  "internal note": "internalNotes",
  "billing notes": "billingNotes",
  "billing note": "billingNotes",
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
      legalName: get("legalName"),
      customerCode: get("customerCode"),
      customerType: get("customerType"),
      customerStatus: get("customerStatus"),
      taxCode: get("taxCode"),
      phone: get("phone"),
      email: get("email"),
      website: get("website"),
      address: get("address"),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2"),
      province: get("province"),
      district: get("district"),
      ward: get("ward"),
      representativeSalutation: get("representativeSalutation"),
      representativeName: get("representativeName"),
      representativeTitle: get("representativeTitle"),
      authorizationDocumentNo: get("authorizationDocumentNo"),
      contactName: get("contactName"),
      contactPosition: get("contactPosition"),
      contactDepartment: get("contactDepartment"),
      contactPhone: get("contactPhone"),
      contactEmail: get("contactEmail"),
      contactZalo: get("contactZalo"),
      contactNotes: get("contactNotes"),
      notes: get("notes"),
      internalNotes: get("internalNotes"),
      billingNotes: get("billingNotes"),
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

function resolveCustomerStatus(value: string): CustomerStatus | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  if (CRM_CUSTOMER_STATUSES.includes(upper as CustomerStatus)) {
    return upper as CustomerStatus;
  }
  const byLabel = CRM_CUSTOMER_STATUSES.find(
    (status) => CUSTOMER_STATUS_LABELS[status].toLowerCase() === normalized.toLowerCase(),
  );
  return byLabel ?? null;
}

function resolveRepresentativeSalutation(value: string): CustomerRepresentativeSalutation | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const upper = normalized.toUpperCase();
  const allowed: CustomerRepresentativeSalutation[] = ["MR", "MRS", "MS", "OTHER"];
  if (allowed.includes(upper as CustomerRepresentativeSalutation)) {
    return upper as CustomerRepresentativeSalutation;
  }
  const byLabel = allowed.find(
    (salutation) =>
      REPRESENTATIVE_SALUTATION_LABELS[salutation].toLowerCase() === normalized.toLowerCase(),
  );
  return byLabel ?? null;
}

async function resolveCustomerTypeId(value: string): Promise<string | null> {
  const normalized = value.trim();
  if (!normalized) return null;
  const row = await prisma.customerType.findFirst({
    where: {
      isActive: true,
      OR: [
        { id: normalized },
        { code: { equals: normalized, mode: "insensitive" } },
        { name: { equals: normalized, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function validateRow(row: ParsedRow): Promise<string[]> {
  const errors: string[] = [];
  if (!row.companyName) errors.push("Thiếu tên công ty.");

  try {
    validateCrmEmail(row.email);
  } catch (err) {
    errors.push(`Email công ty: ${err instanceof Error ? err.message : "Email không hợp lệ."}`);
  }

  try {
    validateCrmEmail(row.contactEmail);
  } catch (err) {
    errors.push(`Contact Email: ${err instanceof Error ? err.message : "Email không hợp lệ."}`);
  }

  try {
    validateCrmPhone(row.phone);
  } catch (err) {
    errors.push(`Phone: ${err instanceof Error ? err.message : "Số điện thoại không hợp lệ."}`);
  }

  try {
    validateCrmPhone(row.contactPhone);
  } catch (err) {
    errors.push(`Contact Phone: ${err instanceof Error ? err.message : "Số điện thoại không hợp lệ."}`);
  }

  try {
    validateCrmTaxCode(row.taxCode);
  } catch (err) {
    errors.push(`Tax Code: ${err instanceof Error ? err.message : "Mã số thuế không hợp lệ."}`);
  }

  if (row.customerStatus && !resolveCustomerStatus(row.customerStatus)) {
    errors.push(`Customer Status không hợp lệ: ${row.customerStatus}.`);
  }

  if (row.representativeSalutation && !resolveRepresentativeSalutation(row.representativeSalutation)) {
    errors.push(`Representative Salutation không hợp lệ: ${row.representativeSalutation}.`);
  }

  if (row.customerType && !(await resolveCustomerTypeId(row.customerType))) {
    errors.push(`Customer Type không hợp lệ hoặc đã ngưng sử dụng: ${row.customerType}.`);
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
    const errors = await validateRow(row);
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

async function rowToCreateInput(row: CustomerImportRow): Promise<CreateCustomerInput> {
  const contactPhone = row.contactPhone || row.phone;
  const contactEmail = row.contactEmail || row.email;
  const primaryContact =
    row.contactName ||
    row.contactPosition ||
    row.contactDepartment ||
    contactPhone ||
    contactEmail ||
    row.contactZalo ||
    row.contactNotes
      ? {
          fullName: row.contactName || row.companyName,
          title: row.contactPosition || null,
          department: row.contactDepartment || null,
          phone: contactPhone || null,
          email: contactEmail || null,
          zalo: row.contactZalo || null,
          note: row.contactNotes || null,
        }
      : undefined;
  const addressLine1 = row.addressLine1 || row.address;

  return {
    customerTypeId: row.customerType ? await resolveCustomerTypeId(row.customerType) : undefined,
    name: row.companyName,
    legalName: row.legalName || row.companyName,
    taxCode: row.taxCode || null,
    phone: row.phone || null,
    email: row.email || null,
    website: row.website ? normalizeWebsiteUrl(row.website) : null,
    address: row.address || null,
    addressLine1: addressLine1 || null,
    addressLine2: row.addressLine2 || null,
    province: row.province || null,
    district: row.district || null,
    provinceNameSnapshot: row.province || null,
    wardNameSnapshot: row.ward || null,
    status: resolveCustomerStatus(row.customerStatus) ?? undefined,
    representativeSalutation: row.representativeSalutation
      ? resolveRepresentativeSalutation(row.representativeSalutation)
      : undefined,
    representativeName: row.representativeName || null,
    representativeTitle: row.representativeTitle || null,
    authorizationDocumentNo: row.authorizationDocumentNo || null,
    note: [
      row.customerCode ? `Customer Code: ${row.customerCode}` : "",
      row.notes,
    ].filter(Boolean).join("\n") || null,
    internalNote: row.internalNotes || null,
    billingNote: row.billingNotes || null,
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
      await createCustomer(await rowToCreateInput(row));
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
