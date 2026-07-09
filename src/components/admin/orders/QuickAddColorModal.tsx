"use client";

import { useRef, useState } from "react";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import type { ColorRecord } from "@/features/colors/color.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (color: ColorRecord) => void;
};

const FORM_ID = "quick-add-color-form";

export default function QuickAddColorModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
    setHex("");
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
      setFieldErrors({ name: "Vui lòng nhập tên màu." });
      return;
    }

    submitLock.current = true;
    setPending(true);

    await mutate({
      loadingMessage: "Đang tạo màu…",
      successMessage: "Đã thêm màu mới.",
      errorFallback: "Không thể tạo màu. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/colors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), hex: hex.trim() || null }),
        });
        const result = await parseAdminJsonResponse(res, (data) => data.color as ColorRecord);
        if (!result.ok) {
          console.error("[QuickAddColorModal] POST /api/colors", res.status, result.message);
        }
        return result;
      },
      onSuccess: (color) => {
        onCreated(color);
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
      title="Thêm màu mới"
      subtitle="Màu sẽ được lưu vào danh mục màu hệ thống."
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={handleClose}
            disabled={pending}
          >
            Hủy
          </button>
          <AdminLoadingButton type="submit" form={FORM_ID} variant="primary" pending={pending} pendingLabel="Đang lưu màu…">
            Lưu màu
          </AdminLoadingButton>
        </>
      }
    >
      {formError && <p className="admin-error">{formError}</p>}
      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        <div className="admin-quick-create-grid">
          <div className="admin-field admin-quick-create-grid__full">
            <label className="admin-label" htmlFor="quick-color-name">
              Tên màu *
            </label>
            <input
              id="quick-color-name"
              className="admin-input"
              value={name}
              disabled={pending}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors({});
              }}
            />
            {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
          </div>
          <div className="admin-field admin-quick-create-grid__full">
            <label className="admin-label" htmlFor="quick-color-hex">
              Mã màu (hex)
            </label>
            <input
              id="quick-color-hex"
              className="admin-input"
              placeholder="#000000"
              value={hex}
              disabled={pending}
              onChange={(e) => setHex(e.target.value)}
            />
          </div>
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
