"use client";

import { useEffect, useState } from "react";
import type { CrmContactRecord } from "@/features/crm/types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  customerId: string;
  open: boolean;
  contact?: CrmContactRecord | null;
  onClose: () => void;
  onSaved: (contact: CrmContactRecord) => void;
};

export default function CrmContactDialog({
  customerId,
  open,
  contact,
  onClose,
  onSaved,
}: Props) {
  const mutate = useAdminMutation();
  const isEdit = Boolean(contact?.id);
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(contact?.fullName ?? "");
    setTitle(contact?.title ?? "");
    setDepartment(contact?.department ?? "");
    setPhone(contact?.phone ?? "");
    setEmail(contact?.email ?? "");
    setNote(contact?.note ?? "");
    setIsPrimary(contact?.isPrimary ?? false);
    setError(null);
  }, [open, contact]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      fullName,
      title: title || null,
      department: department || null,
      phone: phone || null,
      email: email || null,
      note: note || null,
      isPrimary,
    };

    const saved = await mutate({
      loadingMessage: "Đang lưu người liên hệ…",
      successMessage: isEdit ? "Đã cập nhật người liên hệ." : "Đã thêm người liên hệ.",
      action: async () => {
        const url = isEdit
          ? `/api/crm/customers/${customerId}/contacts/${contact?.id}`
          : `/api/crm/customers/${customerId}/contacts`;
        const res = await fetch(url, {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.contact as CrmContactRecord);
      },
    });

    if (!saved) {
      setError("Không thể lưu người liên hệ.");
      return;
    }
    onSaved(saved);
    onClose();
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">
          {isEdit ? "Chỉnh sửa người liên hệ" : "Thêm người liên hệ"}
        </h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-field">
          <label className="admin-label">Họ tên *</label>
          <input className="admin-input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Chức vụ</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Phòng ban</label>
          <input className="admin-input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú</label>
          <textarea className="admin-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <label className="admin-checkbox-row">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
          Người liên hệ chính
        </label>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="admin-btn admin-btn--primary">
            {isEdit ? "Lưu thay đổi" : "Thêm người liên hệ"}
          </button>
        </div>
      </form>
    </div>
  );
}
