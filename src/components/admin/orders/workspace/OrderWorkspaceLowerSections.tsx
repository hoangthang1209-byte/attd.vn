"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatOrderCurrency, formatOrderDate, formatOrderDateTime } from "@/features/orders/order-format";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { orderCarrierDisplay } from "@/features/orders/order-status";
import {
  orderWorkspaceSectionStorageKey,
  type OrderWorkspaceTab,
} from "./order-workspace.types";

type SectionKey = "delivery" | "documents" | "activity" | "notes" | "payment";

type Props = {
  order: OrderDetailRecord;
  orderId: string;
  productionFileCount: number;
  canViewFinancials: boolean;
  roleCode: string | null;
  onNavigateTab: (tab: OrderWorkspaceTab) => void;
};

function deliverySummary(order: OrderDetailRecord): string {
  const date = order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—";
  let status = "Chờ giao";
  if (order.deliveredAt || order.status === "COMPLETED") status = "Đã giao";
  else if (order.shippedAt || order.status === "SHIPPED") status = "Đang giao";
  else if (order.status === "READY_TO_SHIP") status = "Chờ giao";
  return `${date} · ${status}`;
}

function defaultOpenSections(
  order: OrderDetailRecord,
  roleCode: string | null,
  canViewFinancials: boolean,
): Partial<Record<SectionKey, boolean>> {
  const open: Partial<Record<SectionKey, boolean>> = {};
  if (roleCode === "DELIVERY" || ["READY_TO_SHIP", "SHIPPED"].includes(order.status)) {
    open.delivery = true;
  }
  if (
    canViewFinancials &&
    order.financials &&
    (order.financials.outstandingAmount > 0 || order.financials.paymentState === "UNPAID")
  ) {
    open.payment = true;
  }
  const recentActivity = order.activities?.[0];
  if (recentActivity) {
    const ageMs = Date.now() - new Date(recentActivity.createdAt).getTime();
    if (ageMs < 48 * 60 * 60 * 1000) open.activity = true;
  }
  return open;
}

export default function OrderWorkspaceLowerSections({
  order,
  orderId,
  productionFileCount,
  canViewFinancials,
  roleCode,
  onNavigateTab,
}: Props) {
  const storageKey = orderWorkspaceSectionStorageKey(orderId);
  const defaults = useMemo(
    () => defaultOpenSections(order, roleCode, canViewFinancials),
    [canViewFinancials, order, roleCode],
  );
  const [open, setOpen] = useState<Partial<Record<SectionKey, boolean>>>(defaults);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) setOpen({ ...defaults, ...JSON.parse(raw) as Partial<Record<SectionKey, boolean>> });
    } catch {
      /* ignore */
    }
  }, [defaults, storageKey]);

  function toggle(key: SectionKey) {
    setOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const paymentSummary =
    canViewFinancials && order.financials
      ? `Còn phải thu ${formatOrderCurrency(order.financials.outstandingAmount, order.currency)}`
      : null;

  return (
    <div className="order-workspace-lower-grid">
      <details className="order-workspace-lower-card" open={open.delivery}>
        <summary onClick={(e) => { e.preventDefault(); toggle("delivery"); }}>
          Lịch giao hàng: {deliverySummary(order)}
        </summary>
        <div className="order-workspace-lower-card__body">
          <p>{order.deliveryMethodName ?? order.deliveryMethod ?? "—"}</p>
          <p className="admin-field-hint">{order.deliveryOwnerName ?? "—"}</p>
          <p className="admin-field-hint">{orderCarrierDisplay(order) ?? "—"}</p>
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("delivery")}>
            Mở tab giao hàng
          </button>
        </div>
      </details>

      <details className="order-workspace-lower-card" open={open.documents}>
        <summary onClick={(e) => { e.preventDefault(); toggle("documents"); }}>
          Tài liệu đơn hàng: {productionFileCount} file
        </summary>
        <div className="order-workspace-lower-card__body">
          <p className="admin-field-hint">Tài liệu sản xuất được quản lý trong module sản xuất.</p>
          <Link
            href={`/admin/production?search=${encodeURIComponent(order.orderNo)}`}
            className="order-workspace-summary-card__link"
          >
            Mở tài liệu sản xuất
          </Link>
        </div>
      </details>

      <details className="order-workspace-lower-card" open={open.activity}>
        <summary onClick={(e) => { e.preventDefault(); toggle("activity"); }}>
          Lịch sử hoạt động: {(order.activities ?? []).length} cập nhật
        </summary>
        <div className="order-workspace-lower-card__body">
          <ul className="order-activity-timeline">
            {(order.activities ?? []).slice(0, 5).map((activity) => (
              <li key={activity.id}>
                <strong>{activity.title}</strong>
                <span className="admin-field-hint"> · {formatOrderDateTime(activity.createdAt)}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("activity")}>
            Xem tất cả
          </button>
        </div>
      </details>

      <details className="order-workspace-lower-card" open={open.notes}>
        <summary onClick={(e) => { e.preventDefault(); toggle("notes"); }}>
          Ghi chú nội bộ: {order.internalNote ? "Có" : "Không"}
        </summary>
        <div className="order-workspace-lower-card__body">
          {order.internalNote ? (
            <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.internalNote}</pre>
          ) : (
            <p className="admin-field-hint">Chưa có ghi chú.</p>
          )}
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("notes")}>
            Mở tab ghi chú
          </button>
        </div>
      </details>

      {canViewFinancials && paymentSummary && (
        <details className="order-workspace-lower-card" open={open.payment}>
          <summary onClick={(e) => { e.preventDefault(); toggle("payment"); }}>
            Thanh toán: {paymentSummary}
          </summary>
          <div className="order-workspace-lower-card__body">
            <p>Đã nhận: {formatOrderCurrency(order.financials.paidAmount, order.currency)}</p>
            <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("payment")}>
              Xem thanh toán
            </button>
          </div>
        </details>
      )}
    </div>
  );
}
