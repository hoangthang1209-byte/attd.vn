import type { VariantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/features/products/product-relation-ownership";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import { generateSku, ensureUniqueSku } from "@/features/products/product-sku-utils";
import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  combinationSignature,
  computeTheoreticalCombinationCount,
  mapCombinationToLegacyFields,
  VARIANT_MATRIX_CONFIRM_THRESHOLD,
  VARIANT_MATRIX_WARN_THRESHOLD,
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

async function loadMatrixContext(productId: string) {
  const product = await prisma.product.findUnique({
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
      "Không thể tạo biến thể vì sản phẩm chưa có mã sản phẩm.",
      { productCode: "Thiếu mã sản phẩm." },
    );
  }

  return product;
}

export async function previewVariantMatrixGeneration(
  productId: string,
): Promise<VariantMatrixPreview> {
  const product = await loadMatrixContext(productId);
  const groups = toMatrixGroups(product.options);
  const theoreticalCount = computeTheoreticalCombinationCount(groups);
  const previewText = buildCombinationPreviewText(groups);

  if (!groups.length || groups.every((group) => group.values.length === 0)) {
    return {
      previewText,
      theoreticalCount: 0,
      existingCount: 0,
      missingCount: 0,
      requiresConfirmation: false,
      requiresWarning: false,
      canGenerate: false,
      message: "Thêm ít nhất một nhóm biến thể và giá trị trước khi tạo tổ hợp.",
    };
  }

  if (groups.some((group) => group.values.length === 0)) {
    return {
      previewText,
      theoreticalCount,
      existingCount: 0,
      missingCount: 0,
      requiresConfirmation: false,
      requiresWarning: false,
      canGenerate: false,
      message: "Mỗi nhóm biến thể cần ít nhất một giá trị để tạo tổ hợp.",
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
        ? "Tất cả tổ hợp hiện có đã được tạo. Không có biến thể mới để thêm."
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

  const product = await loadMatrixContext(productId);
  const groups = toMatrixGroups(product.options);
  const allCombinations = buildCartesianCombinations(groups);
  const existingSignatures = new Set(
    product.variants
      .filter((variant) => variant.optionValues.length > 0)
      .map((variant) =>
        combinationSignature(variant.optionValues.map((link) => link.optionValueId)),
      ),
  );

  const missing = allCombinations.filter((combo) => !existingSignatures.has(combo.signature));
  const createdVariants: Array<{ id: string; sku: string; displayLabel: string | null }> = [];

  await prisma.$transaction(async (tx) => {
    for (const combo of missing) {
      const legacy = mapCombinationToLegacyFields(groups, combo.valueIds);
      const baseSku = generateSku({
        productCode: product.productCode!,
        colorName: legacy.colorName,
        colorCode: legacy.colorCode,
        sizeName: legacy.sizeName,
        dimensions: legacy.dimensions,
        capacity: legacy.capacity,
      });

      if (!baseSku.trim()) {
        throw new ProductAdminValidationError(
          `Không thể tạo SKU cho tổ hợp "${combo.displayLabel}". Kiểm tra mã giá trị thuộc tính.`,
          { variants: `Tổ hợp "${combo.displayLabel}": thiếu dữ liệu mã SKU.` },
        );
      }

      let sku: string;
      try {
        sku = await ensureUniqueSku(baseSku, tx);
      } catch {
        throw new ProductAdminValidationError(
          `Không thể tạo SKU duy nhất cho tổ hợp "${combo.displayLabel}".`,
          { variants: `Tổ hợp "${combo.displayLabel}": xung đột mã SKU.` },
        );
      }

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
            stockQty: 0,
            stockStatus: "IN_STOCK",
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
      } catch (error) {
        const message =
          error instanceof Error && error.message.includes("Unique constraint")
            ? `SKU "${sku}" đã tồn tại.`
            : "Dữ liệu tổ hợp không hợp lệ.";
        throw new ProductAdminValidationError(
          `Không thể tạo tổ hợp "${combo.displayLabel}": ${message}`,
          { variants: `Tổ hợp "${combo.displayLabel}": ${message}` },
        );
      }
    }
  });

  return {
    created: createdVariants.length,
    skipped: allCombinations.length - missing.length,
    preserved: existingSignatures.size,
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
