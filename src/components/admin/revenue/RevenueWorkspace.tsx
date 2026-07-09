"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLoadingState, AdminPageShell, EmptyState, PageHeader } from "@/components/admin/AdminUi";
import type { RevenueWorkspacePayload } from "@/features/revenue/workspace/types";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/format";
import { SALES_OPPORTUNITY_PRIORITY_LABELS, SALES_OPPORTUNITY_STAGE_LABELS } from "@/features/sales/opportunities/labels";
import { getQuoteStatusLabel } from "@/features/quotes/labels";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import { getPricingStatusLabel } from "@/features/pricing/labels";

type Props = {
  opportunityId: string;
};

type WorkspaceTab = "overview" | "costing" | "quotes" | "orders" | "timeline";

const TAB_OPTIONS: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "costing", label: "Costing" },
  { key: "quotes", label: "Báo giá" },
  { key: "orders", label: "Đơn hàng" },
  { key: "timeline", label: "Timeline" },
];

function renderValue(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

function getSnapshotNumber(snapshot: unknown, key: string): number | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default function RevenueWorkspace({ opportunityId }: Props) {
  const [payload, setPayload] = useState<RevenueWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/revenue/workspace/${opportunityId}`);
      const json = (await response.json()) as RevenueWorkspacePayload & { message?: string };
      if (!response.ok) {
        throw new Error(json.message ?? "Không thể tải Revenue Workspace");
      }
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const costingSnapshot = payload?.pricingCalculation.resultSnapshot;
  const snapshotMarginRate = useMemo(
    () => getSnapshotNumber(costingSnapshot, "actualMarginRate"),
    [costingSnapshot],
  );
  const snapshotCostPerUnit = useMemo(
    () => getSnapshotNumber(costingSnapshot, "totalCostPerUnit"),
    [costingSnapshot],
  );

  if (loading) {
    return <AdminLoadingState label="Đang tải Revenue Workspace…" rows={5} />;
  }

  if (!payload) {
    return (
      <AdminPageShell>
        <EmptyState
          title="Không tìm thấy cơ hội"
          description={error ?? "Cơ hội có thể đã bị xóa hoặc bạn không có quyền truy cập."}
          action={
            <Link href="/admin/sales/pipeline" className="admin-btn admin-btn--secondary">
              Quay lại pipeline
            </Link>
          }
        />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell className="revenue-workspace">
      <PageHeader
        title={`${payload.opportunity.code} · ${payload.opportunity.title}`}
        description="Màn hình hợp nhất cơ hội, costing, báo giá, đơn hàng và timeline."
        meta={
          <div className="revenue-workspace__meta">
            <span className="admin-field-hint">
              Giai đoạn: {SALES_OPPORTUNITY_STAGE_LABELS[payload.opportunity.stage as keyof typeof SALES_OPPORTUNITY_STAGE_LABELS] ?? payload.opportunity.stage}
            </span>
            <span className="admin-field-hint">
              Ưu tiên: {SALES_OPPORTUNITY_PRIORITY_LABELS[payload.opportunity.priority as keyof typeof SALES_OPPORTUNITY_PRIORITY_LABELS] ?? payload.opportunity.priority}
            </span>
          </div>
        }
        actions={
          <>
            <Link href="/admin/sales/pipeline" className="admin-btn admin-btn--secondary">
              Quay lại Pipeline
            </Link>
            <Link href={`/admin/sales/opportunity/${payload.opportunity.id}`} className="admin-btn admin-btn--secondary">
              Mở Opportunity Workspace
            </Link>
            <Link href="/admin/sales/follow-up" className="admin-btn admin-btn--secondary">
              Follow-up Center
            </Link>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void load()}>
              Làm mới
            </button>
          </>
        }
      />

      {error ? <p className="admin-error">{error}</p> : null}

      <section className="admin-panel revenue-workspace__stats">
        <article className="revenue-workspace__stat-card">
          <p className="admin-field-hint">Pipeline value</p>
          <strong>{formatQuoteCurrency(payload.stats.estimatedValue ?? 0)}</strong>
        </article>
        <article className="revenue-workspace__stat-card">
          <p className="admin-field-hint">Quote value</p>
          <strong>{formatQuoteCurrency(payload.stats.quoteValue ?? 0)}</strong>
        </article>
        <article className="revenue-workspace__stat-card">
          <p className="admin-field-hint">Order value</p>
          <strong>{formatQuoteCurrency(payload.stats.orderValue ?? 0)}</strong>
        </article>
        <article className="revenue-workspace__stat-card">
          <p className="admin-field-hint">Probability</p>
          <strong>{payload.stats.probability}%</strong>
        </article>
        <article className="revenue-workspace__stat-card">
          <p className="admin-field-hint">Next follow-up</p>
          <strong>{payload.opportunity.nextFollowUpAt ? formatQuoteDateTime(payload.opportunity.nextFollowUpAt) : "—"}</strong>
        </article>
      </section>

      <div className="revenue-workspace__tabbar">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`admin-btn admin-btn--secondary admin-btn--small${activeTab === tab.key ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <section className="revenue-workspace__grid">
          <article className="admin-panel">
            <h3>Customer / Lead / Contact</h3>
            <dl className="revenue-workspace__facts">
              <div><dt>Customer</dt><dd>{renderValue(payload.customer.label)}</dd></div>
              <div><dt>Lead</dt><dd>{renderValue(payload.lead.label)}</dd></div>
              <div><dt>Contact</dt><dd>{renderValue(payload.contact.label)}</dd></div>
              <div><dt>Expected close</dt><dd>{payload.opportunity.expectedCloseDate ? formatQuoteDate(payload.opportunity.expectedCloseDate) : "—"}</dd></div>
              <div><dt>Assigned to</dt><dd>{renderValue(payload.opportunity.assignedTo)}</dd></div>
              <div><dt>Source</dt><dd>{renderValue(payload.opportunity.source)}</dd></div>
            </dl>
          </article>

          <article className="admin-panel">
            <h3>Current Quote</h3>
            <p>
              <strong>{renderValue(payload.currentQuote.quoteNo)}</strong>
            </p>
            <p className="admin-field-hint">
              {payload.currentQuote.status ? getQuoteStatusLabel(payload.currentQuote.status as never) : "Chưa có báo giá"}
            </p>
            <p>{formatQuoteCurrency(payload.currentQuote.totalAmount ?? 0)}</p>
            <p className="admin-field-hint">
              Valid until: {payload.currentQuote.validUntil ? formatQuoteDate(payload.currentQuote.validUntil) : "—"}
            </p>
            {payload.currentQuote.id ? (
              <Link href={`/admin/quotes/${payload.currentQuote.id}`} className="admin-link">
                Mở chi tiết báo giá
              </Link>
            ) : null}
          </article>

          <article className="admin-panel">
            <h3>Current Costing</h3>
            <p>
              <strong>{renderValue(payload.pricingCalculation.code)}</strong>
            </p>
            <p className="admin-field-hint">
              {payload.pricingCalculation.status
                ? getPricingStatusLabel(payload.pricingCalculation.status as never)
                : "Chưa có bản tính"}
            </p>
            <p>{formatQuoteCurrency(payload.pricingCalculation.totalAmount ?? 0)}</p>
            {payload.pricingCalculation.id ? (
              <Link href={`/admin/pricing/history/${payload.pricingCalculation.id}`} className="admin-link">
                Mở chi tiết bản tính
              </Link>
            ) : null}
          </article>

          <article className="admin-panel">
            <h3>Current Order</h3>
            <p>
              <strong>{renderValue(payload.order.orderNo)}</strong>
            </p>
            <p className="admin-field-hint">
              {payload.order.status
                ? ORDER_STATUS_LABELS[payload.order.status as keyof typeof ORDER_STATUS_LABELS] ?? payload.order.status
                : "Chưa có đơn hàng"}
            </p>
            <p>{formatQuoteCurrency(payload.order.totalAmount ?? 0)}</p>
            {payload.order.id ? (
              <Link href={`/admin/orders/${payload.order.id}`} className="admin-link">
                Mở chi tiết đơn hàng
              </Link>
            ) : null}
          </article>

          <article className="admin-panel">
            <h3>Quick links</h3>
            <div className="revenue-workspace__quick-links">
              <Link href={`/admin/sales/opportunity/${payload.opportunity.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                Opportunity workspace
              </Link>
              <Link href="/admin/sales/pipeline" className="admin-btn admin-btn--secondary admin-btn--small">
                Pipeline
              </Link>
              <Link href="/admin/sales/follow-up" className="admin-btn admin-btn--secondary admin-btn--small">
                Follow-up
              </Link>
              <Link href="/admin/pricing/costing" className="admin-btn admin-btn--secondary admin-btn--small">
                Costing calculator
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "costing" ? (
        <section className="admin-panel">
          <h3>Costing</h3>
          <div className="revenue-workspace__facts-grid">
            <div><dt>Mã bản tính</dt><dd>{renderValue(payload.pricingCalculation.code)}</dd></div>
            <div><dt>Tổng giá trị</dt><dd>{formatQuoteCurrency(payload.pricingCalculation.totalAmount ?? 0)}</dd></div>
            <div><dt>Gross margin</dt><dd>{payload.stats.grossMargin != null ? formatQuoteCurrency(payload.stats.grossMargin) : "—"}</dd></div>
            <div><dt>Margin rate</dt><dd>{snapshotMarginRate != null ? `${snapshotMarginRate}%` : "—"}</dd></div>
            <div><dt>Cost / unit</dt><dd>{snapshotCostPerUnit != null ? formatQuoteCurrency(snapshotCostPerUnit) : "—"}</dd></div>
          </div>

          <h4 className="revenue-workspace__subhead">Related calculations</h4>
          {payload.relatedPricingCalculations.length === 0 ? (
            <p className="admin-field-hint">Không có bản tính liên quan.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã bản tính</th>
                  <th>Trạng thái</th>
                  <th>Tổng</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {payload.relatedPricingCalculations.map((item) => (
                  <tr key={item.id}>
                    <td><Link href={`/admin/pricing/history/${item.id}`} className="admin-link">{item.code}</Link></td>
                    <td>{getPricingStatusLabel(item.status as never)}</td>
                    <td>{formatQuoteCurrency(item.totalAmount)}</td>
                    <td>{formatQuoteDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {activeTab === "quotes" ? (
        <section className="admin-panel">
          <h3>Báo giá</h3>
          <p>
            Hiện tại: <strong>{renderValue(payload.currentQuote.quoteNo)}</strong>
          </p>
          <p className="admin-field-hint">
            Trạng thái: {payload.currentQuote.status ? getQuoteStatusLabel(payload.currentQuote.status as never) : "—"}
          </p>
          <p>Tổng: {formatQuoteCurrency(payload.currentQuote.totalAmount ?? 0)}</p>
          <p>Valid until: {payload.currentQuote.validUntil ? formatQuoteDate(payload.currentQuote.validUntil) : "—"}</p>

          <h4 className="revenue-workspace__subhead">Related quotes</h4>
          {payload.relatedQuotes.length === 0 ? (
            <p className="admin-field-hint">Không có báo giá liên quan.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Báo giá</th>
                  <th>Trạng thái</th>
                  <th>Tổng</th>
                  <th>Hết hạn</th>
                </tr>
              </thead>
              <tbody>
                {payload.relatedQuotes.map((item) => (
                  <tr key={item.id}>
                    <td><Link href={`/admin/quotes/${item.id}`} className="admin-link">{item.quoteNo}</Link></td>
                    <td>{getQuoteStatusLabel(item.status as never)}</td>
                    <td>{formatQuoteCurrency(item.totalAmount)}</td>
                    <td>{item.validUntil ? formatQuoteDate(item.validUntil) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {activeTab === "orders" ? (
        <section className="admin-panel">
          <h3>Đơn hàng</h3>
          <p>
            Hiện tại: <strong>{renderValue(payload.order.orderNo)}</strong>
          </p>
          <p className="admin-field-hint">
            Trạng thái: {payload.order.status ? ORDER_STATUS_LABELS[payload.order.status as keyof typeof ORDER_STATUS_LABELS] ?? payload.order.status : "—"}
          </p>
          <p>Tổng: {formatQuoteCurrency(payload.order.totalAmount ?? 0)}</p>
          <p>Dự kiến giao: {payload.order.deliveryDate ? formatQuoteDate(payload.order.deliveryDate) : "—"}</p>

          <h4 className="revenue-workspace__subhead">Related orders</h4>
          {payload.relatedOrders.length === 0 ? (
            <p className="admin-field-hint">Không có đơn hàng liên quan.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đơn hàng</th>
                  <th>Trạng thái</th>
                  <th>Tổng</th>
                  <th>Dự kiến giao</th>
                </tr>
              </thead>
              <tbody>
                {payload.relatedOrders.map((item) => (
                  <tr key={item.id}>
                    <td><Link href={`/admin/orders/${item.id}`} className="admin-link">{item.orderNo}</Link></td>
                    <td>{ORDER_STATUS_LABELS[item.status as keyof typeof ORDER_STATUS_LABELS] ?? item.status}</td>
                    <td>{formatQuoteCurrency(item.totalAmount ?? 0)}</td>
                    <td>{item.deliveryDate ? formatQuoteDate(item.deliveryDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {activeTab === "timeline" ? (
        <section className="admin-panel">
          <h3>Timeline</h3>
          {payload.timeline.length === 0 ? (
            <p className="admin-field-hint">Chưa có timeline.</p>
          ) : (
            <ul className="revenue-workspace__timeline">
              {payload.timeline.map((item) => (
                <li key={item.id} className="revenue-workspace__timeline-item">
                  <div className="revenue-workspace__timeline-head">
                    <strong>{item.title}</strong>
                    <span>{formatQuoteDateTime(item.at)}</span>
                  </div>
                  <p className="admin-field-hint">{item.type}</p>
                  {item.description ? <p>{item.description}</p> : null}
                  {item.href ? (
                    <Link href={item.href} className="admin-link">
                      Mở chi tiết
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminPageShell>
  );
}
