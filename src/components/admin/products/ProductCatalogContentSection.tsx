"use client";

import { createClientKey } from "@/features/products/product-variant-matrix.utils";
import {
  customizationFieldKey,
  legacyKeysForCustomization,
  resolveFieldError,
} from "@/features/products/product-form-row-error-keys";

type Row = {
  id?: string;
  clientKey?: string;
  label: string;
  description?: string;
  sortOrder?: number;
  enabled?: boolean;
};

type Props = {
  rows: Row[];
  fieldErrors?: Record<string, string>;
  onChange: (rows: Row[]) => void;
  onFieldEdit?: (fieldKey: string) => void;
};

export default function ProductCatalogContentSection({ rows, fieldErrors = {}, onChange, onFieldEdit }: Props) {
  function updateRow(index: number, patch: Partial<Row>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([
      ...rows,
      { clientKey: createClientKey("custom"), label: "", description: "", enabled: true, sortOrder: rows.length },
    ]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function moveRow(index: number, dir: -1 | 1) {
    const next = [...rows];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((row, i) => ({ ...row, sortOrder: i })));
  }

  return (
    <div className="admin-product-section">
      <div className="admin-section-head">
        <h3>Khả năng tùy chỉnh</h3>
        <button type="button" className="btn-secondary btn-sm" onClick={addRow}>
          Thêm khả năng
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="admin-empty-hint">Chưa cấu hình khả năng tùy chỉnh.</p>
      ) : (
        <div className="admin-spec-list">
          {rows.map((row, index) => {
            const labelError = resolveFieldError(
              fieldErrors,
              customizationFieldKey(row, "label"),
              legacyKeysForCustomization(rows, row, "label"),
            );

            return (
              <div
                key={row.clientKey ?? row.id ?? `custom-${index}`}
                className={`admin-spec-row${labelError ? " admin-spec-row--has-error" : ""}`}
                data-field-prefix={customizationFieldKey(row, "label").replace(/\.label$/, "")}
              >
                <div className="admin-field">
                  <input
                    type="text"
                    className={`form-input${labelError ? " admin-input--error" : ""}`}
                    placeholder="VD: In logo / in hình"
                    value={row.label}
                    data-field={customizationFieldKey(row, "label")}
                    aria-invalid={Boolean(labelError)}
                    onChange={(e) => {
                      updateRow(index, { label: e.target.value });
                      onFieldEdit?.(customizationFieldKey(row, "label"));
                    }}
                  />
                  {labelError && (
                    <p className="admin-field-error" role="alert">{labelError}</p>
                  )}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mô tả ngắn (tuỳ chọn)"
                  value={row.description ?? ""}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                />
                <label className="admin-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={row.enabled !== false}
                    onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                  />
                  Hiển thị
                </label>
                <div className="admin-spec-row-actions">
                  <button type="button" className="btn-tertiary btn-sm" onClick={() => moveRow(index, -1)}>↑</button>
                  <button type="button" className="btn-tertiary btn-sm" onClick={() => moveRow(index, 1)}>↓</button>
                  <button type="button" className="btn-tertiary btn-sm" onClick={() => removeRow(index)}>Xóa</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { Row as ProductCustomizationFormRow };
