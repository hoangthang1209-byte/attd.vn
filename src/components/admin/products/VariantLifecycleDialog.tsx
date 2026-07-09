"use client";

import { useEffect, useId, useRef } from "react";
import type { VariantDependencySummary } from "@/features/products/product-variant-lifecycle.service";
import { variantStatusLabel } from "@/features/products/product-variant-labels";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

export type VariantLifecycleDialogState = {
  open: boolean;
  variantKey: string;
  variantId?: string;
  displayLabel: string;
  sku: string;
  optionLabels: string[];
  variantStatus: string;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  canHardDelete: boolean;
  dependencyMessage: string | null;
  dependencies: VariantDependencySummary | null;
};

type Props = {
  state: VariantLifecycleDialogState;
  onClose: () => void;
  onConfirm: (mode: "delete" | "archive" | "restore") => void;
};

export default function VariantLifecycleDialog({ state, onClose, onConfirm }: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.open) {
      cancelRef.current?.focus();
    }
  }, [state.open]);

  if (!state.open) return null;

  const isInactive =
    state.variantStatus === "INACTIVE" || state.variantStatus === "ARCHIVED";
  const title = state.variantId
    ? isInactive
      ? "Kích hoạt lại biến thể?"
      : "Ngừng sử dụng biến thể?"
    : "Xóa khỏi danh sách?";

  return (
    <div
      className="admin-modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id={titleId}>
            {state.variantId
              ? state.canHardDelete && !isInactive
                ? "Xóa biến thể?"
                : title
              : title}
          </h3>
          <button type="button" className="btn-tertiary btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>

        <div className="admin-variant-lifecycle-summary">
          <p>
            <strong>{state.displayLabel || state.sku || "Biến thể"}</strong>
            {state.sku ? <span className="admin-field-hint"> · SKU: {state.sku}</span> : null}
          </p>
          {state.optionLabels.length > 0 && (
            <p className="admin-field-hint">
              Thuộc tính: {state.optionLabels.join(" · ")}
            </p>
          )}
          {state.variantId && (
            <p className="admin-field-hint">
              Trạng thái hiện tại: {variantStatusLabel(state.variantStatus)}
            </p>
          )}
          {state.loading && (
            <InlineLoading title="Đang kiểm tra liên kết nghiệp vụ..." tone="admin" />
          )}
          {state.error && (
            <p className="admin-field-error" role="alert">
              {state.error}
            </p>
          )}
          {!state.loading && state.variantId && state.dependencyMessage && (
            <p className="admin-kb-warning-list" role="status">
              {state.dependencyMessage}
            </p>
          )}
          {state.variantId && !isInactive && (
            <p className="admin-field-hint">
              Ngừng sử dụng sẽ ẩn biến thể khỏi website công khai nhưng giữ lại dữ liệu nghiệp vụ liên quan.
            </p>
          )}
          {!state.variantId && (
            <p className="admin-field-hint">
              Biến thể này chưa được lưu. Thao tác chỉ xóa khỏi biểu mẫu hiện tại.
            </p>
          )}
        </div>

        <div className="admin-variant-lifecycle-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={state.submitting}
          >
            Hủy
          </button>
          {state.variantId && isInactive && (
            <AdminLoadingButton
              variant="primary"
              className="btn-primary"
              pending={state.submitting}
              pendingLabel="Đang kích hoạt lại..."
              disabled={state.loading}
              onClick={() => onConfirm("restore")}
            >
              Kích hoạt lại
            </AdminLoadingButton>
          )}
          {state.variantId && !isInactive && (
            <AdminLoadingButton
              className="btn-secondary"
              pending={state.submitting}
              pendingLabel="Đang ngừng sử dụng..."
              disabled={state.loading}
              onClick={() => onConfirm("archive")}
            >
              Ngừng sử dụng
            </AdminLoadingButton>
          )}
          {state.variantId && state.canHardDelete && !isInactive && (
            <AdminLoadingButton
              variant="primary"
              className="btn-primary"
              pending={state.submitting}
              pendingLabel="Đang xóa vĩnh viễn..."
              disabled={state.loading}
              onClick={() => onConfirm("delete")}
            >
              Xóa vĩnh viễn
            </AdminLoadingButton>
          )}
          {!state.variantId && (
            <button
              type="button"
              className="btn-primary"
              disabled={state.submitting}
              onClick={() => onConfirm("delete")}
            >
              Xóa khỏi danh sách
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
