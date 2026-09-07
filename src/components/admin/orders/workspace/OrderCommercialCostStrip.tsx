"use client";

import { useCallback, useState } from "react";
import { formatOrderCurrency } from "@/features/orders/order-format";
import { formatPricingPercent } from "@/features/pricing/format";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { OrderActualCostSummary } from "@/features/orders/order-actual-cost.types";
import OrderActualCostPanel from "./OrderActualCostPanel";

type Props = {
  order: OrderDetailRecord;
  canEditOrder: boolean;
};

function moneyOrDash(
  value: number | null | undefined,
  currency: string,
  emptyLabel = "—",
): string {
  if (value == null) return emptyLabel;
  return formatOrderCurrency(value, currency);
}

export default function OrderCommercialCostStrip({ order, canEditOrder }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<OrderActualCostSummary | null>(order.actualCost);

  const refreshSummary = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}/actual-cost`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Không thể tải chi phí thực tế");
    setSummary(data.actualCost as OrderActualCostSummary);
    return data.actualCost as OrderActualCostSummary;
  }, [order.id]);

  const commercialValue = summary?.commercialValue ?? order.subtotal - order.discountAmount + order.shippingFee;
  const estimatedCost = summary?.estimatedCost ?? null;
  const hasEstimated = summary?.hasEstimatedCost ?? estimatedCost != null;
  const estimatedMargin = summary?.estimatedGrossMargin ?? null;
  const estimatedRate = summary?.estimatedGrossMarginRate ?? null;
  const actualCost = summary?.actualCostTotal ?? null;
  const actualMargin = summary?.actualGrossMargin ?? null;
  const actualRate = summary?.actualGrossMarginRate ?? null;
  const variance = summary?.costVariance ?? null;
  const status = summary?.status;
  const closed = status === "CLOSED";

  return (
    <>
      <article className="order-workspace-summary-card order-workspace-commercial-strip">
        <h3 className="order-workspace-summary-card__title">Chi phí & lãi gộp</h3>
        {summary?.needsCloseWarning && (
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#b45309" }}>
            Chi phí thực tế chưa được chốt
          </p>
        )}
        <dl
          className="order-workspace-commercial-strip__grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "8px 16px",
            margin: 0,
          }}
        >
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Giá trị đơn hàng</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {formatOrderCurrency(commercialValue, order.currency)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Chi phí dự kiến</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {hasEstimated ? moneyOrDash(estimatedCost, order.currency) : "Chưa có"}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Lãi gộp dự kiến</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {hasEstimated
                ? `${moneyOrDash(estimatedMargin, order.currency)}${
                    estimatedRate != null ? ` · ${formatPricingPercent(estimatedRate)}` : ""
                  }`
                : "—"}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Chi phí thực tế</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {actualCost == null ? "Chưa nhập" : formatOrderCurrency(actualCost, order.currency)}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Lãi gộp thực tế</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {actualMargin == null
                ? "—"
                : `${formatOrderCurrency(actualMargin, order.currency)}${
                    actualRate != null ? ` · ${formatPricingPercent(actualRate)}` : ""
                  }`}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Chênh lệch chi phí</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {variance == null
                ? "—"
                : `${variance > 0 ? "+" : ""}${formatOrderCurrency(variance, order.currency)}`}
            </dd>
          </div>
          <div>
            <dt style={{ fontSize: 12, color: "var(--admin-muted, #64748b)" }}>Trạng thái</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{closed ? "ĐÃ CHỐT" : "CHƯA CHỐT"}</dd>
          </div>
        </dl>
        <button
          type="button"
          className="order-workspace-summary-card__link"
          onClick={() => {
            setOpen(true);
            void refreshSummary().catch(() => undefined);
          }}
          style={{ marginTop: 10 }}
        >
          Chi tiết chi phí
        </button>
      </article>

      {open && (
        <OrderActualCostPanel
          orderId={order.id}
          currency={order.currency}
          canEdit={canEditOrder && summary?.status !== "CLOSED"}
          canCloseOrReopen={canEditOrder}
          summary={summary}
          onClose={() => setOpen(false)}
          onSummaryChange={setSummary}
          refreshSummary={refreshSummary}
        />
      )}
    </>
  );
}
