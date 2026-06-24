"use client";

import { useRouter } from "next/navigation";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { useRef, useState } from "react";
import type { CustomerStatus, CustomerType } from "@prisma/client";
import CrmCustomerAddressFields, {
  type CrmAddressFieldValues,
} from "@/components/admin/crm/CrmCustomerAddressFields";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/features/crm/labels";
import { CRM_CUSTOMER_STATUSES, CRM_CUSTOMER_TYPES } from "@/features/crm/types";

const emptyAddress: CrmAddressFieldValues = {
  provinceId: "",
  wardId: "",
  provinceNameSnapshot: "",
  wardNameSnapshot: "",
  addressLine1: "",
  addressLine2: "",
  address: "",
  province: "",
  district: "",
};

export default function CrmCustomerForm() {
  const router = useRouter();
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [type, setType] = useState<CustomerType>("BUSINESS");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [addressValues, setAddressValues] = useState<CrmAddressFieldValues>(emptyAddress);
  const [status, setStatus] = useState<CustomerStatus>("PROSPECT");
  const [note, setNote] = useState("");
  const [contactFullName, setContactFullName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactDepartment, setContactDepartment] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [contactIsPrimary, setContactIsPrimary] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
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
            address: addressValues.address || null,
            province: addressValues.province || null,
            district: addressValues.district || null,
            provinceId: addressValues.provinceId || null,
            wardId: addressValues.wardId || null,
            provinceNameSnapshot: addressValues.provinceNameSnapshot || null,
            wardNameSnapshot: addressValues.wardNameSnapshot || null,
            addressLine1: addressValues.addressLine1 || null,
            addressLine2: addressValues.addressLine2 || null,
            status,
            note,
            primaryContact: contactFullName.trim()
              ? {
                  fullName: contactFullName,
                  title: contactTitle,
                  department: contactDepartment,
                  phone: contactPhone,
                  email: contactEmail,
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
    submitLock.current = false;
    setSaving(false);
  }

  return (
    <form className="admin-form admin-form--wide" onSubmit={handleSubmit}>
      <section className="admin-section-card">
        <h2>Thông tin doanh nghiệp</h2>
        <div className="admin-form-grid">
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
            Số điện thoại công ty
            <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Email công ty
            <input type="email" className="admin-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Website
            <input className="admin-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="example.com" />
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
        </div>
      </section>

      <section className="admin-section-card">
        <h2>Địa chỉ</h2>
        <CrmCustomerAddressFields
          values={addressValues}
          onChange={(patch) => setAddressValues((prev) => ({ ...prev, ...patch }))}
        />
      </section>

      <section className="admin-section-card">
        <h2>Người liên hệ chính</h2>
        <div className="admin-form-grid">
          <label>
            Họ tên
            <input className="admin-input" value={contactFullName} onChange={(e) => setContactFullName(e.target.value)} />
          </label>
          <label>
            Chức vụ
            <input className="admin-input" value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} />
          </label>
          <label>
            Phòng ban
            <input className="admin-input" value={contactDepartment} onChange={(e) => setContactDepartment(e.target.value)} />
          </label>
          <label>
            Số điện thoại
            <input className="admin-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" className="admin-input" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </label>
          <label className="admin-form-grid-span-2">
            Ghi chú
            <textarea className="admin-input" rows={2} value={contactNote} onChange={(e) => setContactNote(e.target.value)} />
          </label>
          <label className="admin-checkbox-row admin-form-grid-span-2">
            <input type="checkbox" checked={contactIsPrimary} onChange={(e) => setContactIsPrimary(e.target.checked)} />
            Người liên hệ chính
          </label>
        </div>
      </section>

      <section className="admin-section-card">
        <h2>Ghi chú</h2>
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
