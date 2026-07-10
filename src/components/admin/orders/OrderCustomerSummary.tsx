"use client";

import type { OrderCustomerPartyValues } from "@/components/admin/orders/OrderCustomerPartyFields";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  values: OrderCustomerPartyValues;
};

export default function OrderCustomerSummary({ values }: Props) {
  const customerMeta = [
    values.customerCode,
    values.customerTaxCode ? `MST ${values.customerTaxCode}` : null,
    values.customerPhoneSnapshot,
    values.customerEmailSnapshot,
  ]
    .filter(Boolean)
    .join(" · ");

  const contactMeta = [values.contactTitle, values.contactPhone, values.contactEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.customerSummary} aria-label="Tóm tắt khách hàng">
      <div>
        <span className={styles.customerSummary__label}>Khách hàng</span>
        <strong>{values.customerNameSnapshot || values.customerCompanyName || "Chưa chọn"}</strong>
        {customerMeta ? <p>{customerMeta}</p> : null}
      </div>
      <div>
        <span className={styles.customerSummary__label}>Liên hệ</span>
        <strong>{values.contactName || "Chưa chọn"}</strong>
        {contactMeta ? <p>{contactMeta}</p> : null}
      </div>
    </div>
  );
}
