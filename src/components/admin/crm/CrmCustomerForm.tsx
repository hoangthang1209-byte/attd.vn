"use client";

import { useRouter } from "next/navigation";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { useState } from "react";
import type { CustomerStatus, CustomerType } from "@prisma/client";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/features/crm/labels";
import { CRM_CUSTOMER_STATUSES, CRM_CUSTOMER_TYPES } from "@/features/crm/types";

export default function CrmCustomerForm() {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [type, setType] = useState<CustomerType>("BUSINESS");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [status, setStatus] = useState<CustomerStatus>("PROSPECT");
  const [note, setNote] = useState("");
  const [contactFullName, setContactFullName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactZalo, setContactZalo] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const customer = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch("/api/crm/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name,
            legalName,
            taxCode,
            phone,
            email,
            website,
            address,
            province,
            district,
            status,
            note,
            primaryContact: contactFullName.trim()
              ? {
                  fullName: contactFullName,
                  title: contactTitle,
                  phone: contactPhone,
                  email: contactEmail,
                  zalo: contactZalo,
                  note: contactNote,
                }
              : null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.customer as { id: string });
      },
      onSuccess: (savedCustomer) => {
        router.push(`/admin/crm/customers/${savedCustomer.id}`);
      },
    });

    if (!customer) {
      setError("Không thể tạo khách hàng");
    }
    setSaving(false);
  }

  return (
    <form className="admin-form admin-form--wide" onSubmit={handleSubmit}>
      <section className="admin-section-card">
        <h2>Thông tin khách hàng</h2>
        <div className="admin-form-grid">
          <label>
            Loại khách *
            <select className="admin-input" value={type} onChange={(e) => setType(e.target.value as CustomerType)}>
              {CRM_CUSTOMER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CUSTOMER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tên khách hàng *
            <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Tên pháp lý
            <input className="admin-input" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </label>
          <label>
            Mã số thuế
            <input className="admin-input" value={taxCode} onChange={(e) => setTaxCode(e.target.value)} />
          </label>
          <label>
            SĐT
            <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Website
            <input className="admin-input" value={website} onChange={(e) => setWebsite(e.target.value)} />
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
          <label className="admin-form-grid-span-2">
            Địa chỉ
            <input className="admin-input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label>
            Tỉnh/TP
            <input className="admin-input" value={province} onChange={(e) => setProvince(e.target.value)} />
          </label>
          <label>
            Quận/Huyện
            <input className="admin-input" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="admin-section-card">
        <h2>Người liên hệ chính</h2>
        <div className="admin-form-grid">
          <label>
            Họ tên
            <input className="admin-input" value={contactFullName} onChange={(e) => setContactFullName(e.target.value)} />
          </label>
          <label>
            Chức danh
            <input className="admin-input" value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} />
          </label>
          <label>
            SĐT
            <input className="admin-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" className="admin-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </label>
          <label>
            Zalo
            <input className="admin-input" value={contactZalo} onChange={(e) => setContactZalo(e.target.value)} />
          </label>
          <label className="admin-form-grid-span-2">
            Ghi chú liên hệ
            <textarea className="admin-input" rows={2} value={contactNote} onChange={(e) => setContactNote(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="admin-section-card">
        <h2>Ghi chú nội bộ</h2>
        <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </section>

      {error && <p className="admin-message admin-message--error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? "Đang lưu..." : "Tạo khách hàng"}
        </button>
      </div>
    </form>
  );
}
