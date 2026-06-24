"use client";

import { useState } from "react";
import Link from "next/link";
import type { CustomerStatus, CustomerType } from "@prisma/client";
import CrmActivityTimeline from "@/components/admin/crm/CrmActivityTimeline";
import CrmAddActivityForm from "@/components/admin/crm/CrmAddActivityForm";
import CrmContactDialog from "@/components/admin/crm/CrmContactDialog";
import CrmCustomerAddressFields, {
  type CrmAddressFieldValues,
} from "@/components/admin/crm/CrmCustomerAddressFields";
import CrmProductInterestForm, {
  CrmProductInterestList,
} from "@/components/admin/crm/CrmProductInterestForm";
import { CustomerStatusBadge, CustomerTypeBadge } from "@/components/admin/crm/CustomerBadges";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import CrmRelatedQuotes from "@/components/admin/crm/CrmRelatedQuotes";
import CrmRelatedOrders from "@/components/admin/crm/CrmRelatedOrders";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/features/crm/labels";
import { formatCustomerAddressPreview } from "@/features/crm/customer-address";
import { displayWebsiteUrl } from "@/features/crm/crm-validation";
import { formatCrmDateTime } from "@/features/crm/format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import {
  CRM_CUSTOMER_STATUSES,
  CRM_CUSTOMER_TYPES,
  type CrmContactRecord,
  type CrmCustomerRecord,
} from "@/features/crm/types";

function toAddressValues(customer: CrmCustomerRecord): CrmAddressFieldValues {
  return {
    provinceId: customer.provinceId ?? "",
    wardId: customer.wardId ?? "",
    provinceNameSnapshot: customer.provinceNameSnapshot ?? "",
    wardNameSnapshot: customer.wardNameSnapshot ?? "",
    addressLine1: customer.addressLine1 ?? "",
    addressLine2: customer.addressLine2 ?? "",
    address: customer.address ?? "",
    province: customer.province ?? "",
    district: customer.district ?? "",
  };
}

export default function CrmCustomerDetailView({
  initialCustomer,
}: {
  initialCustomer: CrmCustomerRecord;
}) {
  const mutate = useAdminMutation();
  const [customer, setCustomer] = useState(initialCustomer);
  const [type, setType] = useState<CustomerType>(initialCustomer.type);
  const [status, setStatus] = useState<CustomerStatus>(initialCustomer.status);
  const [name, setName] = useState(initialCustomer.name);
  const [legalName, setLegalName] = useState(initialCustomer.legalName ?? "");
  const [taxCode, setTaxCode] = useState(initialCustomer.taxCode ?? "");
  const [phone, setPhone] = useState(initialCustomer.phone ?? "");
  const [email, setEmail] = useState(initialCustomer.email ?? "");
  const [website, setWebsite] = useState(initialCustomer.website ?? "");
  const [addressValues, setAddressValues] = useState<CrmAddressFieldValues>(
    toAddressValues(initialCustomer),
  );
  const [note, setNote] = useState(initialCustomer.note ?? "");
  const [internalNote, setInternalNote] = useState(initialCustomer.internalNote ?? "");
  const [billingNote, setBillingNote] = useState(initialCustomer.billingNote ?? "");
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContactRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function refreshCustomer() {
    const res = await fetch(`/api/crm/customers/${customer.id}`);
    const data = await res.json();
    if (res.ok && data.customer) {
      setCustomer(data.customer);
      setAddressValues(toAddressValues(data.customer));
    }
  }

  async function saveCustomer() {
    setSaving(true);
    setMessage(null);
    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch(`/api/crm/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            status,
            name,
            legalName,
            taxCode,
            phone,
            email,
            website,
            note,
            internalNote,
            billingNote,
            provinceId: addressValues.provinceId || null,
            wardId: addressValues.wardId || null,
            provinceNameSnapshot: addressValues.provinceNameSnapshot || null,
            wardNameSnapshot: addressValues.wardNameSnapshot || null,
            addressLine1: addressValues.addressLine1 || null,
            addressLine2: addressValues.addressLine2 || null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.customer as CrmCustomerRecord);
      },
      onSuccess: (updatedCustomer) => {
        setCustomer(updatedCustomer);
        setAddressValues(toAddressValues(updatedCustomer));
      },
    });
    setSaving(false);
  }

  async function handleDeleteContact(contactId: string) {
    if (!window.confirm("Xóa người liên hệ này?")) return;
    await mutate({
      loadingMessage: "Đang xóa người liên hệ…",
      successMessage: "Đã xóa người liên hệ.",
      action: async () => {
        const res = await fetch(`/api/crm/customers/${customer.id}/contacts/${contactId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error((data as { message?: string }).message ?? "Không thể xóa người liên hệ");
        }
        return { ok: true as const, data: true };
      },
      onSuccess: () => void refreshCustomer(),
    });
  }

  async function handleSetPrimary(contactId: string) {
    await mutate({
      loadingMessage: "Đang cập nhật…",
      successMessage: "Đã đặt liên hệ chính.",
      action: async () => {
        const res = await fetch(
          `/api/crm/customers/${customer.id}/contacts/${contactId}/set-primary`,
          { method: "POST" },
        );
        return parseAdminJsonResponse(res, (data) => data.customer as CrmCustomerRecord);
      },
      onSuccess: (updatedCustomer) => setCustomer(updatedCustomer),
    });
  }

  const addressPreview = formatCustomerAddressPreview({
    ...addressValues,
    addressLine1: addressValues.addressLine1,
    wardNameSnapshot: addressValues.wardNameSnapshot,
    provinceNameSnapshot: addressValues.provinceNameSnapshot,
  });

  return (
    <div className="admin-panel">
      <div className="admin-crm-detail-header">
        <div>
          <p className="admin-crm-detail-code">Mã khách hàng: {customer.code}</p>
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
        <CrmRelatedOrders customerId={customer.id} />
      </div>

      <div className="admin-crm-detail-grid">
        <section className="admin-section-card">
          <h3>A. Thông tin doanh nghiệp</h3>
          <div className="admin-form admin-form--compact admin-form-grid">
            <label>
              Mã khách hàng
              <input className="admin-input" value={customer.code} readOnly />
            </label>
            <label>
              Tên khách hàng *
              <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Tên pháp lý
              <input className="admin-input" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </label>
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
              Mã số thuế
              <input className="admin-input" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
            </label>
            <label>
              Số điện thoại công ty
              <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Email công ty
              <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Website
              <input
                className="admin-input"
                value={displayWebsiteUrl(website)}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="example.com"
              />
            </label>
          </div>
        </section>

        <section className="admin-section-card">
          <h3>B. Địa chỉ</h3>
          <CrmCustomerAddressFields
            values={addressValues}
            onChange={(patch) => setAddressValues((prev) => ({ ...prev, ...patch }))}
          />
          {addressPreview && <p className="admin-field-hint">Xem trước: {addressPreview}</p>}
        </section>

        <section className="admin-section-card">
          <div className="admin-section-header">
            <h3>C. Người liên hệ</h3>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => {
                setEditingContact(null);
                setContactDialogOpen(true);
              }}
            >
              Thêm người liên hệ
            </button>
          </div>
          <div className="admin-crm-contact-list">
            {(customer.contacts ?? []).map((contact) => (
              <article key={contact.id} className="admin-crm-contact-card">
                <div>
                  <strong>{contact.fullName}</strong>
                  {contact.isPrimary && <span className="admin-badge admin-badge--primary">Chính</span>}
                  <p className="admin-field-hint">
                    {[contact.title, contact.department].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="admin-field-hint">
                    {[contact.phone, contact.email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="admin-crm-contact-card__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small"
                    onClick={() => {
                      setEditingContact(contact);
                      setContactDialogOpen(true);
                    }}
                  >
                    Sửa
                  </button>
                  {!contact.isPrimary && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--small"
                      onClick={() => void handleSetPrimary(contact.id)}
                    >
                      Đặt chính
                    </button>
                  )}
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger admin-btn--small"
                    onClick={() => void handleDeleteContact(contact.id)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
            {!customer.contacts?.length && <p className="admin-field-hint">Chưa có người liên hệ</p>}
          </div>
        </section>

        <section className="admin-section-card">
          <h3>D. Ghi chú</h3>
          <div className="admin-form admin-form--compact">
            <label>
              Ghi chú
              <textarea className="admin-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label>
              Ghi chú nội bộ
              <textarea className="admin-input" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            </label>
            <label>
              Ghi chú thanh toán
              <textarea className="admin-input" rows={2} value={billingNote} onChange={(e) => setBillingNote(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="admin-section-card">
          <h3>Lead liên quan</h3>
          {customer.leads?.length ? (
            <ul className="admin-crm-related-list">
              {customer.leads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/admin/crm/leads/${lead.id}`}>{lead.fullName}</Link>
                  <LeadStatusBadge status={lead.status} />
                  <span className="admin-field-hint">{formatCrmDateTime(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-field-hint">Chưa có lead liên quan</p>
          )}
        </section>

        <section className="admin-section-card">
          <h3>Hoạt động</h3>
          <CrmAddActivityForm customerId={customer.id} onCreated={() => void refreshCustomer()} />
          <CrmActivityTimeline activities={customer.activities ?? []} />
        </section>

        <section className="admin-section-card">
          <h3>Nhu cầu sản phẩm</h3>
          <CrmProductInterestForm customerId={customer.id} onCreated={() => void refreshCustomer()} />
          <CrmProductInterestList interests={customer.productInterests ?? []} />
        </section>
      </div>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void saveCustomer()}>
          {saving ? "Đang lưu…" : "Lưu thông tin khách hàng"}
        </button>
      </div>

      <CrmContactDialog
        customerId={customer.id}
        open={contactDialogOpen}
        contact={editingContact}
        onClose={() => setContactDialogOpen(false)}
        onSaved={() => void refreshCustomer()}
      />
    </div>
  );
}
