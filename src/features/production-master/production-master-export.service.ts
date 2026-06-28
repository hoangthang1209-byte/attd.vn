import { prisma } from "@/lib/prisma";
import { createCsvTemplate } from "@/features/import/import-template-utils";
import { PRODUCTION_MASTER_CSV_TEMPLATES } from "@/features/production-master/production-master-import.service";

function boolToCsv(value: boolean): string {
  return value ? "true" : "false";
}

export async function exportProductionMaterialsCsv(input?: {
  search?: string;
  activeOnly?: boolean;
  category?: string;
}): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.category?.trim()) where.category = input.category.trim();
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.productionMaterial.findMany({
    where,
    include: { supplier: { select: { code: true, name: true } } },
    orderBy: [{ code: "asc" }],
  });
  const headers = PRODUCTION_MASTER_CSV_TEMPLATES.material.split(",");
  const rows = items.map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    composition: item.composition ?? "",
    gsm: item.gsm ?? "",
    width: item.width ?? "",
    supplier: item.supplier?.code ?? item.supplier?.name ?? "",
    defaultColor: item.defaultColor ?? "",
    notes: item.notes ?? "",
    active: boolToCsv(item.isActive),
  }));
  return `\uFEFF${createCsvTemplate(headers, rows)}`;
}

export async function exportProductionTrimsCsv(input?: {
  search?: string;
  activeOnly?: boolean;
  category?: string;
}): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.category?.trim()) where.category = input.category.trim();
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.productionTrim.findMany({
    where,
    include: { supplier: { select: { code: true, name: true } } },
    orderBy: [{ code: "asc" }],
  });
  const headers = PRODUCTION_MASTER_CSV_TEMPLATES.trim.split(",");
  const rows = items.map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    supplier: item.supplier?.code ?? item.supplier?.name ?? "",
    notes: item.notes ?? "",
    active: boolToCsv(item.isActive),
  }));
  return `\uFEFF${createCsvTemplate(headers, rows)}`;
}

export async function exportProductionSuppliersCsv(input?: {
  search?: string;
  activeOnly?: boolean;
}): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.productionSupplier.findMany({
    where,
    orderBy: [{ code: "asc" }],
  });
  const headers = PRODUCTION_MASTER_CSV_TEMPLATES.supplier.split(",");
  const rows = items.map((item) => ({
    code: item.code,
    name: item.name,
    contact: item.contact ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    address: item.address ?? "",
    notes: item.notes ?? "",
    active: boolToCsv(item.isActive),
  }));
  return `\uFEFF${createCsvTemplate(headers, rows)}`;
}

export async function exportPrintMethodsCsv(input?: {
  search?: string;
  activeOnly?: boolean;
  category?: string;
}): Promise<string> {
  const where: Record<string, unknown> = {};
  if (input?.activeOnly) where.isActive = true;
  if (input?.category?.trim()) where.category = input.category.trim();
  if (input?.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  const items = await prisma.printMethod.findMany({
    where,
    orderBy: [{ code: "asc" }],
  });
  const headers = PRODUCTION_MASTER_CSV_TEMPLATES["print-method"].split(",");
  const rows = items.map((item) => ({
    code: item.code,
    name: item.name,
    category: item.category,
    description: item.description ?? "",
    active: boolToCsv(item.isActive),
  }));
  return `\uFEFF${createCsvTemplate(headers, rows)}`;
}
