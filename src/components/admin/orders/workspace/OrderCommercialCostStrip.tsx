"use client";

import { formatOrderCurrency } from "@/features/orders/order-format";
import { formatPricingPercent } from "@/features/pricing/format";
import type { OrderDetailRecord } from "@/features/orders/order.types";

type Props = {
  order: OrderDetailRecord;
};

export default function OrderCommercialCostStrip({ order }: Props) {
  const summary = order.quotedCommercial;
  if (!summary?.hasQuotedCost) return null;

  const rows = [
    { label: "Doanh thu", value: formatOrderCurrency(summary.revenue, order.currency) },
    {
      label: "Giá vốn báo giá",
      value: formatOrderCurrency(summary.quotedTotalCost, order.currency),
    },
    {
      label: "LN dự kiến",
      value: formatOrderCurrency(summary.expectedProfit, order.currency),
    },
    {
      label: "Biên LN",
      value:
        summary.expectedMarginRate != null
          ? formatPricingPercent(summary.expectedMarginRate)
          : "—",
    },
  ];

  return (
    <article className="order-workspace-summary-card order-workspace-commercial-strip">
      <h3 className="order-workspace-summary-card__title">Giá vốn báo giá & lợi nhuận dự kiến</h3>
      <dl
        className="order-workspace-commercial-strip__grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "8px 16px",
          margin: 0,
        }}
      >
        {rows.map((row) => (
          <div key={row.label} className="order-workspace-commercial-strip__row">
            <dt style={{ fontSize: "12px", color: "var(--admin-muted, #64748b)" }}>{row.label}</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
