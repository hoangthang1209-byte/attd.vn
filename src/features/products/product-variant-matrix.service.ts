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
import { generateSku, ProductSkuError } from "@/features/products/product-sku-utils";
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

/** Chunked writes keep each interactive txn short on remote DBs. */
const MATRIX_CHUNK_SIZE = 40;
const MATRIX_CHUNK_TRANSACTION_OPTIONS = {
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

/** Timeout / long-running failure — do not claim zero created; client must refetch. */
export const MATRIX_TRANSACTION_TIMEOUT_ERROR =
  "Thao tác tạo biến thể mất nhiều thời gian hơn dự kiến. Hệ thống sẽ kiểm tra lại trạng thái biến thể.";

export const MATRIX_GENERATION_NEEDS_REFETCH = "MATRIX_GENERATION_NEEDS_REFETCH";

export const MATRIX_TX_SERIALIZATION_ERROR =
  "Không thể tạo biến thể do xung đột giao dịch. Vui lòng thử lại.";

export const MATRIX_ZERO_CREATED_AFTER_CHECK =
  "Chưa có biến thể mới được tạo. Vui lòng thử lại hoặc giảm số lượng tổ hợp.";

export const MATRIX_PARTIAL_CREATED_AFTER_CHECK =
  "Một số biến thể đã được tạo. Đã cập nhật lại ma trận.";

export const MATRIX_ALL_CREATED_AFTER_CHECK =
  "Biến thể đã được tạo thành công. Đã cập nhật lại ma trận.";

export const MATRIX_STATUS_UNKNOWN_AFTER_ERROR =
  "Chưa xác định được trạng thái tạo biến thể. Vui lòng tải lại trang để kiểm tra.";

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

/** @deprecated Kept for focused ownership checks in tests; generation uses bulk dry-run. */
export async function assertMatrixCombinationReadyForTests(
  db: DbClient,
  productId: string,
  groups: MatrixOptionGroup[],
  combo: MatrixCombination,
): Promise<void> {
  return assertMatrixCombinationReady(db, productId, groups, combo);
}

/** Resolve SKU uniqueness in memory against a prefetched reserved set (no per-variant DB lookup). */
export function allocateUniqueSkuInMemory(baseSku: string, reservedSkus: Set<string>): string {
  const normalizedBase = baseSku.trim().toUpperCase();
  if (!normalizedBase) {
    throw new ProductSkuError("Không thể tạo SKU duy nhất vì mã gốc trống.");
  }

  const tryCandidate = (candidate: string): string | null => {
    const key = candidate.trim().toUpperCase();
    if (reservedSkus.has(key)) return null;
    reservedSkus.add(key);
    return key;
  };

  const first = tryCandidate(normalizedBase);
  if (first) return first;

  for (let i = 2; i <= 99; i++) {
    const next = tryCandidate(`${normalizedBase}-${i}`);
    if (next) return next;
  }

  for (let i = 0; i < 20; i++) {
    const next = tryCandidate(
      `${normalizedBase}-${Date.now().toString(36).toUpperCase()}${i || ""}`,
    );
    if (next) return next;
  }

  throw new ProductSkuError(`Không thể tạo SKU duy nhất cho mã gốc "${normalizedBase}".`);
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function throwMatrixTimeoutNeedsRefetch(): never {
  throw new ProductAdminValidationError(MATRIX_TRANSACTION_TIMEOUT_ERROR, {
    variants: MATRIX_TRANSACTION_TIMEOUT_ERROR,
    matrixNeedsRefetch: MATRIX_GENERATION_NEEDS_REFETCH,
  });
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

type PreparedMatrixRow = PlannedMatrixCombination & { sku: string };

async function createMatrixChunk(
  productId: string,
  chunk: PreparedMatrixRow[],
): Promise<Array<{ id: string; sku: string; displayLabel: string | null }>> {
  if (chunk.length === 0) return [];

  return prisma.$transaction(async (tx) => {
    const product = await loadMatrixContext(productId, tx);
    const existingSignatures = new Set(
      product.variants
        .filter((variant) => variant.optionValues.length > 0)
        .map((variant) =>
          combinationSignature(variant.optionValues.map((link) => link.optionValueId)),
        ),
    );

    const stillMissing = chunk.filter((row) => !existingSignatures.has(row.combo.signature));
    if (stillMissing.length === 0) return [];

    // Ownership already validated in dry-run; re-check once per chunk for safety.
    const allValueIds = [...new Set(stillMissing.flatMap((row) => row.combo.valueIds))];
    try {
      await assertOptionValueIdsBelongToProduct(tx, productId, allValueIds);
    } catch {
      throw new ProductAdminValidationError(MATRIX_OPTION_VALUE_OWNERSHIP_ERROR, {
        variants: MATRIX_OPTION_VALUE_OWNERSHIP_ERROR,
      });
    }

    const stock = normalizeVariantStockFields(0);
    const variantRows = stillMissing.map((row) => ({
      productId,
      sku: row.sku,
      displayLabel: row.combo.displayLabel,
      colorName: row.legacy.colorName ?? null,
      colorCode: row.legacy.colorCode ?? null,
      sizeName: row.legacy.sizeName ?? null,
      dimensions: row.legacy.dimensions ?? null,
      capacity: row.legacy.capacity ?? null,
      stockQty: stock.stockQty,
      stockStatus: stock.stockStatus,
      variantStatus: "ACTIVE" as VariantStatus,
    }));

    try {
      await tx.productVariant.createMany({
        data: variantRows,
        skipDuplicates: true,
      });
    } catch (error) {
      if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
        throwMatrixTimeoutNeedsRefetch();
      }
      const first = stillMissing[0]!;
      const message = mapMatrixCombinationCreateError(error, first.combo, first.sku, {
        productId,
      });
      throwMatrixCombinationError(first.combo, message);
    }

    const skus = stillMissing.map((row) => row.sku);
    const createdVariants = await tx.productVariant.findMany({
      where: { productId, sku: { in: skus } },
      select: {
        id: true,
        sku: true,
        displayLabel: true,
        optionValues: { select: { optionValueId: true } },
      },
    });

    const skuToValueIds = new Map(
      stillMissing.map((row) => [row.sku.toUpperCase(), row.combo.valueIds] as const),
    );

    const linkRows: Array<{ variantId: string; optionValueId: string }> = [];
    for (const variant of createdVariants) {
      if (variant.optionValues.length > 0) continue;
      const valueIds = skuToValueIds.get(variant.sku.toUpperCase()) ?? [];
      for (const optionValueId of valueIds) {
        linkRows.push({ variantId: variant.id, optionValueId });
      }
    }

    if (linkRows.length > 0) {
      try {
        await tx.productVariantOptionValue.createMany({
          data: linkRows,
          skipDuplicates: true,
        });
      } catch (error) {
        if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
          throwMatrixTimeoutNeedsRefetch();
        }
        const first = stillMissing[0]!;
        const message = mapMatrixCombinationCreateError(error, first.combo, first.sku, {
          productId,
        });
        throwMatrixCombinationError(first.combo, message);
      }
    }

    // Return prepared rows that now exist as structured variants (including recovered orphans).
    return stillMissing
      .map((row) => {
        const variant = createdVariants.find(
          (item) => item.sku.trim().toUpperCase() === row.sku.toUpperCase(),
        );
        if (!variant) return null;
        return {
          id: variant.id,
          sku: variant.sku,
          displayLabel: variant.displayLabel,
        };
      })
      .filter((row): row is { id: string; sku: string; displayLabel: string | null } => Boolean(row));
  }, MATRIX_CHUNK_TRANSACTION_OPTIONS);
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
  const initialExistingCount = previewExisting.size;
  const skippedBaseline = previewCombinations.length - previewMissing.length;

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

  // Prefetch SKUs once for this product prefix — resolve collisions in memory.
  const existingSkuRows = await prisma.productVariant.findMany({
    where: {
      OR: [
        { productId },
        { sku: { startsWith: `${productCode}-` } },
        { sku: { in: dryRunPlan.map((item) => item.baseSku) } },
      ],
    },
    select: { sku: true },
  });
  const reservedSkus = new Set(
    existingSkuRows.map((row) => row.sku.trim().toUpperCase()).filter(Boolean),
  );

  const prepared: PreparedMatrixRow[] = dryRunPlan.map((plan) => {
    try {
      return {
        ...plan,
        sku: allocateUniqueSkuInMemory(plan.baseSku, reservedSkus),
      };
    } catch (error) {
      const detail =
        error instanceof ProductSkuError
          ? error.message
          : `Tổ hợp "${plan.combo.displayLabel}": xung đột mã SKU.`;
      throw new ProductAdminValidationError(
        `Không thể tạo SKU duy nhất cho tổ hợp "${plan.combo.displayLabel}".`,
        {
          variants: detail.startsWith("Tổ hợp")
            ? detail
            : `Tổ hợp "${plan.combo.displayLabel}": xung đột mã SKU.`,
        },
      );
    }
  });

  const createdVariants: Array<{ id: string; sku: string; displayLabel: string | null }> = [];
  const chunks = chunkArray(prepared, MATRIX_CHUNK_SIZE);

  try {
    for (const chunk of chunks) {
      const created = await createMatrixChunk(productId, chunk);
      createdVariants.push(...created);
    }
  } catch (error) {
    if (error instanceof ProductAdminValidationError) {
      // Timeout / needs-refetch already set fieldErrors.matrixNeedsRefetch.
      if (
        error.fieldErrors.matrixNeedsRefetch === MATRIX_GENERATION_NEEDS_REFETCH ||
        error.message === MATRIX_TRANSACTION_TIMEOUT_ERROR
      ) {
        throw error;
      }
      throw error;
    }
    if (isPrismaTransactionTimeoutError(error) || getPrismaErrorCode(error) === "P2028") {
      console.error("[variant-matrix] transaction timeout", {
        productId,
        plannedCount: dryRunPlan.length,
        createdBeforeTimeout: createdVariants.length,
        errorMessage: error instanceof Error ? error.message : String(error),
        diagnosticCode: MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
      });
      throwMatrixTimeoutNeedsRefetch();
    }
    console.error("[variant-matrix] generate failed", {
      productId,
      plannedCount: dryRunPlan.length,
      createdBeforeFailure: createdVariants.length,
      prismaCode: getPrismaErrorCode(error),
      prismaMeta: getPrismaErrorMeta(error),
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      diagnosticCode: MATRIX_UNKNOWN_CREATE_DIAGNOSTIC,
    });
    throw error;
  }

  if (createdVariants.length === 0 && dryRunPlan.length === 0 && skippedBaseline > 0) {
    throw new ProductAdminValidationError("Tất cả tổ hợp biến thể đã tồn tại.", {
      variants: "Tất cả tổ hợp biến thể đã tồn tại.",
    });
  }

  return {
    created: createdVariants.length,
    skipped: skippedBaseline,
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
