"use client";

import Link from "next/link";
import { formatOrderCurrency, formatOrderDate } from "@/features/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { orderCarrierDisplay } from "@/features/orders/order-status";
import { deriveOrderMilestones } from "@/features/orders/order-workspace-milestones";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { OrderWorkspaceTab } from "./order-workspace.types";
import OrderCommercialCostStrip from "./OrderCommercialCostStrip";

type Props = {
  order: OrderDetailRecord;
  bundle: ProductionExecutionBundle | null;
  canViewFinancials: boolean;
  onNavigateTab: (tab: OrderWorkspaceTab) => void;
};

function deliveryStatusLabel(order: OrderDetailRecord): string {
  if (order.deliveredAt || order.status === "COMPLETED") return "Đã giao";
  if (order.shippedAt || order.status === "SHIPPED") return "Đang giao";
  if (order.status === "READY_TO_SHIP") return "Chờ giao";
  return ORDER_STATUS_LABELS[order.status] ?? "—";
}

export default function OrderWorkspaceSummaryCards({
  order,
  bundle,
  canViewFinancials,
  onNavigateTab,
}: Props) {
  const milestones = deriveOrderMilestones(order, bundle);

  return (
    <div className="order-workspace-summary-grid">
      <article className="order-workspace-summary-card">
        <h3 className="order-workspace-summary-card__title">Khách hàng</h3>
        <p className="order-workspace-summary-card__primary">{order.customerCompanyName ?? order.customer?.name ?? "—"}</p>
        <p className="order-workspace-summary-card__line">{order.contactName ?? "—"}</p>
        <p className="order-workspace-summary-card__line">{order.contactPhone ?? "—"}</p>
        {order.customerCode && (
          <p className="order-workspace-summary-card__hint">Mã: {order.customerCode}</p>
        )}
        {order.customer && (
          <Link href={`/admin/crm/customers/${order.customer.id}`} className="order-workspace-summary-card__link">
            Mở hồ sơ khách hàng
          </Link>
        )}
      </article>

      {canViewFinancials && order.financials && (
        <article className="order-workspace-summary-card">
          <h3 className="order-workspace-summary-card__title">Giá trị đơn hàng</h3>
          <p className="order-workspace-summary-card__line">
            Tổng tiền hàng: <strong>{formatOrderCurrency(order.subtotal, order.currency)}</strong>
          </p>
          <p className="order-workspace-summary-card__line">
            VAT: <strong>{formatOrderCurrency(order.vatAmount, order.currency)}</strong>
          </p>
          <p className="order-workspace-summary-card__primary">
            Tổng thanh toán: {formatOrderCurrency(order.financials.totalAmount, order.currency)}
          </p>
          <p className="order-workspace-summary-card__line">
            Đã nhận: {formatOrderCurrency(order.financials.paidAmount, order.currency)}
            {" · "}
            Còn lại: {formatOrderCurrency(order.financials.outstandingAmount, order.currency)}
          </p>
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("payment")}>
            Xem thanh toán
          </button>
        </article>
      )}

      {canViewFinancials && <OrderCommercialCostStrip order={order} />}

      <article className="order-workspace-summary-card">
        <h3 className="order-workspace-summary-card__title">Tiến độ đơn hàng</h3>
        <ol className="order-workspace-milestones">
          {milestones.map((step) => (
            <li
              key={step.key}
              className={`order-workspace-milestones__step order-workspace-milestones__step--${step.state}`}
            >
              {step.label}
            </li>
          ))}
        </ol>
        <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("activity")}>
          Xem chi tiết tiến độ
        </button>
      </article>

      <article className="order-workspace-summary-card">
        <h3 className="order-workspace-summary-card__title">Giao hàng</h3>
        <p className="order-workspace-summary-card__line">
          {order.deliveryMethodName ?? order.deliveryMethod ?? "—"}
        </p>
        <p className="order-workspace-summary-card__line">{order.deliveryOwnerName ?? "—"}</p>
        <p className="order-workspace-summary-card__line">
          Deadline: {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}
        </p>
        <p className="order-workspace-summary-card__line">{deliveryStatusLabel(order)}</p>
        {(order.deliveryTrackingCode || orderCarrierDisplay(order)) && (
          <p className="order-workspace-summary-card__hint">
            {orderCarrierDisplay(order) ?? ""}
            {order.deliveryTrackingCode ? ` · ${order.deliveryTrackingCode}` : ""}
          </p>
        )}
        <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("delivery")}>
          Xem giao hàng
        </button>
      </article>
    </div>
  );
}
