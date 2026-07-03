"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import ProductionPlanEditor from "@/components/admin/production-planning/ProductionPlanEditor";
import ProductionPlanTimeline from "@/components/admin/production-planning/ProductionPlanTimeline";
import { formatOrderDate } from "@/features/orders/order-format";
import type {
  ProductionPlanJobRow,
  ProductionPlanKpiKey,
  ProductionPlanListResponse,
  ProductionPlanQuickFilter,
} from "@/features/production-planning/production-plan.types";
import { PRODUCTION_PLAN_PRIORITY_LABELS } from "@/features/production-planning/production-plan-labels";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";

function priorityClass(p: string): string {
  if (p === "URGENT") return "prod-plan-priority--urgent";
  if (p === "HIGH") return "prod-plan-priority--high";
  if (p === "LOW") return "prod-plan-priority--low";
  return "";
}

function statusClass(status: string): string {
  return `prod-plan-status prod-plan-status--${status.toLowerCase()}`;
}

export default function ProductionPlanManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      kpi: (searchParams.get("kpi") as ProductionPlanKpiKey | null) ?? "",
      quickFilter: (searchParams.get("quickFilter") as ProductionPlanQuickFilter | null) ?? "all",
      mine: searchParams.get("mine") === "1",
      page: Number(searchParams.get("page") ?? "1") || 1,
    }),
    [searchParams],
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [view, setView] = useState<"table" | "timeline">("table");
  const [editorRow, setEditorRow] = useState<ProductionPlanJobRow | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => setSearchInput(filters.search), [filters.search]);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.kpi) params.set("kpi", filters.kpi);
    if (filters.quickFilter && filters.quickFilter !== "all") params.set("quickFilter", filters.quickFilter);
    if (filters.mine) params.set("mine", "1");
    if (filters.page > 1) params.set("page", String(filters.page));
    return `/api/production/plans?${params.toString()}`;
  }, [filters]);

  const query = useAdminListQuery<ProductionPlanListResponse>(apiUrl, apiUrl);

  useEffect(() => {
    if (query.data?.rows[0]) setCanEdit(query.data.rows[0].canEditPlan);
  }, [query.data]);

  const update = useCallback(
    (next: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged = { ...filters, ...next };
      for (const [key, value] of Object.entries(merged)) {
        if (key === "page" && (!value || value === 1)) params.delete("page");
        else if (!value || value === "all" || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) update({ search: searchInput, page: 1 });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.search, update]);

  const todayLabel = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (query.loading && !query.data) {
    return <AdminPageSkeleton message="Đang tải kế hoạch sản xuất…" />;
  }

  if (query.error && !query.data) {
    return (
      <AdminErrorRecovery
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  }

  const data = query.data!;
  const { rows, summary, total, page, totalPages } = data;
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);

  return (
    <div className="prod-plan-dashboard">
      <header className="prod-plan-header">
        <div>
          <h1 className="prod-plan-header__title">Kế hoạch sản xuất</h1>
          <p className="prod-plan-header__subtitle">{todayLabel}</p>
        </div>
        <div className="prod-plan-header__actions">
          <div className="prod-plan-view-toggle">
            <button
              type="button"
              className={view === "table" ? "is-active" : ""}
              onClick={() => setView("table")}
            >
              Bảng kế hoạch
            </button>
            <button
              type="button"
              className={view === "timeline" ? "is-active" : ""}
              onClick={() => setView("timeline")}
            >
              Timeline
            </button>
          </div>
        </div>
      </header>

      <div className="prod-plan-kpi-grid">
        {summary.kpis.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            className={`prod-plan-kpi prod-plan-kpi--${kpi.tone}${filters.kpi === kpi.key ? " is-active" : ""}`}
            onClick={() => update({ kpi: filters.kpi === kpi.key ? "" : kpi.key, page: 1 })}
          >
            <span className="prod-plan-kpi__label">{kpi.label}</span>
            <span className="prod-plan-kpi__count">{kpi.count}</span>
          </button>
        ))}
      </div>

      <div className="prod-plan-controls">
        <input
          className="admin-input prod-plan-controls__search"
          placeholder="Tìm mã việc, đơn hàng, sản phẩm…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {query.refreshing && <AdminInlineLoader message="Đang lọc…" />}
        <div className="prod-plan-chips">
          {summary.quickFilters.map((chip) => {
            const isActive =
              chip.key === "mine" ? filters.mine : chip.key === filters.quickFilter && !filters.kpi;
            return (
              <button
                key={chip.key}
                type="button"
                className={`prod-plan-chip${isActive ? " is-active" : ""}`}
                onClick={() => {
                  if (chip.key === "mine") {
                    update({ mine: !filters.mine, quickFilter: "all", kpi: "", page: 1 });
                    return;
                  }
                  update({ quickFilter: chip.key, kpi: "", mine: false, page: 1 });
                }}
              >
                {chip.label}
                {chip.count != null && <span className="prod-plan-chip__count">{chip.count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {view === "timeline" ? (
        <ProductionPlanTimeline
          rows={rows}
          rangeStart={rangeStart}
          rangeDays={21}
          onJobClick={(row) => setEditorRow(row)}
        />
      ) : (
        <div className="prod-plan-table-wrap">
          {query.refreshing && <div className="prod-plan-table-overlay"><AdminInlineLoader message="Đang lọc…" /></div>}
          <table className="admin-table prod-plan-table">
            <thead>
              <tr>
                <th>Mã việc</th>
                <th>Đơn hàng</th>
                <th>Sản phẩm</th>
                <th>SL</th>
                <th>Deadline giao</th>
                <th>Hạn SX</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Phụ trách</th>
                <th>Xưởng</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>TL</th>
                <th>VT</th>
                <th>QC</th>
                <th>Rủi ro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="prod-plan-empty">Không có công việc sản xuất phù hợp.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.orderItemId}>
                    <td>
                      <Link href={`/admin/production/jobs/${row.orderItemId}`} className="prod-plan-job-link">
                        {row.jobCode}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/orders/${row.orderId}`} className="prod-plan-order-link">
                        {row.orderNo}
                      </Link>
                      {row.canViewCustomer && row.customerName && (
                        <div className="prod-plan-sub">{row.customerName}</div>
                      )}
                    </td>
                    <td>
                      <div className="prod-plan-product">
                        {row.productThumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.productThumbnail} alt="" className="prod-plan-thumb" />
                        )}
                        <div>
                          <div>{row.productName}</div>
                          {row.colorSpec && <div className="prod-plan-sub">{row.colorSpec}</div>}
                          <div className="prod-plan-sub">{row.processingMethodLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td><strong>{row.quantity.toLocaleString("vi-VN")}</strong></td>
                    <td>{row.deliveryDeadline ? formatOrderDate(row.deliveryDeadline) : "—"}</td>
                    <td>{row.internalDeadline ? formatOrderDate(row.internalDeadline) : <span className="prod-plan-muted">Chưa có hạn nội bộ</span>}</td>
                    <td>{row.plannedStartAt ? formatOrderDate(row.plannedStartAt) : "—"}</td>
                    <td>{row.plannedEndAt ? formatOrderDate(row.plannedEndAt) : "—"}</td>
                    <td>{row.ownerName ?? "—"}</td>
                    <td>{row.workshopName ?? "—"}</td>
                    <td><span className={priorityClass(row.priority)}>{PRODUCTION_PLAN_PRIORITY_LABELS[row.priority]}</span></td>
                    <td><span className={statusClass(row.status)}>{row.statusLabel}</span></td>
                    <td><span className={`prod-plan-pill prod-plan-pill--${row.docStatus}`}>{row.docStatusLabel}</span></td>
                    <td><span className={`prod-plan-pill prod-plan-pill--${row.materialStatus}`}>{row.materialStatusLabel}</span></td>
                    <td><span className="prod-plan-sub">{row.qcStatusLabel}</span></td>
                    <td>
                      <div className="prod-plan-risks">
                        {row.risks.slice(0, 2).map((r) => (
                          <span key={r} className={`prod-plan-risk prod-plan-risk--${row.riskTone}`}>{r}</span>
                        ))}
                        {row.risks.length > 2 && <span className="prod-plan-risk-more">+{row.risks.length - 2}</span>}
                      </div>
                    </td>
                    <td className="prod-plan-actions">
                      <Link href={`/admin/production/jobs/${row.orderItemId}`} className="prod-plan-row-link">
                        Mở
                      </Link>
                      {row.canEditPlan && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--xs"
                          onClick={() => setEditorRow(row)}
                        >
                          {row.planId ? "Sửa KH" : "Lập KH"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <footer className={`prod-plan-pagination${totalPages <= 1 ? " prod-plan-pagination--single" : ""}`}>
        <span>Trang {page}/{totalPages} · {total.toLocaleString("vi-VN")} việc</span>
        {totalPages > 1 && (
          <div className="prod-plan-pagination__actions">
            <AdminLoadingButton
              type="button"
              variant="secondary"
              size="small"
              disabled={page <= 1 || query.refreshing}
              onClick={() => update({ page: page - 1 })}
            >
              Trước
            </AdminLoadingButton>
            <AdminLoadingButton
              type="button"
              variant="secondary"
              size="small"
              disabled={page >= totalPages || query.refreshing}
              onClick={() => update({ page: page + 1 })}
            >
              Sau
            </AdminLoadingButton>
          </div>
        )}
      </footer>

      <ProductionPlanEditor
        open={Boolean(editorRow)}
        row={editorRow}
        canEdit={canEdit}
        onClose={() => setEditorRow(null)}
        onSaved={() => void query.reload()}
      />
    </div>
  );
}
