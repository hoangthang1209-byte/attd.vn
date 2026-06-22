"use client";

import { useState } from "react";
import {
  EXPORT_ENTITY_TYPES,
  EXPORT_SCOPE_LABELS,
  type ExportEntityType,
  type ExportScopeType,
} from "@/features/products/product-export.constants";
import type { ProductListParams } from "@/features/products/product-admin.service";

export type ProductExportDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultScope: ExportScopeType;
  productIds?: string[];
  filters?: ProductListParams;
  cloneTemplate?: boolean;
  selectedCount?: number;
};

export default function ProductExportDialog({
  open,
  onClose,
  defaultScope,
  productIds,
  filters,
  cloneTemplate = false,
  selectedCount = 0,
}: ProductExportDialogProps) {
  const [scope, setScope] = useState<ExportScopeType>(defaultScope);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [csvEntity, setCsvEntity] = useState<ExportEntityType>("product");
  const [includeWholesalePrice, setIncludeWholesalePrice] = useState(false);
  const [includeDealerPrice, setIncludeDealerPrice] = useState(false);
  const [includeInactiveVariants, setIncludeInactiveVariants] = useState(true);
  const [includeSpecifications, setIncludeSpecifications] = useState(true);
  const [includeCustomizations, setIncludeCustomizations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleExport() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/products/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          format,
          csvEntity: format === "csv" ? csvEntity : undefined,
          productIds,
          filters,
          includeWholesalePrice,
          includeDealerPrice,
          includeInactiveVariants,
          includeSpecifications,
          includeCustomizations,
          cloneTemplate,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string; error?: string };
        setError(data.message ?? data.error ?? "Không thể tạo tệp xuất. Vui lòng thử lại.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] ?? (format === "xlsx" ? "attd-san-pham.xlsx" : "attd-san-pham.csv");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch {
      setError("Không thể tạo tệp xuất. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const scopeOptions: ExportScopeType[] = cloneTemplate
    ? ["single"]
    : defaultScope === "selected"
      ? ["selected", "filtered", "all"]
      : defaultScope === "single"
        ? ["single"]
        : ["filtered", "all", "selected"];

  return (
    <div className="admin-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h3 id="product-export-title">
            {cloneTemplate ? "Xuất mẫu để nhân bản" : "Xuất dữ liệu sản phẩm"}
          </h3>
          <button type="button" className="btn-tertiary btn-sm" onClick={onClose}>
            Đóng
          </button>
        </div>

        {cloneTemplate && (
          <p className="admin-field-hint">
            Tệp xuất dùng để chỉnh sửa offline rồi nhập lại ở chế độ &quot;Tạo sản phẩm mới&quot;. Bắt buộc đổi productCode, systemCode, name, slug và SKU trước khi nhập — nếu không sẽ ghi đè hoặc trùng bản ghi.
          </p>
        )}

        <div className="admin-field">
          <label className="admin-label">Phạm vi xuất</label>
          <select className="admin-input" value={scope} onChange={(e) => setScope(e.target.value as ExportScopeType)}>
            {scopeOptions.map((value) => (
              <option key={value} value={value}>
                {EXPORT_SCOPE_LABELS[value]}
                {value === "selected" && selectedCount > 0 ? ` (${selectedCount})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-field">
          <label className="admin-label">Định dạng</label>
          <select
            className="admin-input"
            value={format}
            onChange={(e) => setFormat(e.target.value as "xlsx" | "csv")}
          >
            <option value="xlsx">Workbook XLSX (round-trip đầy đủ)</option>
            <option value="csv">CSV (một sheet)</option>
          </select>
          {format === "csv" && (
            <p className="admin-field-hint">CSV chỉ xuất một loại dữ liệu. Dùng XLSX để round-trip đầy đủ.</p>
          )}
        </div>

        {format === "csv" && (
          <div className="admin-field">
            <label className="admin-label">Sheet CSV</label>
            <select
              className="admin-input"
              value={csvEntity}
              onChange={(e) => setCsvEntity(e.target.value as ExportEntityType)}
            >
              {EXPORT_ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>
                  {entity === "product"
                    ? "Sản phẩm"
                    : entity === "variant"
                      ? "Biến thể"
                      : entity === "specification"
                        ? "Thông số"
                        : "Tùy chỉnh"}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 12 }}>
          <legend className="admin-subtitle">Tùy chọn xuất</legend>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={includeSpecifications} onChange={(e) => setIncludeSpecifications(e.target.checked)} />
            Bao gồm thông số sản phẩm
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={includeCustomizations} onChange={(e) => setIncludeCustomizations(e.target.checked)} />
            Bao gồm khả năng tùy chỉnh
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={includeInactiveVariants} onChange={(e) => setIncludeInactiveVariants(e.target.checked)} />
            Bao gồm biến thể ngừng sử dụng / lưu trữ
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={includeWholesalePrice} onChange={(e) => setIncludeWholesalePrice(e.target.checked)} />
            Bao gồm giá sỉ nội bộ
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={includeDealerPrice} onChange={(e) => setIncludeDealerPrice(e.target.checked)} />
            Bao gồm giá đại lý nội bộ
          </label>
          <p className="admin-field-hint">Giá nội bộ tắt mặc định. Chỉ bật khi cần chỉnh sửa giá trong file offline.</p>
        </fieldset>

        {error && (
          <p className="admin-field-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="admin-field-hint" style={{ color: "var(--admin-success, green)" }} role="status">
            Đã tạo tệp xuất sản phẩm.
          </p>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => void handleExport()}
            disabled={loading}
          >
            {loading ? "Đang chuẩn bị dữ liệu xuất…" : "Tải tệp xuất"}
          </button>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose} disabled={loading}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
