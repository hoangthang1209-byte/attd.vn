"use client";

import { useRef, useState } from "react";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import type { MaterialSupplierRecord } from "@/features/materials/material-supplier.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: MaterialSupplierRecord) => void;
};

const FORM_ID = "quick-add-material-supplier-form";

export default function QuickAddMaterialSupplierModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
    setContactName("");
    setPhone("");
    setFormError(null);
    setFieldErrors({});
    setPending(false);
    submitLock.current = false;
  }

  function handleClose() {
    if (pending) return;
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || submitLock.current) return;

    setFormError(null);
    setFieldErrors({});
    if (!name.trim()) {
      setFieldErrors({ name: "Vui lòng nhập tên nhà cung cấp." });
      return;
    }

    submitLock.current = true;
    setPending(true);

    await mutate({
      loadingMessage: "Đang thêm nhà cung cấp…",
      successMessage: "Đã thêm nhà cung cấp nguyên phụ liệu.",
      errorFallback: "Không thể thêm nhà cung cấp. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/material-suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            contactName: contactName.trim() || null,
            phone: phone.trim() || null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.supplier as MaterialSupplierRecord);
      },
      onSuccess: (supplier) => {
        onCreated(supplier);
        resetForm();
        onClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  return (
    <AdminQuickCreateShell
      open={open}
      title="Thêm nhà cung cấp"
      size="compact"
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClose} disabled={pending}>
            Hủy
          </button>
          <button type="submit" form={FORM_ID} className="admin-btn admin-btn--primary" disabled={pending}>
            Thêm nhà cung cấp
          </button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        {formError && <p className="admin-error">{formError}</p>}
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-supplier-name">Tên nhà cung cấp *</label>
          <input
            id="qa-supplier-name"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
          {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-supplier-contact">Người liên hệ</label>
          <input
            id="qa-supplier-contact"
            className="admin-input"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-supplier-phone">Số điện thoại</label>
          <input
            id="qa-supplier-phone"
            className="admin-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
