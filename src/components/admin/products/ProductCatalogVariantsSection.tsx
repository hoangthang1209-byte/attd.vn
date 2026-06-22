"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import MediaPicker from "@/components/admin/media/MediaPicker";
import ProductOptionGroupBuilder, {
  type OptionGroupFormRow,
} from "@/components/admin/products/ProductOptionGroupBuilder";
import VariantLifecycleDialog, {
  type VariantLifecycleDialogState,
} from "@/components/admin/products/VariantLifecycleDialog";
import VariantBulkDialogs, {
  type BulkDialogKind,
} from "@/components/admin/products/VariantBulkDialogs";
import type { BulkVariantResult } from "@/features/products/product-variant-bulk.service";
import type { VariantDependencySummary } from "@/features/products/product-variant-lifecycle.service";
import {
  STOCK_STATUS_LABELS,
  VARIANT_STATUS_OPTIONS,
  variantMatrixRowClass,
  variantStatusBadgeClass,
  variantStatusLabel,
} from "@/features/products/product-variant-labels";
import {
  buildCartesianCombinations,
  buildCombinationPreviewText,
  combinationSignature,
  computeTheoreticalCombinationCount,
  createClientKey,
  mapCombinationToLegacyFields,
  VARIANT_MATRIX_CONFIRM_THRESHOLD,
  VARIANT_MATRIX_WARN_THRESHOLD,
} from "@/features/products/product-variant-matrix.utils";

function renderVariantStatusOptions() {
  return VARIANT_STATUS_OPTIONS.map((opt) => (
    <option key={opt.value} value={opt.value}>
      {opt.label}
    </option>
  ));
}

export type MatrixVariantFormRow = {
  id?: string;
  clientKey: string;
  variantKind: "structured" | "legacy";
  displayLabel: string;
  optionValueIds: string[];
  colorName: string;
  colorCode: string;
  sizeName: string;
  dimensions: string;
  capacity: string;
  sku: string;
  variantStatus: string;
  stockQty: string;
  stockStatus: string;
  moqOverride: string;
  leadTimeOverride: string;
  materialOverride: string;
  wholesalePrice: string;
  dealerPrice: string;
  imageUrl: string;
  internalNote: string;
};

type AdminProductOption = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: Array<{
    id: string;
    label: string;
    valueCode: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }>;
};

type AdminProductVariant = {
  id: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
  dimensions: string | null;
  capacity: string | null;
  displayLabel: string | null;
  moqOverride: number | null;
  leadTimeOverride: string | null;
  materialOverride: string | null;
  wholesalePrice: number | null;
  dealerPrice: number | null;
  stockQty: number;
  stockStatus: string;
  variantStatus: string;
  imageUrl: string | null;
  internalNote: string | null;
  sku: string;
  optionValues?: Array<{ optionValueId: string }>;
};

export function mapOptionsToFormRows(options: AdminProductOption[]): OptionGroupFormRow[] {
  return options.map((option) => ({
    id: option.id,
    clientKey: option.id,
    name: option.name,
    slug: option.slug,
    sortOrder: option.sortOrder,
    values: option.values.map((value) => ({
      id: value.id,
      clientKey: value.id,
      label: value.label,
      valueCode: value.valueCode ?? "",
      imageUrl: value.imageUrl ?? "",
      sortOrder: value.sortOrder,
    })),
  }));
}

export function mapVariantsToFormRows(variants: AdminProductVariant[]): MatrixVariantFormRow[] {
  return variants.map((variant) => {
    const optionValueIds = variant.optionValues?.map((link) => link.optionValueId) ?? [];
    const isStructured = optionValueIds.length > 0;
    return {
      id: variant.id,
      clientKey: variant.id,
      variantKind: isStructured ? "structured" : "legacy",
      displayLabel: variant.displayLabel ?? "",
      optionValueIds,
      colorName: variant.colorName ?? "",
      colorCode: variant.colorCode ?? "",
      sizeName: variant.sizeName ?? "",
      dimensions: variant.dimensions ?? "",
      capacity: variant.capacity ?? "",
      sku: variant.sku,
      variantStatus: variant.variantStatus,
      stockQty: String(variant.stockQty),
      stockStatus: variant.stockStatus,
      moqOverride: variant.moqOverride != null ? String(variant.moqOverride) : "",
      leadTimeOverride: variant.leadTimeOverride ?? "",
      materialOverride: variant.materialOverride ?? "",
      wholesalePrice: variant.wholesalePrice != null ? String(variant.wholesalePrice) : "",
      dealerPrice: variant.dealerPrice != null ? String(variant.dealerPrice) : "",
      imageUrl: variant.imageUrl ?? "",
      internalNote: variant.internalNote ?? "",
    };
  });
}

type Props = {
  productId?: string;
  productCode: string;
  defaultMoq: string;
  defaultLeadTime: string;
  optionGroups: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  onOptionGroupsChange: (groups: OptionGroupFormRow[]) => void;
  onVariantsChange: (variants: MatrixVariantFormRow[]) => void;
  onReloadProduct?: () => Promise<void>;
  onVariantDeleted?: (variantId: string) => void;
  onBulkOperationChange?: (inProgress: boolean) => void;
};

export function applyBulkResultToVariants(
  variants: MatrixVariantFormRow[],
  result: BulkVariantResult,
): MatrixVariantFormRow[] {
  let next = variants;
  if (result.deletedIds.length) {
    const deleted = new Set(result.deletedIds);
    next = next.filter((row) => !row.id || !deleted.has(row.id));
  }
  const updatedById = new Map(result.variants.map((variant) => [variant.id, variant]));
  return next.map((row) => {
    if (!row.id) return row;
    const updated = updatedById.get(row.id);
    if (!updated) return row;
    const optionValueIds =
      updated.optionValueIds.length > 0 ? updated.optionValueIds : row.optionValueIds;
    return {
      ...row,
      variantKind: optionValueIds.length > 0 ? "structured" : row.variantKind,
      displayLabel: updated.displayLabel ?? row.displayLabel,
      sku: updated.sku,
      variantStatus: updated.variantStatus,
      stockQty: String(updated.stockQty),
      stockStatus: updated.stockStatus,
      moqOverride: updated.moqOverride != null ? String(updated.moqOverride) : "",
      leadTimeOverride: updated.leadTimeOverride ?? "",
      imageUrl: updated.imageUrl ?? "",
      colorName: updated.colorName ?? row.colorName,
      colorCode: updated.colorCode ?? row.colorCode,
      sizeName: updated.sizeName ?? row.sizeName,
      dimensions: updated.dimensions ?? row.dimensions,
      capacity: updated.capacity ?? row.capacity,
      optionValueIds,
    };
  });
}

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

export default function ProductCatalogVariantsSection({
  productId,
  productCode,
  defaultMoq,
  defaultLeadTime,
  optionGroups,
  variants,
  onOptionGroupsChange,
  onVariantsChange,
  onReloadProduct,
  onVariantDeleted,
  onBulkOperationChange,
}: Props) {
  const [matrixFilter, setMatrixFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogKind | null>(null);
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

  const theoreticalCount = useMemo(
    () => computeTheoreticalCombinationCount(matrixGroups),
    [matrixGroups],
  );

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

  const structuredVariants = variants.filter((variant) => variant.variantKind === "structured");
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
      setBulkError("Chỉ áp dụng cho biến thể đã lưu trên hệ thống.");
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
        setBulkError(data.message ?? data.error ?? data.detail ?? "Không thể thực hiện thao tác hàng loạt.");
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
        if (editingKey === variant.clientKey) setEditingKey(null);
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
        if (editingKey === variant.clientKey) setEditingKey(null);
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

  function renderVariantActions(variant: MatrixVariantFormRow) {
    const isLoading = actionLoadingKey === variant.clientKey;

    return (
      <div className="admin-variant-row-actions">
        <button
          type="button"
          className="btn-tertiary btn-sm"
          disabled={isLoading}
          onClick={() =>
            setEditingKey(editingKey === variant.clientKey ? null : variant.clientKey)
          }
        >
          Sửa
        </button>
        <button
          type="button"
          className="btn-tertiary btn-sm"
          disabled={isLoading}
          onClick={() => void openLifecycleDialog(variant.clientKey)}
        >
          {isLoading ? "…" : variant.id ? "Quản lý" : "Xóa khỏi danh sách"}
        </button>
      </div>
    );
  }

  function generateClientSideCombinations(confirmLarge = false) {
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
      setMatrixMessage("Tất cả tổ hợp hiện có đã được tạo.");
      return;
    }

    if (theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD) {
      setMatrixMessage(`Cảnh báo: ma trận có ${theoreticalCount} tổ hợp lý thuyết.`);
    }

    if (missing.length >= VARIANT_MATRIX_CONFIRM_THRESHOLD && !confirmLarge) {
      const ok = window.confirm(
        `Sẽ tạo ${missing.length} biến thể mới. Bạn có chắc muốn tiếp tục?`,
      );
      if (!ok) return;
    } else if (
      !window.confirm(
        `Tạo ${missing.length} biến thể mới và giữ nguyên ${existing.size} biến thể hiện có?`,
      )
    ) {
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
      };
    });

    onVariantsChange([...variants, ...created]);
    setMatrixMessage(`Đã thêm ${created.length} biến thể mới vào biểu mẫu. Nhấn Lưu để ghi vào hệ thống.`);
  }

  async function generateFromServer(confirmLarge = false) {
    if (!productId) {
      generateClientSideCombinations(confirmLarge);
      return;
    }

    setGenerating(true);
    setMatrixMessage(null);
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
      };

      if (!response.ok) {
        if (data.message?.includes("xác nhận") && !confirmLarge) {
          const ok = window.confirm(`${data.message}\n\nBạn có muốn tiếp tục?`);
          if (ok) {
            await generateFromServer(true);
            return;
          }
        }
        setMatrixMessage(data.message ?? data.error ?? "Không thể tạo biến thể.");
        return;
      }

      setMatrixMessage(
        `Đã tạo ${data.created ?? 0} biến thể mới. Giữ nguyên ${data.preserved ?? 0} biến thể hiện có.`,
      );
      if (onReloadProduct) await onReloadProduct();
    } catch {
      setMatrixMessage("Không thể kết nối máy chủ khi tạo biến thể.");
    } finally {
      setGenerating(false);
    }
  }

  function addManualStructuredVariant() {
    onVariantsChange([...variants, defaultStructuredVariant()]);
    setEditingKey(variants[variants.length - 1]?.clientKey ?? null);
  }

  function addLegacyVariant() {
    onVariantsChange([...variants, defaultLegacyVariant()]);
  }

  return (
    <div className="admin-variant-matrix-section">
      <ProductOptionGroupBuilder
        groups={optionGroups}
        variantUsageByValueId={variantUsageByValueId}
        onChange={onOptionGroupsChange}
      />

      <section className="admin-product-section">
        <h3>Tổ hợp biến thể</h3>
        <p className="admin-field-hint">{previewText}</p>
        {theoreticalCount >= VARIANT_MATRIX_WARN_THRESHOLD && (
          <p className="admin-kb-warning-list" role="status">
            Ma trận lớn: {theoreticalCount} tổ hợp lý thuyết. Hãy kiểm tra trước khi tạo hàng loạt.
          </p>
        )}
        <div className="admin-variant-matrix-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={generating}
            onClick={() => void generateFromServer(false)}
          >
            {generating ? "Đang tạo…" : "Tạo biến thể từ tổ hợp"}
          </button>
          <button type="button" className="btn-secondary" onClick={addManualStructuredVariant}>
            Thêm biến thể thủ công
          </button>
        </div>
        {matrixMessage && <p className="admin-field-hint" role="status">{matrixMessage}</p>}
      </section>

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
          <p className="admin-field-hint" role="status">
            Đã chọn {selectedKeys.size} biến thể
            {selectedPersistedIds.length < selectedKeys.size
              ? ` (${selectedPersistedIds.length} đã lưu)`
              : ""}
          </p>
        )}

        {selectedPersistedIds.length > 0 && (
          <div className="admin-variant-bulk-toolbar" role="toolbar" aria-label="Thao tác hàng loạt">
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("status")}>
              Cập nhật trạng thái
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("stock")}>
              Cập nhật tồn kho
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
            <button type="button" className="btn-secondary btn-sm" onClick={() => openBulkDialog("image")}>
              Gán ảnh
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
          <div className="admin-variant-matrix-scroll">
            <table className="admin-variant-matrix-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                      aria-label="Chọn tất cả biến thể đang hiển thị"
                    />
                  </th>
                  <th>Ảnh</th>
                  <th>Biến thể</th>
                  <th>Thuộc tính</th>
                  <th>SKU</th>
                  <th>Trạng thái</th>
                  <th>Tồn kho</th>
                  <th>MOQ</th>
                  <th>Lead time</th>
                  <th>Giá nội bộ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredStructuredVariants.map((variant) => (
                  <tr key={variant.clientKey} className={variantMatrixRowClass(variant.variantStatus)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(variant.clientKey)}
                        onChange={(e) => toggleSelect(variant.clientKey, e.target.checked)}
                        aria-label={`Chọn biến thể ${variant.displayLabel || variant.sku}`}
                      />
                    </td>
                    <td>
                      {variant.imageUrl ? (
                        <Image src={variant.imageUrl} alt="" width={40} height={40} className="admin-variant-thumb" />
                      ) : (
                        <span className="admin-field-hint">—</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-variant-cell-truncate" title={variant.displayLabel || undefined}>
                        {variant.displayLabel || "—"}
                      </div>
                      {variant.variantStatus !== "ACTIVE" && (
                        <span className={variantStatusBadgeClass(variant.variantStatus)}>
                          {variantStatusLabel(variant.variantStatus)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-variant-option-list">
                        {variant.optionValueIds.map((valueId) => (
                          <span key={valueId} className="admin-variant-option-chip">
                            {getOptionValueLabel(valueId)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        className="form-input admin-variant-cell-truncate"
                        value={variant.sku}
                        title={variant.sku}
                        onChange={(e) => updateVariant(variant.clientKey, { sku: e.target.value })}
                        placeholder={productCode ? "Tự sinh khi lưu" : ""}
                      />
                    </td>
                    <td>
                      <select
                        className="form-input"
                        value={variant.variantStatus}
                        onChange={(e) => updateVariant(variant.clientKey, { variantStatus: e.target.value })}
                      >
                        {renderVariantStatusOptions()}
                      </select>
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        value={variant.stockQty}
                        onChange={(e) => updateVariant(variant.clientKey, { stockQty: e.target.value })}
                      />
                      <span className="admin-stock-status-hint">
                        {STOCK_STATUS_LABELS[variant.stockStatus] ?? variant.stockStatus}
                        {variant.stockQty.trim() === "" || variant.stockQty === "0"
                          ? " · SL: 0"
                          : ` · SL: ${variant.stockQty}`}
                      </span>
                      <select
                        className="form-input"
                        value={variant.stockStatus}
                        onChange={(e) => updateVariant(variant.clientKey, { stockStatus: e.target.value })}
                        aria-label="Trạng thái tồn kho"
                      >
                        <option value="IN_STOCK">Còn hàng</option>
                        <option value="LOW_STOCK">Sắp hết</option>
                        <option value="OUT_OF_STOCK">Hết hàng</option>
                        <option value="PREORDER">Đặt trước</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className={`form-input${variant.moqOverride.trim() ? " admin-field-overridden" : " admin-field-inherited"}`}
                        type="number"
                        value={variant.moqOverride}
                        onChange={(e) => updateVariant(variant.clientKey, { moqOverride: e.target.value })}
                        placeholder={defaultMoq ? `Kế thừa (${defaultMoq})` : "Kế thừa MOQ SP"}
                      />
                      {!variant.moqOverride.trim() && (
                        <span className="admin-field-inherit-hint">Kế thừa</span>
                      )}
                    </td>
                    <td>
                      <input
                        className={`form-input${variant.leadTimeOverride.trim() ? " admin-field-overridden" : " admin-field-inherited"}`}
                        value={variant.leadTimeOverride}
                        onChange={(e) => updateVariant(variant.clientKey, { leadTimeOverride: e.target.value })}
                        placeholder={defaultLeadTime ? `Kế thừa (${defaultLeadTime})` : "Kế thừa lead time SP"}
                      />
                      {!variant.leadTimeOverride.trim() && (
                        <span className="admin-field-inherit-hint">Kế thừa</span>
                      )}
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        value={variant.wholesalePrice}
                        onChange={(e) => updateVariant(variant.clientKey, { wholesalePrice: e.target.value })}
                        placeholder="Giá sỉ"
                      />
                    </td>
                    <td>{renderVariantActions(variant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editingKey && (
          <div className="admin-variant-edit-panel">
            {(() => {
              const variant = variants.find((item) => item.clientKey === editingKey);
              if (!variant || variant.variantKind !== "structured") return null;
              return (
                <>
                  <h4>Chỉnh sửa biến thể</h4>
                  <div className="admin-spec-row">
                    <label className="admin-label">Chọn giá trị từng nhóm</label>
                    {optionGroups.map((group) => (
                      <select
                        key={group.clientKey}
                        className="form-input"
                        value={
                          variant.optionValueIds.find((valueId) =>
                            group.values.some(
                              (value) => value.id === valueId || value.clientKey === valueId,
                            ),
                          ) ?? ""
                        }
                        onChange={(e) => {
                          const nextIds = variant.optionValueIds.filter(
                            (valueId) =>
                              !group.values.some(
                                (value) => value.id === valueId || value.clientKey === valueId,
                              ),
                          );
                          if (e.target.value) nextIds.push(e.target.value);
                          const labels = nextIds.map((valueId) => {
                            for (const g of optionGroups) {
                              const val = g.values.find(
                                (item) => item.id === valueId || item.clientKey === valueId,
                              );
                              if (val) return val.label;
                            }
                            return "";
                          });
                          updateVariant(variant.clientKey, {
                            optionValueIds: nextIds,
                            displayLabel: labels.filter(Boolean).join(" / "),
                          });
                        }}
                      >
                        <option value="">{group.name}</option>
                        {group.values.map((value) => (
                          <option key={value.clientKey} value={value.id ?? value.clientKey}>
                            {value.label}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                  <MediaPicker
                    value={variant.imageUrl}
                    onChange={(url) => updateVariant(variant.clientKey, { imageUrl: url })}
                    label="Ảnh biến thể"
                    folder="products"
                  />
                  <input
                    className="form-input"
                    value={variant.materialOverride}
                    onChange={(e) => updateVariant(variant.clientKey, { materialOverride: e.target.value })}
                    placeholder="Chất liệu riêng (tuỳ chọn)"
                  />
                </>
              );
            })()}
          </div>
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
                  {renderVariantActions(variant)}
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
}
