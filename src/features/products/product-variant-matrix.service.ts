import type { VariantStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { normalizeVariantStockFields } from "@/features/products/product-foundation-validation";
import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/features/products/product-relation-ownership";
import { assertOptionValueIdsBelongToProduct } from "@/features/products/product-relation-ownership";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { generateSku, ensureUniqueSku, ProductSkuError } from "@/features/products/product-sku-utils";
import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  buildMatrixCombinationSkuSuffix,
  combinationSignature,
  computeTheoreticalCombinationCount,
  countActiveMatrixOptionGroups,
  mapCombinationToLegacyFields,
  validateMatrixCombinationForGeneration,
  VARIANT_MATRIX_CONFIRM_THRESHOLD,
  VARIANT_MATRIX_MIN_OPTION_GROUPS,
  VARIANT_MATRIX_WARN_THRESHOLD,
  type MatrixCombination,
  type MatrixOptionGroup,
} from "@/features/products/product-variant-matrix.utils";

export type VariantMatrixPreview = {
  previewText: string;
  theoreticalCount: number;
  existingCount: number;
  missingCount: number;
  requiresConfirmation: boolean;
  requiresWarning: boolean;
  canGenerate: boolean;
  message?: string;
};

export type VariantMatrixGenerationResult = {
  created: number;
  skipped: number;
  preserved: number;
  variants: Array<{ id: string; sku: string; displayLabel: string | null }>;
};

function toMatrixGroups(
  options: Array<{
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    values: Array<{
      id: string;
      label: string;
      valueCode: string | null;
      sortOrder: number;
    }>;
  }>,
): MatrixOptionGroup[] {
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    slug: option.slug,
    sortOrder: option.sortOrder,
    values: option.values.map((value) => ({
      id: value.id,
      label: value.label,
      valueCode: value.valueCode,
      sortOrder: value.sortOrder,
    })),
  }));
}

async function loadMatrixContext(productId: string, db: DbClient = prisma) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      productCode: true,
      options: {
        orderBy: { sortOrder: "asc" },
        include: {
          values: { orderBy: { sortOrder: "asc" } },
        },
      },
      variants: {
        include: {
          optionValues: { select: { optionValueId: true } },
        },
      },
    },
  });

  if (!product?.productCode) {
    throw new ProductAdminValidationError(
      "Không thể tạo SKU tự động vì sản phẩm hoặc danh mục thiếu mã.",
      { productCode: "Thiếu mã sản phẩm." },
    );
  }

  return product;
}

function validateMatrixGroupsForGeneration(groups: MatrixOptionGroup[]): {
  ok: boolean;
  message?: string;
} {
  const activeGroups = groups.filter((group) => group.values.length > 0);
  if (countActiveMatrixOptionGroups(groups) < VARIANT_MATRIX_MIN_OPTION_GROUPS) {
    return {
      ok: false,
      message: "Vui lòng thêm ít nhất 2 nhóm tuỳ chọn và giá trị trước khi tạo tổ hợp.",
    };
  }

  const emptyGroup = groups.find((group) => group.name.trim() && group.values.length === 0);
  if (emptyGroup) {
    return {
      ok: false,
      message: `Nhóm tuỳ chọn "${emptyGroup.name.trim()}" chưa có giá trị.`,
    };
  }

  if (!activeGroups.length) {
    return {
      ok: false,
      message: "Vui lòng thêm ít nhất 2 nhóm tuỳ chọn và giá trị trước khi tạo tổ hợp.",
    };
  }

  return { ok: true };
}

function throwMatrixCombinationError(
  combo: Pick<MatrixCombination, "displayLabel">,
  message: string,
): never {
  throw new ProductAdminValidationError(
    `Không thể tạo tổ hợp "${combo.displayLabel}": ${message}`,
    { variants: `Tổ hợp "${combo.displayLabel}": ${message}` },
  );
}

export const MATRIX_OPTION_VALUE_OWNERSHIP_ERROR =
  "Giá trị tuỳ chọn không tồn tại hoặc không thuộc sản phẩm này. Vui lòng lưu sản phẩm rồi thử lại.";

/** Maps Prisma/runtime create failures to actionable Vietnamese messages. Exported for tests. */
export function mapMatrixCombinationCreateError(
  error: unknown,
  combo: Pick<MatrixCombination, "displayLabel" | "valueIds">,
  sku: string,
): string {
  if (error instanceof ProductAdminValidationError) {
    throw error;
  }

  const prismaCode =
    error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;

  console.error("[variant-matrix] create combination failed", {
    displayLabel: combo.displayLabel,
    optionValueIds: combo.valueIds,
    sku,
    prismaCode,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  if (isSkuUniqueConstraintError(error)) {
    return `SKU "${sku}" đã tồn tại.`;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return MATRIX_OPTION_VALUE_OWNERSHIP_ERROR;
    }
    if (error.code === "P2025") {
      return MATRIX_OPTION_VALUE_OWNERSHIP_ERROR;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return MATRIX_OPTION_VALUE_OWNERSHIP_ERROR;
  }

  return MATRIX_OPTION_VALUE_OWNERSHIP_ERROR;
}

export function isSkuUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.some((item) => String(item).toLowerCase().includes("sku"));
  }
  if (typeof target === "string") {
    return target.toLowerCase().includes("sku");
  }
  // Unique constraint failures without a clear target are treated as SKU conflicts —
  // ProductVariant.sku is the only global unique business key written in this path.
  return true;
}

async function assertMatrixCombinationReady(
  db: DbClient,
  productId: string,
  groups: MatrixOptionGroup[],
  combo: MatrixCombination,
): Promise<void> {
  const coverageError = validateMatrixCombinationForGeneration(groups, combo.valueIds);
  if (coverageError) {
    throwMatrixCombinationError(combo, coverageError);
  }

  try {
    await assertOptionValueIdsBelongToProduct(db, productId, combo.valueIds);
  } catch {
    throwMatrixCombinationError(combo, MATRIX_OPTION_VALUE_OWNERSHIP_ERROR);
  }
}

export async function previewVariantMatrixGeneration(
  productId: string,
): Promise<VariantMatrixPreview> {
  const product = await loadMatrixContext(productId);
  const groups = toMatrixGroups(product.options);
  const theoreticalCount = computeTheoreticalCombinationCount(groups);
  const previewText = buildCombinationPreviewText(groups);
  const validation = validateMatrixGroupsForGeneration(groups);

  if (!validation.ok) {
    return {
      previewText,
      theoreticalCount: 0,
      existingCount: 0,
      missingCount: 0,
      requiresConfirmation: false,
      requiresWarning: false,
      canGenerate: false,
      message: validation.message,
    };
  }

  const allCombinations = buildCartesianCombinations(groups);
  const existingSignatures = new Set(
    product.variants
      .filter((variant) => variant.optionValues.length > 0)
      .map((variant) =>
        combinationSignature(variant.optionValues.map((link) => link.optionValueId)),
      ),
  );

  const missingCount = allCombinations.filter(
    (combo) => !existingSignatures.has(combo.signature),
  ).length;

  return {
    previewText,
    theoreticalCount,
    existingCount: existingSignatures.size,
    missingCount,
    requiresWarning: theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD,
    requiresConfirmation: missingCount >= VARIANT_MATRIX_CONFIRM_THRESHOLD,
    canGenerate: missingCount > 0,
    message:
      missingCount === 0
        ? "Tất cả tổ hợp biến thể đã tồn tại."
        : undefined,
  };
}

export async function generateVariantMatrix(
  productId: string,
  input: { confirmLarge?: boolean } = {},
): Promise<VariantMatrixGenerationResult> {
  const preview = await previewVariantMatrixGeneration(productId);
  if (!preview.canGenerate) {
    throw new ProductAdminValidationError(
      preview.message ?? "Không thể tạo biến thể từ tổ hợp.",
      { variants: preview.message ?? "Không thể tạo biến thể." },
    );
  }

  if (preview.requiresConfirmation && !input.confirmLarge) {
    throw new ProductAdminValidationError(
      `Cần xác nhận vì sẽ tạo ${preview.missingCount} biến thể mới.`,
      { variants: "Vui lòng xác nhận tạo ma trận lớn." },
    );
  }

  // Preview gate stays outside the write transaction; execute reloads option IDs
  // inside the transaction so we never create links against stale/deleted values.
  const previewProduct = await loadMatrixContext(productId);
  const previewGroups = toMatrixGroups(previewProduct.options);
  const previewCombinations = buildCartesianCombinations(previewGroups);
  const previewExisting = new Set(
    previewProduct.variants
      .filter((variant) => variant.optionValues.length > 0)
      .map((variant) =>
        combinationSignature(variant.optionValues.map((link) => link.optionValueId)),
      ),
  );
  const previewMissing = previewCombinations.filter(
    (combo) => !previewExisting.has(combo.signature),
  );
  const productCode = previewProduct.productCode!.trim().toUpperCase();
  const plannedSkus = previewMissing.map((combo) => {
    const suffix = buildMatrixCombinationSkuSuffix(previewGroups, combo.valueIds);
    const baseSku = suffix
      ? `${productCode}-${suffix}`
      : generateSku({
          productCode,
          ...mapCombinationToLegacyFields(previewGroups, combo.valueIds),
        });
    return { displayLabel: combo.displayLabel, baseSku };
  });
  console.info("[variant-matrix] planned SKUs before create", {
    productId,
    productCode,
    count: plannedSkus.length,
    skus: plannedSkus.map((item) => item.baseSku),
  });

  const createdVariants: Array<{ id: string; sku: string; displayLabel: string | null }> = [];
  let skipped = 0;
  let initialExistingCount = 0;

  await prisma.$transaction(async (tx) => {
    const product = await loadMatrixContext(productId, tx);
    const groups = toMatrixGroups(product.options);
    const allCombinations = buildCartesianCombinations(groups);
    const existingSignatures = new Set(
      product.variants
        .filter((variant) => variant.optionValues.length > 0)
        .map((variant) =>
          combinationSignature(variant.optionValues.map((link) => link.optionValueId)),
        ),
    );
    initialExistingCount = existingSignatures.size;
    const missing = allCombinations.filter((combo) => !existingSignatures.has(combo.signature));
    skipped = allCombinations.length - missing.length;
    const txProductCode = product.productCode!.trim().toUpperCase();
    const reservedSkus = new Set(
      product.variants.map((variant) => variant.sku.trim().toUpperCase()).filter(Boolean),
    );

    for (const combo of missing) {
      if (existingSignatures.has(combo.signature)) {
        skipped += 1;
        continue;
      }

      await assertMatrixCombinationReady(tx, productId, groups, combo);

      const legacy = mapCombinationToLegacyFields(groups, combo.valueIds);
      let suffix = "";
      try {
        suffix = buildMatrixCombinationSkuSuffix(groups, combo.valueIds);
      } catch {
        throw new ProductAdminValidationError(
          `Không thể tạo SKU cho tổ hợp "${combo.displayLabel}". Kiểm tra mã giá trị thuộc tính.`,
          { variants: `Tổ hợp "${combo.displayLabel}": thiếu dữ liệu mã SKU.` },
        );
      }

      const baseSku = suffix
        ? `${txProductCode}-${suffix}`
        : generateSku({
            productCode: txProductCode,
            colorName: legacy.colorName,
            colorCode: legacy.colorCode,
            sizeName: legacy.sizeName,
            dimensions: legacy.dimensions,
            capacity: legacy.capacity,
          });

      if (!suffix && baseSku.trim().toUpperCase() === txProductCode) {
        throw new ProductAdminValidationError(
          "Không thể tạo SKU tự động vì sản phẩm hoặc danh mục thiếu mã.",
          {
            variants: `Tổ hợp "${combo.displayLabel}": thiếu dữ liệu mã SKU cho nhóm tuỳ chọn.`,
          },
        );
      }

      if (!baseSku.trim()) {
        throw new ProductAdminValidationError(
          `Không thể tạo SKU cho tổ hợp "${combo.displayLabel}". Kiểm tra mã giá trị thuộc tính.`,
          { variants: `Tổ hợp "${combo.displayLabel}": thiếu dữ liệu mã SKU.` },
        );
      }

      let sku: string;
      try {
        sku = await ensureUniqueSku(baseSku, tx, reservedSkus);
      } catch (error) {
        const detail =
          error instanceof ProductSkuError
            ? error.message
            : `Tổ hợp "${combo.displayLabel}": xung đột mã SKU.`;
        throw new ProductAdminValidationError(
          `Không thể tạo SKU duy nhất cho tổ hợp "${combo.displayLabel}".`,
          {
            variants: detail.startsWith("Tổ hợp")
              ? detail
              : `Tổ hợp "${combo.displayLabel}": xung đột mã SKU.`,
          },
        );
      }

      const stock = normalizeVariantStockFields(0);
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          const variant = await tx.productVariant.create({
            data: {
              productId,
              sku,
              displayLabel: combo.displayLabel,
              colorName: legacy.colorName ?? null,
              colorCode: legacy.colorCode ?? null,
              sizeName: legacy.sizeName ?? null,
              dimensions: legacy.dimensions ?? null,
              capacity: legacy.capacity ?? null,
              stockQty: stock.stockQty,
              stockStatus: stock.stockStatus,
              variantStatus: "ACTIVE" satisfies VariantStatus,
            },
          });

          await tx.productVariantOptionValue.createMany({
            data: combo.valueIds.map((optionValueId) => ({
              variantId: variant.id,
              optionValueId,
            })),
          });

          createdVariants.push({
            id: variant.id,
            sku: variant.sku,
            displayLabel: variant.displayLabel,
          });
          existingSignatures.add(combo.signature);
          created = true;
        } catch (error) {
          if (isSkuUniqueConstraintError(error) && attempt < 4) {
            reservedSkus.add(sku.trim().toUpperCase());
            try {
              sku = await ensureUniqueSku(baseSku, tx, reservedSkus);
              continue;
            } catch {
              throwMatrixCombinationError(combo, `xung đột mã SKU.`);
            }
          }
          const message = mapMatrixCombinationCreateError(error, combo, sku);
          throwMatrixCombinationError(combo, message);
        }
      }

      if (!created) {
        throwMatrixCombinationError(combo, "xung đột mã SKU.");
      }
    }
  });

  if (createdVariants.length === 0 && skipped > 0) {
    throw new ProductAdminValidationError("Tất cả tổ hợp biến thể đã tồn tại.", {
      variants: "Tất cả tổ hợp biến thể đã tồn tại.",
    });
  }

  return {
    created: createdVariants.length,
    skipped,
    preserved: initialExistingCount,
    variants: createdVariants,
  };
}

export async function countVariantsUsingOptionValue(
  optionValueId: string,
  db: DbClient = prisma,
): Promise<number> {
  return db.productVariantOptionValue.count({ where: { optionValueId } });
}

export async function countVariantsUsingOption(
  optionId: string,
  db: DbClient = prisma,
): Promise<number> {
  const valueIds = await db.productOptionValue.findMany({
    where: { optionId },
    select: { id: true },
  });
  if (!valueIds.length) return 0;
  return db.productVariantOptionValue.count({
    where: { optionValueId: { in: valueIds.map((value) => value.id) } },
  });
}
