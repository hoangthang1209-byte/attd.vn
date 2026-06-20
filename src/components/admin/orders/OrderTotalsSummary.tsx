import type { OrderTotals } from "@/features/orders/order-totals";
import { formatOrderCurrency } from "@/features/orders/order-format";

type Props = {
  totals: OrderTotals;
  currency: string;
  vatRate: number;
};

export default function OrderTotalsSummary({ totals, currency, vatRate }: Props) {
  return (
    <div className="admin-catalog-kpi-bar">
      <div className="admin-catalog-kpi">
        <strong>{formatOrderCurrency(totals.subtotal, currency)}</strong>
        <span>Tạm tính</span>
      </div>
      <div className="admin-catalog-kpi">
        <strong>{formatOrderCurrency(totals.discountAmount, currency)}</strong>
        <span>Chiết khấu</span>
      </div>
      <div className="admin-catalog-kpi">
        <strong>{formatOrderCurrency(totals.shippingFee, currency)}</strong>
        <span>Phí vận chuyển</span>
      </div>
      <div className="admin-catalog-kpi">
        <strong>{formatOrderCurrency(totals.vatAmount, currency)}</strong>
        <span>VAT ({vatRate}%)</span>
      </div>
      <div className="admin-catalog-kpi admin-catalog-kpi--ok">
        <strong>{formatOrderCurrency(totals.totalAmount, currency)}</strong>
        <span>Tổng cộng</span>
      </div>
    </div>
  );
}
