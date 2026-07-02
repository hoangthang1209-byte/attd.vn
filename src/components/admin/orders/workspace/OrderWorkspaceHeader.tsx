"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const moreRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    moreTriggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMore();
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (moreRef.current?.contains(target)) return;
      closeMore();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [moreOpen, closeMore]);

  return (
    <header className="order-workspace-header">
      <div className="order-workspace-header__main">
        <div className="order-workspace-header__status-row">
          <span className="order-workspace-header__code">{order.orderNo}</span>
          <OrderStatusBadge status={order.status} />
          <span
            className={`order-workspace-prod-readiness order-workspace-prod-readiness--${readiness.tone}`}
            title="Tình trạng sẵn sàng sản xuất"
          >
            {readiness.label}
          </span>
        </div>
        <div className="order-workspace-header__meta">
          <span>Deadline giao: {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}</span>
          <span>·</span>
          <span>Tạo: {formatOrderDateTime(order.createdAt)}</span>
          <span>·</span>
          <span>Nguồn: {orderSourceLabel(order)}</span>
          <span>·</span>
          <span>Phụ trách: {order.salesName ?? order.productionOwnerName ?? "—"}</span>
        </div>
      </div>
      <div className="order-workspace-header__actions">
        {canEditOrder && (
          <Link href={`/admin/orders/${order.id}/edit`} className="admin-btn admin-btn--secondary admin-btn--small">
            Chỉnh sửa
          </Link>
        )}
        <OrderDocumentActions order={order} />
        <div className="order-workspace-header__more" ref={moreRef}>
          <button
            ref={moreTriggerRef}
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            disabled={busy}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            Thao tác ▾
          </button>
          {moreOpen && (
            <div className="order-workspace-header__menu" role="menu">
              {canViewFinancials && order.quote && (
                <Link
                  href={`/admin/quotes/${order.quote.id}`}
                  className="order-workspace-header__menu-item"
                  role="menuitem"
                  onClick={() => closeMore()}
                >
                  Báo giá nguồn
                </Link>
              )}
              {transitions
                .filter((s) => s !== "CANCELLED")
                .map((status) => {
                  const label = orderStatusActionLabel(status);
                  if (!label) return null;
                  return (
                    <button
                      key={status}
                      type="button"
                      role="menuitem"
                      className="order-workspace-header__menu-item"
                      disabled={busy}
                      onClick={() => {
                        closeMore();
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
                  role="menuitem"
                  className="order-workspace-header__menu-item order-workspace-header__menu-item--danger"
                  disabled={busy}
                  onClick={() => {
                    closeMore();
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
                  role="menuitem"
                  className="order-workspace-header__menu-item"
                  disabled={busy}
                  onClick={() => {
                    closeMore();
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
