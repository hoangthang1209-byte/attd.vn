"use client";

import { useRef, useState } from "react";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

export type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (category: CategoryOption) => void;
};

const FORM_ID = "quick-add-category-form";

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
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
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
      setFieldErrors({ name: "Vui lòng nhập tên danh mục." });
      return;
    }

    submitLock.current = true;
    setPending(true);
    const slug = toSlug(name.trim()) || "danh-muc";

    await mutate({
      loadingMessage: "Đang tạo danh mục…",
      successMessage: "Đã thêm danh mục mới.",
      errorFallback: "Không thể tạo danh mục. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/admin/products/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), slug }),
        });
        const result = await parseAdminJsonResponse(res, (data) => data as CategoryOption);
        if (!result.ok) {
          console.error("[QuickAddCategoryModal] POST categories", res.status, result.message);
        }
        return result;
      },
      onSuccess: (category) => {
        onCreated(category);
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
      title="Thêm danh mục mới"
      subtitle="Danh mục sẽ được lưu vào hệ thống sản phẩm."
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClose} disabled={pending}>
            Hủy
          </button>
          <AdminLoadingButton type="submit" form={FORM_ID} variant="primary" pending={pending} pendingLabel="Đang lưu danh mục…">
            Lưu danh mục
          </AdminLoadingButton>
        </>
      }
    >
      {formError && <p className="admin-error">{formError}</p>}
      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        <div className="admin-quick-create-grid">
          <div className="admin-field admin-quick-create-grid__full">
            <label className="admin-label" htmlFor="quick-category-name">
              Tên danh mục *
            </label>
            <input
              id="quick-category-name"
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
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
