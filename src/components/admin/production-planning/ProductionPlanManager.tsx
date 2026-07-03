"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import ProductionPlanEditor from "@/components/admin/production-planning/ProductionPlanEditor";
import ProductionPlanPageSkeleton from "@/components/admin/production-planning/ProductionPlanPageSkeleton";
import ProductionPlanRowActions from "@/components/admin/production-planning/ProductionPlanRowActions";
import ProductionPlanTimeline from "@/components/admin/production-planning/ProductionPlanTimeline";
import {
  formatDeadlineCell,
  formatPlanningCell,
  formatQuantity,
  formatStatusSecondaries,
  statusClass,
} from "@/components/admin/production-planning/production-plan-display";
import type {
  ProductionPlanJobRow,
  ProductionPlanKpiKey,
  ProductionPlanListResponse,
  ProductionPlanQuickFilter,
} from "@/features/production-planning/production-plan.types";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";

type PrimaryKpi = {
  id: string;
  label: string;
  tone: string;
  count: (kpis: ProductionPlanListResponse["summary"]["kpis"]) => number;
  breakdown?: (kpis: ProductionPlanListResponse["summary"]["kpis"]) => string | null;
  isActive: (filters: { kpi: string; quickFilter: string }) => boolean;
  apply: () => Partial<{ kpi: ProductionPlanKpiKey | ""; quickFilter: ProductionPlanQuickFilter; page: number }>;
};

const PRIMARY_KPIS: PrimaryKpi[] = [
  {
    id: "not_planned",
    label: "Chưa lập kế hoạch",
    tone: "slate",
    count: (kpis) => kpis.find((k) => k.key === "not_planned")?.count ?? 0,
    isActive: (f) => f.kpi === "not_planned",
    apply: () => ({ kpi: "not_planned", quickFilter: "all", page: 1 }),
  },
  {
    id: "docs_materials",
    label: "Thiếu tài liệu / vật tư",
    tone: "orange",
    count: (kpis) => {
      const docs = kpis.find((k) => k.key === "missing_docs")?.count ?? 0;
      const mats = kpis.find((k) => k.key === "missing_materials")?.count ?? 0;
      return docs + mats;
    },
    breakdown: (kpis) => {
      const docs = kpis.find((k) => k.key === "missing_docs")?.count ?? 0;
      const mats = kpis.find((k) => k.key === "missing_materials")?.count ?? 0;
      return `${docs} tài liệu · ${mats} vật tư`;
    },
    isActive: (f) => f.kpi === "missing_docs" || f.kpi === "missing_materials",
    apply: () => ({ kpi: "missing_docs", quickFilter: "all", page: 1 }),
  },
  {
    id: "in_progress",
    label: "Đang sản xuất",
    tone: "blue",
    count: (kpis) => kpis.find((k) => k.key === "in_progress")?.count ?? 0,
    isActive: (f) => f.kpi === "in_progress",
    apply: () => ({ kpi: "in_progress", quickFilter: "all", page: 1 }),
  },
  {
    id: "awaiting_qc",
    label: "Chờ QC",
    tone: "purple",
    count: (kpis) => kpis.find((k) => k.key === "awaiting_qc")?.count ?? 0,
    isActive: (f) => f.kpi === "awaiting_qc",
    apply: () => ({ kpi: "awaiting_qc", quickFilter: "all", page: 1 }),
  },
  {
    id: "overdue",
    label: "Quá hạn",
    tone: "red",
    count: (kpis) => kpis.find((k) => k.key === "overdue")?.count ?? 0,
    isActive: (f) => f.kpi === "overdue",
    apply: () => ({ kpi: "overdue", quickFilter: "all", page: 1 }),
  },
];

function RiskCell({ row }: { row: ProductionPlanJobRow }) {
  const [showAll, setShowAll] = useState(false);
  if (row.risks.length === 0) {
    return <span className="prod-plan-muted">—</span>;
  }
  const visible = showAll ? row.risks : row.risks.slice(0, 2);
  const extra = row.risks.length - 2;

  return (
    <div
      className="prod-plan-risks"
      title={row.risks.join(" · ")}
      onMouseEnter={() => extra > 0 && setShowAll(true)}
      onMouseLeave={() => setShowAll(false)}
    >
      {visible.map((r) => (
        <span key={r} className={`prod-plan-risk prod-plan-risk--${row.riskTone}`}>{r}</span>
      ))}
      {!showAll && extra > 0 && (
        <span className="prod-plan-risk-more">+{extra}</span>
      )}
    </div>
  );
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
    return <ProductionPlanPageSkeleton />;
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

      <div className="prod-plan-kpi-grid prod-plan-kpi-grid--5">
        {PRIMARY_KPIS.map((kpi) => {
          const active = kpi.isActive({ kpi: filters.kpi, quickFilter: filters.quickFilter });
          const breakdown = kpi.breakdown?.(summary.kpis);
          return (
            <button
              key={kpi.id}
              type="button"
              className={`prod-plan-kpi prod-plan-kpi--${kpi.tone}${active ? " is-active" : ""}`}
              onClick={() => {
                if (active) update({ kpi: "", page: 1 });
                else update(kpi.apply());
              }}
            >
              <span className="prod-plan-kpi__label">{kpi.label}</span>
              <span className="prod-plan-kpi__count">{kpi.count(summary.kpis)}</span>
              {breakdown && <span className="prod-plan-kpi__breakdown">{breakdown}</span>}
            </button>
          );
        })}
      </div>

      <div className="prod-plan-controls">
        <div className="prod-plan-controls__top">
          <input
            className="admin-input prod-plan-controls__search"
            placeholder="Tìm mã việc, đơn hàng, sản phẩm…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {query.refreshing && (
            <span className="prod-plan-controls__refresh">
              <AdminInlineLoader message="Đang lọc…" />
            </span>
          )}
        </div>
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
          {query.refreshing && (
            <div className="prod-plan-table-overlay">
              <AdminInlineLoader message="Đang lọc…" />
            </div>
          )}
          <table className="admin-table prod-plan-table prod-plan-table--compact">
            <thead>
              <tr>
                <th className="prod-plan-col-code">Mã việc</th>
                <th className="prod-plan-col-product">Sản phẩm</th>
                <th className="prod-plan-col-qty">SL</th>
                <th className="prod-plan-col-deadline">Deadline</th>
                <th className="prod-plan-col-plan">Kế hoạch</th>
                <th className="prod-plan-col-owner">Phụ trách</th>
                <th className="prod-plan-col-status">Trạng thái</th>
                <th className="prod-plan-col-risk">Rủi ro</th>
                <th className="prod-plan-col-action" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="prod-plan-empty">Không có công việc sản xuất phù hợp.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const deadline = formatDeadlineCell(row);
                  const planning = formatPlanningCell(row);
                  const secondaries = formatStatusSecondaries(row);

                  return (
                    <tr key={row.orderItemId}>
                      <td className="prod-plan-col-code">
                        <Link
                          href={`/admin/production/jobs/${row.orderItemId}`}
                          className="prod-plan-job-link prod-plan-job-link--compact"
                          title={row.jobCode}
                        >
                          {row.jobCode}
                        </Link>
                      </td>
                      <td className="prod-plan-col-product">
                        <div className="prod-plan-product prod-plan-product--primary">
                          {row.productThumbnail && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.productThumbnail} alt="" className="prod-plan-thumb" />
                          )}
                          <div className="prod-plan-product__text">
                            <div className="prod-plan-product__name">{row.productName}</div>
                            <div className="prod-plan-sub">
                              {[row.colorSpec, row.processingMethodLabel].filter(Boolean).join(" · ")}
                            </div>
                            <div className="prod-plan-product__order">{row.orderNo}</div>
                            {row.canViewCustomer && row.customerName && (
                              <div className="prod-plan-product__customer">{row.customerName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="prod-plan-col-qty">
                        <span className="prod-plan-qty">{formatQuantity(row)}</span>
                      </td>
                      <td className="prod-plan-col-deadline">
                        <div className="prod-plan-deadline">
                          <div className="prod-plan-deadline__primary">{deadline.primary}</div>
                          {deadline.deliveryLine && (
                            <div className="prod-plan-sub">{deadline.deliveryLine}</div>
                          )}
                          {deadline.relative && (
                            <div className={`prod-plan-deadline__relative prod-plan-deadline__relative--${deadline.relativeTone}`}>
                              {deadline.relative}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="prod-plan-col-plan">
                        <div className="prod-plan-planning">
                          <div className={!row.planId ? "prod-plan-muted" : ""}>{planning.range}</div>
                          {planning.priorityBadge && (
                            <span className={`prod-plan-planning__priority ${planning.priorityClass}`}>
                              {planning.priorityBadge}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="prod-plan-col-owner">
                        <span className="prod-plan-owner">{row.ownerName ?? "—"}</span>
                      </td>
                      <td className="prod-plan-col-status">
                        <div className="prod-plan-status-cell">
                          <span className={statusClass(row.status)}>{row.statusLabel}</span>
                          {secondaries.map((s) => (
                            <span key={s} className="prod-plan-status-secondary">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="prod-plan-col-risk">
                        <RiskCell row={row} />
                      </td>
                      <td className="prod-plan-col-action">
                        <ProductionPlanRowActions row={row} onEditPlan={() => setEditorRow(row)} />
                      </td>
                    </tr>
                  );
                })
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
