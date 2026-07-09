"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { formatQuoteCurrency, formatQuoteDateTime } from "@/features/quotes/format";
import {
  SALES_FOLLOW_UP_PRIORITY_BADGE_CLASS,
  SALES_FOLLOW_UP_PRIORITY_LABELS,
  SALES_FOLLOW_UP_TYPE_LABELS,
} from "@/features/sales/follow-up/labels";
import type {
  SalesFollowUpCenterResult,
  SalesFollowUpItem,
  SalesFollowUpType,
} from "@/features/sales/follow-up/types";

type FilterKey = "all" | "urgent" | "opportunity" | "quote" | "lead" | "activity";

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "urgent", label: "Ưu tiên cao" },
  { key: "opportunity", label: "Cơ hội" },
  { key: "quote", label: "Báo giá" },
  { key: "lead", label: "Lead" },
  { key: "activity", label: "Hoạt động" },
];

function matchesFilter(item: SalesFollowUpItem, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "urgent":
      return item.priority === "URGENT" || item.priority === "HIGH";
    case "opportunity":
      return item.type === "OPPORTUNITY_OVERDUE" || item.type === "OPPORTUNITY_TODAY";
    case "quote":
      return item.type === "QUOTE_EXPIRING" || item.type === "QUOTE_NO_RESPONSE";
    case "lead":
      return item.type === "LEAD_FOLLOW_UP";
    case "activity":
      return item.type === "ACTIVITY_FOLLOW_UP";
    default:
      return true;
  }
}

function actionLabel(item: SalesFollowUpItem): string {
  if (item.opportunityId) return "Mở cơ hội";
  if (item.quoteId) return "Mở báo giá";
  if (item.leadId) return "Mở lead";
  return "Mở";
}

export default function SalesFollowUpCenter() {
  const [data, setData] = useState<SalesFollowUpCenterResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/follow-up");
      const json = await res.json() as SalesFollowUpCenterResult & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tải follow-up");
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
    return data.items.filter((item) => matchesFilter(item, filter));
  }, [data, filter]);

  if (loading) {
    return <AdminLoadingState label="Đang tải trung tâm follow-up…" />;
  }

  if (!data && error) {
    return (
      <AdminPageShell>
        <EmptyState
          title="Không thể tải follow-up"
          description={error}
          action={
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Trung tâm follow-up"
        description="Danh sách việc cần liên hệ hôm nay từ cơ hội, báo giá, lead và hoạt động CRM."
        actions={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      {error && <p className="admin-error">{error}</p>}

      {data && (
        <>
          <div className="sales-follow-up__stats">
            <StatCard label="Tổng việc cần xử lý" value={data.stats.total} />
            <StatCard label="Quá hạn" value={data.stats.overdue} tone="danger" />
            <StatCard label="Hôm nay" value={data.stats.today} tone="info" />
            <StatCard label="Báo giá sắp hết hạn" value={data.stats.quoteExpiring} tone="warning" />
            <StatCard label="Báo giá chưa phản hồi" value={data.stats.noResponse} tone="warning" />
            <StatCard label="Lead cần follow-up" value={data.stats.leadFollowUp} />
          </div>

          <div className="sales-follow-up__filters" role="tablist" aria-label="Lọc follow-up">
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
              title="Không có việc follow-up cần xử lý."
              description="Tất cả cơ hội, báo giá và lead đang được theo dõi đúng hạn."
            />
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact sales-follow-up__table">
                <thead>
                  <tr>
                    <th>Ưu tiên</th>
                    <th>Loại</th>
                    <th>Tiêu đề</th>
                    <th>Khách / liên hệ</th>
                    <th>Liên lạc</th>
                    <th>Hạn</th>
                    <th>Giá trị</th>
                    <th>Lý do</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <FollowUpRow key={item.id} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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

function FollowUpRow({ item }: { item: SalesFollowUpItem }) {
  const typeLabel = SALES_FOLLOW_UP_TYPE_LABELS[item.type as SalesFollowUpType] ?? item.type;
  const contactParts = [item.phone, item.zalo ? `Zalo: ${item.zalo}` : null, item.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <tr>
      <td>
        <span className={SALES_FOLLOW_UP_PRIORITY_BADGE_CLASS[item.priority]}>
          {SALES_FOLLOW_UP_PRIORITY_LABELS[item.priority]}
        </span>
      </td>
      <td>{typeLabel}</td>
      <td>
        <div className="sales-follow-up__title-cell">
          <strong>{item.title}</strong>
          {item.subtitle ? <span className="admin-muted">{item.subtitle}</span> : null}
        </div>
      </td>
      <td>
        <div className="sales-follow-up__contact-cell">
          {item.customerLabel ? <span>{item.customerLabel}</span> : null}
          {item.contactLabel ? <span className="admin-muted">{item.contactLabel}</span> : null}
        </div>
      </td>
      <td className="sales-follow-up__channels">{contactParts || "—"}</td>
      <td>{item.dueAt ? formatQuoteDateTime(item.dueAt) : "—"}</td>
      <td>{item.amount != null ? formatQuoteCurrency(item.amount) : "—"}</td>
      <td className="sales-follow-up__reason">{item.reason}</td>
      <td>
        {item.href ? (
          <Link href={item.href} className="admin-btn admin-btn--xs admin-btn--primary">
            {actionLabel(item)}
          </Link>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
