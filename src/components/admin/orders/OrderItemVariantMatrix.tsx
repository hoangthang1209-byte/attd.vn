"use client";

import { useMemo } from "react";
import type { ColorRecord } from "@/features/colors/color.service";
import type { OrderItemVariantInput } from "@/features/orders/order-totals";
import { buildOrderItemVariantSkuBase } from "@/features/orders/order-item-variant-sku";

type Props = {
  variants: OrderItemVariantInput[];
  colors: ColorRecord[];
  sizeOptions: string[];
  defaultUnit: string;
  customerCode: string;
  systemCode?: string | null;
  onChange: (variants: OrderItemVariantInput[]) => void;
  onAddColor: (variantIndex: number) => void;
};

function emptyVariant(defaultUnit: string): OrderItemVariantInput {
  return {
    key: crypto.randomUUID(),
    colorId: null,
    colorNameSnapshot: null,
    sizeValue: null,
    skuSnapshot: null,
    quantity: 1,
    unit: defaultUnit,
  };
}

function variantKey(v: OrderItemVariantInput): string {
  return `${v.colorId ?? ""}|${(v.sizeValue ?? "").trim().toUpperCase()}`;
}

export default function OrderItemVariantMatrix({
  variants,
  colors,
  sizeOptions,
  defaultUnit,
  customerCode,
  systemCode,
  onChange,
  onAddColor,
}: Props) {
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of variants) {
      const key = variantKey(v);
      if (!v.colorId && !v.sizeValue?.trim()) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [variants]);

  function updateVariant(index: number, patch: Partial<OrderItemVariantInput>) {
    onChange(variants.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function addVariant() {
    onChange([...variants, emptyVariant(defaultUnit)]);
  }

  function duplicateVariant(index: number) {
    const source = variants[index];
    onChange([
      ...variants,
      {
        ...source,
        key: crypto.randomUUID(),
        id: null,
        skuSnapshot: null,
      },
    ]);
  }

  function previewSku(variant: OrderItemVariantInput): string {
    if (variant.skuSnapshot?.trim()) return variant.skuSnapshot;
    if (!customerCode.trim() || !systemCode?.trim()) return "—";
    const color = colors.find((c) => c.id === variant.colorId);
    return buildOrderItemVariantSkuBase({
      customerCode: customerCode.trim(),
      systemCode: systemCode.trim(),
      colorName: color?.name ?? variant.colorNameSnapshot,
      colorSlug: color?.slug,
      sizeValue: variant.sizeValue,
    });
  }

  return (
    <div className="order-item-variant-matrix">
      <div className="order-item-variant-matrix__header">
        <h4 className="order-item-variant-matrix__title">Màu sắc, size và số lượng</h4>
        <div className="order-item-variant-matrix__actions">
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={addVariant}>
            Thêm màu / size
          </button>
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="admin-field-hint">Chưa có biến thể. Thêm dòng màu/size để nhập số lượng chi tiết.</p>
      ) : (
        <div className="order-item-variant-matrix__table-wrap">
          <table className="order-item-variant-matrix__table">
            <thead>
              <tr>
                <th>Màu sắc</th>
                <th>Size</th>
                <th>SKU</th>
                <th>Số lượng</th>
                <th>Đơn vị</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => {
                const dup = duplicateKeys.has(variantKey(variant));
                return (
                  <tr key={variant.key ?? index}>
                    <td>
                      <select
                        className="admin-input"
                        value={variant.colorId ?? ""}
                        onChange={(e) => {
                          const color = colors.find((c) => c.id === e.target.value);
                          updateVariant(index, {
                            colorId: e.target.value || null,
                            colorNameSnapshot: color?.name ?? null,
                            skuSnapshot: null,
                          });
                        }}
                      >
                        <option value="">— Chọn màu —</option>
                        {colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        style={{ marginTop: 4 }}
                        onClick={() => onAddColor(index)}
                      >
                        Thêm màu mới
                      </button>
                    </td>
                    <td>
                      {sizeOptions.length > 0 ? (
                        <select
                          className="admin-input"
                          value={variant.sizeValue ?? ""}
                          onChange={(e) =>
                            updateVariant(index, {
                              sizeValue: e.target.value || null,
                              skuSnapshot: null,
                            })
                          }
                        >
                          <option value="">— Không chọn —</option>
                          {sizeOptions.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <label className="admin-field-hint">Size tùy chọn</label>
                          <input
                            className="admin-input"
                            value={variant.sizeValue ?? ""}
                            placeholder="M, L, XL…"
                            onChange={(e) =>
                              updateVariant(index, {
                                sizeValue: e.target.value || null,
                                skuSnapshot: null,
                              })
                            }
                          />
                        </>
                      )}
                    </td>
                    <td>
                      <input className="admin-input" value={previewSku(variant)} readOnly />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        type="number"
                        min="1"
                        value={variant.quantity}
                        onChange={(e) =>
                          updateVariant(index, {
                            quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="admin-input"
                        value={variant.unit ?? defaultUnit}
                        onChange={(e) => updateVariant(index, { unit: e.target.value })}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => duplicateVariant(index)}
                        >
                          Nhân bản
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => removeVariant(index)}
                        >
                          Xóa
                        </button>
                      </div>
                      {dup && (
                        <p className="admin-field-error">Màu và size này đã tồn tại trong sản phẩm.</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
