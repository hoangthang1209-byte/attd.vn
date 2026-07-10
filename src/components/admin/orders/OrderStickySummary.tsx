"use client";

import Link from "next/link";
import OrderTotalsSummary from "@/components/admin/orders/OrderTotalsSummary";
import type { OrderTotals } from "@/features/orders/order-totals";
import styles from "@/components/admin/orders/OrderWorkflow.module.css";

type Props = {
  totals: OrderTotals;
  currency: string;
  vatRate: string;
  discountAmount: string;
  shippingFee: string;
  onDiscountChange: (value: string) => void;
  onShippingChange: (value: string) => void;
  onVatChange: (value: string) => void;
  submitLabel: string;
  cancelHref: string;
};

export default function OrderStickySummary({
  totals,
  currency,
  vatRate,
  discountAmount,
  shippingFee,
  onDiscountChange,
  onShippingChange,
  onVatChange,
  submitLabel,
  cancelHref,
}: Props) {
  const vatRateNumber = Number(vatRate) || 0;

  return (
    <aside className={styles.summaryPanel} aria-label="Tổng giá trị đơn hàng">
      <h2 className={styles.summaryPanel__title}>Tổng giá trị</h2>
      <div className={styles.summaryPanel__fields}>
        <div className="admin-field">
          <label className="admin-label" htmlFor="order-discount">
            Chiết khấu
          </label>
          <input
            id="order-discount"
            className="admin-input"
            type="number"
            min="0"
            value={discountAmount}
            onChange={(e) => onDiscountChange(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="order-shipping">
            Phí vận chuyển
          </label>
          <input
            id="order-shipping"
            className="admin-input"
            type="number"
            min="0"
            value={shippingFee}
            onChange={(e) => onShippingChange(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor="order-vat">
            VAT (%)
          </label>
          <input
            id="order-vat"
            className="admin-input"
            type="number"
            min="0"
            value={vatRate}
            onChange={(e) => onVatChange(e.target.value)}
          />
        </div>
      </div>
      <OrderTotalsSummary totals={totals} currency={currency} vatRate={vatRateNumber} />
      <div className={styles.summaryPanel__actions}>
        <button type="submit" className="admin-btn admin-btn--primary">
          {submitLabel}
        </button>
        <Link href={cancelHref} className="admin-btn admin-btn--secondary">
          Hủy
        </Link>
      </div>
    </aside>
  );
}
