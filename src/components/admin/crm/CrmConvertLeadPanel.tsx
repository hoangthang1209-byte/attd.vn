"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmCustomerRecord } from "@/features/crm/types";
import type { CrmLeadRecord } from "@/features/crm/types";
import { displayLeadContactName } from "@/features/crm/labels";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  lead: CrmLeadRecord;
  onDone: (lead: CrmLeadRecord) => void;
  onError: (message: string) => void;
};

export default function CrmConvertLeadPanel({ lead, onDone, onError }: Props) {
  const mutate = useAdminMutation();
  const [mode, setMode] = useState<"new" | "link">("new");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CrmCustomerRecord[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [createContact, setCreateContact] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasContactData = Boolean(
    lead.contactName?.trim() ||
      lead.fullName?.trim() ||
      (lead.phone && lead.phone !== "—") ||
      lead.email?.trim() ||
      lead.zalo?.trim()
  );

  const searchCustomers = useCallback(async (query: string) => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/crm/customers?${params.toString()}`);
      const data = await res.json();
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch {
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "link") return;
    const timer = setTimeout(() => {
      void searchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, search, searchCustomers]);

  async function createNewCustomer() {
    if (!confirm("Tạo khách hàng mới từ thông tin lead này?")) return;
    setSubmitting(true);
    const updated = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã liên kết khách hàng.",
      action: async () => {
        const res = await fetch(`/api/crm/leads/${lead.id}/convert`, { method: "POST" });
        return parseAdminJsonResponse(res, (data) => data.lead as CrmLeadRecord);
      },
    });
    setSubmitting(false);
    if (updated) onDone(updated);
  }

  async function linkExistingCustomer() {
    if (!selectedCustomerId) {
      onError("Vui lòng chọn khách hàng");
      return;
    }
    setSubmitting(true);
    const updated = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã liên kết khách hàng.",
      action: async () => {
        const res = await fetch(`/api/crm/leads/${lead.id}/link-customer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: selectedCustomerId,
            createContact: createContact && hasContactData,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.lead as CrmLeadRecord);
      },
    });
    setSubmitting(false);
    if (updated) onDone(updated);
  }

  return (
    <section className="admin-section-card admin-crm-convert-panel">
      <h3>Chuyển thành khách hàng</h3>
      <div className="admin-crm-convert-tabs">
        <button
          type="button"
          className={`admin-btn admin-btn--sm ${mode === "new" ? "admin-btn--primary" : "admin-btn--secondary"}`}
          onClick={() => setMode("new")}
        >
          Tạo khách hàng mới
        </button>
        <button
          type="button"
          className={`admin-btn admin-btn--sm ${mode === "link" ? "admin-btn--primary" : "admin-btn--secondary"}`}
          onClick={() => setMode("link")}
        >
          Gắn với khách hàng có sẵn
        </button>
      </div>

      {mode === "new" ? (
        <div className="admin-crm-convert-body">
          <p className="admin-empty-hint">
            Tạo khách hàng mới từ thông tin công ty và liên hệ của lead{" "}
            <strong>{displayLeadContactName(lead)}</strong>.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={submitting}
            onClick={() => void createNewCustomer()}
          >
            {submitting ? "Đang xử lý..." : "Tạo khách hàng mới"}
          </button>
        </div>
      ) : (
        <div className="admin-crm-convert-body">
          <label>
            Tìm khách hàng theo tên, mã, SĐT, email hoặc mã số thuế
            <input
              type="search"
              className="admin-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
            />
          </label>

          {loadingCustomers ? (
            <p className="admin-loading">Đang tìm...</p>
          ) : customers.length === 0 ? (
            <p className="admin-empty-hint">Không tìm thấy khách hàng phù hợp</p>
          ) : (
            <ul className="admin-crm-customer-picker">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <label className="admin-crm-customer-picker-item">
                    <input
                      type="radio"
                      name="selectedCustomer"
                      value={customer.id}
                      checked={selectedCustomerId === customer.id}
                      onChange={() => setSelectedCustomerId(customer.id)}
                    />
                    <span>
                      <strong>{customer.code}</strong> — {customer.name}
                      {(customer.phone || customer.email) && (
                        <span className="admin-crm-customer-picker-meta">
                          {" "}
                          · {customer.phone || "—"} · {customer.email || "—"}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {hasContactData && (
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={createContact}
                onChange={(e) => setCreateContact(e.target.checked)}
              />
              Tạo liên hệ mới từ thông tin lead nếu chưa có liên hệ trùng khớp
            </label>
          )}

          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={submitting || !selectedCustomerId}
            onClick={() => void linkExistingCustomer()}
          >
            {submitting ? "Đang gắn..." : "Gắn với khách hàng có sẵn"}
          </button>
        </div>
      )}
    </section>
  );
}
