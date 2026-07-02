"use client";

import { useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import OrderDocumentActions from "@/components/admin/orders/OrderDocumentActions";
import { formatOrderDate, formatOrderDateTime } from "@/features/orders/order-format";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import {
  orderStatusActionLabel,
  orderStatusCorrectionLabel,
} from "@/features/orders/order-status";
import { deriveProductionReadinessIndicator } from "@/features/orders/order-workspace-milestones";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";

type Props = {
  order: OrderDetailRecord;
  bundle: ProductionExecutionBundle | null;
  canEditOrder: boolean;
  canViewFinancials: boolean;
  busy: boolean;
  transitions: OrderStatus[];
  correctionTargets: OrderStatus[];
  onRequestStatusChange: (status: OrderStatus) => void;
  onOpenCancel: () => void;
  onOpenCorrection: (status: OrderStatus) => void;
};

function orderSourceLabel(order: OrderDetailRecord): string {
  if (order.sourceQuoteNo) return `Báo giá ${order.sourceQuoteNo}`;
  return "Trực tiếp";
}

export default function OrderWorkspaceHeader({
  order,
  bundle,
  canEditOrder,
  canViewFinancials,
  busy,
  transitions,
  correctionTargets,
  onRequestStatusChange,
  onOpenCancel,
  onOpenCorrection,
}: Props) {
  const readiness = deriveProductionReadinessIndicator(order, bundle);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="order-workspace-header">
      <div className="order-workspace-header__main">
        <div className="order-workspace-header__title-row">
          <h1 className="order-workspace-header__code">{order.orderNo}</h1>
          <OrderStatusBadge status={order.status} />
          <span className={`order-workspace-readiness order-workspace-readiness--${readiness.tone}`}>
            {readiness.label}
          </span>
        </div>
        <div className="order-workspace-header__meta">
          <span>Deadline giao: {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}</span>
          <span>Tạo: {formatOrderDateTime(order.createdAt)}</span>
          <span>Nguồn: {orderSourceLabel(order)}</span>
          <span>Phụ trách: {order.salesName ?? order.productionOwnerName ?? "—"}</span>
        </div>
      </div>
      <div className="order-workspace-header__actions">
        {canEditOrder && (
          <Link href={`/admin/orders/${order.id}/edit`} className="admin-btn admin-btn--secondary admin-btn--small">
            Chỉnh sửa
          </Link>
        )}
        {canViewFinancials && order.quote && (
          <Link href={`/admin/quotes/${order.quote.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
            Báo giá nguồn
          </Link>
        )}
        <OrderDocumentActions order={order} />
        <div className="order-workspace-header__more">
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            disabled={busy}
            onClick={() => setMoreOpen((v) => !v)}
          >
            Thao tác ▾
          </button>
          {moreOpen && (
            <div className="order-workspace-header__menu">
              {transitions
                .filter((s) => s !== "CANCELLED")
                .map((status) => {
                  const label = orderStatusActionLabel(status);
                  if (!label) return null;
                  return (
                    <button
                      key={status}
                      type="button"
                      className="order-workspace-header__menu-item"
                      disabled={busy}
                      onClick={() => {
                        setMoreOpen(false);
                        onRequestStatusChange(status);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              {transitions.includes("CANCELLED") && (
                <button
                  type="button"
                  className="order-workspace-header__menu-item order-workspace-header__menu-item--danger"
                  disabled={busy}
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenCancel();
                  }}
                >
                  Hủy đơn
                </button>
              )}
              {correctionTargets.map((status) => (
                <button
                  key={`correction-${status}`}
                  type="button"
                  className="order-workspace-header__menu-item"
                  disabled={busy}
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenCorrection(status);
                  }}
                >
                  {orderStatusCorrectionLabel(status)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
