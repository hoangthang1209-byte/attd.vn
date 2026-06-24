"use client";

import { useMemo, useRef } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  isProcessingWithDecoration,
  PROCESSING_METHOD_OPTIONS,
  SUPPLY_SOURCE_OPTIONS,
} from "@/features/orders/order-item-classification";
import type { RevenueCategoryPickerOption } from "@/features/revenue-categories/revenue-category.service";
import {
  QUICK_ORDER_SIZE_KEYS,
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
  products: ProductOption[];
  revenueCategories: RevenueCategoryPickerOption[];
  productColorsByProductId: Record<string, Array<{ id: string; name: string }>>;
  onRowsChange: (rows: QuickOrderGridRow[]) => void;
  onLoadProductColors: (productId: string) => Promise<void>;
  revenueSuggestionRowKey: string | null;
  onDismissRevenueSuggestion: () => void;
  onApplyRevenueSuggestion: (rowKey: string, categoryId: string) => void;
};

function lineTotal(row: QuickOrderGridRow): number {
  const qty = QUICK_ORDER_SIZE_KEYS.reduce(
    (sum, key) => sum + Math.max(0, Math.floor(row.sizes[key] || 0)),
    0,
  );
  return qty * (row.unitPrice || 0);
}

export default function QuickOrderGrid({
  rows,
  products,
  revenueCategories,
  productColorsByProductId,
  onRowsChange,
  onLoadProductColors,
  revenueSuggestionRowKey,
  onDismissRevenueSuggestion,
  onApplyRevenueSuggestion,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  const productOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.productCode ? `${p.name} (${p.productCode})` : p.name })),
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
    updateRow(index, {
      sizes: { S: 0, M: 0, L: 0, XL: 0, "2XL": 0, "3XL": 0, "4XL": 0, Free: 0 },
    });
  }

  const uniformSuggestionOptions = revenueCategories.filter((c) =>
    ["UNIFORM", "UNIFORM_TSHIRT", "UNIFORM_POLO", "EVENT_MERCH", "EVENT_TSHIRT", "MERCH_TOTE"].includes(
      c.code,
    ),
  );

  return (
    <div className="quick-order-grid-wrap">
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
            {QUICK_ORDER_SIZE_KEYS.map((size) => (
              <th key={size}>{size}</th>
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
            const totalQty = QUICK_ORDER_SIZE_KEYS.reduce(
              (sum, key) => sum + Math.max(0, Math.floor(row.sizes[key] || 0)),
              0,
            );
            const colors = row.productId ? productColorsByProductId[row.productId] ?? [] : [];
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
                    onChange={(e) => updateRow(index, { productName: e.target.value, productId: null })}
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
                    onChange={(e) =>
                      updateRow(index, {
                        supplySource: (e.target.value || null) as QuickOrderGridRow["supplySource"],
                      })
                    }
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
                <td>
                  {colors.length ? (
                    <select
                      className="admin-input admin-input--compact"
                      value={row.colorId ?? ""}
                      onChange={(e) => {
                        const color = colors.find((c) => c.id === e.target.value);
                        updateRow(index, {
                          colorId: color?.id ?? null,
                          colorName: color?.name ?? "",
                        });
                      }}
                    >
                      <option value="">—</option>
                      {colors.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="admin-input admin-input--compact"
                      value={row.colorName}
                      onChange={(e) => updateRow(index, { colorName: e.target.value, colorId: null })}
                      placeholder="Nhập màu"
                    />
                  )}
                </td>
                <td>
                  <input
                    className="admin-input admin-input--compact"
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                  />
                </td>
                {QUICK_ORDER_SIZE_KEYS.map((sizeKey) => (
                  <td key={sizeKey}>
                    <input
                      className="admin-input admin-input--compact admin-input--numeric"
                      type="number"
                      min={0}
                      value={row.sizes[sizeKey] || ""}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                        updateRow(index, {
                          sizes: {
                            ...row.sizes,
                            [sizeKey]: Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0,
                          },
                        });
                      }}
                    />
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
                    onChange={(e) =>
                      updateRow(index, { unitPrice: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="quick-order-grid__money">
                  {lineTotal(row).toLocaleString("vi-VN")}
                </td>
                <td>
                  <div className="quick-order-grid__actions">
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--xs" onClick={() => duplicateRow(index)}>Nhân bản</button>
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--xs" onClick={() => clearSizes(index)}>Xóa SL</button>
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--xs" onClick={() => moveRow(index, -1)}>↑</button>
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--xs" onClick={() => moveRow(index, 1)}>↓</button>
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--xs" onClick={() => removeRow(index)}>Xóa</button>
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
