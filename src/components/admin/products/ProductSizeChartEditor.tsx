"use client";

import {
  applyTeeShirtSizeChartColumns,
  buildSizeChartRowsFromVariantSizes,
  createEmptyProductSizeChart,
  type ProductSizeChart,
  type ProductSizeChartUnit,
} from "@/features/products/product-size-chart";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";

type Props = {
  value: ProductSizeChart;
  onChange: (next: ProductSizeChart) => void;
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  error?: string;
};

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ProductSizeChartEditor({
  value,
  onChange,
  options,
  variants,
  error,
}: Props) {
  function patch(partial: Partial<ProductSizeChart>) {
    onChange({ ...value, ...partial });
  }

  function updateColumnLabel(columnId: string, label: string) {
    onChange({
      ...value,
      columns: value.columns.map((column) =>
        column.id === columnId ? { ...column, label } : column,
      ),
    });
  }

  function updateRowSize(rowId: string, size: string) {
    onChange({
      ...value,
      rows: value.rows.map((row) => (row.id === rowId ? { ...row, size } : row)),
    });
  }

  function updateCell(rowId: string, columnId: string, cellValue: string) {
    onChange({
      ...value,
      rows: value.rows.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [columnId]: cellValue } }
          : row,
      ),
    });
  }

  function addColumn() {
    const id = newId("col");
    onChange({
      ...value,
      columns: [...value.columns, { id, label: "" }],
      rows: value.rows.map((row) => ({
        ...row,
        values: { ...row.values, [id]: "" },
      })),
    });
  }

  function removeColumn(columnId: string) {
    onChange({
      ...value,
      columns: value.columns.filter((column) => column.id !== columnId),
      rows: value.rows.map((row) => {
        const values = { ...row.values };
        delete values[columnId];
        return { ...row, values };
      }),
    });
  }

  function addRow() {
    const values: Record<string, string> = {};
    for (const column of value.columns) values[column.id] = "";
    onChange({
      ...value,
      rows: [...value.rows, { id: newId("row"), size: "", values }],
    });
  }

  function removeRow(rowId: string) {
    onChange({
      ...value,
      rows: value.rows.filter((row) => row.id !== rowId),
    });
  }

  function createFromVariantSizes() {
    const rows = buildSizeChartRowsFromVariantSizes({
      options,
      variants,
      existingColumns: value.columns,
    });
    if (rows.length === 0) {
      window.alert("Chưa có size từ biến thể/tuỳ chọn. Bạn có thể thêm hàng thủ công.");
      return;
    }
    onChange({
      ...value,
      enabled: true,
      rows,
    });
  }

  function addTeeColumns() {
    onChange(applyTeeShirtSizeChartColumns(value));
  }

  function clearChart() {
    if (!window.confirm("Xóa toàn bộ bảng size của sản phẩm này?")) return;
    onChange(createEmptyProductSizeChart());
  }

  return (
    <div className="admin-size-chart" data-testid="product-size-chart-editor">
      <div className="admin-size-chart__toolbar">
        <label className="admin-catalog-toggle">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          Hiển thị bảng size trên trang sản phẩm
        </label>
        <div className="admin-size-chart__actions">
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={createFromVariantSizes}>
            Tạo từ size biến thể
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={addTeeColumns}>
            Thêm cột cơ bản áo thun
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={clearChart}>
            Xóa bảng size
          </button>
        </div>
      </div>

      <div className="admin-seo-brief-form-grid">
        <div className="admin-field">
          <label className="admin-label">Tiêu đề</label>
          <input
            className="admin-input"
            value={value.title ?? ""}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Bảng size"
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn vị</label>
          <select
            className="admin-input"
            value={value.unit}
            onChange={(e) => patch({ unit: e.target.value as ProductSizeChartUnit })}
          >
            <option value="cm">cm</option>
            <option value="inch">inch</option>
          </select>
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-label">Ghi chú</label>
        <textarea
          className="admin-textarea"
          rows={2}
          value={value.note ?? ""}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="Thông số có thể chênh lệch ±1–2cm tùy chất liệu và phương pháp đo."
        />
      </div>

      <div className="admin-size-chart__table-wrap">
        <table className="admin-size-chart__table">
          <thead>
            <tr>
              <th scope="col">Size</th>
              {value.columns.map((column) => (
                <th key={column.id} scope="col">
                  <div className="admin-size-chart__col-head">
                    <input
                      className="admin-input"
                      value={column.label}
                      onChange={(e) => updateColumnLabel(column.id, e.target.value)}
                      placeholder="Cột đo"
                      aria-label="Nhãn cột đo"
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      title="Xóa cột"
                      onClick={() => removeColumn(column.id)}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th scope="col" className="admin-size-chart__row-actions">
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={addColumn}>
                  + Cột
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {value.rows.length === 0 ? (
              <tr>
                <td colSpan={value.columns.length + 2}>
                  <p className="admin-field-hint" style={{ margin: "8px 0" }}>
                    Chưa có hàng size. Dùng “Tạo từ size biến thể” hoặc thêm hàng thủ công.
                  </p>
                </td>
              </tr>
            ) : (
              value.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <input
                      className="admin-input"
                      value={row.size}
                      onChange={(e) => updateRowSize(row.id, e.target.value)}
                      placeholder="M"
                      aria-label="Size"
                    />
                  </th>
                  {value.columns.map((column) => (
                    <td key={column.id}>
                      <input
                        className="admin-input"
                        value={row.values[column.id] ?? ""}
                        onChange={(e) => updateCell(row.id, column.id, e.target.value)}
                        placeholder="50"
                        aria-label={`${row.size || "Size"} ${column.label || column.id}`}
                      />
                    </td>
                  ))}
                  <td className="admin-size-chart__row-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      title="Xóa hàng"
                      onClick={() => removeRow(row.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-size-chart__footer-actions">
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={addRow}>
          + Thêm hàng size
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={addColumn}>
          + Thêm cột đo
        </button>
      </div>

      {error && (
        <p className="admin-field-error" role="alert" data-field="publicSizeChart">
          {error}
        </p>
      )}
    </div>
  );
}
