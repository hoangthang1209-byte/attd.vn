import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  combinationSignature,
  computeTheoreticalCombinationCount,
  countActiveMatrixOptionGroups,
  VARIANT_MATRIX_CONFIRM_THRESHOLD,
  VARIANT_MATRIX_MIN_OPTION_GROUPS,
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

export function formatVariantMatrixGenerationMessage(created: number, skipped: number): string {
  if (created === 0 && skipped > 0) {
    return "Tất cả tổ hợp biến thể đã tồn tại.";
  }
  if (created > 0 && skipped > 0) {
    return `Đã tạo ${created} biến thể mới, bỏ qua ${skipped} biến thể đã có.`;
  }
  if (created > 0) {
    return `Đã tạo ${created} biến thể mới.`;
  }
  return "Không có tổ hợp mới để tạo.";
}

export function computeFormMatrixPreview(
  groups: MatrixOptionGroup[],
  structuredVariants: Array<{ optionValueIds: string[] }>,
): FormMatrixPreview {
  const previewText = buildCombinationPreviewText(groups);
  const theoreticalCount = computeTheoreticalCombinationCount(groups);
  const activeGroupCount = countActiveMatrixOptionGroups(groups);

  if (activeGroupCount < VARIANT_MATRIX_MIN_OPTION_GROUPS) {
    return {
      previewText,
      theoreticalCount: 0,
      existingCount: 0,
      missingCount: 0,
      missingCombinations: [],
      requiresWarning: false,
      requiresConfirmation: false,
      canGenerate: false,
      message: "Vui lòng thêm ít nhất 2 nhóm tuỳ chọn và giá trị trước khi tạo tổ hợp.",
    };
  }

  const emptyGroup = groups.find((group) => group.name.trim() && group.values.length === 0);
  if (emptyGroup) {
    return {
      previewText,
      theoreticalCount,
      existingCount: 0,
      missingCount: 0,
      missingCombinations: [],
      requiresWarning: theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD,
      requiresConfirmation: false,
      canGenerate: false,
      message: `Nhóm tuỳ chọn "${emptyGroup.name.trim()}" chưa có giá trị.`,
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
        ? "Tất cả tổ hợp biến thể đã tồn tại."
        : undefined,
  };
}
