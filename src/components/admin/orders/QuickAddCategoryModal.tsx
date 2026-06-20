"use client";

import { useState } from "react";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

export type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (category: CategoryOption) => void;
};

function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function QuickAddCategoryModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const slug = toSlug(name) || "danh-muc";
    await mutate({
      loadingMessage: "Đang tạo danh mục…",
      successMessage: "Đã thêm danh mục mới.",
      action: async () => {
        const res = await fetch("/api/admin/products/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug }),
        });
        return parseAdminJsonResponse(res, (data) => data as CategoryOption);
      },
      onSuccess: (category) => {
        onCreated(category);
        setName("");
        onClose();
      },
    });
  }

  return (
    <div className="quote-quick-contact-modal">
      <div className="quote-quick-contact-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void handleSubmit(e)}>
        <h3 className="quote-quick-contact-modal__title">Thêm danh mục mới</h3>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-field">
          <label className="admin-label">Tên danh mục *</label>
          <input className="admin-input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="quote-quick-contact-modal__actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="admin-btn admin-btn--primary">Lưu danh mục</button>
        </div>
      </form>
    </div>
  );
}
