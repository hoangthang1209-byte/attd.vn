"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminUi";
import {
  EXECUTIVE_DASHBOARD_KPI_LABELS,
  EXECUTIVE_SECTION_LABELS,
} from "@/features/business-intelligence/labels";
import type { ExecutiveDashboardPayload } from "@/features/business-intelligence/types";
import {
  NOTIFICATION_SEVERITY_BADGE_CLASS,
  NOTIFICATION_SEVERITY_LABELS,
} from "@/features/notifications/labels";
import type { NotificationSeverity } from "@/features/notifications/types";
import { formatPricingCurrency, formatPricingDateTime, formatPricingPercent } from "@/features/pricing/format";

function formatDelta(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <article className="admin-catalog-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
      {delta != null ? (
        <small className="admin-field-hint">
          {formatDelta(delta)} so với tháng trước
        </small>
      ) : null}
    </article>
  );
}

function DataTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="admin-field-hint">{emptyLabel}</p>;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table admin-table--compact">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${headers[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [payload, setPayload] = useState<ExecutiveDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bi/dashboard");
      const json = (await response.json()) as ExecutiveDashboardPayload & { message?: string };
      if (!response.ok) throw new Error(json.message ?? "Không thể tải dashboard");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <AdminLoadingState label="Đang tải Executive Dashboard…" rows={6} />;
  }

  if (!payload) {
    return (
      <AdminPageShell>
        <EmptyState
          title="Không thể tải dashboard"
          description={error ?? "Vui lòng thử lại sau."}
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
        title="Executive Dashboard"
        description="Tổng quan doanh thu, pipeline, báo giá, đơn hàng và cảnh báo vận hành."
        meta={
          <span className="admin-field-hint">
            Cập nhật: {formatPricingDateTime(payload.generatedAt)}
          </span>
        }
        actions={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-catalog-kpi-bar">
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.openPipelineValue}
          value={formatPricingCurrency(payload.kpis.openPipelineValue)}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.weightedForecastValue}
          value={formatPricingCurrency(payload.kpis.weightedForecastValue)}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.wonValueThisMonth}
          value={formatPricingCurrency(payload.kpis.wonValueThisMonth)}
          delta={payload.deltas.wonValueChangePct}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.quoteValueThisMonth}
          value={formatPricingCurrency(payload.kpis.quoteValueThisMonth)}
          delta={payload.deltas.quoteValueChangePct}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.orderValueThisMonth}
          value={formatPricingCurrency(payload.kpis.orderValueThisMonth)}
          delta={payload.deltas.orderValueChangePct}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.averageGrossMargin}
          value={formatPricingPercent(payload.kpis.averageGrossMargin)}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.overdueFollowUps}
          value={String(payload.kpis.overdueFollowUps)}
        />
        <KpiCard
          label={EXECUTIVE_DASHBOARD_KPI_LABELS.notificationCount}
          value={String(payload.kpis.notificationCount)}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <SectionCard title={EXECUTIVE_SECTION_LABELS.funnel}>
          <DataTable
            headers={["Giai đoạn", "Số lượng", "Giá trị"]}
            rows={payload.funnel.map((item) => [
              item.label,
              item.count,
              item.value != null ? formatPricingCurrency(item.value) : "—",
            ])}
            emptyLabel="Chưa có dữ liệu funnel."
          />
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.opportunityByStage}>
          <DataTable
            headers={["Giai đoạn", "Số lượng", "Giá trị", "Có trọng số"]}
            rows={payload.opportunityByStage.map((item) => [
              item.label,
              item.count,
              formatPricingCurrency(item.estimatedValue),
              formatPricingCurrency(item.weightedValue),
            ])}
            emptyLabel="Chưa có opportunity mở."
          />
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.quoteAnalytics}>
          <DataTable
            headers={["Trạng thái", "Số lượng", "Giá trị"]}
            rows={payload.quoteByStatus.map((item) => [
              item.label,
              item.count,
              formatPricingCurrency(item.value),
            ])}
            emptyLabel="Chưa có báo giá."
          />
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.orderSnapshot}>
          <DataTable
            headers={["Trạng thái", "Số lượng", "Giá trị"]}
            rows={payload.orderByStatus.map((item) => [
              item.label,
              item.count,
              formatPricingCurrency(item.value),
            ])}
            emptyLabel="Chưa có đơn hàng."
          />
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.followUpAlerts}>
          <div className="revenue-workspace__grid">
            <div>
              <h4 className="revenue-workspace__subhead">Follow-up</h4>
              <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
                <li>Quá hạn: <strong>{payload.followUp.overdue}</strong></li>
                <li>Hôm nay: <strong>{payload.followUp.today}</strong></li>
                <li>Quote sắp hết hạn: <strong>{payload.followUp.quoteExpiring}</strong></li>
                <li>Quote chưa phản hồi: <strong>{payload.followUp.noResponse}</strong></li>
                <li>Lead cần follow-up: <strong>{payload.followUp.leadFollowUp}</strong></li>
              </ul>
              <Link href="/admin/sales/follow-up" className="admin-link">
                Mở Follow-up Center
              </Link>
            </div>
            <div>
              <h4 className="revenue-workspace__subhead">Top cảnh báo</h4>
              {payload.alerts.length === 0 ? (
                <p className="admin-field-hint">Không có cảnh báo cần xử lý.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
                  {payload.alerts.map((alert) => (
                    <li key={alert.id} style={{ display: "grid", gap: 8 }}>
                      <span
                        className={
                          NOTIFICATION_SEVERITY_BADGE_CLASS[
                            alert.severity as NotificationSeverity
                          ] ?? "admin-status-badge"
                        }
                      >
                        {NOTIFICATION_SEVERITY_LABELS[alert.severity as NotificationSeverity] ??
                          alert.severity}
                      </span>
                      <div>
                        <p>{alert.title}</p>
                        <Link href={alert.href} className="admin-link">
                          Mở
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/notifications" className="admin-link">
                Mở Notification Center
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.topCustomers}>
          {payload.topCustomers.length === 0 ? (
            <p className="admin-field-hint">Chưa có dữ liệu khách hàng.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Giá trị</th>
                    <th>Số đơn</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payload.topCustomers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatPricingCurrency(item.value)}</td>
                      <td>{item.count}</td>
                      <td>
                        <Link href={item.href} className="admin-link">
                          Mở
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.topProducts}>
          <DataTable
            headers={["Sản phẩm", "Giá trị", "Số lượng"]}
            rows={payload.topProducts.map((item) => [
              item.label,
              formatPricingCurrency(item.value),
              item.count,
            ])}
            emptyLabel="Chưa có sản phẩm trong quote tháng này."
          />
        </SectionCard>

        <SectionCard title={EXECUTIVE_SECTION_LABELS.margin}>
          <p className="admin-field-hint">
            Gross margin trung bình: <strong>{formatPricingPercent(payload.margin.average)}</strong>
          </p>
          <div className="revenue-workspace__grid">
            <div>
              <h4 className="revenue-workspace__subhead">Margin cao nhất</h4>
              <DataTable
                headers={["Hạng mục", "Margin", "Giá trị"]}
                rows={payload.margin.highest.map((item) => [
                  item.label,
                  formatPricingPercent(item.marginRate),
                  formatPricingCurrency(item.value),
                ])}
                emptyLabel="Chưa có dữ liệu margin."
              />
            </div>
            <div>
              <h4 className="revenue-workspace__subhead">Margin thấp nhất</h4>
              <DataTable
                headers={["Hạng mục", "Margin", "Giá trị"]}
                rows={payload.margin.lowest.map((item) => [
                  item.label,
                  formatPricingPercent(item.marginRate),
                  formatPricingCurrency(item.value),
                ])}
                emptyLabel="Chưa có dữ liệu margin."
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminPageShell>
  );
}
