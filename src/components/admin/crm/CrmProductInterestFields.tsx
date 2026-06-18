"use client";

import { useEffect, useState } from "react";
import {
  CRM_PRODUCT_SERVICE_OPTIONS,
  type CrmProductInterestRowState,
  type CrmProductOption,
  type CrmVariantOption,
  formatVariantLabel,
} from "@/features/crm/product-interest-utils";

type Props = {
  row: CrmProductInterestRowState;
  products: CrmProductOption[];
  onChange: (row: CrmProductInterestRowState) => void;
  showCustomName?: boolean;
};

export default function CrmProductInterestFields({
  row,
  products,
  onChange,
  showCustomName = true,
}: Props) {
  const [variants, setVariants] = useState<CrmVariantOption[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    if (!row.productId) {
      setVariants([]);
      return;
    }

    setLoadingVariants(true);
    void fetch(`/api/admin/products/${row.productId}`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data.variants) ? data.variants : [];
        setVariants(
          items.map(
            (v: {
              id: string;
              sku: string;
              colorName?: string | null;
              sizeName?: string | null;
              dimensions?: string | null;
              capacity?: string | null;
            }) => ({
              id: v.id,
              sku: v.sku,
              colorName: v.colorName,
              sizeName: v.sizeName,
              dimensions: v.dimensions,
              capacity: v.capacity,
            })
          )
        );
      })
      .catch(() => setVariants([]))
      .finally(() => setLoadingVariants(false));
  }, [row.productId]);

  function patch(partial: Partial<CrmProductInterestRowState>) {
    onChange({ ...row, ...partial });
  }

  function toggleService(key: string) {
    patch({ serviceNeeds: { ...row.serviceNeeds, [key]: !row.serviceNeeds[key] } });
  }

  return (
    <div className="admin-crm-interest-fields">
      <label>
        Sản phẩm
        <select
          className="admin-input"
          value={row.productId}
          onChange={(e) => patch({ productId: e.target.value, variantId: "" })}
        >
          <option value="">Nhu cầu custom / chưa có trong catalog</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productCode ? `${p.productCode} — ` : ""}
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {row.productId && (
        <label>
          Biến thể
          <select
            className="admin-input"
            value={row.variantId}
            onChange={(e) => patch({ variantId: e.target.value })}
            disabled={loadingVariants}
          >
            <option value="">
              {loadingVariants
                ? "Đang tải biến thể..."
                : variants.length === 0
                  ? "Không có biến thể"
                  : "Chọn biến thể"}
            </option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {formatVariantLabel(v)}
              </option>
            ))}
          </select>
        </label>
      )}

      {showCustomName && (
        <label>
          Nhu cầu custom / chưa có trong catalog
          <input
            className="admin-input"
            value={row.productNameSnapshot}
            onChange={(e) => patch({ productNameSnapshot: e.target.value })}
            placeholder="VD: Áo polo cao cấp in logo"
          />
        </label>
      )}

      <div className="admin-form-grid">
        <label>
          Số lượng dự kiến
          <input
            type="number"
            min={1}
            className="admin-input"
            value={row.quantity}
            onChange={(e) => patch({ quantity: e.target.value })}
          />
        </label>
        <label>
          Đơn vị
          <input
            className="admin-input"
            value={row.unit}
            onChange={(e) => patch({ unit: e.target.value })}
          />
        </label>
      </div>

      <label>
        Ghi chú nhu cầu
        <textarea
          className="admin-input"
          rows={2}
          value={row.requirementNote}
          onChange={(e) => patch({ requirementNote: e.target.value })}
        />
      </label>

      <fieldset className="admin-checkbox-group">
        <legend>Dịch vụ kèm theo</legend>
        {CRM_PRODUCT_SERVICE_OPTIONS.map((opt) => (
          <label key={opt.key} className="admin-checkbox-label">
            <input
              type="checkbox"
              checked={Boolean(row.serviceNeeds[opt.key])}
              onChange={() => toggleService(opt.key)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

export function useCrmProducts() {
  const [products, setProducts] = useState<CrmProductOption[]>([]);

  useEffect(() => {
    void fetch("/api/admin/products?pageSize=200")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data.products) ? data.products : [];
        setProducts(
          items.map((p: { id: string; name: string; productCode?: string | null }) => ({
            id: p.id,
            name: p.name,
            productCode: p.productCode ?? null,
          }))
        );
      })
      .catch(() => setProducts([]));
  }, []);

  return products;
}
