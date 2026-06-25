"use client";

import { createClientKey } from "@/features/products/product-variant-matrix.utils";
import {
  legacyKeysForCustomization,
  legacyKeysForSpecification,
  resolveFieldError,
  specificationFieldKey,
  customizationFieldKey,
} from "@/features/products/product-form-row-error-keys";

type SpecRow = {
  id?: string;
  clientKey?: string;
  label: string;
  value: string;
  sortOrder?: number;
};

type Props = {
  rows: SpecRow[];
  fieldErrors?: Record<string, string>;
  onChange: (rows: SpecRow[]) => void;
  onFieldEdit?: (fieldKey: string) => void;
};

export default function ProductCatalogSpecificationsSection({ rows, fieldErrors = {}, onChange, onFieldEdit }: Props) {
  function updateRow(index: number, patch: Partial<SpecRow>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { clientKey: createClientKey("spec"), label: "", value: "", sortOrder: rows.length }]);
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
        <h3>Thông số nổi bật</h3>
        <button type="button" className="btn-secondary btn-sm" onClick={addRow}>
          Thêm thông số
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="admin-empty-hint">Chưa có thông số. Thêm các dòng như Chất liệu, Định lượng, MOQ...</p>
      ) : (
        <div className="admin-spec-list">
          {rows.map((row, index) => {
            const labelError = resolveFieldError(
              fieldErrors,
              specificationFieldKey(row, "label"),
              legacyKeysForSpecification(rows, row, "label"),
            );
            const valueError = resolveFieldError(
              fieldErrors,
              specificationFieldKey(row, "value"),
              legacyKeysForSpecification(rows, row, "value"),
            );
            const rowHasError = Boolean(labelError || valueError);

            return (
              <div
                key={row.clientKey ?? row.id ?? `spec-${index}`}
                className={`admin-spec-row${rowHasError ? " admin-spec-row--has-error" : ""}`}
                data-field-prefix={specificationFieldKey(row, "label").replace(/\.label$/, "")}
              >
                <div className="admin-field">
                  <input
                    type="text"
                    className={`form-input${labelError ? " admin-input--error" : ""}`}
                    placeholder="Tên thông số"
                    value={row.label}
                    data-field={specificationFieldKey(row, "label")}
                    aria-invalid={Boolean(labelError)}
                    onChange={(e) => {
                      updateRow(index, { label: e.target.value });
                      onFieldEdit?.(specificationFieldKey(row, "label"));
                    }}
                  />
                  {labelError && (
                    <p className="admin-field-error" role="alert">{labelError}</p>
                  )}
                </div>
                <div className="admin-field">
                  <input
                    type="text"
                    className={`form-input${valueError ? " admin-input--error" : ""}`}
                    placeholder="Giá trị"
                    value={row.value}
                    data-field={specificationFieldKey(row, "value")}
                    aria-invalid={Boolean(valueError)}
                    onChange={(e) => {
                      updateRow(index, { value: e.target.value });
                      onFieldEdit?.(specificationFieldKey(row, "value"));
                    }}
                  />
                  {valueError && (
                    <p className="admin-field-error" role="alert">{valueError}</p>
                  )}
                </div>
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

export type { SpecRow as ProductSpecificationFormRow };
