"use client";

import { useEffect, useId, useRef, useState } from "react";
import MediaPicker from "@/components/admin/media/MediaPicker";
import type { BulkBlockedItem } from "@/features/products/product-variant-bulk.service";
import { VARIANT_STATUS_OPTIONS } from "@/features/products/product-variant-labels";
import { isValidProductImageUrl, PRODUCT_IMAGE_URL_ERROR } from "@/features/products/product-image-url";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

export type BulkDialogKind =
  | "status"
  | "stock"
  | "moq"
  | "leadTime"
  | "sku"
  | "image"
  | "lifecycle";

type Props = {
  open: boolean;
  kind: BulkDialogKind | null;
  selectedCount: number;
  persistedCount: number;
  productCode: string;
  submitting: boolean;
  error: string | null;
  blockedItems?: BulkBlockedItem[];
  skuPreview?: Array<{ id: string; currentSku: string; nextSku: string }>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  onPreviewSku?: (payload: Record<string, unknown>) => void;
};

export default function VariantBulkDialogs({
  open,
  kind,
  selectedCount,
  persistedCount,
  productCode,
  submitting,
  error,
  blockedItems,
  skuPreview,
  onClose,
  onSubmit,
  onPreviewSku,
}: Props) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ARCHIVED">("INACTIVE");
  const [lifecycleMode, setLifecycleMode] = useState<"archive" | "restore" | "delete">("archive");
  const [stockMode, setStockMode] = useState<"set" | "increase" | "decrease">("set");
  const [stockQty, setStockQty] = useState("0");
  const [stockStatus, setStockStatus] = useState("");
  const [moqMode, setMoqMode] = useState<"set" | "clear">("set");
  const [moqValue, setMoqValue] = useState("");
  const [leadTimeMode, setLeadTimeMode] = useState<"set" | "clear">("set");
  const [leadTimeValue, setLeadTimeValue] = useState("");
  const [skuMode, setSkuMode] = useState<"affix" | "sequential">("affix");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [skuSuffix, setSkuSuffix] = useState("");
  const [skuStart, setSkuStart] = useState("1");
  const [skuPadding, setSkuPadding] = useState("2");
  const [confirmOverwriteSku, setConfirmOverwriteSku] = useState(false);
  const [imageMode, setImageMode] = useState<"set" | "clear">("set");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open, kind]);

  if (!open || !kind) return null;

  const titleMap: Record<BulkDialogKind, string> = {
    status: "Cập nhật trạng thái",
    stock: "Cập nhật tồn kho",
    moq: "Cập nhật MOQ",
    leadTime: "Cập nhật thời gian sản xuất",
    sku: "Cập nhật SKU",
    image: "Gán ảnh biến thể",
    lifecycle: "Quản lý trạng thái",
  };

  function submitLifecycle() {
    if (lifecycleMode === "delete") {
      onSubmit({ operation: "delete" });
      return;
    }
    if (lifecycleMode === "archive") {
      onSubmit({ operation: "archive" });
      return;
    }
    onSubmit({ operation: "restore" });
  }

  function submitStatus() {
    onSubmit({ operation: "status", status });
  }

  function submitStock() {
    onSubmit({
      operation: "stock",
      stock: {
        mode: stockMode,
        quantity: Number(stockQty),
        ...(stockStatus ? { stockStatus } : {}),
      },
    });
  }

  function submitMoq() {
    onSubmit({
      operation: "moq",
      moq: moqMode === "clear" ? { mode: "clear" } : { mode: "set", value: Number(moqValue) },
    });
  }

  function submitLeadTime() {
    onSubmit({
      operation: "leadTime",
      leadTime:
        leadTimeMode === "clear"
          ? { mode: "clear" }
          : { mode: "set", value: leadTimeValue },
    });
  }

  function submitSku(previewOnly = false) {
    const payload: Record<string, unknown> = {
      operation: "sku",
      previewOnly,
      confirmOverwriteSku: confirmOverwriteSku || skuMode === "sequential",
      sku: {
        mode: skuMode,
        prefix: skuPrefix,
        suffix: skuSuffix,
        startNumber: Number(skuStart),
        padding: Number(skuPadding),
        overwrite: confirmOverwriteSku,
      },
    };
    if (previewOnly && onPreviewSku) {
      onPreviewSku(payload);
      return;
    }
    onSubmit(payload);
  }

  function submitImage() {
    if (imageMode === "set" && imageUrl.trim() && !isValidProductImageUrl(imageUrl)) {
      setImageError(PRODUCT_IMAGE_URL_ERROR);
      return;
    }
    setImageError(null);
    onSubmit({
      operation: "image",
      image:
        imageMode === "clear"
          ? { mode: "clear" }
          : { mode: "set", imageUrl },
    });
  }

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id={titleId}>{titleMap[kind]}</h3>
          <button type="button" className="btn-tertiary btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>

        <p className="admin-field-hint">
          Đã chọn {selectedCount} biến thể ({persistedCount} đã lưu trên hệ thống).
        </p>

        {error && (
          <p className="admin-field-error" role="alert">
            {error}
          </p>
        )}

        {blockedItems && blockedItems.length > 0 && (
          <div className="admin-kb-warning-list" role="status">
            <p>{blockedItems.length} biến thể bị chặn xóa vĩnh viễn:</p>
            <ul>
              {blockedItems.slice(0, 8).map((item) => (
                <li key={item.id}>
                  {item.displayLabel || item.sku}: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {kind === "lifecycle" && (
          <div className="admin-spec-row">
            <label className="admin-label">Thao tác</label>
            <select
              className="form-input"
              value={lifecycleMode}
              onChange={(e) => setLifecycleMode(e.target.value as typeof lifecycleMode)}
            >
              <option value="archive">Ngừng sử dụng</option>
              <option value="restore">Kích hoạt lại</option>
              <option value="delete">Xóa vĩnh viễn</option>
            </select>
            {lifecycleMode === "delete" && (
              <p className="admin-field-hint">
                Xóa vĩnh viễn chỉ thực hiện khi tất cả biến thể đã chọn đều an toàn để xóa.
              </p>
            )}
          </div>
        )}

        {kind === "status" && (
          <div className="admin-spec-row">
            <label className="admin-label">Trạng thái mới</label>
            <select
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {VARIANT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {kind === "stock" && (
          <>
            <div className="admin-spec-row">
              <label className="admin-label">Kiểu cập nhật</label>
              <select
                className="form-input"
                value={stockMode}
                onChange={(e) => setStockMode(e.target.value as typeof stockMode)}
              >
                <option value="set">Đặt số lượng cố định</option>
                <option value="increase">Tăng thêm</option>
                <option value="decrease">Giảm bớt</option>
              </select>
            </div>
            <div className="admin-spec-row">
              <label className="admin-label">Số lượng</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </div>
            <div className="admin-spec-row">
              <label className="admin-label">Trạng thái tồn kho (tuỳ chọn)</label>
              <select
                className="form-input"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
              >
                <option value="">Giữ nguyên</option>
                <option value="IN_STOCK">Còn hàng</option>
                <option value="LOW_STOCK">Sắp hết</option>
                <option value="OUT_OF_STOCK">Hết hàng</option>
                <option value="PREORDER">Đặt trước</option>
              </select>
            </div>
          </>
        )}

        {kind === "moq" && (
          <>
            <div className="admin-spec-row">
              <label className="admin-label">MOQ riêng</label>
              <select
                className="form-input"
                value={moqMode}
                onChange={(e) => setMoqMode(e.target.value as typeof moqMode)}
              >
                <option value="set">Đặt giá trị riêng</option>
                <option value="clear">Dùng giá trị của sản phẩm</option>
              </select>
            </div>
            {moqMode === "set" && (
              <input
                className="form-input"
                type="number"
                min="1"
                value={moqValue}
                onChange={(e) => setMoqValue(e.target.value)}
                placeholder="MOQ (cái)"
              />
            )}
          </>
        )}

        {kind === "leadTime" && (
          <>
            <div className="admin-spec-row">
              <label className="admin-label">Thời gian sản xuất</label>
              <select
                className="form-input"
                value={leadTimeMode}
                onChange={(e) => setLeadTimeMode(e.target.value as typeof leadTimeMode)}
              >
                <option value="set">Đặt giá trị riêng</option>
                <option value="clear">Dùng giá trị của sản phẩm</option>
              </select>
            </div>
            {leadTimeMode === "set" && (
              <input
                className="form-input"
                value={leadTimeValue}
                onChange={(e) => setLeadTimeValue(e.target.value)}
                placeholder="VD: Đặt hàng: 5–10 ngày"
              />
            )}
          </>
        )}

        {kind === "sku" && (
          <>
            <div className="admin-spec-row">
              <label className="admin-label">Chế độ SKU</label>
              <select
                className="form-input"
                value={skuMode}
                onChange={(e) => setSkuMode(e.target.value as typeof skuMode)}
              >
                <option value="affix">Thêm tiền tố / hậu tố</option>
                <option value="sequential">Đánh số tuần tự</option>
              </select>
            </div>
            {skuMode === "affix" ? (
              <>
                <input
                  className="form-input"
                  value={skuPrefix}
                  onChange={(e) => setSkuPrefix(e.target.value)}
                  placeholder="Tiền tố"
                />
                <input
                  className="form-input"
                  value={skuSuffix}
                  onChange={(e) => setSkuSuffix(e.target.value)}
                  placeholder="Hậu tố"
                />
              </>
            ) : (
              <>
                <p className="admin-field-hint">Mã sản phẩm: {productCode || "—"}</p>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={skuStart}
                  onChange={(e) => setSkuStart(e.target.value)}
                  placeholder="Số bắt đầu"
                />
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="6"
                  value={skuPadding}
                  onChange={(e) => setSkuPadding(e.target.value)}
                  placeholder="Số chữ số (padding)"
                />
              </>
            )}
            <label className="admin-catalog-toggle">
              <input
                type="checkbox"
                checked={confirmOverwriteSku}
                onChange={(e) => setConfirmOverwriteSku(e.target.checked)}
              />
              Xác nhận ghi đè SKU hiện có
            </label>
            {skuPreview && skuPreview.length > 0 && (
              <div className="admin-variant-sku-preview">
                <p className="admin-field-hint">Xem trước SKU:</p>
                <ul>
                  {skuPreview.map((row) => (
                    <li key={row.id}>
                      {row.currentSku} → {row.nextSku}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {kind === "image" && (
          <>
            <div className="admin-spec-row">
              <label className="admin-label">Ảnh biến thể</label>
              <select
                className="form-input"
                value={imageMode}
                onChange={(e) => setImageMode(e.target.value as typeof imageMode)}
              >
                <option value="set">Ảnh riêng của biến thể</option>
                <option value="clear">Dùng ảnh sản phẩm</option>
              </select>
            </div>
            {imageMode === "set" && (
              <>
                <MediaPicker
                  value={imageUrl}
                  onChange={(value) => {
                    setImageUrl(value);
                    setImageError(null);
                  }}
                  label="Chọn ảnh (URL https://)"
                  folder="products"
                />
                {imageError && (
                  <p className="admin-field-error" role="alert">
                    {imageError}
                  </p>
                )}
              </>
            )}
          </>
        )}

        <div className="admin-variant-lifecycle-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          {kind === "sku" && (
            <button
              type="button"
              className="btn-secondary"
              disabled={submitting || persistedCount === 0}
              onClick={() => submitSku(true)}
            >
              Xem trước
            </button>
          )}
          <AdminLoadingButton
            variant="primary"
            className="btn-primary"
            pending={submitting}
            pendingLabel="Đang áp dụng thay đổi..."
            disabled={persistedCount === 0}
            onClick={() => {
              if (kind === "lifecycle") submitLifecycle();
              else if (kind === "status") submitStatus();
              else if (kind === "stock") submitStock();
              else if (kind === "moq") submitMoq();
              else if (kind === "leadTime") submitLeadTime();
              else if (kind === "sku") submitSku(false);
              else if (kind === "image") submitImage();
            }}
          >
            Áp dụng
          </AdminLoadingButton>
        </div>
      </div>
    </div>
  );
}
