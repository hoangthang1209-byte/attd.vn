"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { QuoteItemRow } from "@/components/admin/quotes/QuoteItemFormRow";

type ProductOption = { id: string; name: string; productCode?: string | null };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};

type Props = {
  index: number;
  item: QuoteItemRow;
  variants: VariantOption[];
  onChange: (patch: Partial<QuoteItemRow>) => void;
  onRemove?: () => void;
  onProductSelect: (productId: string) => Promise<void>;
  onLoadVariants: (productId: string) => void;
};

export default function QuickQuoteProductLine({
  index,
  item,
  variants,
  onChange,
  onRemove,
  onProductSelect,
  onLoadVariants,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownSpace, setDropdownSpace] = useState({ above: false, height: 240 });
  const productLabel = item.productNameSnapshot ?? "";

  const positionDropdown = useCallback(() => {
    const input = wrapRef.current?.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? window.innerHeight);
    const below = bottom - rect.bottom - 16;
    const above = rect.top - top - 16;
    const useAbove = below < 180 && above > below;
    setDropdownSpace({
      above: useAbove,
      height: Math.max(0, Math.min(240, useAbove ? above : below)),
    });
  }, []);

  useLayoutEffect(() => {
    if (searchOpen) positionDropdown();
  }, [searchOpen, positionDropdown]);

  useEffect(() => {
    if (!searchOpen) return;
    window.addEventListener("resize", positionDropdown);
    window.addEventListener("scroll", positionDropdown, true);
    window.visualViewport?.addEventListener("resize", positionDropdown);
    window.visualViewport?.addEventListener("scroll", positionDropdown);
    return () => {
      window.removeEventListener("resize", positionDropdown);
      window.removeEventListener("scroll", positionDropdown, true);
      window.visualViewport?.removeEventListener("resize", positionDropdown);
      window.visualViewport?.removeEventListener("scroll", positionDropdown);
    };
  }, [searchOpen, positionDropdown]);

  const searchProducts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "8" });
      if (q.trim()) params.set("search", q.trim());
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      const data = (await res.json()) as { products?: ProductOption[] };
      setResults(data.products ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const timer = window.setTimeout(() => void searchProducts(productLabel), 250);
    return () => window.clearTimeout(timer);
  }, [searchOpen, productLabel, searchProducts]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectProduct(product: ProductOption) {
    onChange({
      productId: product.id,
      variantId: null,
      productNameSnapshot: product.name,
    });
    onLoadVariants(product.id);
    void onProductSelect(product.id);
    setSearchOpen(false);
  }

  return (
    <div className="quick-quote-line">
      <div className="quick-quote-line__header">
        <span className="quick-quote-line__index">Sản phẩm #{index + 1}</span>
        {onRemove && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            onClick={onRemove}
          >
            Xóa
          </button>
        )}
      </div>

      <div className="quick-quote-line__fields quick-quote-line__fields--row">
        <div className="admin-field quick-quote-product-search" ref={wrapRef}>
          <label className="admin-label">Sản phẩm</label>
          <input
            className="admin-input"
            type="search"
            placeholder="Tìm sản phẩm hoặc nhập tên…"
            value={productLabel}
            onChange={(e) => {
              onChange({
                productNameSnapshot: e.target.value,
                productId: null,
                variantId: null,
              });
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
              window.requestAnimationFrame(positionDropdown);
              void searchProducts(productLabel);
            }}
          />
          {searchOpen && (
            <ul
              className={`quick-quote-product-search__dropdown${dropdownSpace.above ? " quick-quote-product-search__dropdown--top" : ""}`}
              role="listbox"
              style={{ maxHeight: dropdownSpace.height }}
            >
              {loading && (
                <li className="quick-quote-product-search__empty">Đang tìm…</li>
              )}
              {!loading && results.length === 0 && (
                <li className="quick-quote-product-search__empty">
                  {productLabel.trim() ? "Không tìm thấy sản phẩm" : "Nhập để tìm sản phẩm"}
                </li>
              )}
              {!loading &&
                results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      className="quick-quote-product-search__option"
                      onClick={() => selectProduct(product)}
                    >
                      {product.name}
                      {product.productCode ? ` · ${product.productCode}` : ""}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {item.productId && variants.length > 0 && (
          <div className="admin-field">
            <label className="admin-label">Biến thể</label>
            <select
              className="admin-input"
              value={item.variantId ?? ""}
              onChange={(e) => {
                const variantId = e.target.value || null;
                const variant = variants.find((v) => v.id === variantId);
                const parts = [variant?.colorName, variant?.sizeName].filter(Boolean);
                onChange({
                  variantId,
                  variantNameSnapshot: parts.length ? parts.join(" / ") : null,
                  skuSnapshot: variant?.sku ?? null,
                  colorSnapshot: variant?.colorName ?? null,
                });
              }}
            >
              <option value="">— Mặc định —</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {[variant.colorName, variant.sizeName].filter(Boolean).join(" / ") ||
                    variant.sku}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="admin-field">
          <label className="admin-label">Số lượng</label>
          <input
            className="admin-input"
            type="number"
            min={1}
            inputMode="numeric"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">Đơn giá (VND)</label>
          <input
            className="admin-input"
            type="number"
            min={0}
            inputMode="decimal"
            value={item.unitPrice ?? 0}
            onChange={(e) => {
              const price = Number(e.target.value) || 0;
              onChange({
                unitPrice: price,
                baseUnitPrice: price,
              });
            }}
          />
        </div>

        <div className="admin-field admin-field--full">
          <label className="admin-label">Ghi chú nhanh (tùy chọn)</label>
          <input
            className="admin-input"
            type="text"
            placeholder="In logo, màu vải, size mix…"
            value={item.itemNote ?? ""}
            onChange={(e) => onChange({ itemNote: e.target.value || null })}
          />
        </div>
      </div>
    </div>
  );
}
