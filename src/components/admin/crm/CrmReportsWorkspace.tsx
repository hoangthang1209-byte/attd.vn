"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { formatCrmCurrency } from "@/features/crm/format";
import { CRM_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "@/features/crm/labels";
import type {
  CustomerReportResponse,
  LeadSourceReportResponse,
  OverviewReportResponse,
  PipelineReportResponse,
  SalesReportResponse,
} from "@/features/crm/reporting.types";

type TabKey = "overview" | "pipeline" | "sales" | "sources" | "customers";
type ReportData = OverviewReportResponse | PipelineReportResponse | SalesReportResponse | LeadSourceReportResponse | CustomerReportResponse;

const TABS: Array<{ key: TabKey; label: string; endpoint: string }> = [
  { key: "overview", label: "Tổng quan", endpoint: "/api/crm/reports/overview" },
  { key: "pipeline", label: "Pipeline", endpoint: "/api/crm/reports/pipeline" },
  { key: "sales", label: "Hiệu suất sales", endpoint: "/api/crm/reports/sales" },
  { key: "sources", label: "Nguồn lead", endpoint: "/api/crm/reports/sources" },
  { key: "customers", label: "Khách hàng", endpoint: "/api/crm/reports/customers" },
];

const RANGE_PRESETS = [
  { value: "today", label: "Hôm nay" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_quarter", label: "Quý này" },
  { value: "custom", label: "Tùy chọn" },
] as const;

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => ({
      preset: searchParams.get("preset") ?? "30d",
      salesOwnerId: searchParams.get("salesOwnerId") ?? "",
      leadSource: searchParams.get("leadSource") ?? "",
      leadStatus: searchParams.get("leadStatus") ?? "",
      customerType: searchParams.get("customerType") ?? "",
      tab: (searchParams.get("tab") as TabKey) || "overview",
    }),
    [searchParams],
  );

  function update(next: Partial<typeof filters>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { filters, update };
}

export default function CrmReportsWorkspace() {
  const { permissions, employeeId, roleCode } = useAdminPermissions();
  const toast = useAdminToast();
  const { filters, update } = useFilters();
  const [dataByTab, setDataByTab] = useState<Partial<Record<TabKey, ReportData>>>({});
  const [exporting, setExporting] = useState<"" | "sales_csv" | "sales_xlsx" | "sources_csv" | "sources_xlsx">("");

  const activeTab = TABS.some((tab) => tab.key === filters.tab) ? filters.tab : "overview";

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("preset", filters.preset);
    if (filters.salesOwnerId) params.set("salesOwnerId", filters.salesOwnerId);
    if (filters.leadSource) params.set("leadSource", filters.leadSource);
    if (filters.leadStatus) params.set("leadStatus", filters.leadStatus);
    if (filters.customerType) params.set("customerType", filters.customerType);
    return params.toString();
  }, [filters.customerType, filters.leadSource, filters.leadStatus, filters.preset, filters.salesOwnerId]);

  const endpoint = TABS.find((tab) => tab.key === activeTab)?.endpoint ?? TABS[0].endpoint;
  const query = useAdminListQuery<ReportData>(
    `${activeTab}:${queryParams}`,
    `${endpoint}?${queryParams}`,
  );

  useEffect(() => {
    if (!query.data) return;
    setDataByTab((prev) => ({ ...prev, [activeTab]: query.data }));
  }, [activeTab, query.data]);

  async function exportReport(type: "sales" | "sources", format: "csv" | "xlsx") {
    const key = `${type}_${format}` as typeof exporting;
    setExporting(key);
    const params = new URLSearchParams();
    params.set("preset", filters.preset);
    if (filters.salesOwnerId) params.set("salesOwnerId", filters.salesOwnerId);
    if (filters.leadSource) params.set("leadSource", filters.leadSource);
    if (filters.leadStatus) params.set("leadStatus", filters.leadStatus);
    if (filters.customerType) params.set("customerType", filters.customerType);
    params.set("format", format);

    try {
      const res = await fetch(`/api/crm/reports/${type}/export?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        throw new Error(body.message ?? "Không thể xuất báo cáo.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "xlsx" ? "xlsx" : "csv";
      a.href = url;
      a.download = `crm-${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất báo cáo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xuất báo cáo.");
    } finally {
      setExporting("");
    }
  }

  if (!permissions.canViewCrm || !permissions.canViewReports) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>Bạn không có quyền truy cập báo cáo CRM.</p>
      </div>
    );
  }

  const current = dataByTab[activeTab];

  return (
    <div className="admin-panel">
      <div className="admin-crm-360-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-crm-360-tab${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => update({ tab: tab.key })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form className="admin-crm-filters" onSubmit={(event) => event.preventDefault()}>
        <select className="admin-input" value={filters.preset} onChange={(e) => update({ preset: e.target.value })}>
          {RANGE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
        <input
          className="admin-input"
          placeholder="Sales owner (employeeId)"
          value={filters.salesOwnerId}
          onChange={(e) => update({ salesOwnerId: roleCode === "SALES" ? employeeId ?? "" : e.target.value })}
          disabled={roleCode === "SALES"}
        />
        <input className="admin-input" placeholder="Nguồn lead" value={filters.leadSource} onChange={(e) => update({ leadSource: e.target.value })} />
        <select className="admin-input" value={filters.leadStatus} onChange={(e) => update({ leadStatus: e.target.value })}>
          <option value="">Tất cả trạng thái lead</option>
          {Object.entries(CRM_STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <select className="admin-input" value={filters.customerType} onChange={(e) => update({ customerType: e.target.value })}>
          <option value="">Tất cả loại khách</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>
      </form>

      {query.refreshing && <AdminInlineLoader message="Đang cập nhật báo cáo…" />}
      {query.loading && <AdminPageSkeleton />}
      {query.error && !query.loading && (
        <AdminErrorRecovery message={query.error} onRetry={() => void query.reload()} />
      )}

      {!query.loading && !query.error && current && activeTab === "overview" && (
        <div className="admin-crm-kpi-grid">
          {(current as OverviewReportResponse).kpis.map((kpi) => (
            <Link key={kpi.key} href={kpi.href} className="admin-dashboard-card admin-dashboard-card--link">
              <p className="admin-dashboard-label">{kpi.label}</p>
              <p className="admin-dashboard-value">{kpi.kind === "money" ? formatCrmCurrency(kpi.value as number) : kpi.value}</p>
            </Link>
          ))}
        </div>
      )}

      {!query.loading && !query.error && current && activeTab === "pipeline" && (
        <div className="admin-section-card">
          <h2>Pipeline theo trạng thái</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Giai đoạn</th>
                  <th>Số lượng</th>
                  <th>Follow-up quá hạn</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(current as PipelineReportResponse).byStage.map((row) => (
                  <tr key={row.status}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                    <td>{row.overdueFollowUps}</td>
                    <td>
                      <Link href={row.href} className="admin-link-button">
                        Xem lead
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!query.loading && !query.error && current && activeTab === "sales" && (
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2>Hiệu suất sales</h2>
            <div className="admin-table-actions">
              <AdminLoadingButton pending={exporting === "sales_csv"} pendingLabel="Đang xuất báo cáo…" onClick={() => void exportReport("sales", "csv")} size="small">
                Xuất CSV
              </AdminLoadingButton>
              <AdminLoadingButton pending={exporting === "sales_xlsx"} pendingLabel="Đang xuất báo cáo…" onClick={() => void exportReport("sales", "xlsx")} size="small">
                Xuất XLSX
              </AdminLoadingButton>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sales staff</th>
                  <th>Leads assigned</th>
                  <th>Leads contacted</th>
                  <th>Leads won</th>
                  <th>Leads lost</th>
                  <th>Follow-up overdue</th>
                  <th>Activities completed</th>
                  <th>Quotes created</th>
                  <th>Quotes converted</th>
                  <th>Customers created</th>
                  <th>Orders from CRM</th>
                </tr>
              </thead>
              <tbody>
                {(current as SalesReportResponse).rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.salesName}</td>
                    <td>{row.leadsAssigned}</td>
                    <td>{row.leadsContacted}</td>
                    <td>{row.leadsWon}</td>
                    <td>{row.leadsLost}</td>
                    <td>{row.followUpOverdue}</td>
                    <td>{row.activitiesCompleted}</td>
                    <td>{row.quotesCreated}</td>
                    <td>{row.quotesConvertedToOrders}</td>
                    <td>{row.customersCreated}</td>
                    <td>{row.ordersCreatedFromCrm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!query.loading && !query.error && current && activeTab === "sources" && (
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2>Hiệu quả nguồn lead</h2>
            <div className="admin-table-actions">
              <AdminLoadingButton pending={exporting === "sources_csv"} pendingLabel="Đang xuất báo cáo…" onClick={() => void exportReport("sources", "csv")} size="small">
                Xuất CSV
              </AdminLoadingButton>
              <AdminLoadingButton pending={exporting === "sources_xlsx"} pendingLabel="Đang xuất báo cáo…" onClick={() => void exportReport("sources", "xlsx")} size="small">
                Xuất XLSX
              </AdminLoadingButton>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nguồn</th>
                  <th>Lead mới</th>
                  <th>Active</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Quotes</th>
                  <th>Orders</th>
                  <th>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {(current as LeadSourceReportResponse).rows.map((row) => (
                  <tr key={row.source}>
                    <td>
                      <Link href={row.href} className="admin-link-button">
                        {row.label}
                      </Link>
                    </td>
                    <td>{row.newLeads}</td>
                    <td>{row.activeLeads}</td>
                    <td>{row.wonLeads}</td>
                    <td>{row.lostLeads}</td>
                    <td>{row.quotesCreated}</td>
                    <td>{row.ordersCreated}</td>
                    <td>{formatPercent(row.conversionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!query.loading && !query.error && current && activeTab === "customers" && (
        <div className="admin-section-card">
          <h2>Khách hàng</h2>
          <div className="admin-crm-kpi-grid">
            {(current as CustomerReportResponse).kpis.map((kpi) => (
              <Link key={kpi.key} href={kpi.href ?? "/admin/crm/customers"} className="admin-dashboard-card admin-dashboard-card--link">
                <p className="admin-dashboard-label">{kpi.label}</p>
                <p className="admin-dashboard-value">{kpi.value}</p>
              </Link>
            ))}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Số đơn</th>
                  <th>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {(current as CustomerReportResponse).topCustomers.map((row) => (
                  <tr key={row.customerId}>
                    <td>
                      <Link href={row.href} className="admin-link-button">
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.orderCount}</td>
                    <td>{formatCrmCurrency(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
