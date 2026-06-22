"use client";

import type { ProductCustomizationRow } from "@/features/products/product-detail.types";

type Row = {
  id?: string;
  label: string;
  description?: string;
  sortOrder?: number;
  enabled?: boolean;
};

type Props = {
  rows: Row[];
  onChange: (rows: Row[]) => void;
};

export default function ProductCatalogContentSection({ rows, onChange }: Props) {
  function updateRow(index: number, patch: Partial<Row>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { label: "", description: "", enabled: true, sortOrder: rows.length }]);
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
          {rows.map((row, index) => (
            <div key={row.id ?? `custom-${index}`} className="admin-spec-row">
              <input
                type="text"
                className="form-input"
                placeholder="VD: In logo / in hình"
                value={row.label}
                onChange={(e) => updateRow(index, { label: e.target.value })}
              />
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
          ))}
        </div>
      )}
    </div>
  );
}

export type { Row as ProductCustomizationFormRow };
