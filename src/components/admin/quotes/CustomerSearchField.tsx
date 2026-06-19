"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrmCustomerRecord } from "@/features/crm/types";

type Props = {
  value: CrmCustomerRecord | null;
  onSelect: (customer: CrmCustomerRecord | null) => void;
  disabled?: boolean;
};

export default function CustomerSearchField({ value, onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmCustomerRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchCustomers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("search", q.trim());
      params.set("limit", "20");
      const res = await fetch(`/api/crm/customers?${params.toString()}`);
      const data = (await res.json()) as { customers?: CrmCustomerRecord[] };
      setResults(data.customers ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void searchCustomers(query), 300);
    return () => clearTimeout(timer);
  }, [query, open, searchCustomers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function formatLabel(c: CrmCustomerRecord) {
    const parts = [c.code, c.name];
    if (c.legalName && c.legalName !== c.name) parts.push(c.legalName);
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <div className="quote-customer-search" ref={containerRef}>
      <label className="admin-label">Tìm khách hàng</label>
      {value ? (
        <div className="quote-customer-search__selected">
          <div>
            <strong>{value.name}</strong>
            <span className="admin-field-hint"> · {value.code}</span>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            disabled={disabled}
            onClick={() => {
              onSelect(null);
              setQuery("");
              setOpen(true);
            }}
          >
            Đổi khách hàng
          </button>
        </div>
      ) : (
        <>
          <input
            className="admin-input"
            type="search"
            placeholder="Nhập tên công ty, mã khách hàng, SĐT, email hoặc MST"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              void searchCustomers(query);
            }}
          />
          {open && (
            <ul className="quote-customer-search__dropdown" role="listbox">
              {loading && (
                <li className="quote-customer-search__empty">Đang tìm…</li>
              )}
              {!loading && results.length === 0 && (
                <li className="quote-customer-search__empty">
                  Không tìm thấy khách hàng phù hợp
                </li>
              )}
              {!loading &&
                results.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className="quote-customer-search__option"
                      onClick={() => {
                        onSelect(customer);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="quote-customer-search__option-name">
                        {formatLabel(customer)}
                      </span>
                      {customer.taxCode && (
                        <span className="admin-field-hint">MST: {customer.taxCode}</span>
                      )}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
      <p className="admin-field-hint quote-customer-search__hint">
        Tự động điền từ hồ sơ khách hàng · Thông tin này chỉ lưu trên báo giá, không thay đổi hồ sơ CRM
      </p>
    </div>
  );
}
