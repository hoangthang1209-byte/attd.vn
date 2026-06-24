"use client";

import { useMemo, useRef, useState } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  isProcessingWithDecoration,
  PROCESSING_METHOD_OPTIONS,
  SUPPLY_SOURCE_OPTIONS,
} from "@/features/orders/order-item-classification";
import { requiresCatalogColor } from "@/features/orders/quick-order/quick-order-color";
import {
  columnHasQuantities,
  emptyQuickOrderSizeQuantities,
  removeSizeColumn,
  sumQuickOrderSizeQuantities,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";
import {
  sumQuickOrderSizes,
  type QuickOrderGridRow,
} from "@/features/orders/quick-order/quick-order.types";

type ProductOption = {
  id: string;
  name: string;
  productCode: string | null;
  hasStockVariants?: boolean;
};

type Props = {
  rows: QuickOrderGridRow[];
  sizeColumns: QuickOrderSizeColumn[];
  products: ProductOption[];
  revenueCategories: Array<{ id: string; code: string; name: string; displayPath: string }>;
  productColorsByProductId: Record<string, Array<{ id: string; name: string }>>;
  onRowsChange: (rows: QuickOrderGridRow[]) => void;
  onSizeColumnsChange: (columns: QuickOrderSizeColumn[]) => void;
  onLoadProductColors: (productId: string) => Promise<void>;
  revenueSuggestionRowKey: string | null;
  onDismissRevenueSuggestion: () => void;
  onApplyRevenueSuggestion: (rowKey: string, categoryId: string) => void;
};

function lineTotal(row: QuickOrderGridRow, sizeColumns: QuickOrderSizeColumn[]): number {
  return sumQuickOrderSizes(row.sizes, sizeColumns) * (row.unitPrice || 0);
}

function isCatalogColorId(colorId: string | null): boolean {
  return Boolean(colorId && !colorId.startsWith("name:"));
}

export default function QuickOrderGrid({
  rows,
  sizeColumns,
  products,
  revenueCategories,
  productColorsByProductId,
  onRowsChange,
  onSizeColumnsChange,
  onLoadProductColors,
  revenueSuggestionRowKey,
  onDismissRevenueSuggestion,
  onApplyRevenueSuggestion,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [removeSizeKey, setRemoveSizeKey] = useState<string | null>(null);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.productCode ? `${p.name} (${p.productCode})` : p.name,
      })),
    [products],
  );

  const revenueOptions = useMemo(
    () => revenueCategories.map((c) => ({ value: c.id, label: c.displayPath })),
    [revenueCategories],
  );

  function updateRow(index: number, patch: Partial<QuickOrderGridRow>) {
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleProductSelect(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    void onLoadProductColors(product.id);
    updateRow(index, {
      productId: product.id,
      productName: product.name,
      supplySource: product.hasStockVariants ? "ATTD_STOCK" : rows[index]?.supplySource ?? null,
      processingMethod: rows[index]?.processingMethod ?? "AS_IS",
      revenueCategoryId:
        rows[index]?.revenueCategoryId ??
        revenueCategories.find((c) => c.code === "WHOLESALE_BLANK")?.id ??
        null,
      isCustomColor: false,
      colorId: null,
      colorName: "",
      colorCode: "",
    });
  }

  function duplicateRow(index: number) {
    const source = rows[index];
    if (!source) return;
    const copy: QuickOrderGridRow = {
      ...source,
      key: `row-${Date.now()}-${index}`,
      sizes: { ...source.sizes },
    };
    const next = [...rows];
    next.splice(index + 1, 0, copy);
    onRowsChange(next);
  }

  function removeRow(index: number) {
    onRowsChange(rows.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    onRowsChange(next);
  }

  function clearSizes(index: number) {
    updateRow(index, { sizes: emptyQuickOrderSizeQuantities(sizeColumns) });
  }

  function requestRemoveSizeColumn(key: string) {
    const column = sizeColumns.find((col) => col.key === key);
    if (!column || column.isDefault) return;
    if (columnHasQuantities(rows, key)) {
      setRemoveSizeKey(key);
      return;
    }
    applyRemoveSizeColumn(key);
  }

  function applyRemoveSizeColumn(key: string) {
    const nextColumns = removeSizeColumn(sizeColumns, key);
    onSizeColumnsChange(nextColumns);
    onRowsChange(
      rows.map((row) => {
        const { [key]: _removed, ...rest } = row.sizes;
        return { ...row, sizes: ensureSizes(rest, nextColumns) };
      }),
    );
    setRemoveSizeKey(null);
  }

  function ensureSizes(
    sizes: Record<string, number>,
    columns: QuickOrderSizeColumn[],
  ): Record<string, number> {
    const next = emptyQuickOrderSizeQuantities(columns);
    for (const col of columns) {
      next[col.key] = sizes[col.key] ?? 0;
    }
    return next;
  }

  const uniformSuggestionOptions = revenueCategories.filter((c) =>
    ["UNIFORM", "UNIFORM_TSHIRT", "UNIFORM_POLO", "EVENT_MERCH", "EVENT_TSHIRT", "MERCH_TOTE"].includes(
      c.code,
    ),
  );

  const removeSizeColumnLabel = sizeColumns.find((col) => col.key === removeSizeKey)?.label;

  return (
    <div className="quick-order-grid-wrap">
      {removeSizeKey && (
        <div className="quick-order-dialog-backdrop" role="presentation">
          <div className="quick-order-dialog" role="dialog" aria-labelledby="remove-size-title">
            <h3 id="remove-size-title">Xóa cột size?</h3>
            <p>
              Các số lượng đã nhập ở size {removeSizeColumnLabel} sẽ bị xóa khỏi bảng.
            </p>
            <div className="quick-order-dialog__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setRemoveSizeKey(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => applyRemoveSizeColumn(removeSizeKey)}
              >
                Xóa cột
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="quick-order-grid" ref={tableRef}>
        <thead>
          <tr>
            <th>STT</th>
            <th>Mã dòng / SKU khách</th>
            <th>Sản phẩm</th>
            <th>Sản phẩm lấy từ</th>
            <th>Cách xử lý</th>
            <th>Nhóm doanh thu</th>
            <th>Màu</th>
            <th>Mô tả / yêu cầu kỹ thuật</th>
            {sizeColumns.map((column) => (
              <th key={column.key} className="quick-order-grid__size-header">
                <span className="quick-order-grid__size-label">{column.label}</span>
                {!column.isDefault && (
                  <button
                    type="button"
                    className="quick-order-grid__size-remove"
                    title={`Xóa cột ${column.label}`}
                    onClick={() => requestRemoveSizeColumn(column.key)}
                  >
                    ×
                  </button>
                )}
              </th>
            ))}
            <th>Tổng SL</th>
            <th>Đơn vị</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const totalQty = sumQuickOrderSizeQuantities(row.sizes, sizeColumns);
            const colors = row.productId ? productColorsByProductId[row.productId] ?? [] : [];
            const catalogColors = colors.filter((c) => isCatalogColorId(c.id));
            const stockOnly = requiresCatalogColor(row.supplySource);
            const showCustomColor = !stockOnly && (row.isCustomColor || !catalogColors.length);
            const showSuggestion =
              revenueSuggestionRowKey === row.key &&
              isProcessingWithDecoration(row.processingMethod) &&
              uniformSuggestionOptions.length > 0;

            return (
              <tr key={row.key}>
                <td>{index + 1}</td>
                <td>
                  <input
                    className="admin-input admin-input--compact"
                    value={row.lineCode}
                    onChange={(e) => updateRow(index, { lineCode: e.target.value })}
                  />
                </td>
                <td>
                  <AdminSearchableSelect
                    value={row.productId ?? ""}
                    options={productOptions}
                    placeholder="Chọn sản phẩm"
                    onChange={(value) => handleProductSelect(index, value)}
                  />
                  <input
                    className="admin-input admin-input--compact"
                    style={{ marginTop: 4 }}
                    value={row.productName}
                    onChange={(e) =>
                      updateRow(index, { productName: e.target.value, productId: null })
                    }
                    placeholder="Hoặc nhập tên sản phẩm"
                  />
                  {row.fieldErrors?.productName && (
                    <p className="admin-field-error">{row.fieldErrors.productName}</p>
                  )}
                </td>
                <td>
                  <select
                    className="admin-input admin-input--compact"
                    value={row.supplySource ?? ""}
                    onChange={(e) => {
                      const supplySource = (e.target.value || null) as QuickOrderGridRow["supplySource"];
                      const patch: Partial<QuickOrderGridRow> = { supplySource };
                      if (requiresCatalogColor(supplySource) && row.isCustomColor) {
                        patch.isCustomColor = false;
                        patch.colorId = null;
                        patch.colorName = "";
                        patch.colorCode = "";
                      }
                      updateRow(index, patch);
                    }}
                  >
                    <option value="">—</option>
                    {SUPPLY_SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {row.fieldErrors?.supplySource && (
                    <p className="admin-field-error">{row.fieldErrors.supplySource}</p>
                  )}
                </td>
                <td>
                  <select
                    className="admin-input admin-input--compact"
                    value={row.processingMethod ?? ""}
                    onChange={(e) =>
                      updateRow(index, {
                        processingMethod: (e.target.value || null) as QuickOrderGridRow["processingMethod"],
                      })
                    }
                  >
                    <option value="">—</option>
                    {PROCESSING_METHOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {row.fieldErrors?.processingMethod && (
                    <p className="admin-field-error">{row.fieldErrors.processingMethod}</p>
                  )}
                </td>
                <td>
                  <AdminSearchableSelect
                    value={row.revenueCategoryId ?? ""}
                    options={revenueOptions}
                    placeholder="Chọn nhóm doanh thu"
                    onChange={(value) => updateRow(index, { revenueCategoryId: value || null })}
                  />
                  {row.fieldErrors?.revenueCategoryId && (
                    <p className="admin-field-error">{row.fieldErrors.revenueCategoryId}</p>
                  )}
                  {showSuggestion && (
                    <div className="quick-order-suggestion">
                      <p>Bạn có muốn đổi nhóm doanh thu sang nhóm đồng phục hoặc merchandise?</p>
                      <div className="quick-order-suggestion__actions">
                        {uniformSuggestionOptions.slice(0, 3).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => onApplyRevenueSuggestion(row.key, opt.id)}
                          >
                            {opt.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--xs"
                          onClick={onDismissRevenueSuggestion}
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="quick-order-grid__color-cell">
                  {showCustomColor ? (
                    <div className="quick-order-color-custom">
                      <input
                        className="admin-input admin-input--compact"
                        value={row.colorName}
                        onChange={(e) =>
                          updateRow(index, {
                            colorName: e.target.value,
                            colorId: null,
                            isCustomColor: true,
                          })
                        }
                        placeholder="Tên màu"
                      />
                      <input
                        className="admin-input admin-input--compact"
                        style={{ marginTop: 4 }}
                        value={row.colorCode}
                        onChange={(e) =>
                          updateRow(index, {
                            colorCode: e.target.value,
                            colorId: null,
                            isCustomColor: true,
                          })
                        }
                        placeholder="Mã màu / Pantone"
                      />
                      {row.isCustomColor && (
                        <span className="quick-order-color-badge">Màu theo đơn</span>
                      )}
                      {catalogColors.length > 0 && !stockOnly && (
                        <button
                          type="button"
                          className="quick-order-color-switch"
                          onClick={() =>
                            updateRow(index, {
                              isCustomColor: false,
                              colorId: null,
                              colorName: "",
                              colorCode: "",
                            })
                          }
                        >
                          Chọn từ danh sách
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="quick-order-color-catalog">
                      <select
                        className="admin-input admin-input--compact"
                        value={isCatalogColorId(row.colorId) ? row.colorId! : ""}
                        onChange={(e) => {
                          const color = catalogColors.find((c) => c.id === e.target.value);
                          updateRow(index, {
                            colorId: color?.id ?? null,
                            colorName: color?.name ?? "",
                            colorCode: "",
                            isCustomColor: false,
                          });
                        }}
                      >
                        <option value="">—</option>
                        {catalogColors.map((color) => (
                          <option key={color.id} value={color.id}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                      {!stockOnly && (
                        <button
                          type="button"
                          className="quick-order-color-switch"
                          onClick={() =>
                            updateRow(index, {
                              isCustomColor: true,
                              colorId: null,
                              colorName: "",
                              colorCode: "",
                            })
                          }
                        >
                          Nhập màu khác
                        </button>
                      )}
                    </div>
                  )}
                  {row.fieldErrors?.colorName && (
                    <p className="admin-field-error">{row.fieldErrors.colorName}</p>
                  )}
                </td>
                <td>
                  <input
                    className="admin-input admin-input--compact"
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                  />
                </td>
                {sizeColumns.map((column) => (
                  <td key={column.key}>
                    <input
                      className="admin-input admin-input--compact admin-input--numeric"
                      type="number"
                      min={0}
                      value={row.sizes[column.key] || ""}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                        updateRow(index, {
                          sizes: {
                            ...row.sizes,
                            [column.key]:
                              Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0,
                          },
                        });
                      }}
                    />
                    {row.fieldErrors?.[`size-${column.key}`] && (
                      <p className="admin-field-error">{row.fieldErrors[`size-${column.key}`]}</p>
                    )}
                  </td>
                ))}
                <td className="quick-order-grid__total">{totalQty || ""}</td>
                <td>
                  <input
                    className="admin-input admin-input--compact"
                    value={row.unit}
                    onChange={(e) => updateRow(index, { unit: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="admin-input admin-input--compact admin-input--numeric"
                    type="number"
                    min={0}
                    value={row.unitPrice || ""}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => updateRow(index, { unitPrice: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="quick-order-grid__money">
                  {lineTotal(row, sizeColumns).toLocaleString("vi-VN")}
                </td>
                <td>
                  <div className="quick-order-grid__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => duplicateRow(index)}
                    >
                      Nhân bản
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => clearSizes(index)}
                    >
                      Xóa SL
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => moveRow(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => moveRow(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => removeRow(index)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Export helper used when parent adds a column
export function syncRowsToSizeColumns(
  rows: QuickOrderGridRow[],
  columns: QuickOrderSizeColumn[],
): QuickOrderGridRow[] {
  return rows.map((row) => ({
    ...row,
    sizes: {
      ...emptyQuickOrderSizeQuantities(columns),
      ...row.sizes,
    },
  }));
}
