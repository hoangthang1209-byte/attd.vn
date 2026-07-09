"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomerType } from "@prisma/client";
import { CUSTOMER_TYPE_LABELS } from "@/features/crm/labels";
import { CRM_CUSTOMER_TYPES } from "@/features/crm/types";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CrmCustomerRecord, contact: CrmContactRecord | null) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_ID = "customer-quick-create-form";

function pickCreatedContact(
  customer: CrmCustomerRecord,
  contactFullName: string,
): CrmContactRecord | null {
  if (!contactFullName.trim()) return null;
  const trimmed = contactFullName.trim();
  return (
    customer.contacts?.find((c) => c.fullName === trimmed) ??
    customer.contacts?.find((c) => c.isPrimary) ??
    customer.contacts?.[0] ??
    null
  );
}

export default function QuickAddCustomerModal({ open, onClose, onCreated }: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<CustomerType>("BUSINESS");
  const [name, setName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactFullName, setContactFullName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (open) return;
    setFormError(null);
    setFieldErrors({});
    setPending(false);
    submitLock.current = false;
  }, [open]);

  if (!open || !mounted) return null;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Vui lòng nhập tên công ty / khách hàng.";
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      errors.email = "Email không hợp lệ.";
    }
    if (contactEmail.trim() && !EMAIL_RE.test(contactEmail.trim())) {
      errors.contactEmail = "Email liên hệ không hợp lệ.";
    }
    const hasContactName = contactFullName.trim().length > 0;
    const hasPartialContact =
      !hasContactName &&
      (contactTitle.trim() || contactPhone.trim() || contactEmail.trim());
    if (hasPartialContact) {
      errors.contact =
        "Vui lòng nhập họ tên người liên hệ hoặc xóa thông tin liên hệ.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || submitLock.current) return;

    setFormError(null);
    setFieldErrors({});
    if (!validate()) return;

    submitLock.current = true;
    setPending(true);

    const contactNameSnapshot = contactFullName.trim();

    await mutate({
      loadingMessage: "Đang tạo khách hàng…",
      successMessage: "Đã tạo khách hàng mới.",
      errorFallback: "Không thể tạo khách hàng. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/crm/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            name: name.trim(),
            taxCode: taxCode.trim() || null,
            address: address.trim() || null,
            phone: phone.trim() || null,
            email: email.trim() || null,
            primaryContact: contactNameSnapshot
              ? {
                  fullName: contactNameSnapshot,
                  title: contactTitle.trim() || null,
                  phone: contactPhone.trim() || null,
                  email: contactEmail.trim() || null,
                }
              : null,
          }),
        });
        const result = parseAdminJsonResponse(
          res,
          (data) => data.customer as CrmCustomerRecord,
        );
        const parsed = await result;
        if (!parsed.ok) {
          console.error(
            "[QuickAddCustomerModal] POST /api/crm/customers",
            res.status,
            parsed.message,
          );
        }
        return parsed;
      },
      onSuccess: (customer) => {
        const contact = pickCreatedContact(customer, contactNameSnapshot);
        onCreated(customer, contact);
        setType("BUSINESS");
        setName("");
        setTaxCode("");
        setAddress("");
        setPhone("");
        setEmail("");
        setContactFullName("");
        setContactTitle("");
        setContactPhone("");
        setContactEmail("");
        onClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  function handleBackdropClick() {
    if (!pending) onClose();
  }

  return createPortal(
    <div
      className="customer-quick-create-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-quick-create-title"
    >
      <div
        className="customer-quick-create-modal__backdrop"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div className="customer-quick-create-modal__panel">
        <header className="customer-quick-create-modal__header">
          <div className="customer-quick-create-modal__header-text">
            <h3 id="customer-quick-create-title" className="customer-quick-create-modal__title">
              Thêm khách hàng mới
            </h3>
            <p className="customer-quick-create-modal__subtitle">
              Thông tin sẽ được lưu vào CRM và tự động chọn cho đơn hàng này.
            </p>
          </div>
          <button
            type="button"
            className="customer-quick-create-modal__close"
            onClick={() => !pending && onClose()}
            disabled={pending}
            aria-label="Đóng"
          >
            ×
          </button>
        </header>

        <div className="customer-quick-create-modal__body">
          {formError && <p className="admin-error customer-quick-create-modal__form-error">{formError}</p>}

          <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} noValidate>
            <section className="customer-quick-create-modal__section">
              <h4 className="customer-quick-create-modal__section-title">Thông tin khách hàng</h4>
              <div className="customer-quick-create-modal__grid">
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-customer-type">
                    Loại khách hàng
                  </label>
                  <select
                    id="qc-customer-type"
                    className="admin-input"
                    value={type}
                    disabled={pending}
                    onChange={(e) => setType(e.target.value as CustomerType)}
                  >
                    {CRM_CUSTOMER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {CUSTOMER_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-customer-name">
                    Tên công ty / khách hàng *
                  </label>
                  <input
                    id="qc-customer-name"
                    className="admin-input"
                    value={name}
                    disabled={pending}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }}
                  />
                  {fieldErrors.name && (
                    <p className="admin-field-error">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-tax-code">
                    Mã số thuế
                  </label>
                  <input
                    id="qc-tax-code"
                    className="admin-input"
                    value={taxCode}
                    disabled={pending}
                    onChange={(e) => setTaxCode(e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="qc-phone"
                    className="admin-input"
                    value={phone}
                    disabled={pending}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-email">
                    Email
                  </label>
                  <input
                    id="qc-email"
                    className="admin-input"
                    value={email}
                    disabled={pending}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                  />
                  {fieldErrors.email && (
                    <p className="admin-field-error">{fieldErrors.email}</p>
                  )}
                </div>
                <div className="admin-field customer-quick-create-modal__field--full">
                  <label className="admin-label" htmlFor="qc-address">
                    Địa chỉ
                  </label>
                  <input
                    id="qc-address"
                    className="admin-input"
                    value={address}
                    disabled={pending}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <hr className="customer-quick-create-modal__divider" />

            <section className="customer-quick-create-modal__section">
              <h4 className="customer-quick-create-modal__section-title">
                Người liên hệ đầu tiên (tùy chọn)
              </h4>
              {fieldErrors.contact && (
                <p className="admin-field-error">{fieldErrors.contact}</p>
              )}
              <div className="customer-quick-create-modal__grid">
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-name">
                    Họ tên
                  </label>
                  <input
                    id="qc-contact-name"
                    className="admin-input"
                    value={contactFullName}
                    disabled={pending}
                    onChange={(e) => {
                      setContactFullName(e.target.value);
                      if (fieldErrors.contact) setFieldErrors((prev) => ({ ...prev, contact: "" }));
                    }}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-title">
                    Chức vụ
                  </label>
                  <input
                    id="qc-contact-title"
                    className="admin-input"
                    value={contactTitle}
                    disabled={pending}
                    onChange={(e) => setContactTitle(e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="qc-contact-phone"
                    className="admin-input"
                    value={contactPhone}
                    disabled={pending}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-email">
                    Email
                  </label>
                  <input
                    id="qc-contact-email"
                    className="admin-input"
                    value={contactEmail}
                    disabled={pending}
                    onChange={(e) => {
                      setContactEmail(e.target.value);
                      if (fieldErrors.contactEmail) {
                        setFieldErrors((prev) => ({ ...prev, contactEmail: "" }));
                      }
                    }}
                  />
                  {fieldErrors.contactEmail && (
                    <p className="admin-field-error">{fieldErrors.contactEmail}</p>
                  )}
                </div>
              </div>
            </section>
          </form>
        </div>

        <footer className="customer-quick-create-modal__footer">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => !pending && onClose()}
            disabled={pending}
          >
            Hủy
          </button>
          <AdminLoadingButton type="submit" form={FORM_ID} variant="primary" pending={pending} pendingLabel="Đang tạo khách hàng…">
            Tạo khách hàng
          </AdminLoadingButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
