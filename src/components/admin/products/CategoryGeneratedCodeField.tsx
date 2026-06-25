"use client";

import { RefreshCw } from "lucide-react";
import { CATEGORY_CODE_GENERATION_FAILED } from "@/features/categories/category-admin-constants";

export type CategoryCodePreviewState = {
  code: string;
  status: "idle" | "loading" | "available" | "error";
  message: string;
  isPreview: boolean;
};

type Props = {
  id?: string;
  value: string;
  preview: CategoryCodePreviewState;
  legacyNotice?: boolean;
  onRegenerate: () => void;
  disabled?: boolean;
};

export function emptyCategoryCodePreview(): CategoryCodePreviewState {
  return { code: "", status: "idle", message: "", isPreview: false };
}

export function statusMessage(preview: CategoryCodePreviewState): string | null {
  if (preview.status === "loading") return "Đang tạo mã...";
  if (preview.status === "error") return preview.message || CATEGORY_CODE_GENERATION_FAILED;
  if (preview.status === "available") {
    return preview.isPreview
      ? "Mã mới (bấm “Tạo lại mã” hoặc lưu để áp dụng)"
      : "Mã khả dụng";
  }
  return null;
}

export default function CategoryGeneratedCodeField({
  id = "category-generated-code",
  value,
  preview,
  legacyNotice = false,
  onRegenerate,
  disabled = false,
}: Props) {
  const displayValue = preview.code || value;
  const status = statusMessage(preview);

  return (
    <div className="admin-field" data-field="skuCode">
      <label className="admin-label" htmlFor={id}>
        Mã danh mục
      </label>
      <div className="admin-category-code-readonly">
        <output
          id={id}
          className="admin-input admin-input--readonly admin-category-code-readonly__value"
          aria-live="polite"
        >
          {displayValue || "—"}
        </output>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs admin-category-code-readonly__reload"
          onClick={onRegenerate}
          disabled={disabled || preview.status === "loading"}
          title="Tạo lại mã"
          aria-label="Tạo lại mã"
        >
          <RefreshCw size={14} aria-hidden className={preview.status === "loading" ? "is-spinning" : ""} />
        </button>
        <button
          type="button"
          className="btn-tertiary btn-sm"
          onClick={onRegenerate}
          disabled={disabled || preview.status === "loading"}
        >
          Tạo lại mã
        </button>
      </div>
      <p className="admin-field-hint">Mã được hệ thống tự tạo từ tên tiếng Anh.</p>
      {legacyNotice && (
        <p className="admin-field-hint admin-field-hint--warning">
          Mã danh mục cũ chưa theo chuẩn 4 chữ cái. Hãy nhập hoặc cập nhật tên tiếng Anh, sau đó bấm
          &quot;Tạo lại mã&quot;.
        </p>
      )}
      {status && (
        <p
          className={`admin-category-code-status admin-category-code-status--${
            preview.status === "error" ? "taken" : preview.status === "loading" ? "suggested" : "available"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
