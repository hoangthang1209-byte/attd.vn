"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickAddContactModal from "@/components/admin/quotes/QuickAddContactModal";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import OrderAdvancedSection from "@/components/admin/orders/OrderAdvancedSection";
import OrderCustomerSummary from "@/components/admin/orders/OrderCustomerSummary";
import {
  contactToOrderSnapshots,
  customerToOrderSnapshots,
} from "@/features/crm/order-customer-snapshot";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

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
  revealAdvanced?: boolean;
};

export default function OrderCustomerPartyFields({
  values,
  selectedCustomer,
  contacts,
  onCustomerSelect,
  onContactsChange,
  onChange,
  onQuickAddCustomer,
  revealAdvanced = false,
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

  const showSummary = Boolean(
    values.customerId || values.customerNameSnapshot || values.contactName,
  );

  return (
  <>
    <section className={styles.section} aria-labelledby="order-customer-heading">
      <h2 id="order-customer-heading" className={styles.section__title}>
        Khách hàng
      </h2>

      <CustomerSearchField value={selectedCustomer} onSelect={(c) => void handleCustomerSelect(c)} />

      {onQuickAddCustomer && (
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          style={{ marginTop: 8 }}
          onClick={onQuickAddCustomer}
        >
          Thêm khách hàng mới
        </button>
      )}

      {showSummary ? <OrderCustomerSummary values={values} /> : null}

      {values.customerId ? (
        <div className={styles.contactRow}>
          {contacts.length ? (
            <div className="admin-field">
              <label className="admin-label" htmlFor="order-contact-select">
                Người liên hệ
              </label>
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
                fallbackSublabel={
                  [values.contactTitle, values.contactPhone].filter(Boolean).join(" · ") || undefined
                }
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
            Thêm người liên hệ
          </button>
        </div>
      ) : (
        <p className={styles.section__hint}>Chọn khách hàng để tải danh sách liên hệ.</p>
      )}

      <p className={styles.section__hint}>
        Thông tin này chỉ lưu trên đơn hàng, không thay đổi hồ sơ CRM.
      </p>

      <OrderAdvancedSection title="Thông tin khách hàng nâng cao" forceOpen={revealAdvanced}>
        <div className={`${styles.fieldGrid}`} style={{ marginTop: 12 }}>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-customer-code">
              Mã khách hàng
            </label>
            <input id="order-customer-code" className="admin-input" value={values.customerCode} readOnly />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-customer-name">
              Tên khách hàng *
            </label>
            <input
              id="order-customer-name"
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
            <label className="admin-label" htmlFor="order-customer-legal-name">
              Tên pháp lý
            </label>
            <input
              id="order-customer-legal-name"
              className="admin-input"
              value={values.customerLegalNameSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerLegalNameSnapshot: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-customer-tax">
              Mã số thuế
            </label>
            <input
              id="order-customer-tax"
              className="admin-input"
              value={values.customerTaxCode}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerTaxCode: e.target.value });
              }}
            />
          </div>
          <div className={`admin-field ${styles.fieldSpan2}`}>
            <label className="admin-label" htmlFor="order-customer-address">
              Địa chỉ
            </label>
            <input
              id="order-customer-address"
              className="admin-input"
              value={values.customerAddress}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerAddress: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-customer-email">
              Email công ty
            </label>
            <input
              id="order-customer-email"
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
            <label className="admin-label" htmlFor="order-customer-phone">
              Số điện thoại công ty
            </label>
            <input
              id="order-customer-phone"
              className="admin-input"
              value={values.customerPhoneSnapshot}
              onChange={(e) => {
                markManualEdit();
                onChange({ customerPhoneSnapshot: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-contact-name">
              Họ tên liên hệ
            </label>
            <input
              id="order-contact-name"
              className="admin-input"
              value={values.contactName}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactName: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-contact-title">
              Chức vụ
            </label>
            <input
              id="order-contact-title"
              className="admin-input"
              value={values.contactTitle}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactTitle: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-contact-department">
              Phòng ban
            </label>
            <input
              id="order-contact-department"
              className="admin-input"
              value={values.contactDepartment}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactDepartment: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-contact-phone">
              Số điện thoại liên hệ
            </label>
            <input
              id="order-contact-phone"
              className="admin-input"
              value={values.contactPhone}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactPhone: e.target.value });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="order-contact-email">
              Email liên hệ
            </label>
            <input
              id="order-contact-email"
              className="admin-input"
              type="email"
              value={values.contactEmail}
              onChange={(e) => {
                markManualEdit();
                onChange({ contactEmail: e.target.value });
              }}
            />
          </div>
        </div>
      </OrderAdvancedSection>
    </section>

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
