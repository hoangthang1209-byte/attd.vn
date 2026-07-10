"use client";

import Link from "next/link";
import AdminBackLink from "@/components/admin/AdminBackLink";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  mode: "create" | "edit";
  backHref: string;
  cancelHref: string;
  submitLabel: string;
};

export default function OrderFormHeader({ mode, backHref, cancelHref, submitLabel }: Props) {
  return (
    <header className={styles.formHeader}>
      <div className={styles.formHeader__left}>
        <AdminBackLink href={backHref} />
        <h1 className={styles.formHeader__title}>
          {mode === "create" ? "Tạo đơn hàng" : "Chỉnh sửa đơn hàng"}
        </h1>
      </div>
      <div className={styles.formHeader__actions}>
        {mode === "create" && (
          <Link href="/admin/orders/new/quick" className="admin-btn admin-btn--secondary admin-btn--small">
            Nhập nhanh dạng bảng
          </Link>
        )}
        <Link href={cancelHref} className="admin-btn admin-btn--secondary admin-btn--small">
          Hủy
        </Link>
        <button type="submit" className="admin-btn admin-btn--primary admin-btn--small">
          {submitLabel}
        </button>
      </div>
    </header>
  );
}
