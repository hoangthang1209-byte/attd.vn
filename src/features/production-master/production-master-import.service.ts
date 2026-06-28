import { prisma } from "@/lib/prisma";
import {
  generateMasterCode,
  ProductionMasterValidationError,
} from "@/features/production-master/production-master.errors";
import { parseCsvText } from "@/features/knowledge-base/knowledge-base-import-parser";
import {
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_TRIM_CATEGORIES,
  PRINT_METHOD_CATEGORIES,
} from "@/features/production-master/production-master-labels";

export type ImportRowError = {
  row: number;
  message: string;
};

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportRowError[];
};

function parseBool(value: string | undefined, defaultValue = true): boolean {
  if (!value?.trim()) return defaultValue;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "có", "co"].includes(v)) return true;
  if (["0", "false", "no", "n", "không", "khong"].includes(v)) return false;
  return defaultValue;
}

function requireHeaders(headers: string[], required: string[]) {
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new ProductionMasterValidationError("Thiếu cột bắt buộc.");
  }
}

async function resolveSupplierRef(value: string | undefined): Promise<string | null> {
  const raw = value?.trim();
  if (!raw) return null;
  const byCode = await prisma.productionSupplier.findFirst({
    where: { code: { equals: raw, mode: "insensitive" } },
    select: { id: true },
  });
  if (byCode) return byCode.id;
  const byName = await prisma.productionSupplier.findFirst({
    where: { name: { equals: raw, mode: "insensitive" } },
    select: { id: true },
  });
  return byName?.id ?? null;
}

export function parseProductionMasterCsv(buffer: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  if (!text.trim()) throw new ProductionMasterValidationError("File CSV không hợp lệ.");
  const { headers, rows } = parseCsvText(text);
  if (headers.length === 0) throw new ProductionMasterValidationError("File CSV không hợp lệ.");
  return { headers, rows };
}

export async function importProductionMaterialsCsv(buffer: Buffer): Promise<ImportSummary> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const name = row.name?.trim();
      if (!name) {
        summary.skipped += 1;
        continue;
      }
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRODUCTION_MATERIAL_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const supplierId = await resolveSupplierRef(row.supplier);
      const data = {
        name,
        category: category as never,
        composition: row.composition?.trim() || null,
        gsm: row.gsm?.trim() || null,
        width: row.width?.trim() || null,
        supplierId,
        defaultColor: row.defaultColor?.trim() || null,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionMaterial.findUnique({ where: { code } });
        if (existing) {
          await prisma.productionMaterial.update({ where: { id: existing.id }, data });
          summary.updated += 1;
        } else {
          await prisma.productionMaterial.create({ data: { ...data, code } });
          summary.created += 1;
        }
      } else {
        const newCode = await generateMasterCode("PM", "productionMaterial");
        await prisma.productionMaterial.create({ data: { ...data, code: newCode } });
        summary.created += 1;
      }
    } catch {
      summary.errors.push({ row: rowNum, message: "Không thể đọc dòng này." });
    }
  }
  return summary;
}

export async function importProductionTrimsCsv(buffer: Buffer): Promise<ImportSummary> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const name = row.name?.trim();
      if (!name) {
        summary.skipped += 1;
        continue;
      }
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRODUCTION_TRIM_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const supplierId = await resolveSupplierRef(row.supplier);
      const data = {
        name,
        category: category as never,
        supplierId,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionTrim.findUnique({ where: { code } });
        if (existing) {
          await prisma.productionTrim.update({ where: { id: existing.id }, data });
          summary.updated += 1;
        } else {
          await prisma.productionTrim.create({ data: { ...data, code } });
          summary.created += 1;
        }
      } else {
        const newCode = await generateMasterCode("PT", "productionTrim");
        await prisma.productionTrim.create({ data: { ...data, code: newCode } });
        summary.created += 1;
      }
    } catch {
      summary.errors.push({ row: rowNum, message: "Không thể đọc dòng này." });
    }
  }
  return summary;
}

export async function importProductionSuppliersCsv(buffer: Buffer): Promise<ImportSummary> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const name = row.name?.trim();
      if (!name) {
        summary.skipped += 1;
        continue;
      }
      const data = {
        name,
        contact: row.contact?.trim() || null,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        address: row.address?.trim() || null,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionSupplier.findUnique({ where: { code } });
        if (existing) {
          await prisma.productionSupplier.update({ where: { id: existing.id }, data });
          summary.updated += 1;
        } else {
          await prisma.productionSupplier.create({ data: { ...data, code } });
          summary.created += 1;
        }
      } else {
        const newCode = await generateMasterCode("PS", "productionSupplier");
        await prisma.productionSupplier.create({ data: { ...data, code: newCode } });
        summary.created += 1;
      }
    } catch {
      summary.errors.push({ row: rowNum, message: "Không thể đọc dòng này." });
    }
  }
  return summary;
}

export async function importPrintMethodsCsv(buffer: Buffer): Promise<ImportSummary> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    try {
      const name = row.name?.trim();
      if (!name) {
        summary.skipped += 1;
        continue;
      }
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRINT_METHOD_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const data = {
        name,
        category: category as never,
        description: row.description?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.printMethod.findUnique({ where: { code } });
        if (existing) {
          await prisma.printMethod.update({ where: { id: existing.id }, data });
          summary.updated += 1;
        } else {
          await prisma.printMethod.create({ data: { ...data, code } });
          summary.created += 1;
        }
      } else {
        const newCode = await generateMasterCode("PR", "printMethod");
        await prisma.printMethod.create({ data: { ...data, code: newCode } });
        summary.created += 1;
      }
    } catch {
      summary.errors.push({ row: rowNum, message: "Không thể đọc dòng này." });
    }
  }
  return summary;
}

export type ImportPreviewAction = "CREATE" | "UPDATE" | "SKIP" | "ERROR";

export type ImportPreviewRow = {
  rowNumber: number;
  action: ImportPreviewAction;
  code: string | null;
  name: string | null;
  errors: string[];
  normalizedData: Record<string, unknown> | null;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  summary: {
    create: number;
    update: number;
    skip: number;
    error: number;
  };
};

function summarizePreview(rows: ImportPreviewRow[]): ImportPreviewResult["summary"] {
  return {
    create: rows.filter((r) => r.action === "CREATE").length,
    update: rows.filter((r) => r.action === "UPDATE").length,
    skip: rows.filter((r) => r.action === "SKIP").length,
    error: rows.filter((r) => r.action === "ERROR").length,
  };
}

export async function previewProductionMaterialsCsv(buffer: Buffer): Promise<ImportPreviewResult> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const previewRows: ImportPreviewRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      previewRows.push({
        rowNumber: rowNum,
        action: "SKIP",
        code: row.code?.trim() || null,
        name: null,
        errors: [],
        normalizedData: null,
      });
      continue;
    }
    try {
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRODUCTION_MATERIAL_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const supplierId = await resolveSupplierRef(row.supplier);
      const normalizedData = {
        name,
        category,
        composition: row.composition?.trim() || null,
        gsm: row.gsm?.trim() || null,
        width: row.width?.trim() || null,
        supplierId,
        defaultColor: row.defaultColor?.trim() || null,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionMaterial.findUnique({ where: { code } });
        previewRows.push({
          rowNumber: rowNum,
          action: existing ? "UPDATE" : "CREATE",
          code,
          name,
          errors: [],
          normalizedData: { ...normalizedData, code },
        });
      } else {
        previewRows.push({
          rowNumber: rowNum,
          action: "CREATE",
          code: null,
          name,
          errors: [],
          normalizedData,
        });
      }
    } catch {
      previewRows.push({
        rowNumber: rowNum,
        action: "ERROR",
        code: row.code?.trim() || null,
        name,
        errors: ["Không thể đọc dòng này."],
        normalizedData: null,
      });
    }
  }
  return { rows: previewRows, summary: summarizePreview(previewRows) };
}

export async function previewProductionTrimsCsv(buffer: Buffer): Promise<ImportPreviewResult> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const previewRows: ImportPreviewRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      previewRows.push({ rowNumber: rowNum, action: "SKIP", code: row.code?.trim() || null, name: null, errors: [], normalizedData: null });
      continue;
    }
    try {
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRODUCTION_TRIM_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const supplierId = await resolveSupplierRef(row.supplier);
      const normalizedData = {
        name,
        category,
        supplierId,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionTrim.findUnique({ where: { code } });
        previewRows.push({
          rowNumber: rowNum,
          action: existing ? "UPDATE" : "CREATE",
          code,
          name,
          errors: [],
          normalizedData: { ...normalizedData, code },
        });
      } else {
        previewRows.push({ rowNumber: rowNum, action: "CREATE", code: null, name, errors: [], normalizedData });
      }
    } catch {
      previewRows.push({
        rowNumber: rowNum,
        action: "ERROR",
        code: row.code?.trim() || null,
        name,
        errors: ["Không thể đọc dòng này."],
        normalizedData: null,
      });
    }
  }
  return { rows: previewRows, summary: summarizePreview(previewRows) };
}

export async function previewProductionSuppliersCsv(buffer: Buffer): Promise<ImportPreviewResult> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const previewRows: ImportPreviewRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      previewRows.push({ rowNumber: rowNum, action: "SKIP", code: row.code?.trim() || null, name: null, errors: [], normalizedData: null });
      continue;
    }
    try {
      const normalizedData = {
        name,
        contact: row.contact?.trim() || null,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
        address: row.address?.trim() || null,
        notes: row.notes?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.productionSupplier.findUnique({ where: { code } });
        previewRows.push({
          rowNumber: rowNum,
          action: existing ? "UPDATE" : "CREATE",
          code,
          name,
          errors: [],
          normalizedData: { ...normalizedData, code },
        });
      } else {
        previewRows.push({ rowNumber: rowNum, action: "CREATE", code: null, name, errors: [], normalizedData });
      }
    } catch {
      previewRows.push({
        rowNumber: rowNum,
        action: "ERROR",
        code: row.code?.trim() || null,
        name,
        errors: ["Không thể đọc dòng này."],
        normalizedData: null,
      });
    }
  }
  return { rows: previewRows, summary: summarizePreview(previewRows) };
}

export async function previewPrintMethodsCsv(buffer: Buffer): Promise<ImportPreviewResult> {
  const { headers, rows } = parseProductionMasterCsv(buffer);
  requireHeaders(headers, ["name"]);
  const previewRows: ImportPreviewRow[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const rowNum = i + 2;
    const row = rows[i];
    const name = row.name?.trim();
    if (!name) {
      previewRows.push({ rowNumber: rowNum, action: "SKIP", code: row.code?.trim() || null, name: null, errors: [], normalizedData: null });
      continue;
    }
    try {
      const categoryRaw = row.category?.trim().toUpperCase();
      const category =
        categoryRaw && (PRINT_METHOD_CATEGORIES as readonly string[]).includes(categoryRaw)
          ? categoryRaw
          : "OTHER";
      const normalizedData = {
        name,
        category,
        description: row.description?.trim() || null,
        isActive: parseBool(row.active),
      };
      const code = row.code?.trim();
      if (code) {
        const existing = await prisma.printMethod.findUnique({ where: { code } });
        previewRows.push({
          rowNumber: rowNum,
          action: existing ? "UPDATE" : "CREATE",
          code,
          name,
          errors: [],
          normalizedData: { ...normalizedData, code },
        });
      } else {
        previewRows.push({ rowNumber: rowNum, action: "CREATE", code: null, name, errors: [], normalizedData });
      }
    } catch {
      previewRows.push({
        rowNumber: rowNum,
        action: "ERROR",
        code: row.code?.trim() || null,
        name,
        errors: ["Không thể đọc dòng này."],
        normalizedData: null,
      });
    }
  }
  return { rows: previewRows, summary: summarizePreview(previewRows) };
}

export const PRODUCTION_MASTER_CSV_TEMPLATES = {
  material: "code,name,category,composition,gsm,width,supplier,defaultColor,notes,active",
  trim: "code,name,category,supplier,notes,active",
  supplier: "code,name,contact,email,phone,address,notes,active",
  "print-method": "code,name,category,description,active",
} as const;
