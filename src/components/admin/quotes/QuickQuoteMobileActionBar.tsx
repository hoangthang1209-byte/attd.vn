"use client";

import Link from "next/link";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  showBack?: boolean;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary?: () => void;
  primaryType?: "button" | "submit";
  primaryDisabled?: boolean;
  cancelHref?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function QuickQuoteMobileActionBar({
  showBack,
  onBack,
  primaryLabel,
  onPrimary,
  primaryType = "button",
  primaryDisabled,
  cancelHref = "/admin/quotes",
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <div className={styles.mobileActionBar} role="group" aria-label="Thao tác báo giá nhanh">
      {showBack && onBack ? (
        <button
          type="button"
          className={`admin-btn admin-btn--secondary ${styles.mobileActionBar__cancel}`}
          onClick={onBack}
        >
          Quay lại
        </button>
      ) : (
        <Link href={cancelHref} className={`admin-btn admin-btn--secondary ${styles.mobileActionBar__cancel}`}>
          Hủy
        </Link>
      )}
      {secondaryLabel && onSecondary && (
        <button type="button" className="admin-btn admin-btn--secondary" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
      <button
        type={primaryType}
        className="admin-btn admin-btn--primary"
        onClick={primaryType === "button" ? onPrimary : undefined}
        disabled={primaryDisabled}
      >
        {primaryLabel}
      </button>
    </div>
  );
}
