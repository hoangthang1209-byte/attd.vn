"use client";

type SpecRow = {
  id?: string;
  label: string;
  value: string;
  sortOrder?: number;
};

type Props = {
  rows: SpecRow[];
  fieldErrors?: Record<string, string>;
  onChange: (rows: SpecRow[]) => void;
};

export default function ProductCatalogSpecificationsSection({ rows, fieldErrors = {}, onChange }: Props) {
  function updateRow(index: number, patch: Partial<SpecRow>) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addRow() {
    onChange([...rows, { label: "", value: "", sortOrder: rows.length }]);
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
          {rows.map((row, index) => (
            <div key={row.id ?? `spec-${index}`} className="admin-spec-row" data-field-prefix={`specifications.${index}`}>
              <div className="admin-field">
                <input
                  type="text"
                  className={`form-input${fieldErrors[`specifications.${index}.label`] ? " admin-input--error" : ""}`}
                  placeholder="Tên thông số"
                  value={row.label}
                  data-field={`specifications.${index}.label`}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                />
                {fieldErrors[`specifications.${index}.label`] && (
                  <p className="admin-field-error" role="alert">{fieldErrors[`specifications.${index}.label`]}</p>
                )}
              </div>
              <div className="admin-field">
                <input
                  type="text"
                  className={`form-input${fieldErrors[`specifications.${index}.value`] ? " admin-input--error" : ""}`}
                  placeholder="Giá trị"
                  value={row.value}
                  data-field={`specifications.${index}.value`}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                />
                {fieldErrors[`specifications.${index}.value`] && (
                  <p className="admin-field-error" role="alert">{fieldErrors[`specifications.${index}.value`]}</p>
                )}
              </div>
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

export type { SpecRow as ProductSpecificationFormRow };
