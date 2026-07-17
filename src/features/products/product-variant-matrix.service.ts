import type { VariantStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { normalizeVariantStockFields } from "@/features/products/product-foundation-validation";
import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/features/products/product-relation-ownership";
import { assertOptionValueIdsBelongToProduct } from "@/features/products/product-relation-ownership";
import {
  isPrismaTransactionTimeoutError,
  ProductAdminValidationError,
} from "@/features/products/product-admin-input";
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

/** Interactive txn must cover many sequential creates on remote DBs (default 5s is too low). */
const MATRIX_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 60_000,
} as const;

export type VariantMatrixPreview = {
  previewText: string;
  theoreticalCount: number;
  existingCount: number;
  missingCount: number;
  missingCombinations: Array<{ displayLabel: string; signature: string }>;
  optionValueCount: number;
  requiresConfirmation: boolean;
  requiresWarning: boolean;
  canGenerate: boolean;
  message?: string;
};

const PREVIEW_LIST_LIMIT = 24;

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

export const MATRIX_SKU_CONFLICT_RETRY_MESSAGE = (sku: string) =>
  `SKU "${sku}" đã tồn tại. Hệ thống sẽ thử tạo mã khác.`;

export const MATRIX_FK_LINK_ERROR =
  "Không thể liên kết giá trị tuỳ chọn với biến thể. Vui lòng lưu sản phẩm rồi thử lại.";

export const MATRIX_MISSING_RECORD_ERROR =
  "Không tìm thấy dữ liệu tuỳ chọn cần tạo biến thể. Vui lòng tải lại trang rồi thử lại.";

export const MATRIX_VALIDATION_CREATE_ERROR =
  "Dữ liệu tạo biến thể chưa hợp lệ. Vui lòng tải lại trang và thử lại.";

export const MATRIX_UNKNOWN_CREATE_DIAGNOSTIC = "MATRIX_UNKNOWN_CREATE_ERROR";

export const MATRIX_UNKNOWN_CREATE_ERROR =
  `Không thể tạo biến thể do lỗi hệ thống. Mã lỗi: ${MATRIX_UNKNOWN_CREATE_DIAGNOSTIC}.`;

export const MATRIX_TRANSACTION_TIMEOUT_ERROR =
  "Không thể tạo tổ hợp biến thể vì thao tác quá lâu. Không có biến thể nào được tạo. Vui lòng thử lại.";

export const MATRIX_TX_SERIALIZATION_ERROR =
  "Không thể tạo biến thể do xung đột giao dịch. Vui lòng thử lại.";

type MatrixCreateLogContext = {
  productId?: string;
  createPayload?: Record<string, unknown>;
};

function getPrismaErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function getPrismaErrorMeta(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;
  return (error as { meta?: unknown }).meta;
}

function isPrismaValidationError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientValidationError ||
    (error instanceof Error && error.name === "PrismaClientValidationError")
  );
}

function logMatrixCombinationCreateFailure(
  error: unknown,
  combo: Pick<MatrixCombination, "displayLabel" | "valueIds">,
  sku: string,
  context: MatrixCreateLogContext = {},
): void {
  const prismaCode = getPrismaErrorCode(error);
  console.error("[variant-matrix] create combination failed", {
    productId: context.productId,
    displayLabel: combo.displayLabel,
    optionValueIds: combo.valueIds,
    sku,
    createPayload: context.createPayload,
    prismaCode,
    prismaMeta: getPrismaErrorMeta(error),
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    diagnosticCode: MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
  });
}

/** Maps Prisma/runtime create failures to distinct actionable Vietnamese messages. Exported for tests. */
export function mapMatrixCombinationCreateError(
  error: unknown,
  combo: Pick<MatrixCombination, "displayLabel" | "valueIds">,
  sku: string,
  context: MatrixCreateLogContext = {},
): string {
  if (error instanceof ProductAdminValidationError) {
    throw error;
  }

  logMatrixCombinationCreateFailure(error, combo, sku, context);

  if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
    return MATRIX_TRANSACTION_TIMEOUT_ERROR;
  }

  if (isSkuUniqueConstraintError(error)) {
    return MATRIX_SKU_CONFLICT_RETRY_MESSAGE(sku);
  }

  const prismaCode = getPrismaErrorCode(error);
  if (prismaCode === "P2003") {
    return MATRIX_FK_LINK_ERROR;
  }
  if (prismaCode === "P2025") {
    return MATRIX_MISSING_RECORD_ERROR;
  }
  if (prismaCode === "P2034") {
    return MATRIX_TX_SERIALIZATION_ERROR;
  }

  if (isPrismaValidationError(error)) {
    return MATRIX_VALIDATION_CREATE_ERROR;
  }

  return MATRIX_UNKNOWN_CREATE_ERROR;
}

export function isSkuUniqueConstraintError(error: unknown): boolean {
  if (getPrismaErrorCode(error) !== "P2002") {
    return false;
  }
  const meta = getPrismaErrorMeta(error);
  const target =
    meta && typeof meta === "object" && meta !== null && "target" in meta
      ? (meta as { target?: unknown }).target
      : undefined;
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

type PlannedMatrixCombination = {
  combo: MatrixCombination;
  baseSku: string;
  legacy: ReturnType<typeof mapCombinationToLegacyFields>;
};

function planMatrixCombinationSku(
  productCode: string,
  groups: MatrixOptionGroup[],
  combo: MatrixCombination,
): PlannedMatrixCombination {
  const coverageError = validateMatrixCombinationForGeneration(groups, combo.valueIds);
  if (coverageError) {
    throwMatrixCombinationError(combo, coverageError);
  }

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
    ? `${productCode}-${suffix}`
    : generateSku({
        productCode,
        colorName: legacy.colorName,
        colorCode: legacy.colorCode,
        sizeName: legacy.sizeName,
        dimensions: legacy.dimensions,
        capacity: legacy.capacity,
      });

  if (!suffix && baseSku.trim().toUpperCase() === productCode) {
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

  return { combo, baseSku, legacy };
}

/**
 * Validates every planned combination (SKU + option ownership) before any writes.
 * Failures throw ProductAdminValidationError so execute never partially creates.
 */
export async function dryRunVariantMatrixCombinations(
  productId: string,
  groups: MatrixOptionGroup[],
  missing: MatrixCombination[],
  productCode: string,
  db: DbClient = prisma,
): Promise<PlannedMatrixCombination[]> {
  const planned: PlannedMatrixCombination[] = [];
  const allValueIds = [...new Set(missing.flatMap((combo) => combo.valueIds))];
  try {
    await assertOptionValueIdsBelongToProduct(db, productId, allValueIds);
  } catch {
    throw new ProductAdminValidationError(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, {
      variants: MATRIX_OPTION_VALUE_OWNERSHIP_ERROR,
    });
  }

  for (const combo of missing) {
    planned.push(planMatrixCombinationSku(productCode, groups, combo));
  }
  return planned;
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

  const optionValueCount = groups.reduce((total, group) => total + group.values.length, 0);

  if (!validation.ok) {
    return {
      previewText,
      theoreticalCount: 0,
      existingCount: 0,
      missingCount: 0,
      missingCombinations: [],
      optionValueCount,
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

  const missing = allCombinations.filter(
    (combo) => !existingSignatures.has(combo.signature),
  );
  const missingCount = missing.length;

  return {
    previewText,
    theoreticalCount,
    existingCount: existingSignatures.size,
    missingCount,
    missingCombinations: missing.slice(0, PREVIEW_LIST_LIMIT).map((combo) => ({
      displayLabel: combo.displayLabel,
      signature: combo.signature,
    })),
    optionValueCount,
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

  // Dry-run all planned combinations before any writes — fail closed on first invalid combo.
  const dryRunPlan = await dryRunVariantMatrixCombinations(
    productId,
    previewGroups,
    previewMissing,
    productCode,
  );
  console.info("[variant-matrix] planned SKUs before create", {
    productId,
    productCode,
    count: dryRunPlan.length,
    skus: dryRunPlan.map((item) => item.baseSku),
  });

  const createdVariants: Array<{ id: string; sku: string; displayLabel: string | null }> = [];
  let skipped = 0;
  let initialExistingCount = 0;

  try {
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

      // Re-validate inside the transaction against the latest option IDs.
      const planned = await dryRunVariantMatrixCombinations(
        productId,
        groups,
        missing,
        txProductCode,
        tx,
      );

      for (const plan of planned) {
        const { combo, baseSku, legacy } = plan;
        if (existingSignatures.has(combo.signature)) {
          skipped += 1;
          continue;
        }

        await assertMatrixCombinationReady(tx, productId, groups, combo);

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
          const createPayload = {
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
            optionValueIds: combo.valueIds,
          };
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
                optionValues: {
                  create: combo.valueIds.map((optionValueId) => ({ optionValueId })),
                },
              },
            });

            createdVariants.push({
              id: variant.id,
              sku: variant.sku,
              displayLabel: variant.displayLabel,
            });
            existingSignatures.add(combo.signature);
            created = true;
          } catch (error) {
            if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
              logMatrixCombinationCreateFailure(error, combo, sku, {
                productId,
                createPayload,
              });
              throw new ProductAdminValidationError(MATRIX_TRANSACTION_TIMEOUT_ERROR, {
                variants: MATRIX_TRANSACTION_TIMEOUT_ERROR,
              });
            }
            if (isSkuUniqueConstraintError(error) && attempt < 4) {
              reservedSkus.add(sku.trim().toUpperCase());
              try {
                sku = await ensureUniqueSku(baseSku, tx, reservedSkus);
                continue;
              } catch {
                throwMatrixCombinationError(combo, `xung đột mã SKU.`);
              }
            }
            const message = mapMatrixCombinationCreateError(error, combo, sku, {
              productId,
              createPayload,
            });
            throwMatrixCombinationError(combo, message);
          }
        }

        if (!created) {
          throwMatrixCombinationError(combo, "xung đột mã SKU.");
        }
      }
    }, MATRIX_TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof ProductAdminValidationError) {
      throw error;
    }
    if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
      console.error("[variant-matrix] transaction timeout", {
        productId,
        plannedCount: dryRunPlan.length,
        errorMessage: error instanceof Error ? error.message : String(error),
        diagnosticCode: MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
      });
      throw new ProductAdminValidationError(MATRIX_TRANSACTION_TIMEOUT_ERROR, {
        variants: MATRIX_TRANSACTION_TIMEOUT_ERROR,
      });
    }
    console.error("[variant-matrix] generate failed", {
      productId,
      plannedCount: dryRunPlan.length,
      prismaCode: getPrismaErrorCode(error),
      prismaMeta: getPrismaErrorMeta(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      diagnosticCode: MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
    });
    throw error;
  }

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
