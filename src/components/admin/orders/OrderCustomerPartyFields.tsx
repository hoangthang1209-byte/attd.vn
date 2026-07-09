"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickAddContactModal from "@/components/admin/quotes/QuickAddContactModal";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  contactToOrderSnapshots,
  customerToOrderSnapshots,
} from "@/features/crm/order-customer-snapshot";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";

export type OrderCustomerPartyValues = {
  customerId: string;
  contactId: string;
  customerCode: string;
  customerCompanyName: string;
  customerNameSnapshot: string;
  customerLegalNameSnapshot: string;
  customerTaxCode: string;
  customerAddress: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string;
  customerWebsiteSnapshot: string;
  customerProvinceNameSnapshot: string;
  customerWardNameSnapshot: string;
  customerAddressLine1Snapshot: string;
  contactName: string;
  contactTitle: string;
  contactDepartment: string;
  contactPhone: string;
  contactEmail: string;
};

type Props = {
  values: OrderCustomerPartyValues;
  selectedCustomer: CrmCustomerRecord | null;
  contacts: CrmContactRecord[];
  onCustomerSelect: (customer: CrmCustomerRecord | null, contacts?: CrmContactRecord[]) => void;
  onContactsChange: (contacts: CrmContactRecord[]) => void;
  onChange: (patch: Partial<OrderCustomerPartyValues>) => void;
  onQuickAddCustomer?: () => void;
};

export default function OrderCustomerPartyFields({
  values,
  selectedCustomer,
  contacts,
  onCustomerSelect,
  onContactsChange,
  onChange,
  onQuickAddCustomer,
}: Props) {
  const [quickAddContactOpen, setQuickAddContactOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingCustomer = useRef<CrmCustomerRecord | null>(null);
  const manualSnapshotRef = useRef(false);

  const contactOptions = useMemo(
    () =>
      contacts.map((contact) => ({
        value: contact.id,
        label: contact.fullName,
        sublabel: [contact.title, contact.phone, contact.email].filter(Boolean).join(" · "),
      })),
    [contacts],
  );

  useEffect(() => {
    manualSnapshotRef.current = false;
  }, [values.customerId]);

  function markManualEdit() {
    manualSnapshotRef.current = true;
  }

  async function loadCustomerContacts(id: string) {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    return data.contacts ?? [];
  }

  function applyCustomerSnapshots(customer: CrmCustomerRecord, nextContacts?: CrmContactRecord[]) {
    const snapshots = customerToOrderSnapshots(customer);
    onChange({
      customerId: customer.id,
      contactId: "",
      customerCode: snapshots.customerCode ?? "",
      customerCompanyName: snapshots.customerCompanyName ?? customer.name,
      customerNameSnapshot: snapshots.customerNameSnapshot ?? customer.name,
      customerLegalNameSnapshot: snapshots.customerLegalNameSnapshot ?? "",
      customerTaxCode: snapshots.customerTaxCode ?? "",
      customerAddress: snapshots.customerAddress ?? "",
      customerPhoneSnapshot: snapshots.customerPhoneSnapshot ?? "",
      customerEmailSnapshot: snapshots.customerEmailSnapshot ?? "",
      customerWebsiteSnapshot: snapshots.customerWebsiteSnapshot ?? "",
      customerProvinceNameSnapshot: snapshots.customerProvinceNameSnapshot ?? "",
      customerWardNameSnapshot: snapshots.customerWardNameSnapshot ?? "",
      customerAddressLine1Snapshot: snapshots.customerAddressLine1Snapshot ?? "",
      contactName: "",
      contactTitle: "",
      contactDepartment: "",
      contactPhone: "",
      contactEmail: "",
    });
    onCustomerSelect(customer, nextContacts);
    const list = nextContacts ?? contacts;
    const primary = list.find((c) => c.isPrimary);
    if (primary) {
      applyContactSnapshots(primary);
      onChange({ contactId: primary.id });
    }
  }

  function applyContactSnapshots(contact: CrmContactRecord) {
    const snapshots = contactToOrderSnapshots(contact);
    onChange({
      contactId: contact.id,
      contactName: snapshots.contactName ?? "",
      contactTitle: snapshots.contactTitle ?? "",
      contactDepartment: snapshots.contactDepartment ?? "",
      contactPhone: snapshots.contactPhone ?? "",
      contactEmail: snapshots.contactEmail ?? "",
    });
  }

  async function handleCustomerSelect(customer: CrmCustomerRecord | null) {
    if (!customer) {
      onCustomerSelect(null);
      onChange({
        customerId: "",
        contactId: "",
        customerCode: "",
        customerCompanyName: "",
        customerNameSnapshot: "",
        customerLegalNameSnapshot: "",
        customerTaxCode: "",
        customerAddress: "",
        customerPhoneSnapshot: "",
        customerEmailSnapshot: "",
        customerWebsiteSnapshot: "",
        customerProvinceNameSnapshot: "",
        customerWardNameSnapshot: "",
        customerAddressLine1Snapshot: "",
        contactName: "",
        contactTitle: "",
        contactDepartment: "",
        contactPhone: "",
        contactEmail: "",
      });
      onContactsChange([]);
      manualSnapshotRef.current = false;
      return;
    }

    const nextContacts = await loadCustomerContacts(customer.id);
    onContactsChange(nextContacts);

    if (manualSnapshotRef.current && values.customerId && values.customerId !== customer.id) {
      pendingCustomer.current = customer;
      setConfirmOpen(true);
      return;
    }

    applyCustomerSnapshots(customer, nextContacts);
  }

  function confirmReplaceCustomer() {
    if (pendingCustomer.current) {
      void loadCustomerContacts(pendingCustomer.current.id).then((nextContacts) => {
        onContactsChange(nextContacts);
        applyCustomerSnapshots(pendingCustomer.current as CrmCustomerRecord, nextContacts);
        pendingCustomer.current = null;
        manualSnapshotRef.current = false;
      });
    }
    setConfirmOpen(false);
  }

  const customerSummary = [
    values.customerCode,
    values.customerTaxCode ? `MST ${values.customerTaxCode}` : null,
    values.customerPhoneSnapshot,
    values.customerEmailSnapshot,
  ].filter(Boolean).join(" · ");

  const contactSummary = [values.contactName, values.contactTitle, values.contactPhone, values.contactEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section className="admin-workflow-card admin-workflow-card--customer">
        <div className="admin-workflow-card__header">
          <div>
            <p className="admin-workflow-eyebrow">Bước 1</p>
            <h2>Khách hàng</h2>
            <p>Tìm khách hàng để tự động điền hồ sơ. Chỉ chỉnh tay khi đơn hàng này cần snapshot riêng.</p>
          </div>
          {onQuickAddCustomer && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onQuickAddCustomer}>
              Thêm khách mới
            </button>
          )}
        </div>

        <CustomerSearchField value={selectedCustomer} onSelect={(c) => void handleCustomerSelect(c)} />

        {(values.customerNameSnapshot || values.contactName) && (
          <div className="admin-workflow-summary">
            <div>
              <span className="admin-workflow-summary__label">Khách hàng</span>
              <strong>{values.customerNameSnapshot || values.customerCompanyName || "Chưa chọn"}</strong>
              {customerSummary && <p>{customerSummary}</p>}
            </div>
            <div>
              <span className="admin-workflow-summary__label">Liên hệ</span>
              <strong>{values.contactName || "Chưa chọn"}</strong>
              {contactSummary && <p>{contactSummary}</p>}
            </div>
          </div>
        )}

        {values.customerId && (
          <div className="admin-workflow-inline-fields">
            {contacts.length ? (
              <div className="admin-field">
                <label className="admin-label">Người liên hệ</label>
                <AdminSearchableSelect
                  value={values.contactId}
                  onChange={(contactId) => {
                    const contact = contacts.find((c) => c.id === contactId);
                    if (contact) {
                      markManualEdit();
                      applyContactSnapshots(contact);
                    } else {
                      onChange({ contactId: "" });
                    }
                  }}
                  options={contactOptions}
                  placeholder="— Chọn người liên hệ —"
                  searchPlaceholder="Tìm người liên hệ…"
                  fallbackLabel={values.contactName || undefined}
                  fallbackSublabel={[values.contactTitle, values.contactPhone].filter(Boolean).join(" · ") || undefined}
                />
              </div>
            ) : (
              <p className="admin-field-hint">Chưa có người liên hệ</p>
            )}
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => setQuickAddContactOpen(true)}
            >
              Thêm liên hệ
            </button>
          </div>
        )}
      </section>

      <details className="admin-workflow-disclosure admin-workflow-disclosure--panel">
        <summary>Thông tin khách hàng nâng cao</summary>
        <p className="admin-field-hint">
          Các trường dưới đây chỉ lưu trên đơn hàng, không thay đổi hồ sơ CRM.
        </p>

        <div className="admin-workflow-grid admin-workflow-grid--advanced">
          <div className="admin-field">
            <label className="admin-label">Mã khách hàng</label>
            <input className="admin-input" value={values.customerCode} readOnly />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên khách hàng *</label>
            <input
              className="admin-input"
              required
              value={values.customerNameSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({
                  customerNameSnapshot: e.target.value,
                  customerCompanyName: e.target.value,
                });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên pháp lý</label>
            <input
              className="admin-input"
              value={values.customerLegalNameSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerLegalNameSnapshot: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã số thuế</label>
            <input
              className="admin-input"
              value={values.customerTaxCode}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerTaxCode: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Họ tên liên hệ</label>
            <input
              className="admin-input"
              value={values.contactName}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactName: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Chức vụ</label>
            <input
              className="admin-input"
              value={values.contactTitle}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactTitle: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Phòng ban</label>
            <input
              className="admin-input"
              value={values.contactDepartment}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactDepartment: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">SĐT liên hệ</label>
            <input
              className="admin-input"
              value={values.contactPhone}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactPhone: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Email liên hệ</label>
            <input
              className="admin-input"
              type="email"
              value={values.contactEmail}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactEmail: e.target.value });
              }}
            />
          </div>
          <div className="admin-field admin-form-grid-span-2">
            <label className="admin-label">Địa chỉ</label>
            <input
              className="admin-input"
              value={values.customerAddress}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerAddress: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Email công ty</label>
            <input
              className="admin-input"
              type="email"
              value={values.customerEmailSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerEmailSnapshot: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">SĐT công ty</label>
            <input
              className="admin-input"
              value={values.customerPhoneSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerPhoneSnapshot: e.target.value });
              }}
            />
          </div>
        </div>
      </details>

      {values.customerId && (
        <QuickAddContactModal
          customerId={values.customerId}
          open={quickAddContactOpen}
          onClose={() => setQuickAddContactOpen(false)}
          onCreated={(contact) => {
            onContactsChange([...contacts.filter((c) => c.id !== contact.id), contact]);
            applyContactSnapshots(contact);
            setQuickAddContactOpen(false);
          }}
        />
      )}

      {confirmOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" aria-hidden="true" />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">Cập nhật thông tin khách hàng?</h3>
            <p>
              Thông tin khách hàng trên đơn đã được chỉnh sửa. Bạn có muốn thay bằng thông tin của khách hàng mới?
            </p>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setConfirmOpen(false)}>
                Giữ thông tin hiện tại
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={confirmReplaceCustomer}>
                Cập nhật theo khách hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
