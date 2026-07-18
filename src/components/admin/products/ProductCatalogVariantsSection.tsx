"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import ProductOptionGroupBuilder, {
  type OptionGroupFormRow,
  type SharedAttributePickerOption,
} from "@/components/admin/products/ProductOptionGroupBuilder";
import VariantLifecycleDialog, {
  type VariantLifecycleDialogState,
} from "@/components/admin/products/VariantLifecycleDialog";
import VariantBulkDialogs, {
  type BulkDialogKind,
} from "@/components/admin/products/VariantBulkDialogs";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { BulkVariantResult } from "@/features/products/product-variant-bulk.service";
import type { VariantDependencySummary } from "@/features/products/product-variant-lifecycle.service";
import {
  VARIANT_STATUS_OPTIONS,
  variantStatusBadgeClass,
  variantStatusLabel,
} from "@/features/products/product-variant-labels";
import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  combinationSignature,
  createClientKey,
  mapCombinationToLegacyFields,
} from "@/features/products/product-variant-matrix.utils";
import {
  applyBulkResultToVariants,
  type MatrixVariantFormRow,
} from "@/features/products/product-catalog-form-mappers";
import VariantMatrixConfirmDialog from "@/components/admin/products/VariantMatrixConfirmDialog";
import VariantMatrixView from "@/components/admin/products/VariantMatrixView";
import {
  buildVariantRowErrors,
  focusVariantField,
  variantFieldLabel,
} from "@/features/products/variant-field-errors";
import {
  computeFormMatrixPreview,
  formatVariantMatrixGenerationMessage,
  type FormMatrixPreview,
} from "@/features/products/product-variant-matrix-form-preview";
import {
  buildOptionsFingerprint,
  MATRIX_PREVIEW_STALE_ERROR,
  PRODUCT_SAVE_IN_PROGRESS_FOR_MATRIX_ERROR,
} from "@/features/products/product-option-persistence";

type ServerMatrixPreview = FormMatrixPreview & {
  optionValueCount?: number;
};

function renderVariantStatusOptions() {
  return VARIANT_STATUS_OPTIONS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ));
}

type Props = {
  productId?: string;
  productCode: string;
  defaultMoq: string;
  defaultLeadTime: string;
  optionGroups: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  sharedAttributes?: SharedAttributePickerOption[];
  sharedAttributesLoading?: boolean;
  sharedAttributesError?: string | null;
  onRefreshSharedAttributes?: () => void;
  fieldErrors?: Record<string, string>;
  onOptionGroupsChange: (groups: OptionGroupFormRow[]) => void;
  onVariantsChange: (variants: MatrixVariantFormRow[]) => void;
  onReloadProduct?: () => Promise<void | boolean>;
  /**
   * Persist option groups once before server preview.
   * Returns options fingerprint on success, null on failure.
   */
  onBeforeMatrixGenerate?: () => Promise<string | null>;
  /** True while sticky product save is in flight — block matrix. */
  productSaveInProgress?: boolean;
  onMatrixBusyChange?: (busy: boolean) => void;
  onSaveAndContinue?: () => Promise<boolean>;
  onVariantDeleted?: (variantId: string) => void;
  onBulkOperationChange?: (inProgress: boolean) => void;
};

export type ProductCatalogVariantsSectionHandle = {
  openMatrixConfirmation: () => void;
};

function defaultStructuredVariant(): MatrixVariantFormRow {
  return {
    clientKey: createClientKey("var"),
    variantKind: "structured",
    displayLabel: "",
    optionValueIds: [],
    colorName: "",
    colorCode: "",
    sizeName: "",
    dimensions: "",
    capacity: "",
    sku: "",
    variantStatus: "ACTIVE",
    stockQty: "0",
    stockStatus: "IN_STOCK",
    moqOverride: "",
    leadTimeOverride: "",
    materialOverride: "",
    wholesalePrice: "",
    dealerPrice: "",
    imageUrl: "",
    internalNote: "",
  };
}

function defaultLegacyVariant(): MatrixVariantFormRow {
  return {
    ...defaultStructuredVariant(),
    clientKey: createClientKey("legacy"),
    variantKind: "legacy",
  };
}

const EMPTY_LIFECYCLE_DIALOG: VariantLifecycleDialogState = {
  open: false,
  variantKey: "",
  displayLabel: "",
  sku: "",
  optionLabels: [],
  variantStatus: "ACTIVE",
  loading: false,
  submitting: false,
  error: null,
  canHardDelete: true,
  dependencyMessage: null,
  dependencies: null,
};

export default forwardRef<ProductCatalogVariantsSectionHandle, Props>(function ProductCatalogVariantsSection({
  productId,
  productCode,
  defaultMoq,
  defaultLeadTime,
  optionGroups,
  variants,
  sharedAttributes = [],
  sharedAttributesLoading = false,
  sharedAttributesError = null,
  onRefreshSharedAttributes,
  fieldErrors = {},
  onOptionGroupsChange,
  onVariantsChange,
  onReloadProduct,
  onBeforeMatrixGenerate,
  productSaveInProgress = false,
  onMatrixBusyChange,
  onSaveAndContinue,
  onVariantDeleted,
  onBulkOperationChange,
}, ref) {
  const toast = useAdminToast();
  const [matrixFilter, setMatrixFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [previewingMatrix, setPreviewingMatrix] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string | null>(null);
  const [matrixConfirmOpen, setMatrixConfirmOpen] = useState(false);
  const [matrixConfirmLarge, setMatrixConfirmLarge] = useState(false);
  const [serverMatrixPreview, setServerMatrixPreview] = useState<ServerMatrixPreview | null>(null);
  const [previewOptionsFingerprint, setPreviewOptionsFingerprint] = useState<string | null>(null);
  const [manualSkuKeys, setManualSkuKeys] = useState<Set<string>>(new Set());
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogKind | null>(null);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [productId]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkBlocked, setBulkBlocked] = useState<
    Array<{ id: string; sku: string; displayLabel: string | null; reason: string }>
  >([]);
  const [skuPreview, setSkuPreview] = useState<
    Array<{ id: string; currentSku: string; nextSku: string }>
  >([]);
  const [lifecycleDialog, setLifecycleDialog] =
    useState<VariantLifecycleDialogState>(EMPTY_LIFECYCLE_DIALOG);

  const matrixGroups = useMemo(
    () =>
      optionGroups
        .filter((group) => group.values.length > 0)
        .map((group, index) => ({
          id: group.id ?? group.clientKey,
          name: group.name,
          slug: group.slug || `option-${index + 1}`,
          sortOrder: group.sortOrder,
          values: group.values.map((value, valueIndex) => ({
            id: value.id ?? value.clientKey,
            label: value.label,
            valueCode: value.valueCode || null,
            sortOrder: value.sortOrder ?? valueIndex,
          })),
        })),
    [optionGroups],
  );

  const previewText = useMemo(
    () => buildCombinationPreviewText(matrixGroups),
    [matrixGroups],
  );

  const structuredVariants = variants.filter((variant) => variant.variantKind === "structured");

  const matrixPreview = useMemo(
    () => computeFormMatrixPreview(matrixGroups, structuredVariants),
    [matrixGroups, structuredVariants],
  );

  const matrixBusy = savingOptions || previewingMatrix || generating;

  function clearServerPreview() {
    setServerMatrixPreview(null);
    setPreviewOptionsFingerprint(null);
    setMatrixConfirmOpen(false);
    setMatrixConfirmLarge(false);
  }

  function handleOptionGroupsChange(groups: OptionGroupFormRow[]) {
    if (matrixConfirmOpen || serverMatrixPreview) {
      clearServerPreview();
      setMatrixMessage(MATRIX_PREVIEW_STALE_ERROR);
    }
    onOptionGroupsChange(groups);
  }

  async function fetchServerMatrixPreview(): Promise<ServerMatrixPreview | null> {
    if (!productId) return null;
    const response = await fetch(`/api/admin/products/${productId}/variant-matrix`);
    const data = (await response.json()) as ServerMatrixPreview & {
      message?: string;
      error?: string;
    };
    if (!response.ok) {
      setMatrixMessage(data.message ?? data.error ?? "Không thể kiểm tra tổ hợp biến thể.");
      return null;
    }
    return data;
  }

  async function openMatrixConfirm() {
    setMatrixMessage(null);
    if (!matrixPreview.canGenerate) {
      setMatrixMessage(matrixPreview.message ?? "Không có tổ hợp mới để tạo.");
      return;
    }

    if (productSaveInProgress) {
      setMatrixMessage(PRODUCT_SAVE_IN_PROGRESS_FOR_MATRIX_ERROR);
      return;
    }

    if (productId && onBeforeMatrixGenerate) {
      setSavingOptions(true);
      onMatrixBusyChange?.(true);
      let savedFingerprint: string | null = null;
      try {
        savedFingerprint = await onBeforeMatrixGenerate();
        if (!savedFingerprint) {
          setMatrixMessage(
            "Không thể tạo biến thể vì nhóm tuỳ chọn chưa được lưu. Vui lòng lưu sản phẩm rồi thử lại.",
          );
          return;
        }
      } finally {
        setSavingOptions(false);
      }

      setPreviewingMatrix(true);
      try {
        const preview = await fetchServerMatrixPreview();
        if (!preview) return;
        if (!preview.canGenerate) {
          setMatrixMessage(preview.message ?? "Không có tổ hợp mới để tạo.");
          clearServerPreview();
          return;
        }
        setServerMatrixPreview(preview);
        setPreviewOptionsFingerprint(savedFingerprint);
        setMatrixConfirmLarge(Boolean(preview.requiresConfirmation));
        setMatrixConfirmOpen(true);
      } finally {
        setPreviewingMatrix(false);
        onMatrixBusyChange?.(false);
      }
      return;
    }

    setMatrixConfirmLarge(false);
    setMatrixConfirmOpen(true);
  }

  useImperativeHandle(ref, () => ({
    openMatrixConfirmation: () => {
      if (!productId) return;
      void openMatrixConfirm();
    },
  }), [productId, matrixPreview.canGenerate, matrixPreview.message, onBeforeMatrixGenerate, productSaveInProgress, optionGroups]);

  const variantUsageByValueId = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const variant of variants) {
      if (variant.variantKind !== "structured") continue;
      for (const valueId of variant.optionValueIds) {
        usage[valueId] = (usage[valueId] ?? 0) + 1;
      }
    }
    return usage;
  }, [variants]);

  const legacyVariants = variants.filter((variant) => variant.variantKind === "legacy");

  const filteredStructuredVariants = structuredVariants.filter((variant) => {
    if (statusFilter && variant.variantStatus !== statusFilter) return false;
    if (!matrixFilter.trim()) return true;
    const q = matrixFilter.trim().toLowerCase();
    return (
      variant.displayLabel.toLowerCase().includes(q) ||
      variant.sku.toLowerCase().includes(q)
    );
  });

  const filteredLegacyVariants = legacyVariants.filter((variant) => {
    if (statusFilter && variant.variantStatus !== statusFilter) return false;
    if (!matrixFilter.trim()) return true;
    const q = matrixFilter.trim().toLowerCase();
    return (
      variant.displayLabel.toLowerCase().includes(q) ||
      variant.sku.toLowerCase().includes(q) ||
      variant.colorName.toLowerCase().includes(q) ||
      variant.sizeName.toLowerCase().includes(q)
    );
  });

  const visibleVariants = useMemo(
    () => [...filteredStructuredVariants, ...filteredLegacyVariants],
    [filteredStructuredVariants, filteredLegacyVariants],
  );

  const selectedVariants = useMemo(
    () => variants.filter((variant) => selectedKeys.has(variant.clientKey)),
    [variants, selectedKeys],
  );

  const selectedPersistedIds = useMemo(
    () =>
      selectedVariants
        .map((variant) => variant.id)
        .filter((id): id is string => Boolean(id)),
    [selectedVariants],
  );

  const allVisibleSelected =
    visibleVariants.length > 0 &&
    visibleVariants.every((variant) => selectedKeys.has(variant.clientKey));

  function toggleSelect(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleSelectAllVisible(checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const variant of visibleVariants) {
        if (checked) next.add(variant.clientKey);
        else next.delete(variant.clientKey);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function openBulkDialog(kind: BulkDialogKind) {
    setBulkError(null);
    setBulkBlocked([]);
    setSkuPreview([]);
    setBulkDialog(kind);
  }

  function closeBulkDialog() {
    setBulkDialog(null);
    setBulkError(null);
    setBulkBlocked([]);
    setSkuPreview([]);
  }

  async function runBulkOperation(payload: Record<string, unknown>, previewOnly = false) {
    if (!productId || !selectedPersistedIds.length) {
      setBulkError("Vui lòng chọn ít nhất 1 biến thể.");
      return;
    }

    setBulkSubmitting(true);
    setBulkError(null);
    onBulkOperationChange?.(true);

    try {
      const response = await fetch(`/api/admin/products/${productId}/variants/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          variantIds: selectedPersistedIds,
          previewOnly,
        }),
      });
      const data = (await response.json()) as BulkVariantResult & {
        message?: string;
        error?: string;
        detail?: string;
        blocked?: Array<{ id: string; sku: string; displayLabel: string | null; reason: string }>;
        blockedCount?: number;
      };

      if (!response.ok) {
        setBulkError(
          data.message ??
            data.error ??
            data.detail ??
            "Không thể cập nhật biến thể hàng loạt. Vui lòng thử lại.",
        );
        if (data.blocked?.length) setBulkBlocked(data.blocked);
        return;
      }

      if (data.previewOnly && data.skuPreview) {
        setSkuPreview(data.skuPreview);
        return;
      }

      const nextVariants = applyBulkResultToVariants(variants, data);
      onVariantsChange(nextVariants);
      for (const deletedId of data.deletedIds) {
        onVariantDeleted?.(deletedId);
      }
      setMatrixMessage(data.message);
      if (!previewOnly) {
        clearSelection();
        closeBulkDialog();
      }
    } catch {
      setBulkError("Không thể kết nối máy chủ.");
    } finally {
      setBulkSubmitting(false);
      onBulkOperationChange?.(false);
    }
  }

  function updateVariant(key: string, patch: Partial<MatrixVariantFormRow>) {
    onVariantsChange(
      variants.map((variant) =>
        variant.clientKey === key ? { ...variant, ...patch } : variant,
      ),
    );
  }

  function getOptionValueLabel(valueId: string): string {
    for (const group of optionGroups) {
      const value = group.values.find(
        (item) => item.id === valueId || item.clientKey === valueId,
      );
      if (value) return `${group.name}: ${value.label}`;
    }
    return valueId;
  }

  function getOptionValueLabels(valueIds: string[]): string[] {
    return valueIds.map((valueId) => getOptionValueLabel(valueId));
  }

  function closeLifecycleDialog() {
    setLifecycleDialog(EMPTY_LIFECYCLE_DIALOG);
  }

  async function openLifecycleDialog(variantKey: string) {
    const variant = variants.find((item) => item.clientKey === variantKey);
    if (!variant) return;

    const optionLabels = getOptionValueLabels(variant.optionValueIds);
    const baseState: VariantLifecycleDialogState = {
      open: true,
      variantKey,
      variantId: variant.id,
      displayLabel: variant.displayLabel,
      sku: variant.sku,
      optionLabels,
      variantStatus: variant.variantStatus,
      loading: Boolean(variant.id && productId),
      submitting: false,
      error: null,
      canHardDelete: !variant.id,
      dependencyMessage: null,
      dependencies: null,
    };
    setLifecycleDialog(baseState);

    if (!variant.id || !productId) return;

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
      );
      const data = (await response.json()) as {
        canHardDelete?: boolean;
        dependencyMessage?: string | null;
        dependencies?: VariantDependencySummary;
        variantStatus?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setLifecycleDialog((prev) => ({
          ...prev,
          loading: false,
          error: data.message ?? data.error ?? "Không thể tải thông tin biến thể.",
        }));
        return;
      }

      setLifecycleDialog((prev) => ({
        ...prev,
        loading: false,
        canHardDelete: data.canHardDelete ?? false,
        dependencyMessage: data.dependencyMessage ?? null,
        dependencies: data.dependencies ?? null,
        variantStatus: data.variantStatus ?? prev.variantStatus,
      }));
    } catch {
      setLifecycleDialog((prev) => ({
        ...prev,
        loading: false,
        error: "Không thể kết nối máy chủ.",
      }));
    }
  }

  async function confirmLifecycleAction(mode: "delete" | "archive" | "restore") {
    const variant = variants.find((item) => item.clientKey === lifecycleDialog.variantKey);
    if (!variant) return;

    if (!variant.id || !productId) {
      if (mode === "delete") {
        onVariantsChange(variants.filter((item) => item.clientKey !== variant.clientKey));
        setMatrixMessage("Đã xóa biến thể khỏi danh sách.");
      }
      closeLifecycleDialog();
      return;
    }

    setLifecycleDialog((prev) => ({ ...prev, submitting: true, error: null }));
    setActionLoadingKey(variant.clientKey);

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode }),
        },
      );
      const data = (await response.json()) as {
        message?: string;
        error?: string;
        detail?: string;
        removed?: boolean;
        variant?: {
          id: string;
          variantStatus: string;
        };
      };

      if (!response.ok) {
        setLifecycleDialog((prev) => ({
          ...prev,
          submitting: false,
          error: data.message ?? data.error ?? data.detail ?? "Không thể thực hiện thao tác.",
        }));
        return;
      }

      if (data.removed) {
        onVariantsChange(variants.filter((item) => item.clientKey !== variant.clientKey));
        onVariantDeleted?.(variant.id);
      } else if (data.variant) {
        updateVariant(variant.clientKey, {
          variantStatus: data.variant.variantStatus,
        });
      }

      setMatrixMessage(data.message ?? "Đã cập nhật biến thể.");
      closeLifecycleDialog();
    } catch {
      setLifecycleDialog((prev) => ({
        ...prev,
        submitting: false,
        error: "Không thể kết nối máy chủ.",
      }));
    } finally {
      setActionLoadingKey(null);
    }
  }

  function renderLegacyVariantActions(variant: MatrixVariantFormRow) {
    const isLoading = actionLoadingKey === variant.clientKey;
    return (
      <AdminLoadingButton
        variant="ghost"
        size="xs"
        className="btn-tertiary btn-sm"
        pending={isLoading}
        pendingLabel="Đang xử lý..."
        onClick={() => void openLifecycleDialog(variant.clientKey)}
      >
        {variant.id ? "Quản lý" : "Xóa khỏi danh sách"}
      </AdminLoadingButton>
    );
  }

  function addManualStructuredVariant() {
    onVariantsChange([...variants, defaultStructuredVariant()]);
  }

  function generateClientSideCombinations() {
    if (!matrixGroups.length || matrixGroups.some((group) => group.values.length === 0)) {
      setMatrixMessage("Thêm nhóm biến thể và ít nhất một giá trị cho mỗi nhóm trước khi tạo tổ hợp.");
      return;
    }

    const combos = buildCartesianCombinations(matrixGroups);
    const existing = new Set(
      structuredVariants.map((variant) => combinationSignature(variant.optionValueIds)),
    );
    const missing = combos.filter((combo) => !existing.has(combo.signature));

    if (!missing.length) {
      setMatrixMessage("Tất cả tổ hợp biến thể đã tồn tại.");
      return;
    }

    const created = missing.map((combo) => {
      const legacy = mapCombinationToLegacyFields(matrixGroups, combo.valueIds);
      return {
        ...defaultStructuredVariant(),
        clientKey: createClientKey("var"),
        displayLabel: combo.displayLabel,
        optionValueIds: combo.valueIds,
        colorName: legacy.colorName ?? "",
        colorCode: legacy.colorCode ?? "",
        sizeName: legacy.sizeName ?? "",
        dimensions: legacy.dimensions ?? "",
        capacity: legacy.capacity ?? "",
        moqOverride: defaultMoq.trim() || "",
        leadTimeOverride: defaultLeadTime.trim() || "",
      };
    });

    onVariantsChange([...variants, ...created]);
    setMatrixMessage(`Đã thêm ${created.length} biến thể mới vào biểu mẫu. Nhấn Lưu để ghi vào hệ thống.`);
  }

  async function generateFromServer(confirmLarge = false) {
    if (!productId) {
      generateClientSideCombinations();
      return;
    }

    if (productSaveInProgress) {
      setMatrixMessage(PRODUCT_SAVE_IN_PROGRESS_FOR_MATRIX_ERROR);
      return;
    }

    if (
      previewOptionsFingerprint &&
      previewOptionsFingerprint !== buildOptionsFingerprint(optionGroups)
    ) {
      clearServerPreview();
      setMatrixMessage(MATRIX_PREVIEW_STALE_ERROR);
      return;
    }

    const expectedCreateCount = matrixPreview.missingCount;
    setGenerating(true);
    onMatrixBusyChange?.(true);
    setMatrixMessage(
      expectedCreateCount > 0
        ? `Đang tạo ${expectedCreateCount} biến thể...`
        : "Đang tạo tổ hợp biến thể...",
    );
    try {
      const response = await fetch(`/api/admin/products/${productId}/variant-matrix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmLarge }),
      });
      const data = (await response.json()) as {
        message?: string;
        created?: number;
        skipped?: number;
        preserved?: number;
        error?: string;
        fieldErrors?: Record<string, string>;
        matrixNeedsRefetch?: boolean;
      };

      if (!response.ok) {
        if (data.message?.includes("xác nhận") && !confirmLarge) {
          setMatrixConfirmLarge(true);
          setMatrixConfirmOpen(true);
          return;
        }

        const needsRefetch =
          Boolean(data.matrixNeedsRefetch) ||
          Boolean(data.fieldErrors?.matrixNeedsRefetch) ||
          /kiểm tra lại trạng thái biến thể/i.test(data.message ?? "") ||
          /kiểm tra lại trạng thái biến thể/i.test(data.fieldErrors?.variants ?? "");

        if (needsRefetch) {
          setMatrixMessage(
            "Thao tác tạo biến thể mất nhiều thời gian hơn dự kiến. Hệ thống sẽ kiểm tra lại trạng thái biến thể.",
          );
          const beforeExisting = matrixPreview.existingCount;
          const theoretical = matrixPreview.theoreticalCount;
          try {
            const refreshed = await fetchServerMatrixPreview();
            if (refreshed) {
              setServerMatrixPreview(refreshed);
              setPreviewOptionsFingerprint(buildOptionsFingerprint(optionGroups));
              if (refreshed.missingCount === 0 && refreshed.existingCount >= theoretical) {
                setMatrixMessage("Biến thể đã được tạo thành công. Đã cập nhật lại ma trận.");
                if (onReloadProduct) await onReloadProduct();
              } else if (refreshed.existingCount > beforeExisting) {
                setMatrixMessage("Một số biến thể đã được tạo. Đã cập nhật lại ma trận.");
                if (onReloadProduct) await onReloadProduct();
              } else {
                setMatrixMessage(
                  "Chưa có biến thể mới được tạo. Vui lòng thử lại hoặc giảm số lượng tổ hợp.",
                );
              }
            } else {
              setMatrixMessage(
                "Chưa xác định được trạng thái tạo biến thể. Vui lòng tải lại trang để kiểm tra.",
              );
            }
          } catch {
            setMatrixMessage(
              "Chưa xác định được trạng thái tạo biến thể. Vui lòng tải lại trang để kiểm tra.",
            );
          }
          return;
        }

        const comboError = data.fieldErrors?.variants;
        setMatrixMessage(comboError ?? data.message ?? data.error ?? "Không thể tạo biến thể.");
        return;
      }

      const created = data.created ?? 0;
      const skipped = data.skipped ?? 0;
      const summary = formatVariantMatrixGenerationMessage(created, skipped);
      setMatrixMessage(summary);
      clearServerPreview();
      if (created > 0 || skipped > 0) {
        if (created > 0) toast.success(summary);
        if (onReloadProduct) {
          await onReloadProduct();
        }
      }
    } catch {
      setMatrixMessage(
        "Thao tác tạo biến thể mất nhiều thời gian hơn dự kiến. Hệ thống sẽ kiểm tra lại trạng thái biến thể.",
      );
      try {
        const refreshed = await fetchServerMatrixPreview();
        if (refreshed) {
          setServerMatrixPreview(refreshed);
          setPreviewOptionsFingerprint(buildOptionsFingerprint(optionGroups));
          if (refreshed.missingCount === 0) {
            setMatrixMessage("Biến thể đã được tạo thành công. Đã cập nhật lại ma trận.");
            if (onReloadProduct) await onReloadProduct();
          } else if (refreshed.existingCount > 0) {
            setMatrixMessage("Một số biến thể đã được tạo. Đã cập nhật lại ma trận.");
            if (onReloadProduct) await onReloadProduct();
          } else {
            setMatrixMessage(
              "Chưa có biến thể mới được tạo. Vui lòng thử lại hoặc giảm số lượng tổ hợp.",
            );
          }
        } else {
          setMatrixMessage(
            "Chưa xác định được trạng thái tạo biến thể. Vui lòng tải lại trang để kiểm tra.",
          );
        }
      } catch {
        setMatrixMessage(
          "Chưa xác định được trạng thái tạo biến thể. Vui lòng tải lại trang để kiểm tra.",
        );
      }
    } finally {
      setGenerating(false);
      onMatrixBusyChange?.(false);
      setMatrixConfirmOpen(false);
    }
  }

  async function confirmMatrixGeneration() {
    if (!productId) {
      setMatrixConfirmOpen(false);
      generateClientSideCombinations();
      return;
    }
    if (
      previewOptionsFingerprint &&
      previewOptionsFingerprint !== buildOptionsFingerprint(optionGroups)
    ) {
      clearServerPreview();
      setMatrixMessage(MATRIX_PREVIEW_STALE_ERROR);
      return;
    }
    const confirmLarge =
      matrixConfirmLarge || Boolean(serverMatrixPreview?.requiresConfirmation);
    await generateFromServer(confirmLarge);
  }

  function addLegacyVariant() {
    onVariantsChange([...variants, defaultLegacyVariant()]);
  }

  const variantRowErrors = buildVariantRowErrors(fieldErrors, variants);

  return (
    <div className="admin-variant-matrix-section">
      <ProductOptionGroupBuilder
        groups={optionGroups}
        sharedAttributes={sharedAttributes}
        sharedAttributesLoading={sharedAttributesLoading}
        sharedAttributesError={sharedAttributesError}
        onRefreshSharedAttributes={onRefreshSharedAttributes}
        variantUsageByValueId={variantUsageByValueId}
        fieldErrors={fieldErrors}
        onChange={handleOptionGroupsChange}
      />

      <section className="admin-product-section admin-product-section--step-3">
        <h3>3. Tạo tổ hợp biến thể</h3>
        <p className="admin-field-hint">{previewText}</p>
        {!productId && (
          <p className="admin-kb-warning-list" role="status">
            Hãy lưu sản phẩm trước để tạo tổ hợp biến thể và SKU tự động.
          </p>
        )}
        <dl className="admin-matrix-preview-stats admin-matrix-preview-stats--inline">
          <div>
            <dt>Tổ hợp lý thuyết</dt>
            <dd>{matrixPreview.theoreticalCount}</dd>
          </div>
          <div>
            <dt>Đã có</dt>
            <dd>{matrixPreview.existingCount}</dd>
          </div>
          <div>
            <dt>Sẽ tạo mới</dt>
            <dd><strong>{matrixPreview.missingCount}</strong></dd>
          </div>
        </dl>
        {matrixPreview.requiresWarning && (
          <p className="admin-kb-warning-list" role="status">
            Ma trận lớn: {matrixPreview.theoreticalCount} biến thể. Quá trình tạo có thể mất vài giây.
          </p>
        )}
        <div className="admin-variant-matrix-actions">
          {productId ? (
            <AdminLoadingButton
              variant="primary"
              className="btn-primary"
              pending={matrixBusy}
              pendingLabel={
                savingOptions
                  ? "Đang lưu tuỳ chọn..."
                  : previewingMatrix
                    ? "Đang kiểm tra tổ hợp..."
                    : generating && matrixPreview.missingCount > 0
                      ? `Đang tạo ${matrixPreview.missingCount} biến thể...`
                      : "Đang tạo tổ hợp biến thể..."
              }
              disabled={!matrixPreview.canGenerate || matrixBusy || productSaveInProgress}
              onClick={() => void openMatrixConfirm()}
            >
              Tạo tổ hợp biến thể
            </AdminLoadingButton>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={!onSaveAndContinue || !matrixPreview.canGenerate || matrixBusy}
              onClick={() => void onSaveAndContinue?.()}
            >
              Lưu sản phẩm và tạo tổ hợp
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={addManualStructuredVariant}>
            Thêm biến thể thủ công
          </button>
        </div>
        {matrixMessage && <p className="admin-field-hint" role="status">{matrixMessage}</p>}
      </section>

      <VariantMatrixConfirmDialog
        open={matrixConfirmOpen}
        previewText={serverMatrixPreview?.previewText ?? matrixPreview.previewText}
        theoreticalCount={serverMatrixPreview?.theoreticalCount ?? matrixPreview.theoreticalCount}
        existingCount={serverMatrixPreview?.existingCount ?? matrixPreview.existingCount}
        missingCount={serverMatrixPreview?.missingCount ?? matrixPreview.missingCount}
        missingCombinations={
          serverMatrixPreview?.missingCombinations ?? matrixPreview.missingCombinations
        }
        requiresWarning={
          serverMatrixPreview?.requiresWarning ?? matrixPreview.requiresWarning
        }
        requiresConfirmation={
          matrixConfirmLarge ||
          Boolean(serverMatrixPreview?.requiresConfirmation ?? matrixPreview.requiresConfirmation)
        }
        submitting={matrixBusy}
        submittingLabel={
          savingOptions
            ? "Đang lưu tuỳ chọn..."
            : previewingMatrix
              ? "Đang kiểm tra tổ hợp..."
              : "Đang tạo tổ hợp biến thể..."
        }
        onCancel={() => {
          if (matrixBusy) return;
          clearServerPreview();
        }}
        onConfirm={() => void confirmMatrixGeneration()}
      />

      <section className="admin-product-section">
        <div className="admin-section-head">
          <h3>Ma trận biến thể theo nhóm thuộc tính</h3>
          <p className="admin-field-hint">
            Biến thể có cấu trúc từ nhóm thuộc tính. Biến thể ngừng/lưu trữ vẫn quản lý tại đây nhưng không hiển thị trên website.
          </p>
          <div className="admin-variant-matrix-filters">
            <input
              className="form-input"
              value={matrixFilter}
              onChange={(e) => setMatrixFilter(e.target.value)}
              placeholder="Tìm theo SKU hoặc nhãn"
              aria-label="Lọc biến thể"
            />
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              {renderVariantStatusOptions()}
            </select>
          </div>
        </div>

        {selectedKeys.size > 0 && (
          <div className="admin-variant-selection-bar">
            <p className="admin-field-hint" role="status">
              Đã chọn {selectedKeys.size} biến thể
              {selectedPersistedIds.length < selectedKeys.size
                ? ` (${selectedPersistedIds.length} đã lưu)`
                : ""}
            </p>
            <div className="admin-variant-selection-actions">
              <button
                type="button"
                className="btn-tertiary btn-sm"
                onClick={() => toggleSelectAllVisible(true)}
              >
                {matrixFilter.trim() || statusFilter
                  ? "Chọn tất cả kết quả lọc"
                  : "Chọn tất cả"}
              </button>
              <button type="button" className="btn-tertiary btn-sm" onClick={clearSelection}>
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {variantRowErrors.length > 0 && (
          <div className="admin-variant-error-summary" role="alert">
            <p className="admin-variant-error-summary__title">Lỗi biến thể cần sửa:</p>
            <ul className="admin-variant-error-summary__list">
              {variantRowErrors.map((rowError) => (
                <li key={rowError.fieldKey}>
                  <button
                    type="button"
                    className="admin-variant-error-summary__item"
                    onClick={() => focusVariantField(rowError.fieldKey)}
                  >
                    <strong>{rowError.variantLabel}</strong> — {variantFieldLabel(rowError.field)}: {rowError.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedPersistedIds.length > 0 && (
          <div className="admin-variant-bulk-toolbar" role="toolbar" aria-label="Cập nhật hàng loạt">
            <span className="admin-field-hint">
              Cập nhật hàng loạt · {selectedPersistedIds.length} biến thể đã lưu
            </span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("status")}>
              Cập nhật trạng thái
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("stock")}>
              Cập nhật tồn kho
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("price")}>
              Cập nhật giá
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("image")}>
              Cập nhật ảnh
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("moq")}>
              Cập nhật MOQ
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("leadTime")}>
              Cập nhật thời gian sản xuất
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("sku")}>
              Cập nhật SKU
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("lifecycle")}>
              Quản lý trạng thái
            </button>
            <button type="button" className="btn-tertiary btn-sm" onClick={clearSelection}>
              Bỏ chọn
            </button>
          </div>
        )}

        {filteredStructuredVariants.length === 0 ? (
          <p className="admin-empty-hint">
            {structuredVariants.length === 0
              ? "Chưa có biến thể theo nhóm thuộc tính. Tạo từ tổ hợp hoặc thêm thủ công."
              : "Không có biến thể phù hợp bộ lọc hiện tại."}
          </p>
        ) : (
          <VariantMatrixView
            variants={variants}
            filteredVariants={filteredStructuredVariants}
            optionGroups={optionGroups}
            fieldErrors={fieldErrors}
            productCode={productCode}
            defaultMoq={defaultMoq}
            defaultLeadTime={defaultLeadTime}
            selectedKeys={selectedKeys}
            manualSkuKeys={manualSkuKeys}
            allVisibleSelected={allVisibleSelected}
            actionLoadingKey={actionLoadingKey}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onUpdateVariant={updateVariant}
            onEnableManualSku={(clientKey) =>
              setManualSkuKeys((prev) => new Set(prev).add(clientKey))
            }
            onOpenLifecycle={(clientKey) => void openLifecycleDialog(clientKey)}
            getOptionValueLabel={getOptionValueLabel}
          />
        )}
      </section>


      <section className="admin-product-section">
        <div className="admin-section-head">
          <h3>Biến thể cũ (màu / size thủ công)</h3>
          <p className="admin-field-hint">
            Dùng cho sản phẩm chưa có nhóm thuộc tính cấu trúc. Không trộn với ma trận phía trên.
          </p>
          <button type="button" className="btn-secondary btn-sm" onClick={addLegacyVariant}>
            Thêm biến thể cũ
          </button>
        </div>
        {filteredLegacyVariants.length === 0 ? (
          <p className="admin-empty-hint">
            {legacyVariants.length === 0
              ? "Không có biến thể legacy. Thêm nếu sản phẩm dùng màu/size thủ công."
              : "Không có biến thể legacy phù hợp bộ lọc."}
          </p>
        ) : (
          <div className="admin-legacy-variant-list">
            {filteredLegacyVariants.map((variant) => (
              <div key={variant.clientKey} className="admin-catalog-variant-row">
                <div className="admin-catalog-variant-header">
                  <label className="admin-catalog-toggle">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(variant.clientKey)}
                      onChange={(e) => toggleSelect(variant.clientKey, e.target.checked)}
                      aria-label={`Chọn biến thể ${variant.displayLabel || variant.sku}`}
                    />
                  </label>
                  <strong>{variant.displayLabel || variant.sku || "Biến thể cũ"}</strong>
                  {variant.variantStatus !== "ACTIVE" && (
                    <span className={variantStatusBadgeClass(variant.variantStatus)}>
                      {variantStatusLabel(variant.variantStatus)}
                    </span>
                  )}
                  {renderLegacyVariantActions(variant)}
                </div>
                <div className="admin-catalog-variant-fields">
                  <input className="form-input" value={variant.colorName} placeholder="Màu sắc" onChange={(e) => updateVariant(variant.clientKey, { colorName: e.target.value })} />
                  <input className="form-input" value={variant.colorCode} placeholder="Mã màu" onChange={(e) => updateVariant(variant.clientKey, { colorCode: e.target.value })} />
                  <input className="form-input" value={variant.sizeName} placeholder="Size" onChange={(e) => updateVariant(variant.clientKey, { sizeName: e.target.value })} />
                  <input className="form-input" value={variant.sku} placeholder="SKU" onChange={(e) => updateVariant(variant.clientKey, { sku: e.target.value })} />
                  <input className="form-input" type="number" value={variant.stockQty} onChange={(e) => updateVariant(variant.clientKey, { stockQty: e.target.value })} />
                  <select className="form-input" value={variant.variantStatus} onChange={(e) => updateVariant(variant.clientKey, { variantStatus: e.target.value })}>
                    {renderVariantStatusOptions()}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <VariantLifecycleDialog
        state={lifecycleDialog}
        onClose={closeLifecycleDialog}
        onConfirm={(mode) => void confirmLifecycleAction(mode)}
      />

      <VariantBulkDialogs
        open={bulkDialog !== null}
        kind={bulkDialog}
        selectedCount={selectedKeys.size}
        persistedCount={selectedPersistedIds.length}
        productCode={productCode}
        submitting={bulkSubmitting}
        error={bulkError}
        blockedItems={bulkBlocked}
        skuPreview={skuPreview}
        onClose={closeBulkDialog}
        onSubmit={(payload) => void runBulkOperation(payload)}
        onPreviewSku={(payload) => void runBulkOperation(payload, true)}
      />
    </div>
  );
});
