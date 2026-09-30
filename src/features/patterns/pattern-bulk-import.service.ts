import "server-only";

import { prisma } from "@/lib/prisma";
import { createPattern } from "@/features/patterns/pattern.service";
import { generatePatternCodes } from "@/features/patterns/pattern-code";
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

function lookupKey(value: string | null | undefined): string {
  return clean(value).toLocaleLowerCase("vi-VN");
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

async function loadReferenceMaps(rows: PatternBulkImportRow[]) {
  const categoryKeys = uniqueValues(rows.map((row) => row.category));
  const productKeys = uniqueValues(rows.map((row) => row.product));
  const customerKeys = uniqueValues(rows.map((row) => row.customer));
  const supplierKeys = uniqueValues(rows.map((row) => row.supplier));

  const [categories, products, customers, suppliers] = await Promise.all([
    categoryKeys.length
      ? prisma.category.findMany({
          where: {
            OR: [
              { name: { in: categoryKeys, mode: "insensitive" } },
              { skuCode: { in: categoryKeys, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, skuCode: true },
        })
      : Promise.resolve([]),
    productKeys.length
      ? prisma.product.findMany({
          where: {
            OR: [
              { name: { in: productKeys, mode: "insensitive" } },
              { productCode: { in: productKeys, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, productCode: true },
        })
      : Promise.resolve([]),
    customerKeys.length
      ? prisma.customer.findMany({
          where: {
            OR: [
              { name: { in: customerKeys, mode: "insensitive" } },
              { code: { in: customerKeys, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
    supplierKeys.length
      ? prisma.productionSupplier.findMany({
          where: {
            OR: [
              { name: { in: supplierKeys, mode: "insensitive" } },
              { code: { in: supplierKeys, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve([]),
  ]);

  const categoryMap = new Map<string, (typeof categories)[number]>();
  for (const item of categories) {
    categoryMap.set(lookupKey(item.name), item);
    if (item.skuCode) categoryMap.set(lookupKey(item.skuCode), item);
  }

  const productMap = new Map<string, (typeof products)[number]>();
  for (const item of products) {
    productMap.set(lookupKey(item.name), item);
    if (item.productCode) productMap.set(lookupKey(item.productCode), item);
  }

  const customerMap = new Map<string, (typeof customers)[number]>();
  for (const item of customers) {
    customerMap.set(lookupKey(item.name), item);
    if (item.code) customerMap.set(lookupKey(item.code), item);
  }

  const supplierMap = new Map<string, (typeof suppliers)[number]>();
  for (const item of suppliers) {
    supplierMap.set(lookupKey(item.name), item);
    if (item.code) supplierMap.set(lookupKey(item.code), item);
  }

  return { categoryMap, productMap, customerMap, supplierMap };
}

type ReferenceMaps = Awaited<ReturnType<typeof loadReferenceMaps>>;


const LEGACY_TEST_PATTERNS = [
  { code: "PT0001", name: "ATTD 001", targetCode: "TEST-0001" },
  { code: "PT0002", name: "IMIN JERSEY 2026 V2", targetCode: "TEST-0002" },
] as const;

export async function moveLegacyTestPatternsOutOfProductionSequence(): Promise<void> {
  const sourceCodes = LEGACY_TEST_PATTERNS.map((item) => item.code);
  const targetCodes = LEGACY_TEST_PATTERNS.map((item) => item.targetCode);

  const existing = await prisma.pattern.findMany({
    where: { code: { in: [...sourceCodes, ...targetCodes] } },
    select: { id: true, code: true, name: true },
  });

  const occupiedTargets = new Set(
    existing.filter((item) => targetCodes.includes(item.code as (typeof targetCodes)[number])).map((item) => item.code),
  );

  const moves = LEGACY_TEST_PATTERNS.filter((item) =>
    existing.some(
      (pattern) => pattern.code === item.code && pattern.name === item.name,
    ),
  );

  if (moves.length === 0) return;

  for (const move of moves) {
    if (occupiedTargets.has(move.targetCode)) {
      throw new Error(
        `Không thể giải phóng ${move.code}: mã ${move.targetCode} đã tồn tại.`,
      );
    }
  }

  await prisma.$transaction(
    moves.map((move) =>
      prisma.pattern.updateMany({
        where: { code: move.code, name: move.name },
        data: { code: move.targetCode },
      }),
    ),
  );
}

async function importOne(
  row: PatternBulkImportRow,
  reservedCode: string | undefined,
  refs: ReferenceMaps,
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

  const category = refs.categoryMap.get(lookupKey(row.category)) ?? null;
  const product = refs.productMap.get(lookupKey(row.product)) ?? null;
  const customer = refs.customerMap.get(lookupKey(row.customer)) ?? null;
  const supplier = refs.supplierMap.get(lookupKey(row.supplier)) ?? null;

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
      code: reservedCode ?? null,
      productCategoryId: category?.id ?? null,
      productId: product?.id ?? null,
      baseSize: clean(row.baseSize) || null,
      sizeRange: clean(row.sizeRange) || null,
      gradingRule: clean(row.gradingRule) || null,
      sourceType,
      patternSupplierId: supplier?.id ?? null,
      sourceSupplierCode: supplier?.code ?? null,
      sourceSupplier: supplier?.name ?? (clean(row.supplier) || null),
      customerId: customer?.id ?? null,
      customerNameSnapshot: customer?.name ?? (clean(row.customer) || null),
      sourceNotes: clean(row.sourceNotes) || null,
      notes: clean(row.notes) || null,
      createdBy,
    });

    return {
      rowNumber: row.rowNumber,
      status: "created",
      id: created.id,
      code: created.code,
      name: created.name,
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

  // One-time compatibility cleanup for the two original test records. This only
  // moves the known test names, so future real PT0001/PT0002 records are untouched.
  await moveLegacyTestPatternsOutOfProductionSequence();

  const [refs, reservedCodes] = await Promise.all([
    loadReferenceMaps(rows),
    generatePatternCodes(rows.length),
  ]);
  const items: PatternBulkImportResultItem[] = [];

  // Keep writes sequential for predictable database load; code allocation and
  // reference resolution are batched so large legacy imports stay efficient.
  for (const [index, row] of rows.entries()) {
    items.push(
      await importOne(row, reservedCodes[index], refs, input.createdBy ?? null),
    );
  }

  return {
    created: items.filter((item) => item.status === "created").length,
    failed: items.filter((item) => item.status === "error").length,
    items,
  };
}
