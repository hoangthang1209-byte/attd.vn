"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { OrderItemSupplySource } from "@prisma/client";
import type { ColorRecord } from "@/features/colors/color.service";
import type { OrderItemVariantInput } from "@/features/orders/order-totals";
import { requiresCatalogColor } from "@/features/orders/quick-order/quick-order-color";
import {
  addMatrixSizeColumn,
  buildMatrixColumnsFromVariants,
  columnHasQuantities,
  createEmptyMatrixColorRow,
  matrixStateToVariants,
  removeMatrixSizeColumn,
  rowHasQuantities,
  sumMatrixGrandTotal,
  sumMatrixRowTotal,
  validateMatrixStockCells,
  variantsToMatrixState,
  type ProductStockVariant,
  type VariantMatrixEditorState,
} from "@/features/orders/order-item-variant-matrix-editor.utils";

type Props = {
  variants: OrderItemVariantInput[];
  colors: ColorRecord[];
  stockVariants: ProductStockVariant[];
  supplySource?: OrderItemSupplySource | null;
  productId?: string | null;
  defaultUnit: string;
  onChange: (variants: OrderItemVariantInput[]) => void;
  onAddCatalogColor: () => void;
};

type ConfirmDialog =
  | { type: "remove-size"; columnKey: string; label: string }
  | { type: "remove-color"; rowKey: string; colorLabel: string }
  | null;

function MatrixQtyCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const display = !focused && value === 0 ? "" : String(value);

  return (
    <input
      className="admin-input admin-input--compact admin-input--numeric order-variant-matrix-editor__qty"
      type="number"
      min={0}
      inputMode="numeric"
      value={display}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
    />
  );
}

export default function OrderItemVariantMatrixEditor({
  variants,
  colors,
  stockVariants,
  supplySource,
  productId,
  defaultUnit,
  onChange,
  onAddCatalogColor,
}: Props) {
  const stockOnly = requiresCatalogColor(supplySource);
  const catalogColors = useMemo(
    () =>
      stockOnly && stockVariants.length > 0
        ? colors.filter((color) =>
            stockVariants.some(
              (v) => v.colorId === color.id || v.colorName?.trim().toLowerCase() === color.name.trim().toLowerCase(),
            ),
          )
        : colors.filter((c) => c.isActive),
    [colors, stockOnly, stockVariants],
  );

  const initialColumns = useMemo(() => buildMatrixColumnsFromVariants(variants), [variants]);
  const [matrixState, setMatrixState] = useState<VariantMatrixEditorState>(() =>
    variantsToMatrixState(variants, initialColumns),
  );
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [sizeLabelInput, setSizeLabelInput] = useState("");
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  const commit = useCallback(
    (next: VariantMatrixEditorState) => {
      setMatrixState(next);
      const nextVariants = matrixStateToVariants(next, defaultUnit);
      onChange(nextVariants);
      const validationError = validateMatrixStockCells({
        supplySource,
        productId,
        stockVariants,
        state: next,
      });
      setStockError(validationError);
    },
    [defaultUnit, onChange, productId, stockVariants, supplySource],
  );

  useEffect(() => {
    const cols = buildMatrixColumnsFromVariants(variants);
    setMatrixState(variantsToMatrixState(variants, cols));
  }, [productId]);

  const grandTotal = sumMatrixGrandTotal(matrixState);

  function updateRow(rowKey: string, patch: Partial<VariantMatrixEditorState["rows"][number]>) {
    commit({
      ...matrixState,
      rows: matrixState.rows.map((row) => (row.key === rowKey ? { ...row, ...patch } : row)),
    });
  }

  function updateCell(rowKey: string, columnKey: string, quantity: number) {
    commit({
      ...matrixState,
      rows: matrixState.rows.map((row) =>
        row.key === rowKey
          ? { ...row, quantities: { ...row.quantities, [columnKey]: quantity } }
          : row,
      ),
    });
  }

  function addColorRow() {
    commit({
      ...matrixState,
      rows: [...matrixState.rows, createEmptyMatrixColorRow()],
    });
  }

  function removeColorRow(rowKey: string) {
    commit({
      ...matrixState,
      rows: matrixState.rows.filter((row) => row.key !== rowKey),
    });
    setConfirmDialog(null);
  }

  function requestRemoveColor(row: VariantMatrixEditorState["rows"][number]) {
    const label = row.colorName || colors.find((c) => c.id === row.colorId)?.name || "màu này";
    if (!rowHasQuantities(row, matrixState.columns)) {
      removeColorRow(row.key);
      return;
    }
    setConfirmDialog({ type: "remove-color", rowKey: row.key, colorLabel: label });
  }

  function submitAddSize() {
    const result = addMatrixSizeColumn(matrixState, sizeLabelInput);
    if (result.error) {
      setSizeError(result.error);
      return;
    }
    commit(result.state);
    setSizeLabelInput("");
    setSizeError(null);
    setSizeDialogOpen(false);
  }

  function requestRemoveSize(columnKey: string, label: string) {
    const column = matrixState.columns.find((c) => c.key === columnKey);
    if (!column || column.isDefault) return;
    if (!columnHasQuantities(matrixState, columnKey)) {
      commit(removeMatrixSizeColumn(matrixState, columnKey));
      return;
    }
    setConfirmDialog({ type: "remove-size", columnKey, label });
  }

  return (
    <div className="order-variant-matrix-editor">
      <div className="order-item-variant-matrix__header">
        <h4 className="order-item-variant-matrix__title">Màu sắc &amp; số lượng theo size</h4>
        <div className="order-item-variant-matrix__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={() => {
              setSizeLabelInput("");
              setSizeError(null);
              setSizeDialogOpen(true);
            }}
          >
            + Thêm size
          </button>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={addColorRow}>
            + Thêm màu
          </button>
        </div>
      </div>

      <p className="admin-field-hint order-variant-matrix-editor__total">
        Tổng số lượng dòng: <strong>{grandTotal.toLocaleString("vi-VN")}</strong> {defaultUnit}
      </p>

      {stockError && <p className="admin-field-error">{stockError}</p>}

      {matrixState.rows.length === 0 ? (
        <p className="admin-field-hint">
          Chưa có màu trong bảng. Nhấn <strong>+ Thêm màu</strong> để bắt đầu nhập số lượng theo size.
        </p>
      ) : (
        <div className="order-variant-matrix-editor__table-wrap">
          <table className="order-variant-matrix-editor__table">
            <thead>
              <tr>
                <th className="order-variant-matrix-editor__color-col">Màu sắc</th>
                {matrixState.columns.map((column) => (
                  <th key={column.key} className="order-variant-matrix-editor__size-col">
                    <div className="order-variant-matrix-editor__size-header">
                      <span>{column.label}</span>
                      {!column.isDefault && (
                        <button
                          type="button"
                          className="order-variant-matrix-editor__remove-size"
                          title={`Xóa cột ${column.label}`}
                          onClick={() => requestRemoveSize(column.key, column.label)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="order-variant-matrix-editor__total-col">Tổng</th>
                <th className="order-variant-matrix-editor__action-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {matrixState.rows.map((row) => {
                const rowTotal = sumMatrixRowTotal(row, matrixState.columns);
                const showCustom = !stockOnly && (row.isCustomColor || (!row.colorId && row.colorName));
                return (
                  <tr key={row.key}>
                    <td className="order-variant-matrix-editor__color-col">
                      {showCustom ? (
                        <div className="quick-order-color-custom">
                          <input
                            className="admin-input admin-input--compact"
                            value={row.colorName}
                            onChange={(e) =>
                              updateRow(row.key, {
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
                              updateRow(row.key, {
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
                          {catalogColors.length > 0 && (
                            <button
                              type="button"
                              className="quick-order-color-switch"
                              onClick={() =>
                                updateRow(row.key, {
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
                            value={row.colorId ?? ""}
                            onChange={(e) => {
                              const color = catalogColors.find((c) => c.id === e.target.value);
                              updateRow(row.key, {
                                colorId: color?.id ?? null,
                                colorName: color?.name ?? "",
                                colorCode: "",
                                isCustomColor: false,
                              });
                            }}
                          >
                            <option value="">— Chọn màu —</option>
                            {catalogColors.map((color) => (
                              <option key={color.id} value={color.id}>
                                {color.name}
                                {!color.isActive ? " (ngưng)" : ""}
                              </option>
                            ))}
                          </select>
                          {colorSwatch(row.colorId, catalogColors)}
                          {!stockOnly && (
                            <button
                              type="button"
                              className="quick-order-color-switch"
                              onClick={() =>
                                updateRow(row.key, {
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
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            style={{ marginTop: 4 }}
                            onClick={onAddCatalogColor}
                          >
                            Thêm màu mới
                          </button>
                        </div>
                      )}
                    </td>
                    {matrixState.columns.map((column) => (
                      <td key={column.key} className="order-variant-matrix-editor__size-col">
                        <MatrixQtyCell
                          value={Math.max(0, row.quantities[column.key] ?? 0)}
                          onChange={(qty) => updateCell(row.key, column.key, qty)}
                        />
                      </td>
                    ))}
                    <td className="order-variant-matrix-editor__total-col">
                      <strong>{rowTotal > 0 ? rowTotal : "—"}</strong>
                    </td>
                    <td className="order-variant-matrix-editor__action-col">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => requestRemoveColor(row)}
                      >
                        Xóa màu
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sizeDialogOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setSizeDialogOpen(false)} />
          <div className="quote-quick-contact-modal__panel" style={{ maxWidth: 420 }}>
            <h3 className="quote-quick-contact-modal__title">Thêm size</h3>
            <div className="admin-field">
              <label className="admin-label">Tên size</label>
              <input
                className="admin-input"
                value={sizeLabelInput}
                placeholder="Ví dụ: XS, 5XL, 28, 2 tuổi"
                onChange={(e) => setSizeLabelInput(e.target.value)}
                autoFocus
              />
              {sizeError && <p className="admin-field-error">{sizeError}</p>}
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setSizeDialogOpen(false)}>
                Hủy
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={submitAddSize}>
                Thêm size
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog?.type === "remove-size" && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setConfirmDialog(null)} />
          <div className="quote-quick-contact-modal__panel" style={{ maxWidth: 420 }}>
            <h3 className="quote-quick-contact-modal__title">Xóa cột size?</h3>
            <p className="admin-field-hint">
              Các số lượng đã nhập ở size <strong>{confirmDialog.label}</strong> sẽ bị xóa khỏi sản phẩm này.
            </p>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setConfirmDialog(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  commit(removeMatrixSizeColumn(matrixState, confirmDialog.columnKey));
                  setConfirmDialog(null);
                }}
              >
                Xóa cột
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog?.type === "remove-color" && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setConfirmDialog(null)} />
          <div className="quote-quick-contact-modal__panel" style={{ maxWidth: 420 }}>
            <h3 className="quote-quick-contact-modal__title">Xóa dòng màu?</h3>
            <p className="admin-field-hint">
              Tất cả số lượng của màu <strong>{confirmDialog.colorLabel}</strong> sẽ bị xóa khỏi sản phẩm này.
            </p>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setConfirmDialog(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => removeColorRow(confirmDialog.rowKey)}
              >
                Xóa màu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function colorSwatch(colorId: string | null, colors: ColorRecord[]) {
  if (!colorId) return null;
  const color = colors.find((c) => c.id === colorId);
  if (!color?.hex) return null;
  return (
    <span
      className="order-variant-matrix-editor__swatch"
      style={{ backgroundColor: color.hex }}
      title={color.name}
    />
  );
}
