import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  isValidFourLetterCategoryCode,
} from "@/features/categories/category-admin-constants";
import { CATEGORY_SKU_CODE_MISSING_ERROR } from "@/features/products/product-sku-utils";
import type { ProductImportValidationError } from "@/features/products/product-import-types";
import { normalizeCategoryName } from "@/features/products/product-import-utils";

export const IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR =
  "Không thể tự tạo danh mục vì thiếu mã danh mục hợp lệ.";

export type ImportCategoryRecord = {
  id: string;
  name: string;
  slug: string;
  skuCode: string | null;
};

function toSlug(text: string): string {
  const viMap: Record<string, string> = {
    à: "a", á: "a", ả: "a", ã: "a", ạ: "a", ă: "a", ắ: "a", ằ: "a", ẳ: "a", ẵ: "a", ặ: "a",
    â: "a", ấ: "a", ầ: "a", ẩ: "a", ẫ: "a", ậ: "a",
    è: "e", é: "e", ẻ: "e", ẽ: "e", ẹ: "e", ê: "e", ế: "e", ề: "e", ể: "e", ễ: "e", ệ: "e",
    ì: "i", í: "i", ỉ: "i", ĩ: "i", ị: "i",
    ò: "o", ó: "o", ỏ: "o", õ: "o", ọ: "o", ô: "o", ố: "o", ồ: "o", ổ: "o", ỗ: "o", ộ: "o",
    ơ: "o", ớ: "o", ờ: "o", ở: "o", ỡ: "o", ợ: "o",
    ù: "u", ú: "u", ủ: "u", ũ: "u", ụ: "u", ư: "u", ứ: "u", ừ: "u", ử: "u", ữ: "u", ự: "u",
    ỳ: "y", ý: "y", ỷ: "y", ỹ: "y", ỵ: "y", đ: "d",
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => viMap[c] ?? c)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Extract an explicit 4-letter category skuCode from an import reference.
 * Display names (e.g. "Áo thun trơn") are never coerced into accidental codes —
 * only values that are exactly four ASCII letters (ignoring surrounding whitespace) qualify.
 */
export function extractImportCategorySkuCode(categoryRef: string): string | null {
  const normalized = normalizeCategoryName(categoryRef);
  const compact = normalized.replace(/\s+/g, "");
  if (!/^[A-Za-z]{4}$/.test(compact)) return null;
  const code = compact.toUpperCase();
  return isValidFourLetterCategoryCode(code) ? code : null;
}

export async function findExistingCategoryForImport(
  categoryRef: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ImportCategoryRecord | null> {
  const normalized = normalizeCategoryName(categoryRef);
  const skuCandidate = extractImportCategorySkuCode(normalized);

  return db.category.findFirst({
    where: {
      OR: [
        { name: { equals: normalized, mode: "insensitive" } },
        { slug: { equals: normalized, mode: "insensitive" } },
        ...(skuCandidate ? [{ skuCode: { equals: skuCandidate, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { id: true, name: true, slug: true, skuCode: true },
  });
}

export function validateCategoryForImportPreview(
  categoryRef: string,
  existing: ImportCategoryRecord | null,
  autoCreateCategories: boolean,
): ProductImportValidationError[] {
  const normalized = normalizeCategoryName(categoryRef);
  const errors: ProductImportValidationError[] = [];

  if (existing) {
    if (!existing.skuCode?.trim()) {
      errors.push({
        field: "category",
        message: CATEGORY_SKU_CODE_MISSING_ERROR,
        severity: "error",
      });
    }
    return errors;
  }

  if (!autoCreateCategories) {
    errors.push({
      field: "category",
      message: `Danh mục "${normalized}" chưa tồn tại.`,
      severity: "error",
    });
    return errors;
  }

  if (!extractImportCategorySkuCode(normalized)) {
    errors.push({
      field: "category",
      message: IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR,
      severity: "error",
    });
  }

  return errors;
}

export async function ensureCategoryForImportExecution(
  categoryRef: string,
  autoCreateCategories: boolean,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<ImportCategoryRecord> {
  const normalized = normalizeCategoryName(categoryRef);
  const existing = await findExistingCategoryForImport(normalized, db);
  if (existing) {
    if (!existing.skuCode?.trim()) {
      throw new Error(CATEGORY_SKU_CODE_MISSING_ERROR);
    }
    return existing;
  }

  if (!autoCreateCategories) {
    throw new Error(`Không tìm được danh mục "${normalized}".`);
  }

  const skuCode = extractImportCategorySkuCode(normalized);
  if (!skuCode) {
    throw new Error(IMPORT_CATEGORY_SKU_CODE_REQUIRED_ERROR);
  }

  const taken = await db.category.findFirst({
    where: { skuCode: { equals: skuCode, mode: "insensitive" } },
    select: { id: true },
  });
  if (taken) {
    throw new Error(`Mã danh mục ${skuCode} đã được sử dụng.`);
  }

  const slug = toSlug(normalized);
  const created = await db.category.create({
    data: {
      name: normalized,
      slug,
      skuCode,
    },
    select: { id: true, name: true, slug: true, skuCode: true },
  });

  return created;
}
