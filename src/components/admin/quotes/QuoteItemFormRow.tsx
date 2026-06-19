"use client";

import MediaPicker from "@/components/admin/media/MediaPicker";
import type { QuoteItemInput } from "@/features/quotes/types";

type ProductOption = { id: string; name: string };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};

export type QuoteItemRow = QuoteItemInput & { key: string };

type Props = {
  index: number;
  item: QuoteItemRow;
  products: ProductOption[];
  variants: VariantOption[];
  onChange: (patch: Partial<QuoteItemRow>) => void;
  onRemove?: () => void;
  onLoadVariants: (productId: string) => void;
  onProductSelect: (productId: string) => Promise<void>;
};

export function emptyQuoteItem(): QuoteItemRow {
  return {
    key: crypto.randomUUID(),
    productNameSnapshot: "",
    quantity: 100,
    unit: "cái",
    baseUnitPrice: 0,
    serviceFee: 0,
    setupFee: 0,
    unitPrice: 0,
    discountAmount: 0,
  };
}

export default function QuoteItemFormRow({
  index,
  item,
  products,
  variants,
  onChange,
  onRemove,
  onLoadVariants,
  onProductSelect,
}: Props) {
  return (
    <div className="admin-catalog-variant-row" style={{ marginBottom: 12 }}>
      <div className="admin-catalog-variant-header">
        <strong>Dòng #{index + 1}</strong>
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
              onChange({ productId: id || null, variantId: null, productNameSnapshot: product?.name ?? item.productNameSnapshot });
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
                variantNameSnapshot: variant ? [variant.colorName, variant.sizeName].filter(Boolean).join(" · ") : null,
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
          <input className="admin-input" value={item.productNameSnapshot ?? ""} onChange={(e) => onChange({ productNameSnapshot: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">SKU / Mã sản phẩm</label>
          <input className="admin-input" value={item.skuSnapshot ?? ""} onChange={(e) => onChange({ skuSnapshot: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Màu</label>
          <input className="admin-input" value={item.colorSnapshot ?? ""} onChange={(e) => onChange({ colorSnapshot: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Danh mục</label>
          <input className="admin-input" value={item.categorySnapshot ?? ""} onChange={(e) => onChange({ categorySnapshot: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Giới tính</label>
          <input className="admin-input" value={item.genderSnapshot ?? ""} onChange={(e) => onChange({ genderSnapshot: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả sản phẩm</label>
          <input className="admin-input" value={item.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">MOQ</label>
          <input className="admin-input" type="number" min="0" value={item.moqSnapshot ?? ""} onChange={(e) => onChange({ moqSnapshot: e.target.value.trim() ? parseInt(e.target.value, 10) : null })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú</label>
          <input className="admin-input" value={item.itemNote ?? ""} onChange={(e) => onChange({ itemNote: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số lượng</label>
          <input className="admin-input" type="number" min="1" value={item.quantity} onChange={(e) => onChange({ quantity: parseInt(e.target.value, 10) || 1 })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn vị</label>
          <input className="admin-input" value={item.unit ?? "cái"} onChange={(e) => onChange({ unit: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đơn giá</label>
          <input className="admin-input" type="number" min="0" value={item.baseUnitPrice ?? 0} onChange={(e) => onChange({ baseUnitPrice: Number(e.target.value) || 0, unitPrice: Number(e.target.value) || 0 })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Phí dịch vụ</label>
          <input className="admin-input" type="number" min="0" value={item.serviceFee ?? 0} onChange={(e) => onChange({ serviceFee: Number(e.target.value) || 0 })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Phí setup</label>
          <input className="admin-input" type="number" min="0" value={item.setupFee ?? 0} onChange={(e) => onChange({ setupFee: Number(e.target.value) || 0 })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Giá chỉnh tay / đơn vị</label>
          <input className="admin-input" type="number" min="0" value={item.manualUnitPrice ?? ""} onChange={(e) => onChange({ manualUnitPrice: e.target.value.trim() ? Number(e.target.value) : null })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Thời gian sản xuất</label>
          <input className="admin-input" value={item.productionLeadTime ?? ""} onChange={(e) => onChange({ productionLeadTime: e.target.value })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Phí làm mẫu</label>
          <input className="admin-input" type="number" min="0" value={item.sampleFee ?? ""} onChange={(e) => onChange({ sampleFee: e.target.value.trim() ? Number(e.target.value) : null })} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Thời gian làm mẫu</label>
          <input className="admin-input" value={item.sampleLeadTime ?? ""} onChange={(e) => onChange({ sampleLeadTime: e.target.value })} />
        </div>
        <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
          <label className="admin-label">Tải/chọn thiết kế</label>
          <MediaPicker
            folder="general"
            usageType="auto"
            value={item.designImageUrl ?? null}
            onChange={(url) => onChange({ designImageUrl: url })}
          />
          {!item.designImageUrl && <p className="admin-field-hint">Chưa có thiết kế</p>}
        </div>
      </div>
    </div>
  );
}
