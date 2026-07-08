"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SalesOpportunityPriority, SalesOpportunityStage } from "@prisma/client";
import {
  AdminLoadingState,
  AdminPageShell,
  DataToolbar,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { formatQuoteCurrency, formatQuoteDate } from "@/features/quotes/format";
import {
  SALES_OPPORTUNITY_PRIORITY_BADGE_CLASS,
  SALES_OPPORTUNITY_PRIORITY_LABELS,
  SALES_OPPORTUNITY_STAGE_LABELS,
  SALES_OPPORTUNITY_STAGE_ORDER,
} from "@/features/sales/opportunities/labels";
import type {
  SalesOpportunityListRecord,
  SalesOpportunityPipelineResult,
} from "@/features/sales/opportunities/types";

type LeadOption = { id: string; label: string };
type CustomerOption = { id: string; label: string };
type QuoteOption = { id: string; label: string };

const EMPTY_FORM = {
  title: "",
  leadId: "",
  customerId: "",
  quoteId: "",
  estimatedValue: "",
  expectedCloseDate: "",
  nextFollowUpAt: "",
  priority: "NORMAL" as SalesOpportunityPriority,
  source: "",
  note: "",
};

export default function SalesOpportunityPipeline() {
  const [data, setData] = useState<SalesOpportunityPipelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([]);
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/sales/opportunities?${params}`);
      const json = await res.json() as SalesOpportunityPipelineResult & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tải pipeline");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadCreateOptions = useCallback(async () => {
    try {
      const [leadsRes, customersRes, quotesRes] = await Promise.all([
        fetch("/api/crm/leads?limit=50"),
        fetch("/api/crm/customers?limit=50"),
        fetch("/api/quotes?limit=50"),
      ]);

      const leadsJson = await leadsRes.json() as {
        leads?: Array<{ id: string; code?: string | null; fullName: string; companyName?: string | null }>;
      };
      const customersJson = await customersRes.json() as {
        customers?: Array<{ id: string; code: string; name: string }>;
      };
      const quotesJson = await quotesRes.json() as {
        quotes?: Array<{ id: string; quoteNo: string; customerLabel?: string | null }>;
      };

      setLeadOptions(
        (leadsJson.leads ?? []).map((lead) => ({
          id: lead.id,
          label: `${lead.code ?? "—"} · ${lead.companyName || lead.fullName}`,
        })),
      );
      setCustomerOptions(
        (customersJson.customers ?? []).map((customer) => ({
          id: customer.id,
          label: `${customer.code} · ${customer.name}`,
        })),
      );
      setQuoteOptions(
        (quotesJson.quotes ?? []).map((quote) => ({
          id: quote.id,
          label: `${quote.quoteNo}${quote.customerLabel ? ` · ${quote.customerLabel}` : ""}`,
        })),
      );
    } catch {
      // Non-blocking for MVP create form.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showCreate) void loadCreateOptions();
  }, [showCreate, loadCreateOptions]);

  const stats = data?.stats;

  const grouped = useMemo(() => {
    if (!data) {
      return SALES_OPPORTUNITY_STAGE_ORDER.reduce(
        (acc, stage) => {
          acc[stage] = [];
          return acc;
        },
        {} as Record<SalesOpportunityStage, SalesOpportunityListRecord[]>,
      );
    }
    return data.groupedByStage;
  }, [data]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề cơ hội");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          leadId: form.leadId || null,
          customerId: form.customerId || null,
          quoteId: form.quoteId || null,
          estimatedValue: form.estimatedValue ? Number(form.estimatedValue.replace(/[^\d.]/g, "")) : null,
          expectedCloseDate: form.expectedCloseDate || null,
          nextFollowUpAt: form.nextFollowUpAt || null,
          priority: form.priority,
          source: form.source || null,
          note: form.note || null,
        }),
      });
      const json = await res.json() as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tạo cơ hội");
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo cơ hội");
    } finally {
      setCreating(false);
    }
  }

  async function handleStageChange(id: string, stage: SalesOpportunityStage) {
    setStageUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/sales/opportunities/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const json = await res.json() as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể cập nhật giai đoạn");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật giai đoạn");
    } finally {
      setStageUpdatingId(null);
    }
  }

  return (
    <AdminPageShell>
      <PageHeader
        description="Theo dõi cơ hội bán hàng từ tư vấn đến chốt đơn — không thay thế CRM hiện tại."
        meta={stats ? <span>Tổng: {stats.total} cơ hội</span> : null}
        actions={
          <>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
              Làm mới
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? "Đóng form" : "Tạo cơ hội"}
            </button>
          </>
        }
      />

      {stats && (
        <div className="sales-pipeline-stats">
          <div className="sales-pipeline-stat">
            <span className="sales-pipeline-stat__label">Tổng cơ hội</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="sales-pipeline-stat">
            <span className="sales-pipeline-stat__label">Giá trị pipeline</span>
            <strong>{formatQuoteCurrency(stats.totalEstimatedValue)}</strong>
          </div>
          <div className="sales-pipeline-stat">
            <span className="sales-pipeline-stat__label">Đã báo giá</span>
            <strong>{formatQuoteCurrency(stats.quotedValue)}</strong>
          </div>
          <div className="sales-pipeline-stat">
            <span className="sales-pipeline-stat__label">Thắng</span>
            <strong>{formatQuoteCurrency(stats.wonValue)}</strong>
          </div>
          <div className="sales-pipeline-stat">
            <span className="sales-pipeline-stat__label">Follow-up quá hạn</span>
            <strong className={stats.followUpOverdueCount > 0 ? "sales-pipeline-stat__alert" : undefined}>
              {stats.followUpOverdueCount}
            </strong>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <DataToolbar>
          <input
            className="admin-input admin-data-toolbar__search"
            placeholder="Tìm mã, tiêu đề, khách hàng, báo giá…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="admin-btn admin-btn--secondary">Tìm</button>
        </DataToolbar>
      </form>

      {showCreate && (
        <form className="sales-pipeline-create admin-panel" onSubmit={(e) => void handleCreate(e)}>
          <h3 className="sales-pipeline-create__title">Tạo cơ hội mới</h3>
          <div className="sales-pipeline-create__grid">
            <label className="admin-field">
              <span className="admin-field__label">Tiêu đề *</span>
              <input
                className="admin-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Lead</span>
              <select
                className="admin-input"
                value={form.leadId}
                onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
              >
                <option value="">— Không chọn —</option>
                {leadOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Khách hàng</span>
              <select
                className="admin-input"
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
              >
                <option value="">— Không chọn —</option>
                {customerOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Báo giá</span>
              <select
                className="admin-input"
                value={form.quoteId}
                onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value }))}
              >
                <option value="">— Không chọn —</option>
                {quoteOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Giá trị ước tính (VND)</span>
              <input
                className="admin-input"
                inputMode="numeric"
                value={form.estimatedValue}
                onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Ngày chốt dự kiến</span>
              <input
                type="date"
                className="admin-input"
                value={form.expectedCloseDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedCloseDate: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Follow-up tiếp theo</span>
              <input
                type="datetime-local"
                className="admin-input"
                value={form.nextFollowUpAt}
                onChange={(e) => setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Ưu tiên</span>
              <select
                className="admin-input"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as SalesOpportunityPriority }))}
              >
                {(Object.keys(SALES_OPPORTUNITY_PRIORITY_LABELS) as SalesOpportunityPriority[]).map((p) => (
                  <option key={p} value={p}>{SALES_OPPORTUNITY_PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Nguồn</span>
              <input
                className="admin-input"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              />
            </label>
            <label className="admin-field sales-pipeline-create__note">
              <span className="admin-field__label">Ghi chú</span>
              <textarea
                className="admin-input"
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
          </div>
          <div className="sales-pipeline-create__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={creating}>
              {creating ? "Đang tạo…" : "Lưu cơ hội"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <AdminLoadingState label="Đang tải pipeline bán hàng…" />
      ) : !data || data.opportunities.length === 0 ? (
        <EmptyState
          title="Chưa có cơ hội bán hàng"
          description="Tạo cơ hội mới để theo dõi tiến trình từ tư vấn đến chốt đơn."
          action={
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowCreate(true)}>
              Tạo cơ hội
            </button>
          }
        />
      ) : (
        <div className="sales-pipeline-board">
          {SALES_OPPORTUNITY_STAGE_ORDER.map((stage) => (
            <section key={stage} className="sales-pipeline-column">
              <header className="sales-pipeline-column__header">
                <h3>{SALES_OPPORTUNITY_STAGE_LABELS[stage]}</h3>
                <span>{grouped[stage]?.length ?? 0}</span>
              </header>
              <div className="sales-pipeline-column__cards">
                {(grouped[stage] ?? []).map((opp) => (
                  <article key={opp.id} className="sales-pipeline-card">
                    <div className="sales-pipeline-card__top">
                      <code>{opp.code}</code>
                      <span className={SALES_OPPORTUNITY_PRIORITY_BADGE_CLASS[opp.priority]}>
                        {SALES_OPPORTUNITY_PRIORITY_LABELS[opp.priority]}
                      </span>
                    </div>
                    <h4 className="sales-pipeline-card__title">{opp.title}</h4>
                    <p className="sales-pipeline-card__meta">
                      {opp.customerLabel || opp.leadLabel || "—"}
                    </p>
                    <p className="sales-pipeline-card__value">
                      {opp.estimatedValue != null ? formatQuoteCurrency(opp.estimatedValue) : "—"}
                      {" · "}
                      {opp.probability}%
                    </p>
                    <p className={`sales-pipeline-card__followup${opp.isFollowUpOverdue ? " is-overdue" : ""}`}>
                      Follow-up: {opp.nextFollowUpAt ? formatQuoteDate(opp.nextFollowUpAt) : "—"}
                    </p>
                    {opp.quoteNo && (
                      <p className="sales-pipeline-card__quote">
                        <Link href={`/admin/quotes`} className="admin-link">
                          BG: {opp.quoteNo}
                        </Link>
                      </p>
                    )}
                    <label className="sales-pipeline-card__stage">
                      <span className="admin-field-hint">Giai đoạn</span>
                      <select
                        className="admin-input admin-input--compact"
                        value={opp.stage}
                        disabled={stageUpdatingId === opp.id}
                        onChange={(e) => void handleStageChange(opp.id, e.target.value as SalesOpportunityStage)}
                      >
                        {SALES_OPPORTUNITY_STAGE_ORDER.map((s) => (
                          <option key={s} value={s}>{SALES_OPPORTUNITY_STAGE_LABELS[s]}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
