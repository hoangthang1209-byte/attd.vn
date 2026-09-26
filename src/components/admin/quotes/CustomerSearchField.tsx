"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import CustomerQuickCreateDialog from "@/components/admin/crm/CustomerQuickCreateDialog";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";

type Props = {
  value: CrmCustomerRecord | null;
  onSelect: (customer: CrmCustomerRecord | null) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  hideHint?: boolean;
  allowQuickCreate?: boolean;
  quickCreateContextLabel?: string;
  onContactSelect?: (contact: CrmContactRecord | null) => void;
};

export default function CustomerSearchField({
  value,
  onSelect,
  disabled,
  label = "Tìm khách hàng",
  hint = "Tự động điền từ hồ sơ khách hàng · Thông tin này chỉ lưu trên báo giá, không thay đổi hồ sơ CRM",
  hideHint = false,
  allowQuickCreate = false,
  quickCreateContextLabel = "phiên làm việc hiện tại",
  onContactSelect,
}: Props) {
  const { permissions } = useAdminPermissions();
  const canQuickCreate = allowQuickCreate && permissions.canCreateCustomers;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmCustomerRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
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
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportRight = viewportLeft + (visualViewport?.width ?? window.innerWidth);
    const viewportBottom = viewportTop + (visualViewport?.height ?? window.innerHeight);
    const viewportPadding = 12;
    const gap = 6;
    const roomBelow = viewportBottom - rect.bottom - viewportPadding - gap;
    const roomAbove = rect.top - viewportTop - viewportPadding - gap;
    const placement =
      roomBelow < 220 && roomAbove > roomBelow ? "top" : "bottom";
    const availableHeight = placement === "bottom" ? roomBelow : roomAbove;
    const maxWidth = Math.max(0, viewportRight - viewportLeft - viewportPadding * 2);
    const width = Math.min(Math.max(rect.width, Math.min(280, maxWidth)), maxWidth);
    const left = Math.min(
      Math.max(viewportLeft + viewportPadding, rect.left),
      viewportRight - width - viewportPadding,
    );
    const useViewportOverlay = availableHeight < 96;
    const maxHeight = useViewportOverlay
      ? Math.max(0, Math.min(280, viewportBottom - viewportTop - viewportPadding * 2))
      : Math.max(0, Math.min(280, availableHeight));
    const top = useViewportOverlay
      ? viewportTop + viewportPadding
      : placement === "bottom"
      ? Math.min(rect.bottom + gap, viewportBottom - viewportPadding - maxHeight)
      : Math.max(rect.top - gap, viewportTop + viewportPadding + maxHeight);

    setDropdownPosition({
      left,
      top,
      width,
      maxHeight,
      placement: useViewportOverlay ? "bottom" : placement,
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
    window.visualViewport?.addEventListener("resize", updateDropdownPosition);
    window.visualViewport?.addEventListener("scroll", updateDropdownPosition);
    const frame = window.requestAnimationFrame(updateDropdownPosition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.visualViewport?.removeEventListener("resize", updateDropdownPosition);
      window.visualViewport?.removeEventListener("scroll", updateDropdownPosition);
    };
  }, [open, updateDropdownPosition, value]);

  function formatLabel(c: CrmCustomerRecord) {
    const parts = [c.code, c.name];
    if (c.legalName && c.legalName !== c.name) parts.push(c.legalName);
    return parts.filter(Boolean).join(" · ");
  }

  function handleQuickCreated(customer: CrmCustomerRecord, contact: CrmContactRecord | null) {
    onSelect(customer);
    onContactSelect?.(contact);
    setOpen(false);
    setQuery("");
    void searchCustomers(customer.name);
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
              onContactSelect?.(null);
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
            placeholder="Tìm khách hàng…"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              window.requestAnimationFrame(updateDropdownPosition);
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
                        onContactSelect?.(
                          customer.contacts?.find((c) => c.isPrimary) ??
                            customer.contacts?.[0] ??
                            null,
                        );
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
              {canQuickCreate && !loading && (
                <li>
                  <button
                    type="button"
                    className="quote-customer-search__option quote-customer-search__option--create"
                    onClick={() => {
                      setOpen(false);
                      setQuickCreateOpen(true);
                    }}
                  >
                    + Tạo khách hàng mới
                  </button>
                </li>
              )}
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

      {canQuickCreate && (
        <CustomerQuickCreateDialog
          open={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          onCreated={handleQuickCreated}
          variant="minimal"
          contextLabel={quickCreateContextLabel}
        />
      )}
    </div>
  );
}
