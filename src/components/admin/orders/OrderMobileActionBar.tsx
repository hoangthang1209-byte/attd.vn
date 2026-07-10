"use client";

import Link from "next/link";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  submitLabel: string;
  cancelHref: string;
};

export default function OrderMobileActionBar({ submitLabel, cancelHref }: Props) {
  return (
    <div className={styles.mobileActionBar} role="group" aria-label="Thao tác đơn hàng">
      <Link href={cancelHref} className={`admin-btn admin-btn--secondary ${styles.mobileActionBar__cancel}`}>
        Hủy
      </Link>
      <button type="submit" className="admin-btn admin-btn--primary">
        {submitLabel}
      </button>
    </div>
  );
}
