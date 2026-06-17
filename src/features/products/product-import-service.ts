import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ProductImportRow,
  ProductImportOptions,
  ProductImportPreviewRow,
  ProductImportExecuteResult,
} from "@/features/products/product-import-types";
import { normalizeCategoryName, validateImportRow, validateRawFieldValues } from "@/features/products/product-import-utils";
import { getSuggestedFix } from "@/features/products/product-import-feedback";
import {
  generateSku,
  ensureUniqueSku,
  getCategorySkuCode,
  generateProductCode,
} from "@/features/products/product-sku-utils";

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
  return text.toLowerCase().split("").map((c) => viMap[c] ?? c).join("").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

async function ensureUniqueProductSlug(baseSlug: string): Promise<string> {
  const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
  if (!existing) return baseSlug;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseSlug}-${i}`;
    const dup = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!dup) return candidate;
  }
  return `${baseSlug}-${Date.now()}`;
}

async function ensureUniqueProductCode(baseCode: string): Promise<string> {
  const existing = await prisma.product.findFirst({ where: { productCode: baseCode } });
  if (!existing) return baseCode;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${baseCode}-${i}`;
    const dup = await prisma.product.findFirst({ where: { productCode: candidate } });
    if (!dup) return candidate;
  }
  return `${baseCode}-${Date.now()}`;
}

export async function previewProductImport(
  rows: ProductImportRow[],
  options: ProductImportOptions,
  rawRows?: Record<string, unknown>[],
): Promise<ProductImportPreviewRow[]> {
  const allCategories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, skuCode: true },
  });
  const categoryMap = new Map<string, { id: string; name: string; skuCode: string | null }>(
    allCategories.map((c) => [c.name.toLowerCase().trim(), { id: c.id, name: c.name, skuCode: c.skuCode }])
  );

  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, productCode: true, category: { select: { name: true } } },
  });
  const productNameCatMap = new Map<string, string>(
    allProducts.map((p) => [`${p.category.name.toLowerCase()}::${p.name.toLowerCase()}`, p.id])
  );

  const allVariants = await prisma.productVariant.findMany({ select: { sku: true } });
  const existingSkus = new Set(allVariants.map((v) => v.sku));

  return rows.map((row, index) => {
    const errors = validateImportRow(row);
    const raw = rawRows?.[index];
    if (raw) {
      errors.push(...validateRawFieldValues(raw, options.columnMapping));
    }
    const normalizedCategory = normalizeCategoryName(row.category);
    const catData = categoryMap.get(normalizedCategory.toLowerCase()) ?? null;

    if (!catData && !options.autoCreateCategories) {
      errors.push({
        field: "category",
        message: `Danh mục "${normalizedCategory}" chưa tồn tại.`,
        severity: "error",
        suggestedFix: getSuggestedFix({ field: "category", message: "" }),
      });
    }

    const catSkuCode = getCategorySkuCode(normalizedCategory, catData?.skuCode);
    const productCode = row.productCode ?? generateProductCode(row.productName, row.material);

    const generatedSku = row.sku?.trim() || generateSku({
      categorySkuCode: catSkuCode,
      productCode,
      colorName: row.colorName,
      colorCode: row.colorCode,
      sizeName: row.sizeName,
      dimensions: row.dimensions,
      capacity: row.capacity,
    });

    let duplicateInfo = null;
    if (generatedSku && existingSkus.has(generatedSku)) {
      duplicateInfo = { type: "sku" as const };
    } else {
      const nameKey = `${normalizedCategory.toLowerCase()}::${row.productName.toLowerCase()}`;
      if (productNameCatMap.has(nameKey)) {
        duplicateInfo = { type: "name+category" as const, existingId: productNameCatMap.get(nameKey) };
      }
    }

    const isValid = errors.length === 0;
    const defaultStrategy = options.defaultDuplicateStrategy;
    const duplicateStrategy = duplicateInfo ? defaultStrategy : "skip";

    let finalAction: ProductImportPreviewRow["finalAction"];
    if (!isValid) finalAction = "invalid";
    else if (duplicateInfo) {
      if (defaultStrategy === "skip") finalAction = "skip";
      else if (defaultStrategy === "update") finalAction = "update";
      else finalAction = "copy";
    } else finalAction = "create";

    return {
      ...row,
      normalizedCategory,
      generatedSku,
      validationErrors: errors,
      duplicateInfo,
      duplicateStrategy,
      finalAction,
      isValid,
    };
  });
}

export async function executeProductImport(
  rows: ProductImportPreviewRow[],
  options: ProductImportOptions,
  jobId?: string
): Promise<ProductImportExecuteResult> {
  const result: ProductImportExecuteResult = {
    createdProducts: 0, updatedProducts: 0,
    createdVariants: 0, updatedVariants: 0,
    skippedRows: 0, invalidRows: 0, duplicateRows: 0, createdCategories: 0,
    errors: [],
  };

  const categoryCache = new Map<string, string>();

  async function getCategoryId(name: string): Promise<string | null> {
    const key = name.toLowerCase().trim();
    if (categoryCache.has(key)) return categoryCache.get(key)!;
    let cat = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (!cat && options.autoCreateCategories) {
      const slug = toSlug(name);
      cat = await prisma.category.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
        select: { id: true },
      });
      result.createdCategories++;
    }
    if (cat) { categoryCache.set(key, cat.id); return cat.id; }
    return null;
  }

  for (const row of rows) {
    if (row.finalAction === "invalid") { result.invalidRows++; continue; }
    if (row.finalAction === "skip") { result.skippedRows++; if (row.duplicateInfo) result.duplicateRows++; continue; }

    try {
      const categoryId = await getCategoryId(row.normalizedCategory);
      if (!categoryId) { result.invalidRows++; result.errors.push(`Hàng ${row.rowIndex + 1}: Không tìm được danh mục "${row.normalizedCategory}".`); continue; }

      const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { name: true, skuCode: true } });
      const catSkuCode = getCategorySkuCode(category?.name ?? row.normalizedCategory, category?.skuCode);
      const baseProductCode = row.productCode ?? generateProductCode(row.productName, row.material);

      let productId: string;

      if (row.finalAction === "update" && row.duplicateInfo?.existingId) {
        productId = row.duplicateInfo.existingId;
        await prisma.product.update({
          where: { id: productId },
          data: {
            shortDescription: row.shortDescription,
            material: row.material,
            form: row.form,
            defaultMoq: row.defaultMoq,
            supportsPrinting: row.supportsPrinting ?? false,
            supportsEmbroidery: row.supportsEmbroidery ?? false,
            supportsOem: row.supportsOem ?? false,
            tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            status: row.status as Prisma.EnumProductStatusFilter["equals"],
          },
        });
        result.updatedProducts++;
      } else {
        const productCode = row.finalAction === "copy"
          ? await ensureUniqueProductCode(baseProductCode)
          : baseProductCode;
        const slug = await ensureUniqueProductSlug(row.slug ?? toSlug(row.productName));
        const product = await prisma.product.create({
          data: {
            name: row.productName,
            slug,
            productCode,
            categoryId,
            shortDescription: row.shortDescription,
            description: row.description,
            material: row.material,
            form: row.form,
            fit: row.fit,
            defaultMoq: row.defaultMoq,
            useCases: row.useCases ? row.useCases.split(",").map((s) => s.trim()).filter(Boolean) : [],
            targetCustomers: row.targetCustomers ? row.targetCustomers.split(",").map((s) => s.trim()).filter(Boolean) : [],
            supportsPrinting: row.supportsPrinting ?? false,
            supportsEmbroidery: row.supportsEmbroidery ?? false,
            supportsOem: row.supportsOem ?? false,
            tags: row.tags ? row.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            status: (row.status ?? "DRAFT") as "ACTIVE" | "DRAFT" | "INACTIVE" | "ARCHIVED",
            featuredImage: row.featuredImage,
          },
        });
        productId = product.id;
        result.createdProducts++;
      }

      const hasVariantData = row.colorName || row.sizeName || row.dimensions || row.capacity || row.sku;
      if (hasVariantData) {
        const baseSku = row.generatedSku || generateSku({
          categorySkuCode: catSkuCode,
          productCode: baseProductCode,
          colorName: row.colorName,
          colorCode: row.colorCode,
          sizeName: row.sizeName,
          dimensions: row.dimensions,
          capacity: row.capacity,
        });

        const existing = await prisma.productVariant.findUnique({ where: { sku: baseSku } });
        if (existing && row.finalAction !== "update") {
          result.duplicateRows++;
        } else if (existing && row.finalAction === "update") {
          await prisma.productVariant.update({
            where: { sku: baseSku },
            data: {
              colorName: row.colorName,
              colorCode: row.colorCode,
              sizeName: row.sizeName,
              wholesalePrice: row.wholesalePrice,
              dealerPrice: row.dealerPrice,
              stockQty: row.stockQty ?? 0,
              stockStatus: (row.stockStatus ?? "IN_STOCK") as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER",
            },
          });
          result.updatedVariants++;
        } else {
          const sku = await ensureUniqueSku(baseSku);
          await prisma.productVariant.create({
            data: {
              productId,
              sku,
              colorName: row.colorName,
              colorCode: row.colorCode,
              sizeName: row.sizeName,
              dimensions: row.dimensions,
              capacity: row.capacity,
              wholesalePrice: row.wholesalePrice,
              dealerPrice: row.dealerPrice,
              costPrice: row.costPrice,
              stockQty: row.stockQty ?? 0,
              stockStatus: (row.stockStatus ?? "IN_STOCK") as "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER",
              weight: row.weight,
              internalNote: row.internalNote,
            },
          });
          result.createdVariants++;
        }
      }
    } catch (err) {
      result.errors.push(`Hàng ${row.rowIndex + 1}: ${err instanceof Error ? err.message : "Lỗi không xác định."}`);
      result.invalidRows++;
    }
  }

  if (jobId) {
    const { updateProductImportJobExecute } = await import("@/features/products/product-import-job-service");
    await updateProductImportJobExecute(jobId, result);
  }

  return result;
}
