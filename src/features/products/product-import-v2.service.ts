import type { Prisma, ProductStatus, StockStatus, VariantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IMPORT_CLEAR_TOKEN, IMPORT_EXECUTE_BATCH_SIZE } from "@/features/products/product-import-constants";
import type {
  ProductImportExecuteResult,
  ProductImportOptions,
  ProductImportPreviewRow,
  ProductImportPreviewSummary,
  ProductImportRow,
} from "@/features/products/product-import-types";
import {
  normalizeCategoryName,
  validateImportRow,
  validateRawFieldValues,
} from "@/features/products/product-import-utils";
import {
  buildDisplayLabelFromOptions,
  normalizeOptionComboSignature,
  parseStructuredOptionValues,
} from "@/features/products/product-import-options-parser";
import { matchProductByIdentifiers, matchVariantForProduct } from "@/features/products/product-import-matching";
import {
  createProductAdmin,
  updateProductAdmin,
  type ProductInput,
} from "@/features/products/product-admin.service";
import { resolveImportedProductAttributes } from "@/features/products/product-attribute-assignment-import";
import { syncProductCmsData } from "@/features/products/product-admin-cms";
import { generateProductSystemCode } from "@/features/products/product-system-code";
import {
  ensureUniqueSku,
  generateSku,
  normalizeSkuPart,
  requireCategorySkuCode,
  validateProductCodeForCategory,
  CATEGORY_SKU_CODE_MISSING_ERROR,
} from "@/features/products/product-sku-utils";
import { previewProductImport, executeProductImport } from "@/features/products/product-import-service";
import { normalizeOptionName } from "@/features/products/product-variant-matrix.utils";
import {
  findExistingCategoryForImport,
  validateCategoryForImportPreview,
  ensureCategoryForImportExecution,
} from "@/features/products/product-import-category";
import {
  normalizeVariantStockFields,
  validateVariantPriceFields,
} from "@/features/products/product-foundation-validation";

function buildPreviewSummary(rows: ProductImportPreviewRow[]): ProductImportPreviewSummary {
  const warnings = rows.reduce((sum, r) => sum + (r.warningCount ?? 0), 0);
  return {
    total: rows.length,
    valid: rows.filter((r) => r.isValid).length,
    invalid: rows.filter((r) => r.finalAction === "invalid" || r.finalAction === "error").length,
    warnings,
    duplicates: rows.filter((r) => r.duplicateInfo !== null).length,
    newProducts: rows.filter((r) => r.entityType === "product" && r.finalAction === "create").length,
    newVariants: rows.filter((r) => r.entityType === "variant" && r.finalAction === "create").length,
    updatedProducts: rows.filter((r) => r.entityType === "product" && r.finalAction === "update").length,
    updatedVariants: rows.filter((r) => r.entityType === "variant" && r.finalAction === "update").length,
    existingProductsMatched: rows.filter((r) => r.matchedProductId).length,
    existingVariantsMatched: rows.filter((r) => r.matchedVariantId).length,
    duplicateSkuCount: rows.filter((r) => r.duplicateInfo?.type === "sku").length,
    duplicateOptionComboCount: rows.filter((r) => r.duplicateInfo?.type === "option-combination").length,
    missingCategoryCount: rows.filter((r) =>
      r.validationErrors.some((e) => e.field === "category"),
    ).length,
    invalidImageUrlCount: rows.filter((r) =>
      r.validationErrors.some((e) =>
        ["featuredImage", "galleryUrls", "imageUrl"].includes(e.field),
      ),
    ).length,
    invalidStockMoqLeadTimeCount: rows.filter((r) =>
      r.validationErrors.some((e) =>
        ["stockQty", "defaultMoq", "moqOverride", "leadTime", "leadTimeOverride", "stockStatus"].includes(e.field),
      ),
    ).length,
    productsDetected: rows.filter((r) => r.entityType === "product").length,
    variantsDetected: rows.filter((r) => r.entityType === "variant").length,
    specsDetected: rows.filter((r) => r.entityType === "specification").length,
    customizationsDetected: rows.filter((r) => r.entityType === "customization").length,
  };
}

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

function splitTags(value?: string): string[] | undefined {
  if (!value || value === IMPORT_CLEAR_TOKEN) return value === IMPORT_CLEAR_TOKEN ? [] : undefined;
  return value.split(",").map((t) => t.trim()).filter(Boolean);
}

function splitGallery(value?: string): string[] | undefined {
  if (!value) return undefined;
  if (value === IMPORT_CLEAR_TOKEN) return [];
  return value.split("|").map((u) => u.trim()).filter(Boolean);
}

function applyClearableString(current: string | null | undefined, incoming?: string): string | null | undefined {
  if (incoming === undefined) return undefined;
  if (incoming === IMPORT_CLEAR_TOKEN) return null;
  return incoming;
}

export async function previewProductImportV2(
  rows: ProductImportRow[],
  options: ProductImportOptions,
  rawRows?: Record<string, unknown>[],
): Promise<ProductImportPreviewRow[]> {
  if (!options.importMode) {
    const legacy = await previewProductImport(rows, options, rawRows);
    return legacy.map((row) => ({
      ...row,
      entityType: row.entityType ?? "product",
      parsedOptionPairs: row.optionValues ? parseStructuredOptionValues(row.optionValues) : [],
    }));
  }

  const importMode = options.importMode;
  const allSkus = new Set(
    (await prisma.productVariant.findMany({ select: { sku: true } })).map((v) => v.sku),
  );
  const fileSkuCounts = new Map<string, number>();
  const fileComboCounts = new Map<string, number>();

  const previewRows: ProductImportPreviewRow[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const entityType = row.entityType ?? "product";
    const errors = validateImportRow(row, importMode);
    const raw = rawRows?.[index];
    if (raw) errors.push(...validateRawFieldValues(raw, options.columnMapping));

    const optionPairs = row.optionValues ? parseStructuredOptionValues(row.optionValues) : [];
    const matchedProduct = await matchProductByIdentifiers(row);
    let matchedVariantId: string | undefined;
    let duplicateInfo = null;
    let finalAction: ProductImportPreviewRow["finalAction"] = "create";
    const warnings: ProductImportValidationError[] = [];

    if (entityType === "product") {
      if (importMode === "update-product") {
        if (!matchedProduct) {
          errors.push({ field: "productCode", message: "Không tìm thấy sản phẩm để cập nhật.", severity: "error" });
          finalAction = "error";
        } else {
          finalAction = "update";
        }
      } else if (importMode === "create-product") {
        if (matchedProduct && row.productCode) {
          duplicateInfo = { type: "productCode" as const, existingId: matchedProduct.id };
          if (options.defaultDuplicateStrategy === "skip") finalAction = "skip";
          else if (options.defaultDuplicateStrategy === "update") finalAction = "update";
          else finalAction = "copy";
        } else {
          const catRef = row.category;
          if (catRef) {
            const existingCategory = await findExistingCategoryForImport(catRef);
            errors.push(
              ...validateCategoryForImportPreview(
                catRef,
                existingCategory,
                options.autoCreateCategories,
              ),
            );
          }
          finalAction = "create";
        }
      }
    }

    if (entityType === "variant") {
      if (!matchedProduct) {
        errors.push({ field: "productCode", message: "Không tìm thấy sản phẩm cho biến thể.", severity: "error" });
        finalAction = "error";
      } else {
        const { variant } = await matchVariantForProduct(matchedProduct.id, row);
        if (variant) {
          matchedVariantId = variant.id;
          if (importMode === "update-variants-bulk" || options.defaultDuplicateStrategy === "update") {
            finalAction = "update";
          } else if (options.defaultDuplicateStrategy === "skip") {
            finalAction = "skip";
            duplicateInfo = { type: "sku" as const, existingId: variant.id };
          } else {
            finalAction = "update";
          }
          if (variant.variantStatus !== "ACTIVE" && row.variantStatus?.toUpperCase() === "ACTIVE") {
            warnings.push({
              field: "variantStatus",
              message: "Biến thể đang ngừng/lưu trữ — không tự kích hoạt lại trừ khi cột variantStatus=ACTIVE được cung cấp.",
              severity: "warning",
            });
          }
        } else {
          finalAction = importMode === "update-variants-bulk" ? "error" : "create";
          if (importMode === "update-variants-bulk") {
            errors.push({ field: "sku", message: "Không tìm thấy biến thể để cập nhật.", severity: "error" });
          }
        }
      }

      const generatedSku =
        row.sku?.trim() ||
        (matchedProduct?.productCode
          ? generateSku({
              productCode: matchedProduct.productCode,
              colorName: row.colorName,
              colorCode: row.colorCode,
              sizeName: row.sizeName,
              dimensions: row.dimensions,
              capacity: row.capacity,
            })
          : "");

      if (generatedSku) {
        const count = (fileSkuCounts.get(generatedSku) ?? 0) + 1;
        fileSkuCounts.set(generatedSku, count);
        if (count > 1 || (allSkus.has(generatedSku) && finalAction === "create")) {
          duplicateInfo = { type: "sku" as const };
          if (finalAction === "create") {
            errors.push({ field: "sku", message: `SKU "${generatedSku}" bị trùng.`, severity: "error" });
          }
        }
      }

      if (optionPairs.length && matchedProduct) {
        const comboKey = `${matchedProduct.id}::${normalizeOptionComboSignature(optionPairs)}`;
        const count = (fileComboCounts.get(comboKey) ?? 0) + 1;
        fileComboCounts.set(comboKey, count);
        if (count > 1) {
          duplicateInfo = { type: "option-combination" as const };
          errors.push({
            field: "optionValues",
            message: "Tổ hợp thuộc tính bị trùng trong file.",
            severity: "error",
          });
        }
      }
    }

    if (entityType === "specification" || entityType === "customization") {
      if (!matchedProduct) {
        errors.push({ field: "productCode", message: "Không tìm thấy sản phẩm.", severity: "error" });
        finalAction = "error";
      } else {
        finalAction = "create";
      }
    }

    const isValid = errors.length === 0;
    if (!isValid) finalAction = finalAction === "skip" ? "skip" : "invalid";

    previewRows.push({
      ...row,
      entityType,
      normalizedCategory: normalizeCategoryName(row.category),
      generatedSku:
        row.sku?.trim() ||
        (matchedProduct?.productCode
          ? generateSku({
              productCode: matchedProduct.productCode,
              colorName: row.colorName,
              colorCode: row.colorCode,
              sizeName: row.sizeName,
              dimensions: row.dimensions,
              capacity: row.capacity,
            })
          : ""),
      matchedProductId: matchedProduct?.id,
      matchedProductCode: matchedProduct?.productCode ?? undefined,
      matchedVariantId,
      validationErrors: [...errors, ...warnings],
      duplicateInfo,
      duplicateStrategy: duplicateInfo ? options.defaultDuplicateStrategy : "skip",
      finalAction,
      isValid,
      warningCount: warnings.length,
      parsedOptionPairs: optionPairs,
      affectedFields: Object.keys(row._presentFields ?? {}),
      displayLabel:
        row.displayLabel ||
        (optionPairs.length ? buildDisplayLabelFromOptions(optionPairs) : row.displayLabel),
    });
  }

  return previewRows;
}

type ProductImportValidationError = ProductImportPreviewRow["validationErrors"][number];

async function ensureOptionsForVariant(
  productId: string,
  pairs: Array<{ group: string; value: string }>,
  allowCreate: boolean,
): Promise<string[]> {
  if (!pairs.length) return [];

  const options = await prisma.productOption.findMany({
    where: { productId },
    include: { values: true },
    orderBy: { sortOrder: "asc" },
  });

  const valueIds: string[] = [];
  for (const pair of pairs) {
    let option = options.find(
      (o) => o.name.toLowerCase() === pair.group.toLowerCase() || o.slug.toLowerCase() === pair.group.toLowerCase(),
    );
    const sharedAttribute = await prisma.productAttribute.findFirst({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { equals: pair.group, mode: "insensitive" } },
          { slug: { equals: toSlug(pair.group), mode: "insensitive" } },
          { code: { equals: normalizeSkuPart(pair.group), mode: "insensitive" } },
        ],
      },
      include: { values: { where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } } },
    });
    let sharedValue = sharedAttribute?.values.find(
      (value) =>
        normalizeOptionName(value.name) === normalizeOptionName(pair.value) ||
        value.code.toUpperCase() === normalizeSkuPart(pair.value),
    );
    if (sharedAttribute && !sharedValue && !allowCreate) {
      throw new Error(`Giá trị "${pair.value}" chưa tồn tại hoặc đã ngừng sử dụng trong thuộc tính chung "${sharedAttribute.name}".`);
    }
    if (sharedAttribute && !sharedValue && allowCreate) {
      const code = normalizeSkuPart(pair.value) || `VAL${sharedAttribute.values.length + 1}`;
      sharedValue = await prisma.productAttributeValue.create({
        data: {
          attributeId: sharedAttribute.id,
          name: pair.value,
          code,
          slug: toSlug(pair.value) || code.toLowerCase(),
          sortOrder: sharedAttribute.values.length,
        },
      });
      sharedAttribute.values.push(sharedValue);
    }

    if (!option && allowCreate) {
      const slug = sharedAttribute?.slug ?? toSlug(pair.group) ?? `option-${options.length + 1}`;
      option = await prisma.productOption.create({
        data: {
          productId,
          attributeId: sharedAttribute?.id,
          name: sharedAttribute?.name ?? pair.group,
          slug,
          sortOrder: options.length,
          values: {
            create: sharedValue
              ? [{
                  attributeValueId: sharedValue.id,
                  label: sharedValue.name,
                  valueCode: sharedValue.code,
                  imageUrl: sharedValue.imageUrl,
                  sortOrder: 0,
                }]
              : [{ label: pair.value, sortOrder: 0 }],
          },
        },
        include: { values: true },
      });
      options.push(option);
    }
    if (!option) {
      throw new Error(`Nhóm thuộc tính "${pair.group}" chưa tồn tại. Bật tạo nhóm thuộc tính mới hoặc tạo trước trong admin.`);
    }

    let value = option.values.find((v) =>
      v.attributeValueId === sharedValue?.id ||
      normalizeOptionName(v.label) === normalizeOptionName(pair.value),
    );
    if (!value && allowCreate) {
      value = await prisma.productOptionValue.create({
        data: {
          optionId: option.id,
          attributeValueId: sharedValue?.id,
          label: sharedValue?.name ?? pair.value,
          valueCode: sharedValue?.code,
          imageUrl: sharedValue?.imageUrl,
          sortOrder: option.values.length,
        },
      });
      option.values.push(value);
    }
    if (!value) {
      throw new Error(`Giá trị "${pair.value}" chưa tồn tại trong nhóm "${pair.group}".`);
    }
    valueIds.push(value.id);
  }

  return valueIds;
}

export async function executeProductImportV2(
  rows: ProductImportPreviewRow[],
  options: ProductImportOptions,
  jobId?: string,
): Promise<ProductImportExecuteResult> {
  if (!options.importMode) {
    const legacy = await executeProductImport(rows, options, jobId);
    return { ...legacy, failedRows: 0, createdSpecs: 0, updatedSpecs: 0, createdCustomizations: 0, updatedCustomizations: 0 };
  }

  const result: ProductImportExecuteResult = {
    createdProducts: 0,
    updatedProducts: 0,
    createdVariants: 0,
    updatedVariants: 0,
    createdSpecs: 0,
    updatedSpecs: 0,
    createdCustomizations: 0,
    updatedCustomizations: 0,
    skippedRows: 0,
    invalidRows: 0,
    failedRows: 0,
    duplicateRows: 0,
    createdCategories: 0,
    errors: [],
    rowFailures: [],
  };

  const executable = rows.filter((row) => {
    if (row.finalAction === "skip") {
      result.skippedRows++;
      if (row.duplicateInfo) result.duplicateRows++;
      return false;
    }
    if (row.finalAction === "invalid" || row.finalAction === "error") {
      if (options.importValidRowsOnly) {
        result.skippedRows++;
        return false;
      }
      result.invalidRows++;
      return false;
    }
    return true;
  });

  if (!options.importValidRowsOnly && rows.some((r) => r.finalAction === "invalid" || r.finalAction === "error")) {
    result.errors.push("Import bị chặn vì còn dòng lỗi. Chọn \"Chỉ nhập các dòng hợp lệ\" để bỏ qua.");
    return result;
  }

  for (let i = 0; i < executable.length; i += IMPORT_EXECUTE_BATCH_SIZE) {
    const batch = executable.slice(i, i + IMPORT_EXECUTE_BATCH_SIZE);
    await prisma.$transaction(async () => {
      for (const row of batch) {
        try {
          await executeImportRow(row, options, result);
        } catch (err) {
          result.failedRows++;
          const message = err instanceof Error ? err.message : "Lỗi không xác định.";
          result.errors.push(`Hàng ${row.rowIndex + 1}: ${message}`);
          result.rowFailures?.push({ rowIndex: row.rowIndex, message });
        }
      }
    });
  }

  if (jobId) {
    const { updateProductImportJobExecute } = await import("@/features/products/product-import-job-service");
    await updateProductImportJobExecute(jobId, result);
  }

  return result;
}

async function executeImportRow(
  row: ProductImportPreviewRow,
  options: ProductImportOptions,
  result: ProductImportExecuteResult,
): Promise<void> {
  const entityType = row.entityType;

  if (entityType === "product") {
    await executeProductRow(row, options, result);
    return;
  }
  if (entityType === "variant") {
    await executeVariantRow(row, options, result);
    return;
  }
  if (entityType === "specification") {
    await executeSpecRow(row, result);
    return;
  }
  if (entityType === "customization") {
    await executeCustomizationRow(row, result);
  }
}

async function executeProductRow(
  row: ProductImportPreviewRow,
  options: ProductImportOptions,
  result: ProductImportExecuteResult,
): Promise<void> {
  let resolvedAssignments: ProductInput["attributeAssignments"] | undefined;
  if (row.productAttributes?.trim()) {
    resolvedAssignments = await resolveImportedProductAttributes(row.productAttributes, {
      allowCreateCatalogValues: options.allowCreateOptions,
    });
  }

  if (row.finalAction === "update" && row.matchedProductId) {
    const update: Partial<ProductInput> = {};
    const present = row._presentFields ?? {};

    if (present.productName || row.productName) update.name = row.productName || undefined;
    if (present.shortDescription) update.shortDescription = applyClearableString(undefined, row.shortDescription) ?? undefined;
    if (present.description) update.description = applyClearableString(undefined, row.description) ?? undefined;
    if (present.material) update.material = applyClearableString(undefined, row.material) ?? undefined;
    if (present.form) update.form = applyClearableString(undefined, row.form) ?? undefined;
    if (present.fit) update.fit = applyClearableString(undefined, row.fit) ?? undefined;
    if (present.gsm) update.gsm = row.gsm ?? null;
    if (present.productAttributes) update.attributeAssignments = resolvedAssignments ?? [];
    if (present.defaultMoq) update.defaultMoq = row.defaultMoq ?? null;
    if (present.leadTime) update.leadTime = applyClearableString(undefined, row.leadTime) ?? null;
    if (present.supportsPrinting) update.supportsPrinting = row.supportsPrinting;
    if (present.supportsEmbroidery) update.supportsEmbroidery = row.supportsEmbroidery;
    if (present.supportsOem) update.supportsOem = row.supportsOem;
    if (present.tags) update.tags = splitTags(row.tags);
    if (present.featuredImage) update.featuredImage = applyClearableString(undefined, row.featuredImage) ?? null;
    if (present.galleryUrls) update.gallery = splitGallery(row.galleryUrls);
    if (present.seoTitle) update.seoTitle = applyClearableString(undefined, row.seoTitle) ?? undefined;
    if (present.seoDescription) update.seoDescription = applyClearableString(undefined, row.seoDescription) ?? undefined;
    if (present.status && row.status) update.status = row.status as ProductStatus;

    await updateProductAdmin(row.matchedProductId, update);
    result.updatedProducts++;
    return;
  }

  const cat = await ensureCategoryForImportExecution(row.category, options.autoCreateCategories);
  if (!cat.skuCode?.trim()) throw new Error(CATEGORY_SKU_CODE_MISSING_ERROR);

  const prefix = requireCategorySkuCode(cat.skuCode);
  let productCode = row.productCode;
  if (productCode?.trim()) {
    productCode = validateProductCodeForCategory(prefix, productCode);
  }

  const input: ProductInput = {
    name: row.productName,
    slug: row.slug,
    productCode: productCode || undefined,
    categoryId: cat.id,
    shortDescription: row.shortDescription,
    description: row.description,
    material: row.material,
    form: row.form,
    fit: row.fit,
    gsm: row.gsm ?? null,
    defaultMoq: row.defaultMoq ?? null,
    leadTime: row.leadTime ?? null,
    useCases: row.useCases ? splitTags(row.useCases) : [],
    targetCustomers: row.targetCustomers ? splitTags(row.targetCustomers) : [],
    supportsPrinting: row.supportsPrinting ?? false,
    supportsEmbroidery: row.supportsEmbroidery ?? false,
    supportsOem: row.supportsOem ?? true,
    tags: splitTags(row.tags) ?? [],
    featuredImage: row.featuredImage === IMPORT_CLEAR_TOKEN ? null : row.featuredImage ?? null,
    gallery: splitGallery(row.galleryUrls) ?? [],
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: (row.status ?? "DRAFT") as ProductStatus,
    attributeAssignments: resolvedAssignments,
  };

  await createProductAdmin(input);
  result.createdProducts++;
}

async function executeVariantRow(
  row: ProductImportPreviewRow,
  options: ProductImportOptions,
  result: ProductImportExecuteResult,
): Promise<void> {
  const productId = row.matchedProductId;
  if (!productId) throw new Error("Thiếu sản phẩm cho biến thể.");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { productCode: true },
  });
  if (!product) throw new Error("Sản phẩm không tồn tại.");

  const optionPairs = row.parsedOptionPairs ?? [];
  const optionValueIds = await ensureOptionsForVariant(
    productId,
    optionPairs,
    Boolean(options.allowCreateOptions),
  );

  if (!product.productCode) throw new Error("Sản phẩm chưa có productCode.");

  const baseSku =
    row.generatedSku ||
    generateSku({
      productCode: product.productCode,
      colorName: row.colorName,
      colorCode: row.colorCode,
      sizeName: row.sizeName,
      dimensions: row.dimensions,
      capacity: row.capacity,
    });

  if (row.finalAction === "update" && row.matchedVariantId) {
    const present = row._presentFields ?? {};
    const data: Prisma.ProductVariantUpdateInput = {};
    if (present.stockQty) {
      const stock = normalizeVariantStockFields(row.stockQty ?? 0, row.stockStatus as StockStatus | undefined);
      data.stockQty = stock.stockQty;
      data.stockStatus = stock.stockStatus;
    } else if (present.stockStatus && row.stockStatus) {
      const current = await prisma.productVariant.findUnique({
        where: { id: row.matchedVariantId },
        select: { stockQty: true },
      });
      const stock = normalizeVariantStockFields(current?.stockQty ?? 0, row.stockStatus as StockStatus);
      data.stockStatus = stock.stockStatus;
    }
    if (present.moqOverride) data.moqOverride = row.moqOverride ?? null;
    if (present.leadTimeOverride) {
      data.leadTimeOverride =
        row.leadTimeOverride === IMPORT_CLEAR_TOKEN ? null : row.leadTimeOverride ?? null;
    }
    if (present.imageUrl) {
      data.imageUrl = row.imageUrl === IMPORT_CLEAR_TOKEN ? null : row.imageUrl ?? null;
    }
    if (present.wholesalePrice || present.dealerPrice) {
      validateVariantPriceFields({
        wholesalePrice: present.wholesalePrice ? row.wholesalePrice : undefined,
        dealerPrice: present.dealerPrice ? row.dealerPrice : undefined,
      });
    }
    if (present.wholesalePrice) data.wholesalePrice = row.wholesalePrice ?? null;
    if (present.dealerPrice) data.dealerPrice = row.dealerPrice ?? null;
    if (present.displayLabel) data.displayLabel = row.displayLabel ?? null;
    if (present.variantStatus && row.variantStatus) {
      const next = row.variantStatus.toUpperCase() as VariantStatus;
      const current = await prisma.productVariant.findUnique({
        where: { id: row.matchedVariantId },
        select: { variantStatus: true },
      });
      if (current && current.variantStatus !== "ACTIVE" && next === "ACTIVE" && !present.variantStatus) {
        /* do not auto-reactivate */
      } else if (present.variantStatus) {
        data.variantStatus = next;
      }
    }

    await prisma.productVariant.update({ where: { id: row.matchedVariantId }, data });
    result.updatedVariants++;
    return;
  }

  const sku = row.sku?.trim() ? await ensureUniqueSku(row.sku.trim()) : await ensureUniqueSku(baseSku);
  const stock = normalizeVariantStockFields(
    row.stockQty ?? 0,
    (row.stockStatus as StockStatus | undefined) ?? undefined,
  );
  const created = await prisma.productVariant.create({
    data: {
      productId,
      sku,
      displayLabel: row.displayLabel || (optionPairs.length ? buildDisplayLabelFromOptions(optionPairs) : undefined),
      colorName: row.colorName,
      colorCode: row.colorCode,
      sizeName: row.sizeName,
      dimensions: row.dimensions,
      capacity: row.capacity,
      stockQty: stock.stockQty,
      stockStatus: stock.stockStatus,
      moqOverride: row.moqOverride ?? null,
      leadTimeOverride: row.leadTimeOverride === IMPORT_CLEAR_TOKEN ? null : row.leadTimeOverride ?? null,
      imageUrl: row.imageUrl === IMPORT_CLEAR_TOKEN ? null : row.imageUrl ?? null,
      wholesalePrice: row.wholesalePrice ?? null,
      dealerPrice: row.dealerPrice ?? null,
      costPrice: row.costPrice ?? null,
      variantStatus: (row.variantStatus ?? "ACTIVE") as VariantStatus,
    },
  });

  if (optionValueIds.length) {
    await syncProductCmsData(productId, {
      variantOptionValueIds: { [created.id]: optionValueIds },
    });
  }

  result.createdVariants++;
}

async function executeSpecRow(row: ProductImportPreviewRow, result: ProductImportExecuteResult): Promise<void> {
  const productId = row.matchedProductId;
  if (!productId || !row.specLabel || !row.specValue) throw new Error("Thiếu dữ liệu thông số.");

  const existing = await prisma.productSpecification.findFirst({
    where: { productId, label: row.specLabel },
  });

  if (existing) {
    await prisma.productSpecification.update({
      where: { id: existing.id },
      data: {
        value: row.specValue,
        sortOrder: row.specSortOrder ?? existing.sortOrder,
      },
    });
    result.updatedSpecs++;
  } else {
    await prisma.productSpecification.create({
      data: {
        productId,
        label: row.specLabel,
        value: row.specValue,
        sortOrder: row.specSortOrder ?? 0,
      },
    });
    result.createdSpecs++;
  }
}

async function executeCustomizationRow(
  row: ProductImportPreviewRow,
  result: ProductImportExecuteResult,
): Promise<void> {
  const productId = row.matchedProductId;
  if (!productId || !row.capability) throw new Error("Thiếu dữ liệu tùy chỉnh.");

  const existing = await prisma.productCustomizationCapability.findFirst({
    where: { productId, label: row.capability },
  });

  if (existing) {
    await prisma.productCustomizationCapability.update({
      where: { id: existing.id },
      data: {
        description: row.capabilityDescription ?? existing.description,
        sortOrder: row.capabilitySortOrder ?? existing.sortOrder,
        enabled: row.capabilityEnabled ?? existing.enabled,
      },
    });
    result.updatedCustomizations++;
  } else {
    await prisma.productCustomizationCapability.create({
      data: {
        productId,
        label: row.capability,
        description: row.capabilityDescription,
        sortOrder: row.capabilitySortOrder ?? 0,
        enabled: row.capabilityEnabled ?? true,
      },
    });
    result.createdCustomizations++;
  }
}

export function buildPreviewSummaryFromRows(rows: ProductImportPreviewRow[]): ProductImportPreviewSummary {
  return buildPreviewSummary(rows);
}

// Ensure system code on create path via admin service is already handled; expose for tests.
export { generateProductSystemCode };
