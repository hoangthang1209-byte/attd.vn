"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CustomerStatus, CustomerType } from "@prisma/client";
import CrmActivityTimeline from "@/components/admin/crm/CrmActivityTimeline";
import CrmAddActivityForm from "@/components/admin/crm/CrmAddActivityForm";
import CrmProductInterestForm, {
  CrmProductInterestList,
} from "@/components/admin/crm/CrmProductInterestForm";
import { CustomerStatusBadge, CustomerTypeBadge } from "@/components/admin/crm/CustomerBadges";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import CrmRelatedQuotes from "@/components/admin/crm/CrmRelatedQuotes";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/features/crm/labels";
import { formatCrmDateTime } from "@/features/crm/format";
import {
  CRM_CUSTOMER_STATUSES,
  CRM_CUSTOMER_TYPES,
  type CrmCustomerRecord,
} from "@/features/crm/types";

export default function CrmCustomerDetailView({
  initialCustomer,
}: {
  initialCustomer: CrmCustomerRecord;
}) {
  const router = useRouter();
  const [customer, setCustomer] = useState(initialCustomer);
  const [type, setType] = useState<CustomerType>(initialCustomer.type);
  const [status, setStatus] = useState<CustomerStatus>(initialCustomer.status);
  const [name, setName] = useState(initialCustomer.name);
  const [phone, setPhone] = useState(initialCustomer.phone ?? "");
  const [email, setEmail] = useState(initialCustomer.email ?? "");
  const [province, setProvince] = useState(initialCustomer.province ?? "");
  const [note, setNote] = useState(initialCustomer.note ?? "");
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function refreshCustomer() {
    const res = await fetch(`/api/crm/customers/${customer.id}`);
    const data = await res.json();
    if (res.ok && data.customer) {
      setCustomer(data.customer);
    }
    router.refresh();
  }

  async function saveCustomer() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, status, name, phone, email, province, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
        return;
      }
      setCustomer(data.customer);
      setMessage({ type: "success", text: "Đã cập nhật khách hàng" });
    } catch {
      setMessage({ type: "error", text: "Cập nhật thất bại" });
    } finally {
      setSaving(false);
    }
  }

  async function addContact() {
    if (!newContactName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          fullName: newContactName,
          phone: newContactPhone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Không thể thêm liên hệ" });
        return;
      }
      setCustomer(data.customer);
      setNewContactName("");
      setNewContactPhone("");
      setMessage({ type: "success", text: "Đã thêm liên hệ" });
    } catch {
      setMessage({ type: "error", text: "Không thể thêm liên hệ" });
    } finally {
      setSaving(false);
    }
  }

  async function markPrimary(contactId: string) {
    const res = await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id, contactId }),
    });
    const data = await res.json();
    if (res.ok) setCustomer(data.customer);
  }

  return (
    <div className="admin-panel">
      <div className="admin-crm-detail-header">
        <div>
          <p className="admin-crm-detail-code">{customer.code}</p>
          <h2>{customer.name}</h2>
          <div className="admin-crm-detail-badges">
            <CustomerTypeBadge type={customer.type} />
            <CustomerStatusBadge status={customer.status} />
          </div>
        </div>
        <Link href="/admin/crm/customers" className="admin-btn admin-btn--secondary">
          ← Danh sách khách hàng
        </Link>
      </div>

      {message && (
        <p className={`admin-message admin-message--${message.type}`} role="alert">
          {message.text}
        </p>
      )}

      <div className="admin-crm-placeholder-grid">
        <CrmRelatedQuotes
          customerId={customer.id}
          createHref={`/admin/quotes/new?customerId=${customer.id}`}
        />
        <div className="admin-section-card admin-section-card--disabled">
          <h3>Đơn hàng</h3>
          <p className="admin-empty-hint">Sẽ triển khai ở sprint sau</p>
        </div>
      </div>

      <div className="admin-crm-detail-grid">
        <section className="admin-section-card">
          <h3>Thông tin khách hàng</h3>
          <div className="admin-form admin-form--compact">
            <label>
              Loại khách
              <select className="admin-input" value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
                {CRM_CUSTOMER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CUSTOMER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tên *
              <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              SĐT
              <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Email
              <input className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Tỉnh/TP
              <input className="admin-input" value={province} onChange={(e) => setProvince(e.target.value)} />
            </label>
            <label>
              Trạng thái
              <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)}>
                {CRM_CUSTOMER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CUSTOMER_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ghi chú
              <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void saveCustomer()}>
              Lưu thay đổi
            </button>
          </div>
        </section>

        <section className="admin-section-card">
          <h3>Người liên hệ</h3>
          {(customer.contacts ?? []).length === 0 ? (
            <p className="admin-empty-hint">Chưa có liên hệ</p>
          ) : (
            <ul className="admin-crm-contact-list">
              {(customer.contacts ?? []).map((contact) => (
                <li key={contact.id}>
                  <strong>{contact.fullName}</strong>
                  {contact.isPrimary && <span className="admin-badge">Chính</span>}
                  <p>
                    {contact.phone || "—"} · {contact.email || "—"}
                  </p>
                  {!contact.isPrimary && (
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => void markPrimary(contact.id)}
                    >
                      Đặt làm liên hệ chính
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <hr className="admin-divider" />
          <div className="admin-form admin-form--compact">
            <label>
              Thêm liên hệ
              <input className="admin-input" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="Họ tên" />
            </label>
            <label>
              SĐT
              <input className="admin-input" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
            </label>
            <button type="button" className="admin-btn admin-btn--secondary" disabled={saving} onClick={() => void addContact()}>
              Thêm liên hệ
            </button>
          </div>
        </section>
      </div>

      <section className="admin-section-card">
        <h3>Lead liên quan</h3>
        {(customer.leads ?? []).length === 0 ? (
          <p className="admin-empty-hint">Chưa có lead liên quan</p>
        ) : (
          <ul className="admin-crm-interest-list">
            {(customer.leads ?? []).map((lead) => (
              <li key={lead.id}>
                <Link href={`/admin/crm/leads/${lead.id}`}>
                  {lead.code || lead.id} — {lead.contactName || lead.fullName}
                </Link>{" "}
                <LeadStatusBadge status={lead.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section-card">
        <h3>Sản phẩm quan tâm</h3>
        <CrmProductInterestList interests={customer.productInterests ?? []} />
        <hr className="admin-divider" />
        <CrmProductInterestForm customerId={customer.id} onCreated={() => void refreshCustomer()} />
      </section>

      <section className="admin-section-card">
        <h3>Hoạt động chăm sóc</h3>
        <CrmActivityTimeline activities={customer.activities ?? []} />
        <hr className="admin-divider" />
        <CrmAddActivityForm customerId={customer.id} onCreated={() => void refreshCustomer()} />
      </section>
    </div>
  );
}
