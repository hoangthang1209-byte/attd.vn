"use client";

import type { OrderProductGender } from "@prisma/client";
import MediaPicker from "@/components/admin/media/MediaPicker";
import OrderItemVariantMatrix from "@/components/admin/orders/OrderItemVariantMatrix";
import type { CategoryOption } from "@/components/admin/orders/QuickAddCategoryModal";
import type { ColorRecord } from "@/features/colors/color.service";
import type { OrderItemInput } from "@/features/orders/order-totals";
import { computeOrderItem } from "@/features/orders/order-totals";
import { formatOrderCurrency } from "@/features/orders/order-format";
import {
  ORDER_PRODUCT_GENDER_OPTIONS,
  orderProductGenderLabel,
} from "@/features/orders/order-gender";

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
  customerCode: string;
  products: ProductOption[];
  variants: VariantOption[];
  colors: ColorRecord[];
  categories: CategoryOption[];
  onChange: (patch: Partial<OrderItemRow>) => void;
  onRemove?: () => void;
  onLoadVariants: (productId: string) => void;
  onProductSelect: (productId: string) => Promise<void>;
  onAddColor: (variantIndex?: number) => void;
  onAddCategory: () => void;
  onCustomProduct: () => void;
};

export function emptyOrderItem(): OrderItemRow {
  return {
    key: crypto.randomUUID(),
    productNameSnapshot: "",
    quantity: 100,
    unit: "cái",
    unitPrice: 0,
    variants: [],
  };
}

function defaultVariantFromItem(item: OrderItemRow) {
  return {
    key: crypto.randomUUID(),
    colorId: item.colorId ?? null,
    colorNameSnapshot: item.colorSnapshot ?? null,
    sizeValue: null,
    skuSnapshot: null,
    quantity: item.quantity > 0 ? item.quantity : 1,
    unit: item.unit ?? "cái",
  };
}

export default function OrderItemFormRow({
  index,
  item,
  currency,
  customerCode,
  products,
  variants,
  colors,
  categories,
  onChange,
  onRemove,
  onLoadVariants,
  onProductSelect,
  onAddColor,
  onAddCategory,
  onCustomProduct,
}: Props) {
  const lineTotal = computeOrderItem(item).lineTotal;
  const selectedColor = colors.find((c) => c.id === item.colorId);
  const selectedCategory = categories.find((c) => c.id === item.categoryId);
  const sizeOptions = [
    ...new Set(
      variants.map((v) => v.sizeName?.trim()).filter((v): v is string => Boolean(v)),
    ),
  ];
  const showVariantMatrix = Boolean(item.productId || item.variants?.length);
  const variantRows = item.variants ?? [];

  function ensureVariantsAfterProductSelect() {
    if (!item.variants?.length && item.colorId) {
      onChange({ variants: [defaultVariantFromItem(item)] });
    }
  }

  return (
    <div className="admin-catalog-variant-row" style={{ marginBottom: 12 }}>
      <div className="admin-catalog-variant-header">
        <strong>Dòng #{index + 1}</strong>
        <span className="admin-field-hint">
          Tổng SL: {computeOrderItem(item).quantity} · Thành tiền: {formatOrderCurrency(lineTotal, currency)}
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
                variants: id ? item.variants ?? [] : [],
              });
              if (id) {
                onLoadVariants(id);
                void onProductSelect(id).then(() => ensureVariantsAfterProductSelect());
              }
            }}
          >
            <option value="">— Tùy chỉnh —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onCustomProduct}>
            Tạo sản phẩm tùy chọn
          </button>
        </div>
        <div className="admin-field">
          <label className="admin-label">Biến thể catalog</label>
          <select
            className="admin-input"
            value={item.variantId ?? ""}
            disabled={!item.productId}
            onChange={(e) => {
              const variant = variants.find((v) => v.id === e.target.value);
              onChange({
                variantId: e.target.value || null,
                variantNameSnapshot: variant
                  ? [variant.colorName, variant.sizeName].filter(Boolean).join(" · ")
                  : null,
                skuSnapshot: variant?.sku ?? item.skuSnapshot,
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
          <label className="admin-label">SKU (tham chiếu đơn hàng)</label>
          <input className="admin-input" value={item.skuSnapshot ?? ""} readOnly placeholder="Tự động khi lưu" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Màu sắc mặc định *</label>
          <select
            className="admin-input"
            value={item.colorId ?? ""}
            onChange={(e) => {
              const color = colors.find((c) => c.id === e.target.value);
              onChange({
                colorId: e.target.value || null,
                colorSnapshot: color?.name ?? null,
              });
            }}
          >
            <option value="">— Chọn màu —</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{!c.isActive ? " (ngưng)" : ""}
              </option>
            ))}
            {item.colorId && !selectedColor && item.colorSnapshot && (
              <option value={item.colorId}>{item.colorSnapshot} (lưu trước)</option>
            )}
          </select>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => onAddColor()}>
            Thêm màu mới
          </button>
        </div>
        <div className="admin-field">
          <label className="admin-label">Danh mục *</label>
          <select
            className="admin-input"
            value={item.categoryId ?? ""}
            onChange={(e) => {
              const category = categories.find((c) => c.id === e.target.value);
              onChange({
                categoryId: e.target.value || null,
                categorySnapshot: category?.name ?? null,
              });
            }}
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {item.categoryId && !selectedCategory && item.categorySnapshot && (
              <option value={item.categoryId}>{item.categorySnapshot} (lưu trước)</option>
            )}
          </select>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onAddCategory}>
            Thêm danh mục mới
          </button>
        </div>
        <div className="admin-field">
          <label className="admin-label">Giới tính *</label>
          <select
            className="admin-input"
            value={item.gender ?? ""}
            onChange={(e) => {
              const gender = e.target.value as OrderProductGender;
              onChange({
                gender: gender || null,
                genderSnapshot: orderProductGenderLabel(gender),
              });
            }}
          >
            <option value="">— Chọn giới tính —</option>
            {ORDER_PRODUCT_GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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
        {!showVariantMatrix && (
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
        )}
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

      {showVariantMatrix && (
        <OrderItemVariantMatrix
          variants={variantRows}
          colors={colors}
          sizeOptions={sizeOptions}
          defaultUnit={item.unit ?? "cái"}
          customerCode={customerCode}
          systemCode={item.systemCode}
          onChange={(nextVariants) => onChange({ variants: nextVariants })}
          onAddColor={(variantIndex) => onAddColor(variantIndex)}
        />
      )}
    </div>
  );
}
