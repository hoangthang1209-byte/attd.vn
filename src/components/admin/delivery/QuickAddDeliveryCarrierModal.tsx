"use client";

import { useRef, useState } from "react";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (carrier: DeliveryCarrierRecord) => void;
};

const FORM_ID = "quick-add-delivery-carrier-form";

export default function QuickAddDeliveryCarrierModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName("");
    setShortName("");
    setDescription("");
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
      setFieldErrors({ name: "Vui lòng nhập tên đơn vị vận chuyển." });
      return;
    }

    submitLock.current = true;
    setPending(true);

    await mutate({
      loadingMessage: "Đang thêm đơn vị vận chuyển…",
      successMessage: "Đã thêm đơn vị vận chuyển.",
      errorFallback: "Không thể thêm đơn vị vận chuyển. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/delivery-carriers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            shortName: shortName.trim() || null,
            description: description.trim() || null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.deliveryCarrier as DeliveryCarrierRecord);
      },
      onSuccess: (carrier) => {
        onCreated(carrier);
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
      title="Thêm đơn vị vận chuyển"
      size="compact"
      onClose={handleClose}
      pending={pending}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={handleClose} disabled={pending}>
            Hủy
          </button>
          <button type="submit" form={FORM_ID} className="admin-btn admin-btn--primary" disabled={pending}>
            Thêm đơn vị vận chuyển
          </button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={(e) => void handleSubmit(e)}>
        {formError && <p className="admin-error">{formError}</p>}
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-carrier-name">Tên đơn vị *</label>
          <input
            id="qa-carrier-name"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
          {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-carrier-shortName">Tên viết tắt</label>
          <input
            id="qa-carrier-shortName"
            className="admin-input"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="qa-carrier-description">Mô tả</label>
          <textarea
            id="qa-carrier-description"
            className="admin-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
          />
        </div>
      </form>
    </AdminQuickCreateShell>
  );
}
