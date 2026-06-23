import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  combinationSignature,
  computeTheoreticalCombinationCount,
  VARIANT_MATRIX_CONFIRM_THRESHOLD,
  VARIANT_MATRIX_WARN_THRESHOLD,
  type MatrixOptionGroup,
} from "@/features/products/product-variant-matrix.utils";

export type FormMatrixPreview = {
  previewText: string;
  theoreticalCount: number;
  existingCount: number;
  missingCount: number;
  missingCombinations: Array<{ displayLabel: string; signature: string }>;
  requiresWarning: boolean;
  requiresConfirmation: boolean;
  canGenerate: boolean;
  message?: string;
};

const PREVIEW_LIST_LIMIT = 24;

export function computeFormMatrixPreview(
  groups: MatrixOptionGroup[],
  structuredVariants: Array<{ optionValueIds: string[] }>,
): FormMatrixPreview {
  const previewText = buildCombinationPreviewText(groups);
  const theoreticalCount = computeTheoreticalCombinationCount(groups);

  if (!groups.length || groups.every((group) => group.values.length === 0)) {
    return {
      previewText,
      theoreticalCount: 0,
      existingCount: 0,
      missingCount: 0,
      missingCombinations: [],
      requiresWarning: false,
      requiresConfirmation: false,
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
      missingCombinations: [],
      requiresWarning: theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD,
      requiresConfirmation: false,
      canGenerate: false,
      message: "Mỗi nhóm biến thể cần ít nhất một giá trị để tạo tổ hợp.",
    };
  }

  const allCombinations = buildCartesianCombinations(groups);
  const existingSignatures = new Set(
    structuredVariants
      .filter((variant) => variant.optionValueIds.length > 0)
      .map((variant) => combinationSignature(variant.optionValueIds)),
  );

  const missing = allCombinations.filter((combo) => !existingSignatures.has(combo.signature));

  return {
    previewText,
    theoreticalCount,
    existingCount: existingSignatures.size,
    missingCount: missing.length,
    missingCombinations: missing.slice(0, PREVIEW_LIST_LIMIT).map((combo) => ({
      displayLabel: combo.displayLabel,
      signature: combo.signature,
    })),
    requiresWarning: theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD,
    requiresConfirmation: missing.length >= VARIANT_MATRIX_CONFIRM_THRESHOLD,
    canGenerate: missing.length > 0,
    message:
      missing.length === 0
        ? "Tất cả tổ hợp hiện có đã được tạo. Không có biến thể mới để thêm."
        : undefined,
  };
}
