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
  buildProductGroupKey,
  validateProductCodeForCategory,
  requireCategorySkuCode,
  initCategoryCodeCounter,
  allocateProductCodeFromCounter,
  ProductSkuError,
  CATEGORY_SKU_CODE_MISSING_ERROR,
  isProductCodeTaken,
  type CategoryCodeCounter,
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

type CategoryMeta = { id: string; name: string; skuCode: string | null; prefix?: string };

async function allocateProductCodesForGroups(
  rows: ProductImportPreviewRow[],
  categoryMap: Map<string, CategoryMeta>
): Promise<Map<string, string>> {
  const groupCodes = new Map<string, string>();
  const counters = new Map<string, CategoryCodeCounter>();

  for (const row of rows) {
    if (row.finalAction !== "create" && row.finalAction !== "copy") continue;

    const cat = categoryMap.get(row.normalizedCategory.toLowerCase());
    if (!cat?.id || !cat.prefix) continue;

    const groupKey = buildProductGroupKey(cat.id, row.productName, row.productCode);
    if (groupCodes.has(groupKey)) continue;

    if (row.productCode?.trim()) {
      groupCodes.set(
        groupKey,
        validateProductCodeForCategory(cat.prefix, row.productCode)
      );
      continue;
    }

    if (!counters.has(cat.id)) {
      counters.set(cat.id, await initCategoryCodeCounter(cat.id));
    }
    const counter = counters.get(cat.id)!;
    groupCodes.set(groupKey, allocateProductCodeFromCounter(counter));
  }

  return groupCodes;
}

function resolveProductCodeForRow(
  row: ProductImportPreviewRow,
  categoryMap: Map<string, CategoryMeta>,
  groupCodes: Map<string, string>
): string | undefined {
  const cat = categoryMap.get(row.normalizedCategory.toLowerCase());
  if (!cat?.id) return row.productCode;

  const groupKey = buildProductGroupKey(cat.id, row.productName, row.productCode);
  return groupCodes.get(groupKey) ?? row.productCode;
}

export async function previewProductImport(
  rows: ProductImportRow[],
  options: ProductImportOptions,
  rawRows?: Record<string, unknown>[],
): Promise<ProductImportPreviewRow[]> {
  const allCategories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, skuCode: true },
  });
  const categoryMap = new Map<string, CategoryMeta>(
    allCategories.map((c) => [
      c.name.toLowerCase().trim(),
      {
        id: c.id,
        name: c.name,
        skuCode: c.skuCode,
        prefix: c.skuCode?.trim() ? requireCategorySkuCode(c.skuCode) : undefined,
      },
    ])
  );

  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, productCode: true, category: { select: { name: true } } },
  });
  const productNameCatMap = new Map<string, string>(
    allProducts.map((p) => [`${p.category.name.toLowerCase()}::${p.name.toLowerCase()}`, p.id])
  );
  const existingProductCodes = new Set(
    allProducts.map((p) => p.productCode).filter(Boolean) as string[]
  );

  const allVariants = await prisma.productVariant.findMany({ select: { sku: true } });
  const existingSkus = new Set(allVariants.map((v) => v.sku));

  const previewRows: ProductImportPreviewRow[] = rows.map((row, index) => {
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

    if (catData && !catData.prefix) {
      errors.push({
        field: "category",
        message: CATEGORY_SKU_CODE_MISSING_ERROR,
        severity: "error",
      });
    }

    if (catData?.prefix && row.productCode?.trim()) {
      try {
        validateProductCodeForCategory(catData.prefix, row.productCode);
      } catch (err) {
        errors.push({
          field: "productCode",
          message: err instanceof ProductSkuError ? err.message : "Mã sản phẩm không hợp lệ.",
          severity: "error",
        });
      }
    }

    const isValid = errors.length === 0;
    const defaultStrategy = options.defaultDuplicateStrategy;

    let duplicateInfo = null;
    const nameKey = `${normalizedCategory.toLowerCase()}::${row.productName.toLowerCase()}`;
    if (row.productCode && existingProductCodes.has(row.productCode.toUpperCase())) {
      duplicateInfo = { type: "productCode" as const };
    } else if (productNameCatMap.has(nameKey)) {
      duplicateInfo = { type: "name+category" as const, existingId: productNameCatMap.get(nameKey) };
    }

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
      entityType: row.entityType ?? "product",
      normalizedCategory,
      generatedSku: "",
      validationErrors: errors,
      duplicateInfo,
      duplicateStrategy,
      finalAction,
      isValid,
    };
  });

  const groupCodes = await allocateProductCodesForGroups(previewRows, categoryMap);

  return previewRows.map((row) => {
    const cat = categoryMap.get(row.normalizedCategory.toLowerCase());
    const productCode = resolveProductCodeForRow(row, categoryMap, groupCodes);

    const generatedSku =
      row.sku?.trim() ||
      (productCode
        ? generateSku({
            productCode,
            colorName: row.colorName,
            colorCode: row.colorCode,
            sizeName: row.sizeName,
            dimensions: row.dimensions,
            capacity: row.capacity,
          })
        : "");

    let duplicateInfo = row.duplicateInfo;
    if (generatedSku && existingSkus.has(generatedSku)) {
      duplicateInfo = { type: "sku" as const };
    }

    let finalAction = row.finalAction;
    if (row.isValid && duplicateInfo?.type === "sku") {
      if (options.defaultDuplicateStrategy === "skip") finalAction = "skip";
      else if (options.defaultDuplicateStrategy === "update") finalAction = "update";
      else finalAction = "copy";
    }

    if (productCode && existingProductCodes.has(productCode) && finalAction === "create") {
      duplicateInfo = { type: "productCode" as const };
      if (options.defaultDuplicateStrategy === "skip") finalAction = "skip";
      else if (options.defaultDuplicateStrategy === "update") finalAction = "update";
      else finalAction = "copy";
    }

    return {
      ...row,
      productCode,
      generatedSku,
      duplicateInfo,
      finalAction,
      isValid: row.isValid && finalAction !== "invalid",
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
    createdSpecs: 0, updatedSpecs: 0,
    createdCustomizations: 0, updatedCustomizations: 0,
    skippedRows: 0, invalidRows: 0, failedRows: 0, duplicateRows: 0, createdCategories: 0,
    errors: [],
  };

  const categoryCache = new Map<string, string>();
  const categoryMetaCache = new Map<string, CategoryMeta>();
  const groupCodes = new Map<string, string>();
  const counters = new Map<string, CategoryCodeCounter>();
  const productGroupCache = new Map<string, { productId: string; productCode: string }>();

  async function getCategoryMeta(name: string): Promise<CategoryMeta | null> {
    const key = name.toLowerCase().trim();
    if (categoryMetaCache.has(key)) return categoryMetaCache.get(key)!;

    let cat = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, skuCode: true },
    });

    if (!cat && options.autoCreateCategories) {
      const slug = toSlug(name);
      cat = await prisma.category.upsert({
        where: { slug },
        create: { name, slug },
        update: {},
        select: { id: true, name: true, skuCode: true },
      });
      result.createdCategories++;
    }

    if (!cat) return null;

    const meta: CategoryMeta = {
      id: cat.id,
      name: cat.name,
      skuCode: cat.skuCode,
      prefix: cat.skuCode?.trim() ? requireCategorySkuCode(cat.skuCode) : undefined,
    };
    categoryMetaCache.set(key, meta);
    categoryCache.set(key, cat.id);
    return meta;
  }

  async function resolveGroupProductCode(
    cat: CategoryMeta,
    row: ProductImportPreviewRow
  ): Promise<string> {
    const groupKey = buildProductGroupKey(cat.id, row.productName, row.productCode);
    if (groupCodes.has(groupKey)) return groupCodes.get(groupKey)!;

    if (row.productCode?.trim() && cat.prefix) {
      const code = validateProductCodeForCategory(cat.prefix, row.productCode);
      groupCodes.set(groupKey, code);
      return code;
    }

    if (!counters.has(cat.id)) {
      counters.set(cat.id, await initCategoryCodeCounter(cat.id));
    }
    const code = allocateProductCodeFromCounter(counters.get(cat.id)!);
    groupCodes.set(groupKey, code);
    return code;
  }

  for (const row of rows) {
    if (row.finalAction === "invalid") { result.invalidRows++; continue; }
    if (row.finalAction === "skip") { result.skippedRows++; if (row.duplicateInfo) result.duplicateRows++; continue; }

    try {
      const cat = await getCategoryMeta(row.normalizedCategory);
      if (!cat) {
        result.invalidRows++;
        result.errors.push(`Hàng ${row.rowIndex + 1}: Không tìm được danh mục "${row.normalizedCategory}".`);
        continue;
      }
      if (!cat.prefix) {
        result.invalidRows++;
        result.errors.push(`Hàng ${row.rowIndex + 1}: ${CATEGORY_SKU_CODE_MISSING_ERROR}`);
        continue;
      }

      const groupKey = buildProductGroupKey(cat.id, row.productName, row.productCode);
      let productId: string;
      let productCode: string;

      const cached = productGroupCache.get(groupKey);
      if (cached) {
        productId = cached.productId;
        productCode = cached.productCode;
      } else if (row.finalAction === "update" && row.duplicateInfo?.existingId) {
        productId = row.duplicateInfo.existingId;
        const existing = await prisma.product.findUnique({
          where: { id: productId },
          select: { productCode: true },
        });
        productCode = existing?.productCode ?? (await resolveGroupProductCode(cat, row));
        productGroupCache.set(groupKey, { productId, productCode });

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
        productCode = row.productCode ?? (await resolveGroupProductCode(cat, row));

        if (await isProductCodeTaken(productCode)) {
          if (row.finalAction === "copy") {
            if (!counters.has(cat.id)) {
              counters.set(cat.id, await initCategoryCodeCounter(cat.id));
            }
            productCode = allocateProductCodeFromCounter(counters.get(cat.id)!);
          } else {
            result.duplicateRows++;
            result.errors.push(`Hàng ${row.rowIndex + 1}: Mã sản phẩm ${productCode} đã tồn tại.`);
            result.invalidRows++;
            continue;
          }
        }

        const slug = await ensureUniqueProductSlug(row.slug ?? toSlug(row.productName));
        const product = await prisma.product.create({
          data: {
            name: row.productName,
            slug,
            productCode,
            categoryId: cat.id,
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
        productGroupCache.set(groupKey, { productId, productCode });
        result.createdProducts++;
      }

      const hasVariantData = row.colorName || row.sizeName || row.dimensions || row.capacity || row.sku;
      if (hasVariantData) {
        const baseSku =
          row.generatedSku ||
          generateSku({
            productCode,
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
