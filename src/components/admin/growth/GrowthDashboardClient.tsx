"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import { InlineLoading, PageLoading } from "@/components/ui/loading/ContextLoading";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { formatCrmCurrency } from "@/features/crm/format";
import type { GrowthDashboardResponse } from "@/features/growth/growth-dashboard.types";

const RANGE_PRESETS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "this_month", label: "Tháng này" },
  { value: "this_quarter", label: "Quý này" },
] as const;

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export default function GrowthDashboardClient() {
  const { permissions } = useAdminPermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const preset = searchParams.get("preset") ?? "30d";
  const queryString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("preset")) params.set("preset", "30d");
    return params.toString();
  }, [searchParams]);

  const query = useAdminListQuery<GrowthDashboardResponse>(
    `growth-dashboard:${queryString}`,
    `/api/growth/dashboard?${queryString}`,
  );
  const data = query.data;

  function setPreset(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("preset", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!permissions.canViewDashboard) {
    return (
      <AdminErrorRecovery message="Growth Engine dashboard dành cho owner/quản trị có quyền dashboard." />
    );
  }

  if (query.loading && !data) {
    return <PageLoading title="Đang tải Growth Engine..." tone="admin" />;
  }

  if (query.error) {
    return <AdminErrorRecovery message={query.error} onRetry={() => void query.reload()} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="admin-stack admin-stack--lg">
      <div className="admin-panel admin-panel--flat">
        <p className="admin-text-muted admin-text-sm">
          Báo cáo theo cohort lead trong khoảng thời gian ({data.meta.rangeLabel}). Chỉ số doanh
          thu gắn đơn hàng phát sinh từ lead tương ứng — không hiển thị lượt xem hay vanity metrics.
        </p>
        <div className="admin-chip-row admin-chip-row--wrap admin-mt-md">
          {RANGE_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`admin-chip ${preset === item.value ? "admin-chip--active" : ""}`}
              onClick={() => setPreset(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-kpi-grid">
        {data.kpis.map((kpi) => (
          <Link key={kpi.key} href={kpi.href ?? "#"} className="admin-kpi-card admin-kpi-card--link">
            <span className="admin-kpi-label">{kpi.label}</span>
            <span className="admin-kpi-value">
              {kpi.kind === "money" ? formatCrmCurrency(kpi.value) : kpi.value.toLocaleString("vi-VN")}
            </span>
          </Link>
        ))}
      </div>

      <div className="admin-panel">
        <div className="admin-panel__header">
          <h2 className="admin-panel__title">Kênh / chiến dịch</h2>
          {query.refreshing ? <InlineLoading title="Đang cập nhật..." tone="admin" /> : null}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-table--compact">
            <thead>
              <tr>
                <th>Kênh</th>
                <th>Chiến dịch</th>
                <th className="admin-table__num">Lead</th>
                <th className="admin-table__num">Đủ ĐK</th>
                <th className="admin-table__num">Báo giá</th>
                <th className="admin-table__num">Đơn</th>
                {data.meta.canViewFinancials ? <th className="admin-table__num">Doanh thu</th> : null}
                <th className="admin-table__num">Chuyển đổi</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={data.meta.canViewFinancials ? 8 : 7} className="admin-text-muted">
                    Chưa có lead trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={`${row.channel}-${row.campaign ?? ""}`}>
                    <td>
                      <Link href={row.href} className="admin-link">
                        {row.channelLabel}
                      </Link>
                    </td>
                    <td>{row.campaignLabel}</td>
                    <td className="admin-table__num">{row.leads.toLocaleString("vi-VN")}</td>
                    <td className="admin-table__num">{row.qualifiedLeads.toLocaleString("vi-VN")}</td>
                    <td className="admin-table__num">{row.quotations.toLocaleString("vi-VN")}</td>
                    <td className="admin-table__num">{row.orders.toLocaleString("vi-VN")}</td>
                    {data.meta.canViewFinancials ? (
                      <td className="admin-table__num">
                        {row.revenue != null ? formatCrmCurrency(row.revenue) : "—"}
                      </td>
                    ) : null}
                    <td className="admin-table__num">{formatPercent(row.conversionRate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
