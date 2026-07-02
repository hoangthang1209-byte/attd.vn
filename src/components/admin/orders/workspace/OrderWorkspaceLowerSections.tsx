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

function deliveryStatusShort(order: OrderDetailRecord): string {
  if (order.deliveredAt || order.status === "COMPLETED") return "Đã giao";
  if (order.shippedAt || order.status === "SHIPPED") return "Đang giao";
  if (order.status === "READY_TO_SHIP") return "Chờ giao";
  return "Chờ giao";
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
  const roleDefaults = useMemo(
    () => defaultOpenSections(order, roleCode, canViewFinancials),
    [canViewFinancials, order, roleCode],
  );
  const [open, setOpen] = useState<Partial<Record<SectionKey, boolean>>>({});

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        setOpen(JSON.parse(raw) as Partial<Record<SectionKey, boolean>>);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(roleDefaults);
  }, [roleDefaults, storageKey]);

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

  const activityCount = (order.activities ?? []).length;

  return (
    <div className="order-workspace-lower-list">
      <details className="order-workspace-lower-row" open={Boolean(open.delivery)}>
        <summary onClick={(e) => { e.preventDefault(); toggle("delivery"); }}>
          <span className="order-workspace-lower-row__label">Lịch giao hàng</span>
          <span className="order-workspace-lower-row__value">{deliveryStatusShort(order)}</span>
        </summary>
        <div className="order-workspace-lower-row__body">
          <p>
            {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}
            {" · "}
            {order.deliveryMethodName ?? order.deliveryMethod ?? "—"}
          </p>
          <p className="admin-field-hint">{order.deliveryOwnerName ?? "—"} · {orderCarrierDisplay(order) ?? "—"}</p>
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("delivery")}>
            Mở tab giao hàng
          </button>
        </div>
      </details>

      <details className="order-workspace-lower-row" open={Boolean(open.documents)}>
        <summary onClick={(e) => { e.preventDefault(); toggle("documents"); }}>
          <span className="order-workspace-lower-row__label">Tài liệu đơn hàng</span>
          <span className="order-workspace-lower-row__value">{productionFileCount} file</span>
        </summary>
        <div className="order-workspace-lower-row__body">
          <p className="admin-field-hint">Tài liệu sản xuất được quản lý trong module sản xuất.</p>
          <Link
            href={`/admin/production?search=${encodeURIComponent(order.orderNo)}`}
            className="order-workspace-summary-card__link"
          >
            Mở tài liệu sản xuất
          </Link>
        </div>
      </details>

      <details className="order-workspace-lower-row" open={Boolean(open.activity)}>
        <summary onClick={(e) => { e.preventDefault(); toggle("activity"); }}>
          <span className="order-workspace-lower-row__label">Lịch sử hoạt động</span>
          <span className="order-workspace-lower-row__value">{activityCount} cập nhật</span>
        </summary>
        <div className="order-workspace-lower-row__body">
          {(order.activities ?? []).length === 0 ? (
            <p className="admin-field-hint">Chưa có hoạt động.</p>
          ) : (
            <ul className="order-activity-timeline">
              {(order.activities ?? []).slice(0, 5).map((activity) => (
                <li key={activity.id}>
                  <strong>{activity.title}</strong>
                  <span className="admin-field-hint"> · {formatOrderDateTime(activity.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="order-workspace-summary-card__link" onClick={() => onNavigateTab("activity")}>
            Xem tất cả
          </button>
        </div>
      </details>

      <details className="order-workspace-lower-row" open={Boolean(open.notes)}>
        <summary onClick={(e) => { e.preventDefault(); toggle("notes"); }}>
          <span className="order-workspace-lower-row__label">Ghi chú nội bộ</span>
          <span className="order-workspace-lower-row__value">{order.internalNote ? "Có" : "Không có"}</span>
        </summary>
        <div className="order-workspace-lower-row__body">
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
        <details className="order-workspace-lower-row" open={Boolean(open.payment)}>
          <summary onClick={(e) => { e.preventDefault(); toggle("payment"); }}>
            <span className="order-workspace-lower-row__label">Thanh toán</span>
            <span className="order-workspace-lower-row__value">{paymentSummary}</span>
          </summary>
          <div className="order-workspace-lower-row__body">
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
