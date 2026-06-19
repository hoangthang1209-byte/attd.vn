import type { QuoteTotals } from "@/features/quotes/types";
import { formatQuoteCurrency } from "@/features/quotes/format";

export default function QuoteTotalsSummary({ totals }: { totals: QuoteTotals }) {
  return (
    <div className="admin-catalog-kpi-bar">
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.subtotal)}</strong><span>Tạm tính</span></div>
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.serviceTotal)}</strong><span>Phí dịch vụ</span></div>
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.setupTotal)}</strong><span>Phí setup</span></div>
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.discountAmount)}</strong><span>Chiết khấu</span></div>
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.shippingFee)}</strong><span>Phí vận chuyển</span></div>
      <div className="admin-catalog-kpi"><strong>{formatQuoteCurrency(totals.vatAmount)}</strong><span>VAT ({totals.vatRate}%)</span></div>
      <div className="admin-catalog-kpi admin-catalog-kpi--ok">
        <strong>{formatQuoteCurrency(totals.manualOverride && totals.manualTotalAmount != null ? totals.manualTotalAmount : totals.totalAmount)}</strong>
        <span>{totals.manualOverride ? "Tổng chỉnh tay" : "Tổng cộng"}</span>
      </div>
    </div>
  );
}
