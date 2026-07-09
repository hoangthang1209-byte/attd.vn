"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupplierCategory } from "@prisma/client";
import { SUPPLIER_CATEGORY_LABELS } from "@/features/production-master/production-master-labels";

export type SupplierSearchRecord = {
  id: string;
  code: string;
  name: string;
  category: SupplierCategory;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Props = {
  value: SupplierSearchRecord | null;
  onSelect: (supplier: SupplierSearchRecord | null) => void;
  disabled?: boolean;
  defaultCategory?: SupplierCategory;
};

export default function SupplierSearchField({
  value,
  onSelect,
  disabled,
  defaultCategory = "PATTERN_ROOM",
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierSearchRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchSuppliers = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("search", q.trim());
        params.set("activeOnly", "true");
        if (!showAllSuppliers) params.set("category", defaultCategory);
        const res = await fetch(`/api/production-suppliers?${params.toString()}`);
        const data = (await res.json()) as { items?: SupplierSearchRecord[] };
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [defaultCategory, showAllSuppliers],
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void searchSuppliers(query), 250);
    return () => clearTimeout(timer);
  }, [query, open, searchSuppliers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createHref = `/admin/production-suppliers?category=${defaultCategory}`;

  return (
    <div className="supplier-search-field" ref={containerRef}>
      <div className="supplier-search-field__toolbar">
        <span className="admin-field__label">Nhà cung cấp rập</span>
        <label className="supplier-search-field__filter-toggle">
          <input
            type="checkbox"
            checked={showAllSuppliers}
            disabled={disabled}
            onChange={(e) => {
              setShowAllSuppliers(e.target.checked);
              if (open) void searchSuppliers(query);
            }}
          />
          <span>Hiện tất cả nhà cung cấp</span>
        </label>
      </div>

      {value ? (
        <div className="supplier-search-field__card">
          <div className="supplier-search-field__card-main">
            <strong>{value.code}</strong>
            <span>{value.name}</span>
            <span className="admin-status-badge admin-status-badge--info">
              {SUPPLIER_CATEGORY_LABELS[value.category] ?? value.category}
            </span>
          </div>
          <dl className="supplier-search-field__card-meta">
            {value.contact ? (
              <div>
                <dt>Liên hệ</dt>
                <dd>{value.contact}</dd>
              </div>
            ) : null}
            {value.phone ? (
              <div>
                <dt>Điện thoại / Zalo</dt>
                <dd>{value.phone}</dd>
              </div>
            ) : null}
          </dl>
          {!disabled && (
            <button
              type="button"
              className="admin-btn admin-btn--xs"
              onClick={() => {
                onSelect(null);
                setQuery("");
                setOpen(true);
              }}
            >
              Đổi nhà cung cấp
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            className="admin-input"
            type="search"
            placeholder="Tìm mã, tên, liên hệ, điện thoại..."
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              void searchSuppliers(query);
            }}
          />
          {open && !disabled && (
            <ul className="supplier-search-field__results" role="listbox">
              {loading && <li className="supplier-search-field__empty">Đang tìm…</li>}
              {!loading && results.length === 0 && (
                <li className="supplier-search-field__empty">Không tìm thấy nhà cung cấp phù hợp</li>
              )}
              {!loading &&
                results.map((supplier) => (
                  <li key={supplier.id}>
                    <button
                      type="button"
                      className="supplier-search-field__option"
                      onClick={() => {
                        onSelect(supplier);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span>
                        <strong>{supplier.code}</strong> — {supplier.name}
                      </span>
                      <span className="supplier-search-field__option-meta">
                        <span>{SUPPLIER_CATEGORY_LABELS[supplier.category] ?? supplier.category}</span>
                        {supplier.contact && <span>{supplier.contact}</span>}
                        {supplier.phone && <span>{supplier.phone}</span>}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      {!disabled && (
        <p className="admin-field-hint supplier-search-field__hint">
          <Link href={createHref} className="admin-link" target="_blank" rel="noopener noreferrer">
            Tạo nhà cung cấp
          </Link>
          {!showAllSuppliers && ` · Mặc định lọc: ${SUPPLIER_CATEGORY_LABELS[defaultCategory]}`}
        </p>
      )}

      {!value && !disabled && (
        <p className="admin-field-hint">
          Rập cũ chỉ có tên nhà cung cấp dạng text vẫn hiển thị bình thường cho đến khi bạn chọn từ danh mục.
        </p>
      )}
    </div>
  );
}
