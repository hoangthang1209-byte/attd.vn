"use client";

import { useState } from "react";
import type { CrmContactRecord } from "@/features/crm/types";

type Props = {
  customerId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (contact: CrmContactRecord) => void;
};

export default function QuickAddContactModal({
  customerId,
  open,
  onClose,
  onCreated,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zalo, setZalo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/customers/${customerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, title, phone, email, zalo }),
      });
      const data = (await res.json()) as { contact?: CrmContactRecord; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo người liên hệ");
      if (!data.contact) throw new Error("Không thể tạo người liên hệ");
      onCreated(data.contact);
      setFullName("");
      setTitle("");
      setPhone("");
      setEmail("");
      setZalo("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo liên hệ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">Thêm người liên hệ mới</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-field">
          <label className="admin-label">Họ tên *</label>
          <input
            className="admin-input"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Chức vụ</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Số điện thoại</label>
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input
            className="admin-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Zalo</label>
          <input className="admin-input" value={zalo} onChange={(e) => setZalo(e.target.value)} />
        </div>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? "Đang lưu…" : "Thêm liên hệ"}
          </button>
        </div>
      </form>
    </div>
  );
}
