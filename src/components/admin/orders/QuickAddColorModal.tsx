"use client";

import { useState } from "react";
import type { ColorRecord } from "@/features/colors/color.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (color: ColorRecord) => void;
};

export default function QuickAddColorModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    await mutate({
      loadingMessage: "Đang tạo màu…",
      successMessage: "Đã thêm màu mới.",
      action: async () => {
        const res = await fetch("/api/colors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, hex: hex || null }),
        });
        return parseAdminJsonResponse(res, (data) => data.color as ColorRecord);
      },
      onSuccess: (color) => {
        onCreated(color);
        setName("");
        setHex("");
        onClose();
      },
    });
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">Thêm màu mới</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-field">
          <label className="admin-label">Tên màu *</label>
          <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mã màu (hex)</label>
          <input className="admin-input" placeholder="#000000" value={hex} onChange={(e) => setHex(e.target.value)} />
        </div>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="admin-btn admin-btn--primary">Lưu màu</button>
        </div>
      </form>
    </div>
  );
}
