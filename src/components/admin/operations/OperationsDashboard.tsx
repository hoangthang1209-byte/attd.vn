"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
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

  if (loading) return <AdminLoadingState label="Đang tải tổng quan vận hành…" rows={4} />;
  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được tổng quan vận hành"
        description={error}
      />
    );
  }
  if (!summary) {
    return (
      <EmptyState
        title="Không có dữ liệu vận hành"
        description="Chưa có đơn hàng hoặc tóm tắt vận hành để hiển thị."
      />
    );
  }

  const cards: SummaryCard[] = [
    { label: "Đơn mới", value: summary.newOrders, href: "/admin/orders?status=NEW" },
    { label: "Chờ xác nhận", value: summary.awaitingConfirmation, href: "/admin/orders?status=NEW" },
    { label: "Đang sản xuất", value: summary.inProduction, href: "/admin/production?status=IN_PRODUCTION" },
    {
      label: "Sắp trễ hạn sản xuất",
      value: summary.productionDueSoon,
      href: "/admin/production?due=upcoming",
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
        <p className="admin-muted" style={{ margin: 0 }}>
          Tóm tắt nhanh các đơn hàng cần xử lý
        </p>
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
