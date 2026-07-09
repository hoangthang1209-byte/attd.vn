"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { CrmCustomerRecord } from "@/features/crm/types";

type Props = {
  value: CrmCustomerRecord | null;
  onSelect: (customer: CrmCustomerRecord | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  hideHint?: boolean;
};

export default function CustomerSearchField({
  value,
  onSelect,
  disabled,
  label = "Tìm khách hàng",
  hint = "Tự động điền từ hồ sơ khách hàng · Thông tin này chỉ lưu trên báo giá, không thay đổi hồ sơ CRM",
  hideHint = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmCustomerRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    left: 0,
    top: 0,
    width: 320,
    maxHeight: 280,
    placement: "bottom" as "bottom" | "top",
  });

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
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateDropdownPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const viewportPadding = 12;
    const gap = 6;
    const roomBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
    const roomAbove = rect.top - viewportPadding - gap;
    const placement =
      roomBelow < 220 && roomAbove > roomBelow ? "top" : "bottom";
    const availableHeight = placement === "bottom" ? roomBelow : roomAbove;
    const width = Math.min(
      Math.max(rect.width, 320),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );

    setDropdownPosition({
      left,
      top: placement === "bottom" ? rect.bottom + gap : rect.top - gap,
      width,
      maxHeight: Math.max(160, Math.min(280, availableHeight)),
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || value) return;
    updateDropdownPosition();
  }, [open, updateDropdownPosition, value]);

  useEffect(() => {
    if (!open || value) return;

    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition, value]);

  function formatLabel(c: CrmCustomerRecord) {
    const parts = [c.code, c.name];
    if (c.legalName && c.legalName !== c.name) parts.push(c.legalName);
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <div className="quote-customer-search" ref={containerRef}>
      <label className="admin-label">{label}</label>
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
            ref={inputRef}
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
          {open && createPortal(
            <ul
              ref={dropdownRef}
              className={`quote-customer-search__dropdown quote-customer-search__dropdown--portal quote-customer-search__dropdown--${dropdownPosition.placement}`}
              role="listbox"
              style={{
                left: dropdownPosition.left,
                top: dropdownPosition.top,
                right: "auto",
                width: dropdownPosition.width,
                maxHeight: dropdownPosition.maxHeight,
              }}
            >
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
            </ul>,
            document.body,
          )}
        </>
      )}
      {!hideHint ? (
        <p className="admin-field-hint quote-customer-search__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
