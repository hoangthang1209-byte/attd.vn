"use client";

import { useState } from "react";
import type { CustomerType } from "@prisma/client";
import { CUSTOMER_TYPE_LABELS } from "@/features/crm/labels";
import { CRM_CUSTOMER_TYPES } from "@/features/crm/types";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CrmCustomerRecord, contact: CrmContactRecord | null) => void;
};

export default function QuickAddCustomerModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const [type, setType] = useState<CustomerType>("BUSINESS");
  const [name, setName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactFullName, setContactFullName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    await mutate({
      loadingMessage: "Đang tạo khách hàng…",
      successMessage: "Đã tạo khách hàng mới.",
      action: async () => {
        const res = await fetch("/api/crm/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name,
            taxCode: taxCode || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            primaryContact: contactFullName.trim()
              ? {
                  fullName: contactFullName,
                  title: contactTitle || null,
                  phone: contactPhone || null,
                  email: contactEmail || null,
                }
              : null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.customer as CrmCustomerRecord);
      },
      onSuccess: async (customer) => {
        let contact: CrmContactRecord | null = null;
        if (contactFullName.trim()) {
          const contactsRes = await fetch(`/api/crm/customers/${customer.id}/contacts`);
          const contactsData = (await contactsRes.json()) as { contacts?: CrmContactRecord[] };
          contact =
            contactsData.contacts?.find((c) => c.fullName === contactFullName.trim()) ??
            contactsData.contacts?.[0] ??
            null;
        }
        onCreated(customer, contact);
        setName("");
        setTaxCode("");
        setAddress("");
        setPhone("");
        setEmail("");
        setContactFullName("");
        setContactTitle("");
        setContactPhone("");
        setContactEmail("");
        onClose();
      },
    });
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">Thêm khách hàng mới</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-field">
          <label className="admin-label">Loại khách hàng</label>
          <select className="admin-input" value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
            {CRM_CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Tên công ty / khách hàng *</label>
          <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mã số thuế</label>
          <input className="admin-input" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Địa chỉ</label>
          <input className="admin-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid var(--admin-border, #ddd)" }} />
        <p className="admin-field-hint">Người liên hệ đầu tiên (tùy chọn)</p>
        <div className="admin-field">
          <label className="admin-label">Họ tên</label>
          <input className="admin-input" value={contactFullName} onChange={(e) => setContactFullName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Chức vụ</label>
          <input className="admin-input" value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input className="admin-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="admin-btn admin-btn--primary">
            Tạo khách hàng
          </button>
        </div>
      </form>
    </div>
  );
}
