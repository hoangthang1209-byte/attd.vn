"use client";

import { useEffect, useId, useRef, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { ProductStatus } from "@prisma/client";

export type ProductBulkDialogKind =
  | "archive"
  | "status"
  | "publish"
  | "unpublish"
  | "moq"
  | "leadTime"
  | "capabilities";

type Props = {
  open: boolean;
  kind: ProductBulkDialogKind | null;
  selectedCount: number;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
};

const LEAD_TIME_PRESETS = [
  "Có sẵn: 1–3 ngày",
  "Đặt hàng: 5–10 ngày",
  "OEM: 10–20 ngày tuỳ số lượng",
] as const;

const CAPABILITY_ACTIONS: Array<{
  label: string;
  field: "supportsPrinting" | "supportsEmbroidery" | "supportsOem";
  value: boolean;
}> = [
  { label: "Bật hỗ trợ in", field: "supportsPrinting", value: true },
  { label: "Tắt hỗ trợ in", field: "supportsPrinting", value: false },
  { label: "Bật hỗ trợ thêu", field: "supportsEmbroidery", value: true },
  { label: "Tắt hỗ trợ thêu", field: "supportsEmbroidery", value: false },
  { label: "Bật hỗ trợ OEM", field: "supportsOem", value: true },
  { label: "Tắt hỗ trợ OEM", field: "supportsOem", value: false },
];

export default function ProductBulkDialogs({
  open,
  kind,
  selectedCount,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [moqValue, setMoqValue] = useState("");
  const [leadTimeValue, setLeadTimeValue] = useState("");
  const [capabilityKey, setCapabilityKey] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmLargeUpdate, setConfirmLargeUpdate] = useState(false);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
      setConfirmLargeUpdate(false);
      setLocalError(null);
      setMoqValue("");
      setLeadTimeValue("");
      setStatus("DRAFT");
      setCapabilityKey(0);
    }
  }, [open, kind]);

  if (!open || !kind) return null;

  const requiresLargeConfirm =
    selectedCount > 20 || kind === "archive" || kind === "publish" || kind === "status";

  const titleMap: Record<ProductBulkDialogKind, string> = {
    archive: "Lưu trữ sản phẩm",
    status: "Cập nhật trạng thái",
    publish: "Publish sản phẩm",
    unpublish: "Chuyển về nháp",
    moq: "Cập nhật MOQ",
    leadTime: "Cập nhật lead-time",
    capabilities: "Cập nhật tính năng",
  };

  function canSubmit(): boolean {
    if (selectedCount <= 0) return false;
    if (requiresLargeConfirm && !confirmLargeUpdate) return false;
    return true;
  }

  function submit() {
    setLocalError(null);
    if (kind === "archive") {
      onSubmit({ operation: "archive" });
      return;
    }
    if (kind === "publish") {
      onSubmit({ operation: "publish" });
      return;
    }
    if (kind === "unpublish") {
      onSubmit({ operation: "unpublish" });
      return;
    }
    if (kind === "status") {
      onSubmit({ operation: "status", status });
      return;
    }
    if (kind === "moq") {
      const value = Number(moqValue);
      if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
        setLocalError("Giá trị nhập không hợp lệ.");
        return;
      }
      onSubmit({ operation: "moq", moq: { mode: "set", value } });
      return;
    }
    if (kind === "leadTime") {
      const value = leadTimeValue.trim();
      if (!value) {
        setLocalError("Giá trị nhập không hợp lệ.");
        return;
      }
      onSubmit({ operation: "leadTime", leadTime: { mode: "set", value } });
      return;
    }
    if (kind === "capabilities") {
      const action = CAPABILITY_ACTIONS[capabilityKey];
      if (!action) {
        setLocalError("Giá trị nhập không hợp lệ.");
        return;
      }
      onSubmit({
        operation: "capabilities",
        capabilities: { field: action.field, value: action.value },
      });
    }
  }

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="product-bulk-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <h2 id={titleId}>{titleMap[kind]}</h2>
          <p className="admin-field-hint">Đã chọn {selectedCount} sản phẩm</p>
        </header>

        <div className="admin-modal-body">
          {kind === "archive" && (
            <p>
              Bạn sắp lưu trữ {selectedCount} sản phẩm. Sản phẩm sẽ không còn hiển thị trên website
              nhưng dữ liệu vẫn được giữ lại.
            </p>
          )}

          {kind === "publish" && (
            <p>
              Chỉ các sản phẩm đủ điều kiện publish mới được chuyển sang Đang bán. Sản phẩm chưa đủ
              điều kiện sẽ bị bỏ qua.
            </p>
          )}

          {kind === "unpublish" && (
            <p>Các sản phẩm đã chọn sẽ được chuyển về trạng thái Nháp.</p>
          )}

          {kind === "status" && (
            <label className="admin-field">
              <span>Trạng thái</span>
              <select
                className="admin-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
              >
                <option value="DRAFT">Nháp</option>
                <option value="ACTIVE">Đang bán</option>
                <option value="INACTIVE">Tạm dừng</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
          )}

          {kind === "moq" && (
            <label className="admin-field">
              <span>Đặt MOQ bằng</span>
              <input
                className="admin-input"
                type="number"
                min={1}
                step={1}
                value={moqValue}
                onChange={(e) => setMoqValue(e.target.value)}
                placeholder="Ví dụ: 50"
              />
            </label>
          )}

          {kind === "leadTime" && (
            <div className="admin-field">
              <span>Lead-time</span>
              <div className="admin-catalog-badges" style={{ marginBottom: 8 }}>
                {LEAD_TIME_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="admin-kb-tag"
                    onClick={() => setLeadTimeValue(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                className="admin-input"
                value={leadTimeValue}
                onChange={(e) => setLeadTimeValue(e.target.value)}
                placeholder="Nhập lead-time hoặc chọn gợi ý"
                maxLength={120}
              />
            </div>
          )}

          {kind === "capabilities" && (
            <label className="admin-field">
              <span>Thao tác</span>
              <select
                className="admin-input"
                value={capabilityKey}
                onChange={(e) => setCapabilityKey(Number(e.target.value))}
              >
                {CAPABILITY_ACTIONS.map((action, index) => (
                  <option key={action.label} value={index}>
                    {action.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {requiresLargeConfirm && (
            <label className="admin-checkbox-row" style={{ marginTop: 12 }}>
              <input
                type="checkbox"
                checked={confirmLargeUpdate}
                onChange={(e) => setConfirmLargeUpdate(e.target.checked)}
              />
              <span>
                Tôi xác nhận cập nhật {selectedCount} sản phẩm
                {kind === "archive" || kind === "publish" || kind === "status"
                  ? " (ảnh hưởng hiển thị công khai)"
                  : ""}
                .
              </span>
            </label>
          )}

          {(localError || error) && (
            <p className="admin-kb-warning" role="alert">
              {localError || error}
            </p>
          )}
        </div>

        <footer className="admin-modal-footer">
          <button ref={cancelRef} type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Huỷ
          </button>
          <AdminLoadingButton
            pending={submitting}
            pendingLabel={`Đang cập nhật ${selectedCount} sản phẩm...`}
            disabled={!canSubmit()}
            onClick={submit}
          >
            Xác nhận
          </AdminLoadingButton>
        </footer>
      </div>
    </div>
  );
}
