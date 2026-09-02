"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProductOption = { id: string; name: string; productCode?: string | null };

type Props = {
  value: string;
  productId?: string;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (next: {
    customProductName: string;
    productId?: string;
    variantId?: string;
  }) => void;
  onCommit?: () => void;
  onKeyNav?: (key: "enter" | "tab" | "shiftTab" | "escape") => void;
  onRegisterFocus?: (focus: () => void) => void;
};

export default function CostingBatchStyleCell({
  value,
  productId,
  disabled,
  placeholder = "Nhập style…",
  autoFocus,
  inputRef: externalRef,
  onChange,
  onCommit,
  onKeyNav,
  onRegisterFocus,
}: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q.trim(), pageSize: "8" });
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
    if (!open) return;
    const timer = setTimeout(() => void searchProducts(value), 250);
    return () => clearTimeout(timer);
  }, [open, value, searchProducts]);

  useEffect(() => {
    if (onRegisterFocus) {
      onRegisterFocus(() => inputRef.current?.focus());
    }
  }, [onRegisterFocus, inputRef]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus, inputRef]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmed = value.trim();
  const showCustom = trimmed.length > 0;

  return (
    <div className="costing-batch-style-cell" ref={wrapRef}>
      <input
        ref={inputRef}
        className="costing-batch-cell-input"
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange({ customProductName: e.target.value, productId: undefined, variantId: undefined });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onCommit?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onKeyNav?.("enter");
          } else if (e.key === "Tab" && e.shiftKey) {
            e.preventDefault();
            onKeyNav?.("shiftTab");
          } else if (e.key === "Tab") {
            e.preventDefault();
            onKeyNav?.("tab");
          } else if (e.key === "Escape") {
            e.preventDefault();
            onKeyNav?.("escape");
          }
        }}
      />
      {productId && (
        <span className="admin-field-hint costing-batch-style-cell__catalog">Catalog</span>
      )}
      {open && (loading || results.length > 0 || showCustom) && (
        <ul className="costing-batch-style-cell__dropdown" role="listbox">
          {loading && <li className="costing-batch-style-cell__empty">Đang tìm…</li>}
          {!loading &&
            results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="costing-batch-style-cell__option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({
                      customProductName: product.name,
                      productId: product.id,
                    });
                    setOpen(false);
                    onCommit?.();
                  }}
                >
                  {product.productCode ? `${product.productCode} · ` : ""}{product.name}
                </button>
              </li>
            ))}
          {showCustom && (
            <li>
              <button
                type="button"
                className="costing-batch-style-cell__option costing-batch-style-cell__option--custom"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ customProductName: trimmed, productId: undefined });
                  setOpen(false);
                  onCommit?.();
                }}
              >
                Dùng &quot;{trimmed}&quot; làm style tùy chỉnh
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
