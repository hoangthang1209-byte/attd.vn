import "server-only";

import { prisma } from "@/lib/prisma";
import { createPattern, updatePattern } from "@/features/patterns/pattern.service";
import {
  normalizePatternImportSource,
  PATTERN_IMPORT_MAX_ROWS,
  type PatternBulkImportResponse,
  type PatternBulkImportRow,
  type PatternBulkImportResultItem,
} from "@/features/patterns/pattern-bulk-import";

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

async function resolveCategory(value: string) {
  const q = clean(value);
  if (!q) return null;
  return prisma.category.findFirst({
    where: {
      OR: [
        { name: { equals: q, mode: "insensitive" } },
        { skuCode: { equals: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function resolveProduct(value: string) {
  const q = clean(value);
  if (!q) return null;
  return prisma.product.findFirst({
    where: {
      OR: [
        { name: { equals: q, mode: "insensitive" } },
        { productCode: { equals: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function resolveCustomer(value: string) {
  const q = clean(value);
  if (!q) return null;
  return prisma.customer.findFirst({
    where: {
      OR: [
        { name: { equals: q, mode: "insensitive" } },
        { code: { equals: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function resolveSupplier(value: string) {
  const q = clean(value);
  if (!q) return null;
  return prisma.productionSupplier.findFirst({
    where: {
      OR: [
        { name: { equals: q, mode: "insensitive" } },
        { code: { equals: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, code: true },
  });
}

async function importOne(
  row: PatternBulkImportRow,
  createdBy: string | null,
): Promise<PatternBulkImportResultItem> {
  const name = clean(row.name);
  if (!name) {
    return {
      rowNumber: row.rowNumber,
      status: "error",
      name: "",
      message: "Tên rập là bắt buộc.",
    };
  }

  const [category, product, customer, supplier] = await Promise.all([
    resolveCategory(row.category),
    resolveProduct(row.product),
    resolveCustomer(row.customer),
    resolveSupplier(row.supplier),
  ]);

  const warnings: string[] = [];
  if (row.category && !category) warnings.push(`Không tìm thấy danh mục "${row.category}".`);
  if (row.product && !product) warnings.push(`Không tìm thấy sản phẩm "${row.product}".`);
  if (row.customer && !customer) {
    warnings.push(`Không tìm thấy khách hàng "${row.customer}", đã giữ tên dạng snapshot.`);
  }
  if (row.supplier && !supplier) {
    warnings.push(`Không tìm thấy nhà cung cấp "${row.supplier}", đã giữ tên dạng snapshot.`);
  }

  const sourceType = normalizePatternImportSource(row.sourceType);
  if (row.sourceType && !sourceType) {
    warnings.push(`Nguồn "${row.sourceType}" chưa nhận diện, để trống để kiểm tra lại.`);
  }

  try {
    const created = await createPattern({
      name,
      productCategoryId: category?.id ?? null,
      productId: product?.id ?? null,
      baseSize: clean(row.baseSize) || null,
      sizeRange: clean(row.sizeRange) || null,
      gradingRule: clean(row.gradingRule) || null,
      notes: clean(row.notes) || null,
      createdBy,
    });

    const needsMetadataPatch =
      Boolean(sourceType) ||
      Boolean(supplier?.id) ||
      Boolean(row.supplier) ||
      Boolean(customer?.id) ||
      Boolean(row.customer) ||
      Boolean(row.sourceNotes);

    const finalPattern = needsMetadataPatch
      ? await updatePattern(created.id, {
          sourceType,
          patternSupplierId: supplier?.id ?? null,
          sourceSupplierCode: supplier?.code ?? null,
          sourceSupplier: supplier?.name ?? (clean(row.supplier) || null),
          customerId: customer?.id ?? null,
          customerNameSnapshot: customer?.name ?? (clean(row.customer) || null),
          sourceNotes: clean(row.sourceNotes) || null,
        })
      : created;

    return {
      rowNumber: row.rowNumber,
      status: "created",
      id: finalPattern.id,
      code: finalPattern.code,
      name: finalPattern.name,
      warnings: warnings.length ? warnings : undefined,
    };
  } catch (error) {
    return {
      rowNumber: row.rowNumber,
      status: "error",
      name,
      message: error instanceof Error ? error.message : "Không thể nhập rập.",
    };
  }
}

export async function bulkImportPatterns(input: {
  rows: PatternBulkImportRow[];
  createdBy?: string | null;
}): Promise<PatternBulkImportResponse> {
  const rows = input.rows.slice(0, PATTERN_IMPORT_MAX_ROWS);
  const items: PatternBulkImportResultItem[] = [];

  // Sequential creation intentionally avoids bursts of code-generation collisions and
  // keeps database load predictable during legacy imports.
  for (const row of rows) {
    items.push(await importOne(row, input.createdBy ?? null));
  }

  return {
    created: items.filter((item) => item.status === "created").length,
    failed: items.filter((item) => item.status === "error").length,
    items,
  };
}
