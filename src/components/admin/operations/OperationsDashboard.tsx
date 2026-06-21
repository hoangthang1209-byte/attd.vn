"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatOrderCurrency } from "@/features/orders/order-format";
import type { OrderOperationalSummary } from "@/features/orders/order-operations.types";

type SummaryCard = {
  label: string;
  value: number | string;
  href: string;
  variant?: "danger" | "warning" | "success";
};

export default function OperationsDashboard() {
  const [summary, setSummary] = useState<OrderOperationalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetch("/api/orders/operations-summary")
      .then(async (res) => {
        const data = await res.json() as { summary?: OrderOperationalSummary; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải tổng quan");
        setSummary(data.summary ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="admin-loading">Đang tải…</p>;
  if (error) return <p className="admin-error">{error}</p>;
  if (!summary) return <div className="admin-empty-state"><p>Không có dữ liệu vận hành</p></div>;

  const cards: SummaryCard[] = [
    { label: "Đơn mới", value: summary.newOrders, href: "/admin/orders?status=NEW" },
    { label: "Chờ xác nhận", value: summary.awaitingConfirmation, href: "/admin/orders?status=NEW" },
    { label: "Đang sản xuất", value: summary.inProduction, href: "/admin/production?status=IN_PRODUCTION" },
    {
      label: "Sắp trễ hạn sản xuất",
      value: summary.productionDueSoon,
      href: "/admin/production?due=upcoming3",
      variant: "warning",
    },
    {
      label: "Quá hạn sản xuất",
      value: summary.productionOverdue,
      href: "/admin/production?due=overdue",
      variant: "danger",
    },
    { label: "Sẵn sàng giao", value: summary.readyToShip, href: "/admin/delivery?status=READY_TO_SHIP" },
    { label: "Đang giao", value: summary.inTransit, href: "/admin/delivery?status=SHIPPED" },
    {
      label: "Thiếu thông tin giao hàng",
      value: summary.missingDeliveryInfo,
      href: "/admin/delivery?readiness=MISSING_INFO",
      variant: "warning",
    },
    {
      label: "Tổng còn phải thu (đơn active)",
      value: formatOrderCurrency(summary.totalOutstandingActive),
      href: "/admin/orders",
    },
  ];

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-subtitle">Tổng quan vận hành</h2>
          <p className="admin-muted">Tóm tắt nhanh các đơn hàng cần xử lý</p>
        </div>
        <div className="admin-crm-detail-actions">
          <Link href="/admin/production" className="admin-btn admin-btn--secondary">Bảng sản xuất</Link>
          <Link href="/admin/delivery" className="admin-btn admin-btn--secondary">Vận hành giao hàng</Link>
        </div>
      </div>

      <div className="admin-dashboard-grid admin-ops-summary-grid">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`admin-dashboard-card admin-dashboard-card--link admin-ops-summary-card${
              card.variant === "danger"
                ? " admin-dashboard-card--danger"
                : card.variant === "warning"
                  ? " admin-dashboard-card--warning"
                  : card.variant === "success"
                    ? " admin-dashboard-card--success"
                    : ""
            }`}
          >
            <p className="admin-dashboard-label">{card.label}</p>
            <p className="admin-dashboard-value">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
