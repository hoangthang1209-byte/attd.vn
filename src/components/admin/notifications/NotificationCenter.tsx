"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { formatQuoteDateTime } from "@/features/quotes/format";
import {
  NOTIFICATION_SEVERITY_BADGE_CLASS,
  NOTIFICATION_SEVERITY_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "@/features/notifications/labels";
import type {
  NotificationCenterResponse,
  NotificationItem,
  NotificationType,
} from "@/features/notifications/types";

type FilterKey = "all" | "urgent" | "quote" | "opportunity" | "order" | "crm";

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "urgent", label: "Khẩn cấp" },
  { key: "quote", label: "Báo giá" },
  { key: "opportunity", label: "Cơ hội" },
  { key: "order", label: "Đơn hàng" },
  { key: "crm", label: "CRM" },
];

function matchesFilter(item: NotificationItem, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "urgent":
      return item.severity === "URGENT";
    case "quote":
      return item.type === "QUOTE_EXPIRING" || item.type === "QUOTE_NO_RESPONSE";
    case "opportunity":
      return (
        item.type === "OPPORTUNITY_OVERDUE" ||
        item.type === "FOLLOW_UP_TODAY" ||
        item.type === "READY_FOR_HANDOVER"
      );
    case "order":
      return item.type === "NEW_ORDER" || item.type === "ORDER_OVERDUE";
    case "crm":
      return item.type === "CRM_ACTIVITY";
    default:
      return true;
  }
}

export default function NotificationCenter() {
  const [data, setData] = useState<NotificationCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications");
      const json = (await res.json()) as NotificationCenterResponse & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tải thông báo");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.notifications.filter((item) => matchesFilter(item, filter));
  }, [data, filter]);

  if (loading) {
    return <AdminLoadingState label="Đang tải trung tâm thông báo…" />;
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Thông báo"
        description="Hộp thư vận hành nội bộ tổng hợp từ cơ hội, báo giá, đơn hàng và CRM."
        actions={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      {data ? (
        <>
          <div className="sales-follow-up__stats">
            <StatCard label="Tổng" value={data.stats.total} />
            <StatCard label="Khẩn cấp" value={data.stats.urgent} tone="danger" />
            <StatCard label="Cao" value={data.stats.high} tone="warning" />
            <StatCard label="Bình thường" value={data.stats.normal} tone="info" />
            <StatCard label="Thấp" value={data.stats.low} />
          </div>

          <div className="sales-follow-up__filters" role="tablist" aria-label="Lọc thông báo">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={filter === option.key}
                className={`admin-btn admin-btn--xs${filter === option.key ? " admin-btn--primary" : ""}`}
                onClick={() => setFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <EmptyState
              title="Không có thông báo phù hợp"
              description="Hệ thống chưa phát hiện sự kiện cần xử lý theo bộ lọc hiện tại."
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact sales-follow-up__table">
                <thead>
                  <tr>
                    <th>Mức độ</th>
                    <th>Loại</th>
                    <th>Tiêu đề</th>
                    <th>Nội dung</th>
                    <th>Hạn xử lý</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <NotificationRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </AdminPageShell>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "info";
}) {
  return (
    <article className={`sales-follow-up__stat-card${tone ? ` sales-follow-up__stat-card--${tone}` : ""}`}>
      <span className="sales-follow-up__stat-label">{label}</span>
      <strong className="sales-follow-up__stat-value">{value}</strong>
    </article>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <tr>
      <td>
        <span className={NOTIFICATION_SEVERITY_BADGE_CLASS[item.severity]}>
          {NOTIFICATION_SEVERITY_LABELS[item.severity]}
        </span>
      </td>
      <td>{NOTIFICATION_TYPE_LABELS[item.type as NotificationType]}</td>
      <td className="sales-follow-up__title-cell">
        <strong>{item.title}</strong>
      </td>
      <td className="sales-follow-up__reason">{item.message}</td>
      <td>{item.dueAt ? formatQuoteDateTime(item.dueAt) : "—"}</td>
      <td>
        <Link href={item.href} className="admin-btn admin-btn--xs admin-btn--secondary">
          Mở
        </Link>
      </td>
    </tr>
  );
}
