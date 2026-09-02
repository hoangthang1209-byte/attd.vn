"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CustomerLegacyType } from "@prisma/client";
import { CUSTOMER_LEGACY_TYPE_LABELS } from "@/features/crm/labels";
import {
  buildQuickCreateCustomerPayload,
  pickQuickCreateContact,
} from "@/features/crm/customer-quick-create";
import { CRM_CUSTOMER_LEGACY_TYPES } from "@/features/crm/types";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_ID = "customer-quick-create-form";

type Variant = "minimal" | "full";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CrmCustomerRecord, contact: CrmContactRecord | null) => void;
  variant?: Variant;
  contextLabel?: string;
};

export default function CustomerQuickCreateDialog({
  open,
  onClose,
  onCreated,
  variant = "minimal",
  contextLabel = "phiên làm việc hiện tại",
}: Props) {
  const mutate = useAdminMutation();
  const submitLock = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<CustomerLegacyType>("BUSINESS");
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
  const [duplicateMatches, setDuplicateMatches] = useState<CrmCustomerRecord[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

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
    setDuplicateMatches([]);
    submitLock.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmedName = name.trim();
    const trimmedTax = taxCode.trim();
    const trimmedEmail = contactEmail.trim() || email.trim();
    if (!trimmedName && !trimmedTax && !trimmedEmail) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(() => {
      setCheckingDuplicates(true);
      const params = new URLSearchParams();
      if (trimmedName) params.set("name", trimmedName);
      if (trimmedTax) params.set("taxCode", trimmedTax);
      if (trimmedEmail) params.set("email", trimmedEmail);
      void fetch(`/api/crm/customers/quick-create-check?${params.toString()}`)
        .then(async (res) => {
          const data = await res.json() as { matches?: CrmCustomerRecord[] };
          setDuplicateMatches(data.matches ?? []);
        })
        .catch(() => setDuplicateMatches([]))
        .finally(() => setCheckingDuplicates(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [open, name, taxCode, email, contactEmail]);

  if (!open || !mounted) return null;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Vui lòng nhập tên khách hàng.";
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

  function handleSelectExisting(customer: CrmCustomerRecord) {
    const contact = pickQuickCreateContact(customer, contactFullName);
    onCreated(customer, contact);
    resetForm();
    onClose();
  }

  function resetForm() {
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
    setDuplicateMatches([]);
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
    const payload =
      variant === "full"
        ? {
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
          }
        : buildQuickCreateCustomerPayload({
            name,
            taxCode,
            phone,
            email,
            contactFullName: contactNameSnapshot,
            contactPhone,
            contactEmail,
          });

    await mutate({
      loadingMessage: "Đang tạo khách hàng…",
      successMessage: "Đã tạo khách hàng mới.",
      errorFallback: "Không thể tạo khách hàng. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const res = await fetch("/api/crm/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = parseAdminJsonResponse(
          res,
          (data) => data.customer as CrmCustomerRecord,
        );
        return await result;
      },
      onSuccess: (customer) => {
        const contact = pickQuickCreateContact(customer, contactNameSnapshot);
        onCreated(customer, contact);
        resetForm();
        onClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  function handleBackdropClick() {
    if (!pending) onClose();
  }

  const subtitle =
    variant === "minimal"
      ? `Thông tin được lưu vào CRM và tự động chọn cho ${contextLabel}.`
      : `Thông tin sẽ được lưu vào CRM và tự động chọn cho ${contextLabel}.`;

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
              Tạo khách hàng mới
            </h3>
            <p className="customer-quick-create-modal__subtitle">{subtitle}</p>
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

          {duplicateMatches.length > 0 && (
            <div className="customer-quick-create-modal__duplicates" role="status">
              <p className="admin-field-hint" style={{ marginBottom: 8 }}>
                {checkingDuplicates ? "Đang kiểm tra trùng…" : "Có thể khách hàng này đã tồn tại"}
              </p>
              {duplicateMatches.map((match) => (
                <div
                  key={match.id}
                  className="customer-quick-create-modal__duplicate-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    padding: "8px 10px",
                    border: "1px solid var(--admin-border, #e5e7eb)",
                    borderRadius: 6,
                  }}
                >
                  <div>
                    <strong>{match.name}</strong>
                    {match.taxCode && (
                      <span className="admin-field-hint"> · MST: {match.taxCode}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    disabled={pending}
                    onClick={() => handleSelectExisting(match)}
                  >
                    Chọn khách hàng này
                  </button>
                </div>
              ))}
            </div>
          )}

          <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} noValidate>
            <section className="customer-quick-create-modal__section">
              <h4 className="customer-quick-create-modal__section-title">Thông tin khách hàng</h4>
              <div className="customer-quick-create-modal__grid">
                {variant === "full" && (
                  <div className="admin-field">
                    <label className="admin-label" htmlFor="qc-customer-type">Loại khách hàng</label>
                    <select
                      id="qc-customer-type"
                      className="admin-input"
                      value={type}
                      disabled={pending}
                      onChange={(e) => setType(e.target.value as CustomerLegacyType)}
                    >
                      {CRM_CUSTOMER_LEGACY_TYPES.map((t) => (
                        <option key={t} value={t}>{CUSTOMER_LEGACY_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-customer-name">Tên khách hàng *</label>
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
                  {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
                </div>
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-tax-code">Mã số thuế</label>
                  <input
                    id="qc-tax-code"
                    className="admin-input"
                    value={taxCode}
                    disabled={pending}
                    onChange={(e) => setTaxCode(e.target.value)}
                  />
                </div>
                {variant === "minimal" && (
                  <>
                    <div className="admin-field">
                      <label className="admin-label" htmlFor="qc-phone">Số điện thoại</label>
                      <input
                        id="qc-phone"
                        className="admin-input"
                        value={phone}
                        disabled={pending}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label" htmlFor="qc-email">Email</label>
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
                      {fieldErrors.email && <p className="admin-field-error">{fieldErrors.email}</p>}
                    </div>
                  </>
                )}
                {variant === "full" && (
                  <>
                    <div className="admin-field">
                      <label className="admin-label" htmlFor="qc-phone-full">Số điện thoại</label>
                      <input
                        id="qc-phone-full"
                        className="admin-input"
                        value={phone}
                        disabled={pending}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="admin-field">
                      <label className="admin-label" htmlFor="qc-email-full">Email</label>
                      <input
                        id="qc-email-full"
                        className="admin-input"
                        value={email}
                        disabled={pending}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                        }}
                      />
                      {fieldErrors.email && <p className="admin-field-error">{fieldErrors.email}</p>}
                    </div>
                    <div className="admin-field customer-quick-create-modal__field--full">
                      <label className="admin-label" htmlFor="qc-address">Địa chỉ</label>
                      <input
                        id="qc-address"
                        className="admin-input"
                        value={address}
                        disabled={pending}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            <hr className="customer-quick-create-modal__divider" />

            <section className="customer-quick-create-modal__section">
              <h4 className="customer-quick-create-modal__section-title">
                {variant === "minimal" ? "Người liên hệ (tùy chọn)" : "Người liên hệ đầu tiên (tùy chọn)"}
              </h4>
              {fieldErrors.contact && <p className="admin-field-error">{fieldErrors.contact}</p>}
              <div className="customer-quick-create-modal__grid">
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-name">Người liên hệ</label>
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
                {variant === "full" && (
                  <div className="admin-field">
                    <label className="admin-label" htmlFor="qc-contact-title">Chức vụ</label>
                    <input
                      id="qc-contact-title"
                      className="admin-input"
                      value={contactTitle}
                      disabled={pending}
                      onChange={(e) => setContactTitle(e.target.value)}
                    />
                  </div>
                )}
                {variant === "full" && (
                  <div className="admin-field">
                    <label className="admin-label" htmlFor="qc-contact-phone">Số điện thoại</label>
                    <input
                      id="qc-contact-phone"
                      className="admin-input"
                      value={contactPhone}
                      disabled={pending}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                )}
                <div className="admin-field">
                  <label className="admin-label" htmlFor="qc-contact-email">Email</label>
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
          <AdminLoadingButton
            type="submit"
            form={FORM_ID}
            variant="primary"
            pending={pending}
            pendingLabel="Đang tạo khách hàng…"
          >
            Tạo khách hàng
          </AdminLoadingButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
