"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { formatOrderDate } from "@/features/orders/order-format";
import {
  ORDER_PAYMENT_STATE_LABELS,
  ORDER_STATUS_LABELS,
  type OrderPaymentStateFilter,
} from "@/features/orders/order-labels";
import type {
  OrderListDashboardResponse,
  OrderListDashboardRow,
  OrderListKpiKey,
  OrderListQuickFilter,
} from "@/features/orders/order-list-dashboard.types";
import { SlidersHorizontal } from "lucide-react";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";

function kpiDisplayLabel(label: string, key: OrderListKpiKey): string {
  if (key === "at_risk") return "Nguy cơ trễ";
  return label;
}

function WarningDisplay({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return <span className="order-ops-muted">—</span>;
  const shown = warnings.slice(0, 2);
  const extra = warnings.length - 2;
  return (
    <div className="order-ops-warnings">
      {shown.map((w) => (
        <span key={w} className="order-ops-warning-tag">{w}</span>
      ))}
      {extra > 0 && <span className="order-ops-warning-more">+{extra}</span>}
    </div>
  );
}

function useListFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      status: (searchParams.get("status") as OrderStatus | null) ?? "",
      paymentState: (searchParams.get("paymentState") as OrderPaymentStateFilter | null) ?? "",
      quickFilter: (searchParams.get("quickFilter") as OrderListQuickFilter | null) ?? "all",
      kpi: (searchParams.get("kpi") as OrderListKpiKey | null) ?? "",
      mine: searchParams.get("mine") === "1",
      page: Number(searchParams.get("page") ?? "1") || 1,
    }),
    [searchParams],
  );

  const update = useCallback(
    (next: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged = { ...filters, ...next };
      for (const [key, value] of Object.entries(merged)) {
        if (key === "page" && (!value || value === 1)) {
          params.delete("page");
          continue;
        }
        if (!value || value === "all" || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      if (next.kpi !== undefined || next.quickFilter !== undefined) {
        if (next.kpi) {
          params.delete("quickFilter");
        }
        if (next.quickFilter && next.quickFilter !== "all") {
          params.delete("kpi");
        }
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  return { filters, update };
}

function buildQueryString(filters: ReturnType<typeof useListFilters>["filters"]) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentState) params.set("paymentState", filters.paymentState);
  if (filters.quickFilter && filters.quickFilter !== "all") {
    params.set("quickFilter", filters.quickFilter);
  }
  if (filters.kpi) params.set("kpi", filters.kpi);
  if (filters.mine) params.set("mine", "1");
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

function buildDetailHref(orderId: string, qs: string) {
  const params = new URLSearchParams();
  params.set("from", "list");
  if (qs) params.set("qs", qs);
  return `/admin/orders/${orderId}?${params.toString()}`;
}

function kpiToneClass(tone: string) {
  return `order-ops-kpi order-ops-kpi--${tone}`;
}

function progressToneClass(tone: OrderListDashboardRow["progressTone"]) {
  return `order-ops-badge order-ops-badge--${tone}`;
}

function deadlineToneClass(tone: OrderListDashboardRow["deliveryDeadlineTone"]) {
  return `order-ops-deadline order-ops-deadline--${tone}`;
}

export default function OrderListManager() {
  const { permissions } = useAdminPermissions();
  const { filters, update } = useListFilters();
  const [searchInput, setSearchInput] = useState(filters.search);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== filters.search) {
        update({ search: searchInput, page: 1 });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [filters.search, searchInput, update]);

  const queryString = buildQueryString(filters);
  const query = useAdminListQuery<OrderListDashboardResponse>(
    `orders-dashboard:${queryString}`,
    `/api/orders/dashboard?${queryString}`,
  );

  const data = query.data;
  const orders = data?.orders ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const page = data?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canViewFinancials = data?.permissions.canViewFinancials ?? permissions.canViewFinancials;
  const canCreateOrders = data?.permissions.canCreateOrders ?? permissions.canCreateOrders;
  const canViewCrm = permissions.canViewCrm;

  const activeQuick =
    filters.kpi ? null : filters.mine ? "mine" : filters.quickFilter || "all";

  if (query.loading && !query.data) {
    return <AdminPageSkeleton message="Đang tải danh sách đơn hàng…" />;
  }

  return (
    <div className="order-ops-dashboard">
      <header className="order-ops-header">
        <div>
          <h1 className="order-ops-header__title">Đơn hàng</h1>
          <p className="order-ops-header__subtitle">
            Quản lý trạng thái vận hành, thanh toán và tiến độ đơn hàng
          </p>
        </div>
        {canCreateOrders && (
          <Link href="/admin/orders/new" className="admin-btn admin-btn--primary">
            + Tạo đơn hàng
          </Link>
        )}
      </header>

      {summary && (
        <div className="order-ops-kpi-grid">
          {summary.kpis.map((kpi) => (
            <button
              key={kpi.key}
              type="button"
              className={`${kpiToneClass(kpi.tone)}${filters.kpi === kpi.key ? " is-active" : ""}`}
              onClick={() =>
                update({
                  kpi: filters.kpi === kpi.key ? "" : kpi.key,
                  quickFilter: "all",
                  mine: false,
                  page: 1,
                })
              }
            >
              <span className="order-ops-kpi__label">{kpiDisplayLabel(kpi.label, kpi.key)}</span>
              <span className="order-ops-kpi__count">{kpi.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="order-ops-controls">
        <div className="order-ops-toolbar">
          <input
            className="admin-input order-ops-toolbar__search"
            placeholder="Tìm theo mã đơn, khách hàng, sản phẩm…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            className="admin-input order-ops-toolbar__select"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value as OrderStatus | "", page: 1 })}
          >
            <option value="">Trạng thái</option>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
            ))}
          </select>
          {canViewFinancials && (
            <select
              className="admin-input order-ops-toolbar__select order-ops-toolbar__select--payment"
              value={filters.paymentState}
              onChange={(e) =>
                update({ paymentState: e.target.value as OrderPaymentStateFilter | "", page: 1 })
              }
            >
              <option value="">Thanh toán</option>
              {(Object.keys(ORDER_PAYMENT_STATE_LABELS) as OrderPaymentStateFilter[]).map((s) => (
                <option key={s} value={s}>{ORDER_PAYMENT_STATE_LABELS[s]}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={`admin-btn admin-btn--secondary admin-btn--small order-ops-toolbar__filter${advancedOpen ? " is-active" : ""}`}
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <SlidersHorizontal size={14} aria-hidden />
            <span>Bộ lọc</span>
          </button>
          {query.refreshing && (
            <span className="order-ops-toolbar__refresh">
              <AdminInlineLoader message="Đang lọc…" />
            </span>
          )}
        </div>

        {advancedOpen && (
          <p className="order-ops-controls__hint admin-field-hint">
            Dùng thẻ KPI hoặc chip nhanh để lọc theo tình trạng vận hành.
          </p>
        )}

        {summary && (
          <div className="order-ops-chips">
            {summary.quickFilters.map((chip) => {
              const isActive =
                chip.key === "mine"
                  ? filters.mine
                  : chip.key === activeQuick && !filters.kpi;
              return (
                <button
                  key={chip.key}
                  type="button"
                  className={`order-ops-chip${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    if (chip.key === "mine") {
                      update({ mine: !filters.mine, kpi: "", quickFilter: "all", page: 1 });
                      return;
                    }
                    update({
                      quickFilter: chip.key,
                      kpi: "",
                      mine: false,
                      page: 1,
                    });
                  }}
                >
                  {chip.label}
                  {chip.count != null && (
                    <span className="order-ops-chip__count">{chip.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {query.error && (
        <AdminErrorRecovery
          message="Không thể tải danh sách đơn hàng. Vui lòng thử lại."
          onRetry={() => void query.reload()}
        />
      )}

      {!query.error && orders.length === 0 && !query.loading && (
        <div className="order-ops-empty">
          <p>
            {filters.search || filters.status || filters.kpi || filters.quickFilter !== "all" || filters.mine
              ? "Không tìm thấy đơn hàng phù hợp."
              : "Chưa có đơn hàng."}
          </p>
        </div>
      )}

      {orders.length > 0 && (
        <>
          <div className="order-ops-table-wrap">
            {query.refreshing && <div className="order-ops-table-overlay"><AdminInlineLoader message="Đang tìm kiếm…" /></div>}
            <table className="admin-table order-ops-table">
              <thead>
                <tr>
                  <th>Mã đơn hàng</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm / Số lượng</th>
                  <th>Deadline giao</th>
                  <th>Tiến độ</th>
                  <th>Người phụ trách</th>
                  <th>Giao hàng</th>
                  <th>Cảnh báo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={buildDetailHref(row.id, queryString)} className="order-ops-order-link">
                        {row.orderNo}
                      </Link>
                      <div className="order-ops-sub">Tạo: {formatOrderDate(row.createdAt)}</div>
                    </td>
                    <td className="order-ops-cell-customer">
                      {row.customerId && canViewCrm ? (
                        <Link href={`/admin/crm/customers/${row.customerId}`} className="order-ops-customer-link">
                          {row.customerCompanyName ?? row.contactName ?? "—"}
                        </Link>
                      ) : (
                        <span className="order-ops-customer-name">
                          {row.customerCompanyName ?? row.contactName ?? "—"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="order-ops-products">
                        {row.productThumbnails.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="order-ops-product-thumb" />
                        ))}
                        <div>
                          <div className="order-ops-product-count">{row.productCount} sản phẩm</div>
                          <div className="order-ops-product-qty">
                            {row.totalQuantity.toLocaleString("vi-VN")}
                            {row.quantityUnit ? ` ${row.quantityUnit}` : " cái"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="order-ops-deadline-date">
                        {row.deliveryExpectedAt ? formatOrderDate(row.deliveryExpectedAt) : "—"}
                      </div>
                      <div className={deadlineToneClass(row.deliveryDeadlineTone)}>
                        {row.deliveryDeadlineRelative}
                      </div>
                    </td>
                    <td>
                      {row.progressPercent != null && (
                        <div className="order-ops-progress" title={`${row.progressPercent}%`}>
                          <div
                            className="order-ops-progress__bar"
                            style={{ width: `${row.progressPercent}%` }}
                          />
                        </div>
                      )}
                      <span className={`${progressToneClass(row.progressTone)} order-ops-progress-badge`}>
                        {row.progressLabel}
                      </span>
                    </td>
                    <td>
                      <div className="order-ops-owner-name">{row.ownerName ?? "—"}</div>
                      {row.ownerRole && <div className="order-ops-sub">{row.ownerRole}</div>}
                    </td>
                    <td>
                      <div className="order-ops-delivery-method">{row.deliveryMethodLabel ?? "—"}</div>
                      <div className="order-ops-sub">{row.deliveryStateLabel}</div>
                    </td>
                    <td>
                      <WarningDisplay warnings={row.warnings} />
                    </td>
                    <td className="order-ops-cell-action">
                      <Link
                        href={buildDetailHref(row.id, queryString)}
                        className="order-ops-row-link"
                      >
                        Mở
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className={`order-ops-pagination${totalPages <= 1 ? " order-ops-pagination--single" : ""}`}>
            <span className="order-ops-pagination__meta">
              Trang {page}/{totalPages} · {total.toLocaleString("vi-VN")} đơn
            </span>
            {totalPages > 1 && (
              <div className="order-ops-pagination__actions">
                <AdminLoadingButton
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={page <= 1 || query.refreshing}
                  pending={query.refreshing}
                  onClick={() => update({ page: page - 1 })}
                >
                  Trước
                </AdminLoadingButton>
                <AdminLoadingButton
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={page >= totalPages || query.refreshing}
                  pending={query.refreshing}
                  onClick={() => update({ page: page + 1 })}
                >
                  Sau
                </AdminLoadingButton>
              </div>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
