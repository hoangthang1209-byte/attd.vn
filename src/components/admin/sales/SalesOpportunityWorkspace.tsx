"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CRMActivityType, SalesOpportunityPriority, SalesOpportunityStage } from "@prisma/client";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { CRM_ACTIVITY_TYPE_LABELS } from "@/features/crm/labels";
import { CRM_ACTIVITY_TYPES } from "@/features/crm/types";
import {
  SALES_OPPORTUNITY_PRIORITY_BADGE_CLASS,
  SALES_OPPORTUNITY_PRIORITY_LABELS,
  SALES_OPPORTUNITY_STAGE_LABELS,
  SALES_OPPORTUNITY_STAGE_ORDER,
} from "@/features/sales/opportunities/labels";
import type { SalesOpportunityWorkspaceResult } from "@/features/sales/opportunities/types";
import { getPricingStatusLabel } from "@/features/pricing/labels";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteDateTime, toDateInputValue } from "@/features/quotes/format";
import { getQuoteStatusLabel } from "@/features/quotes/labels";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";

const WORKSPACE_ACTIVITY_TYPES = CRM_ACTIVITY_TYPES.filter((type): type is CRMActivityType =>
  ["CALL", "ZALO", "EMAIL", "MEETING", "NOTE", "FOLLOW_UP"].includes(type),
);

type WorkspaceFormState = {
  title: string;
  stage: SalesOpportunityStage;
  priority: SalesOpportunityPriority;
  estimatedValue: string;
  probability: string;
  expectedCloseDate: string;
  nextFollowUpAt: string;
  assignedTo: string;
  source: string;
  note: string;
  lostReason: string;
};

type ActivityFormState = {
  type: CRMActivityType;
  title: string;
  content: string;
  nextFollowUpAt: string;
};

function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildFormState(workspace: SalesOpportunityWorkspaceResult): WorkspaceFormState {
  const { opportunity } = workspace;
  return {
    title: opportunity.title,
    stage: opportunity.stage,
    priority: opportunity.priority,
    estimatedValue: opportunity.estimatedValue != null ? String(opportunity.estimatedValue) : "",
    probability: String(opportunity.probability),
    expectedCloseDate: toDateInputValue(opportunity.expectedCloseDate),
    nextFollowUpAt: toDateTimeLocalValue(opportunity.nextFollowUpAt),
    assignedTo: opportunity.assignedTo ?? "",
    source: opportunity.source ?? "",
    note: opportunity.note ?? "",
    lostReason: opportunity.lostReason ?? "",
  };
}

const EMPTY_ACTIVITY_FORM: ActivityFormState = {
  type: "NOTE",
  title: "",
  content: "",
  nextFollowUpAt: "",
};

type Props = {
  opportunityId: string;
};

export default function SalesOpportunityWorkspace({ opportunityId }: Props) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<SalesOpportunityWorkspaceResult | null>(null);
  const [form, setForm] = useState<WorkspaceFormState | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(EMPTY_ACTIVITY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [handoverCreating, setHandoverCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/opportunities/${opportunityId}`);
      const json = await res.json() as SalesOpportunityWorkspaceResult & { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tải cơ hội");
      setWorkspace(json);
      setForm(buildFormState(json));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setWorkspace(null);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canLogActivity = Boolean(workspace?.lead?.id || workspace?.customer?.id);

  const canCreateHandover = Boolean(
    workspace?.handoverEligible && workspace.quote && !workspace.linkedOrder,
  );

  const priorityBadgeClass = useMemo(() => {
    if (!form) return "";
    return SALES_OPPORTUNITY_PRIORITY_BADGE_CLASS[form.priority];
  }, [form]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const estimatedValue = form.estimatedValue.trim()
        ? Number(form.estimatedValue.replace(/[^\d.]/g, ""))
        : null;
      const probability = Number(form.probability);
      if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
        throw new Error("Xác suất phải từ 0 đến 100");
      }

      const res = await fetch(`/api/sales/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          stage: form.stage,
          priority: form.priority,
          estimatedValue: Number.isFinite(estimatedValue!) ? estimatedValue : null,
          probability,
          expectedCloseDate: form.expectedCloseDate || null,
          nextFollowUpAt: form.nextFollowUpAt || null,
          assignedTo: form.assignedTo.trim() || null,
          source: form.source.trim() || null,
          note: form.note.trim() || null,
          lostReason: form.lostReason.trim() || null,
        }),
      });
      const json = await res.json() as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể lưu cơ hội");
      setMessage("Đã lưu thay đổi.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu cơ hội");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivitySubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!workspace || !canLogActivity) return;

    setActivitySaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: workspace.lead?.id ?? null,
          customerId: workspace.customer?.id ?? null,
          contactId: workspace.contact?.id ?? null,
          type: activityForm.type,
          title: activityForm.title.trim(),
          content: activityForm.content.trim() || null,
          nextFollowUpAt: activityForm.nextFollowUpAt || null,
        }),
      });
      const json = await res.json() as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể thêm hoạt động");
      setActivityForm(EMPTY_ACTIVITY_FORM);
      setMessage("Đã ghi nhận hoạt động.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thêm hoạt động");
    } finally {
      setActivitySaving(false);
    }
  }

  async function handleCreateHandover() {
    setHandoverCreating(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/sales/opportunities/${opportunityId}/handover`, {
        method: "POST",
      });
      const json = await res.json() as { order?: { id: string; orderNo: string }; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Không thể tạo đơn hàng nháp");
      if (json.order?.id) {
        router.push(`/admin/orders/${json.order.id}`);
        return;
      }
      setMessage(`Đã tạo đơn hàng nháp ${json.order?.orderNo ?? ""}.`.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng nháp");
    } finally {
      setHandoverCreating(false);
    }
  }

  if (loading) {
    return <AdminLoadingState label="Đang tải không gian cơ hội…" />;
  }

  if (!workspace || !form) {
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

  const {
    opportunity,
    lead,
    customer,
    contact,
    quote,
    pricingCalculation,
    linkedOrder,
    handoverEligible,
    relatedQuotes,
    relatedCalculations,
    timeline,
  } = workspace;

  return (
    <AdminPageShell>
      <PageHeader
        description={`Theo dõi và cập nhật cơ hội ${opportunity.code} trong một màn hình.`}
        meta={
          <span className={priorityBadgeClass}>
            {SALES_OPPORTUNITY_PRIORITY_LABELS[form.priority]}
          </span>
        }
        actions={
          <>
            <Link href="/admin/sales/pipeline" className="admin-btn admin-btn--secondary">
              Quay lại pipeline
            </Link>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
              Làm mới
            </button>
            <button
              type="submit"
              form="sales-opportunity-workspace-form"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      {message && <p className="admin-field-hint">{message}</p>}

      <form id="sales-opportunity-workspace-form" className="sales-opportunity-workspace" onSubmit={(e) => void handleSave(e)}>
        <section className="sales-opportunity-workspace__header admin-panel">
          <div className="sales-opportunity-workspace__header-top">
            <div>
              <p className="admin-field-hint">Mã cơ hội</p>
              <code>{opportunity.code}</code>
            </div>
            <label className="admin-field">
              <span className="admin-field__label">Giai đoạn</span>
              <select
                className="admin-input"
                value={form.stage}
                onChange={(e) => setForm((current) => current ? { ...current, stage: e.target.value as SalesOpportunityStage } : current)}
              >
                {SALES_OPPORTUNITY_STAGE_ORDER.map((stage) => (
                  <option key={stage} value={stage}>{SALES_OPPORTUNITY_STAGE_LABELS[stage]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span className="admin-field__label">Tiêu đề</span>
            <input
              className="admin-input"
              value={form.title}
              onChange={(e) => setForm((current) => current ? { ...current, title: e.target.value } : current)}
              required
            />
          </label>

          <div className="admin-form-grid">
            <label className="admin-field">
              <span className="admin-field__label">Ưu tiên</span>
              <select
                className="admin-input"
                value={form.priority}
                onChange={(e) => setForm((current) => current ? { ...current, priority: e.target.value as SalesOpportunityPriority } : current)}
              >
                {(Object.keys(SALES_OPPORTUNITY_PRIORITY_LABELS) as SalesOpportunityPriority[]).map((priority) => (
                  <option key={priority} value={priority}>{SALES_OPPORTUNITY_PRIORITY_LABELS[priority]}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Giá trị ước tính (VND)</span>
              <input
                className="admin-input"
                inputMode="numeric"
                value={form.estimatedValue}
                onChange={(e) => setForm((current) => current ? { ...current, estimatedValue: e.target.value } : current)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Xác suất (%)</span>
              <input
                className="admin-input"
                inputMode="numeric"
                value={form.probability}
                onChange={(e) => setForm((current) => current ? { ...current, probability: e.target.value } : current)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Ngày chốt dự kiến</span>
              <input
                type="date"
                className="admin-input"
                value={form.expectedCloseDate}
                onChange={(e) => setForm((current) => current ? { ...current, expectedCloseDate: e.target.value } : current)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Follow-up tiếp theo</span>
              <input
                type="datetime-local"
                className="admin-input"
                value={form.nextFollowUpAt}
                onChange={(e) => setForm((current) => current ? { ...current, nextFollowUpAt: e.target.value } : current)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Phụ trách</span>
              <input
                className="admin-input"
                value={form.assignedTo}
                onChange={(e) => setForm((current) => current ? { ...current, assignedTo: e.target.value } : current)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Nguồn</span>
              <input
                className="admin-input"
                value={form.source}
                onChange={(e) => setForm((current) => current ? { ...current, source: e.target.value } : current)}
              />
            </label>
          </div>
        </section>

        <div className="sales-opportunity-workspace__grid">
          <div className="sales-opportunity-workspace__column">
            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Khách hàng / Lead</h3>
              {lead || customer || contact ? (
                <dl className="sales-opportunity-workspace__facts">
                  {lead && (
                    <>
                      <div><dt>Lead</dt><dd>{lead.code ? `${lead.code} · ` : ""}{lead.fullName}</dd></div>
                      <div><dt>Công ty</dt><dd>{lead.companyName || lead.company || "—"}</dd></div>
                      <div><dt>Điện thoại</dt><dd>{lead.phone || "—"}</dd></div>
                      <div><dt>Email</dt><dd>{lead.email || "—"}</dd></div>
                    </>
                  )}
                  {customer && (
                    <>
                      <div><dt>Khách hàng</dt><dd>{customer.code} · {customer.name}</dd></div>
                      <div><dt>Điện thoại KH</dt><dd>{customer.phone || "—"}</dd></div>
                      <div><dt>Email KH</dt><dd>{customer.email || "—"}</dd></div>
                    </>
                  )}
                  {contact && (
                    <>
                      <div><dt>Liên hệ</dt><dd>{contact.fullName}{contact.title ? ` · ${contact.title}` : ""}</dd></div>
                      <div><dt>Điện thoại LH</dt><dd>{contact.phone || "—"}</dd></div>
                      <div><dt>Email LH</dt><dd>{contact.email || "—"}</dd></div>
                    </>
                  )}
                </dl>
              ) : (
                <p className="admin-field-hint">Chưa liên kết lead, khách hàng hoặc liên hệ.</p>
              )}
              <div className="sales-opportunity-workspace__links">
                {lead && (
                  <Link href={`/admin/crm/leads/${lead.id}`} className="admin-link">
                    Mở lead
                  </Link>
                )}
                {customer && (
                  <Link href={`/admin/crm/customers/${customer.id}`} className="admin-link">
                    Mở khách hàng
                  </Link>
                )}
              </div>
            </section>

            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Báo giá</h3>
              {quote ? (
                <div className="sales-opportunity-workspace__linked-card">
                  <p><strong>{quote.quoteNo}</strong> · {getQuoteStatusLabel(quote.status)}</p>
                  <p>{formatQuoteCurrency(quote.totalAmount)} · Hết hạn {formatQuoteDate(quote.validUntil)}</p>
                  <Link href={`/admin/quotes/${quote.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở báo giá
                  </Link>
                </div>
              ) : (
                <p className="admin-field-hint">Chưa liên kết báo giá.</p>
              )}
              {relatedQuotes.length > 0 && (
                <div className="sales-opportunity-workspace__related-list">
                  <p className="admin-field-hint">Báo giá liên quan</p>
                  <ul>
                    {relatedQuotes.map((item) => (
                      <li key={item.id}>
                        <Link href={`/admin/quotes/${item.id}`} className="admin-link">
                          {item.quoteNo}
                        </Link>
                        {" · "}
                        {getQuoteStatusLabel(item.status)}
                        {" · "}
                        {formatQuoteCurrency(item.totalAmount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Tính giá</h3>
              {pricingCalculation ? (
                <div className="sales-opportunity-workspace__linked-card">
                  <p><strong>{pricingCalculation.code}</strong> · {getPricingStatusLabel(pricingCalculation.status)}</p>
                  <p>{formatQuoteCurrency(pricingCalculation.totalAmount)}</p>
                  <Link href={`/admin/pricing/history/${pricingCalculation.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở bản tính
                  </Link>
                </div>
              ) : (
                <p className="admin-field-hint">Chưa liên kết bản tính giá.</p>
              )}
              {relatedCalculations.length > 0 && (
                <div className="sales-opportunity-workspace__related-list">
                  <p className="admin-field-hint">Bản tính liên quan</p>
                  <ul>
                    {relatedCalculations.map((item) => (
                      <li key={item.id}>
                        <Link href={`/admin/pricing/history/${item.id}`} className="admin-link">
                          {item.code}
                        </Link>
                        {" · "}
                        {getPricingStatusLabel(item.status)}
                        {" · "}
                        {formatQuoteCurrency(item.totalAmount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Bàn giao sản xuất</h3>
              {linkedOrder ? (
                <div className="sales-opportunity-workspace__linked-card">
                  <p>
                    <strong>{linkedOrder.orderNo}</strong>
                    {" · "}
                    {ORDER_STATUS_LABELS[linkedOrder.status]}
                  </p>
                  <p className="admin-field-hint">
                    Tạo lúc {formatQuoteDateTime(linkedOrder.createdAt)}
                  </p>
                  <Link
                    href={`/admin/orders/${linkedOrder.id}`}
                    className="admin-btn admin-btn--secondary admin-btn--small"
                  >
                    Mở đơn hàng
                  </Link>
                </div>
              ) : (
                <>
                  <p className="admin-field-hint">
                    {handoverEligible
                      ? quote
                        ? "Cơ hội đủ điều kiện để tạo đơn hàng nháp cho vận hành."
                        : "Cần liên kết báo giá có dòng sản phẩm trước khi bàn giao."
                      : "Chỉ tạo đơn hàng nháp khi cơ hội đã thắng hoặc báo giá đã được chấp nhận."}
                  </p>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--small"
                    disabled={!canCreateHandover || handoverCreating}
                    onClick={() => void handleCreateHandover()}
                  >
                    {handoverCreating ? "Đang tạo…" : "Tạo đơn hàng nháp"}
                  </button>
                </>
              )}
            </section>

            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Thao tác nhanh</h3>
              <div className="sales-opportunity-workspace__quick-actions">
                <Link href="/admin/pricing/calculator" className="admin-btn admin-btn--secondary admin-btn--small">
                  Mở Costing Calculator
                </Link>
                <Link href="/admin/quotes" className="admin-btn admin-btn--secondary admin-btn--small">
                  Mở danh sách báo giá
                </Link>
                <Link href="/admin/sales/pipeline" className="admin-btn admin-btn--secondary admin-btn--small">
                  Mở pipeline
                </Link>
              </div>
            </section>
          </div>

          <div className="sales-opportunity-workspace__column">
            <section className="admin-panel">
              <h3 className="sales-opportunity-workspace__section-title">Ghi chú bán hàng</h3>
              <label className="admin-field">
                <span className="admin-field__label">Ghi chú</span>
                <textarea
                  className="admin-input"
                  rows={4}
                  value={form.note}
                  onChange={(e) => setForm((current) => current ? { ...current, note: e.target.value } : current)}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Lý do thua</span>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={form.lostReason}
                  onChange={(e) => setForm((current) => current ? { ...current, lostReason: e.target.value } : current)}
                />
              </label>
            </section>
          </div>
        </div>
      </form>

      {canLogActivity && (
        <section className="admin-panel sales-opportunity-workspace__activity-panel">
          <h3 className="sales-opportunity-workspace__section-title">Ghi hoạt động nhanh</h3>
          <form className="admin-form admin-form--compact" onSubmit={(e) => void handleActivitySubmit(e)}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span className="admin-field__label">Loại</span>
                <select
                  className="admin-input"
                  value={activityForm.type}
                  onChange={(e) => setActivityForm((current) => ({ ...current, type: e.target.value as CRMActivityType }))}
                >
                  {WORKSPACE_ACTIVITY_TYPES.map((type) => (
                    <option key={type} value={type}>{CRM_ACTIVITY_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Tiêu đề</span>
                <input
                  className="admin-input"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm((current) => ({ ...current, title: e.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="admin-field">
              <span className="admin-field__label">Nội dung</span>
              <textarea
                className="admin-input"
                rows={3}
                value={activityForm.content}
                onChange={(e) => setActivityForm((current) => ({ ...current, content: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">Follow-up tiếp theo</span>
              <input
                type="datetime-local"
                className="admin-input"
                value={activityForm.nextFollowUpAt}
                onChange={(e) => setActivityForm((current) => ({ ...current, nextFollowUpAt: e.target.value }))}
              />
            </label>
            <button type="submit" className="admin-btn admin-btn--secondary" disabled={activitySaving}>
              {activitySaving ? "Đang ghi…" : "Ghi hoạt động"}
            </button>
          </form>
        </section>
      )}

      <section className="admin-panel sales-opportunity-workspace__timeline">
        <h3 className="sales-opportunity-workspace__section-title">Hoạt động gần đây</h3>
        {timeline.length === 0 ? (
          <p className="admin-field-hint">Chưa có hoạt động nào.</p>
        ) : (
          <ul className="sales-opportunity-workspace__timeline-list">
            {timeline.map((entry) => (
              <li key={entry.id} className="sales-opportunity-workspace__timeline-item">
                <div className="sales-opportunity-workspace__timeline-meta">
                  <strong>{entry.title}</strong>
                  <span>{formatQuoteDateTime(entry.createdAt)}</span>
                </div>
                <p className="admin-field-hint">
                  {entry.kind === "activity"
                    ? CRM_ACTIVITY_TYPE_LABELS[entry.type as CRMActivityType] ?? entry.type
                    : "Cơ hội bán hàng"}
                </p>
                {entry.content && <p>{entry.content}</p>}
                {entry.outcome && <p>Kết quả: {entry.outcome}</p>}
                {entry.nextFollowUpAt && (
                  <p className="admin-field-hint">Follow-up: {formatQuoteDateTime(entry.nextFollowUpAt)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPageShell>
  );
}
