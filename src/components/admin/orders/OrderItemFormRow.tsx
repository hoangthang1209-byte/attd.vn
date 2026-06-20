"use client";

import MediaPicker from "@/components/admin/media/MediaPicker";
import type { OrderItemInput } from "@/features/orders/order-totals";
import { computeOrderItem } from "@/features/orders/order-totals";
import { formatOrderCurrency } from "@/features/orders/order-format";

type ProductOption = { id: string; name: string };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};

export type OrderItemRow = OrderItemInput & { key: string };

type Props = {
  index: number;
  item: OrderItemRow;
  currency: string;
  products: ProductOption[];
  variants: VariantOption[];
  onChange: (patch: Partial<OrderItemRow>) => void;
  onRemove?: () => void;
  onLoadVariants: (productId: string) => void;
  onProductSelect: (productId: string) => Promise<void>;
};

export function emptyOrderItem(): OrderItemRow {
  return {
    key: crypto.randomUUID(),
    productNameSnapshot: "",
    quantity: 100,
    unit: "cái",
    unitPrice: 0,
  };
}

export default function OrderItemFormRow({
  index,
  item,
  currency,
  products,
  variants,
  onChange,
  onRemove,
  onLoadVariants,
  onProductSelect,
}: Props) {
  const lineTotal = computeOrderItem(item).lineTotal;

  return (
    <div className="admin-catalog-variant-row" style={{ marginBottom: 12 }}>
      <div className="admin-catalog-variant-header">
        <strong>Dòng #{index + 1}</strong>
        <span className="admin-field-hint">
          Thành tiền: {formatOrderCurrency(lineTotal, currency)}
        </span>
        {onRemove && (
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onRemove}>
            Xóa
          </button>
        )}
      </div>
      <div className="admin-catalog-variant-fields">
        <div className="admin-field">
          <label className="admin-label">Sản phẩm</label>
          <select
            className="admin-input"
            value={item.productId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const product = products.find((p) => p.id === id);
              onChange({
                productId: id || null,
                variantId: null,
                productNameSnapshot: product?.name ?? item.productNameSnapshot,
              });
              if (id) {
                onLoadVariants(id);
                void onProductSelect(id);
              }
            }}
          >
            <option value="">— Tùy chỉnh —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Biến thể</label>
          <select
            className="admin-input"
            value={item.variantId ?? ""}
            onChange={(e) => {
              const variant = variants.find((v) => v.id === e.target.value);
              onChange({
                variantId: e.target.value || null,
                variantNameSnapshot: variant
                  ? [variant.colorName, variant.sizeName].filter(Boolean).join(" · ")
                  : null,
                skuSnapshot: variant?.sku ?? item.skuSnapshot,
                colorSnapshot: variant?.colorName ?? item.colorSnapshot,
              });
            }}
          >
            <option value="">— Không chọn —</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>{v.sku}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Tên hiển thị *</label>
          <input
            className="admin-input"
            value={item.productNameSnapshot ?? ""}
            onChange={(e) => onChange({ productNameSnapshot: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">SKU</label>
          <input
            className="admin-input"
            value={item.skuSnapshot ?? ""}
            onChange={(e) => onChange({ skuSnapshot: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Màu</label>
          <input
            className="admin-input"
            value={item.colorSnapshot ?? ""}
            onChange={(e) => onChange({ colorSnapshot: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Danh mục</label>
          <input
            className="admin-input"
            value={item.categorySnapshot ?? ""}
            onChange={(e) => onChange({ categorySnapshot: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Giới tính</label>
          <input
            className="admin-input"
            value={item.genderSnapshot ?? ""}
            onChange={(e) => onChange({ genderSnapshot: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả</label>
          <input
            className="admin-input"
            value={item.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">MOQ</label>
          <input
            className="admin-input"
            type="number"
            min="0"
            value={item.moqSnapshot ?? ""}
            onChange={(e) =>
              onChange({
                moqSnapshot: e.target.value.trim() ? parseInt(e.target.value, 10) : null,
              })
            }
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số lượng</label>
          <input
            className="admin-input"
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn vị</label>
          <input
            className="admin-input"
            value={item.unit ?? "cái"}
            onChange={(e) => onChange({ unit: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn giá</label>
          <input
            className="admin-input"
            type="number"
            min="0"
            value={item.unitPrice ?? 0}
            onChange={(e) => onChange({ unitPrice: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Thời gian sản xuất</label>
          <input
            className="admin-input"
            value={item.productionLeadTime ?? ""}
            onChange={(e) => onChange({ productionLeadTime: e.target.value })}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú dòng</label>
          <input
            className="admin-input"
            value={item.itemNote ?? ""}
            onChange={(e) => onChange({ itemNote: e.target.value })}
          />
        </div>
        <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
          <label className="admin-label">Hình thiết kế</label>
          <MediaPicker
            folder="general"
            usageType="auto"
            value={item.designImageUrl ?? null}
            onChange={(url) => onChange({ designImageUrl: url })}
          />
        </div>
      </div>
    </div>
  );
}
