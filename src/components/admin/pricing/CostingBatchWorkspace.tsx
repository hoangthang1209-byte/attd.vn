"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import CostingBatchSpreadsheetTable from "@/components/admin/pricing/CostingBatchSpreadsheetTable";
import { minimalCustomerRecord } from "@/features/crm/customer-quick-create";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import {
  formatPricingCurrency,
  formatPricingPercent,
} from "@/features/pricing/format";
import type { CostingBatchDetail } from "@/features/pricing/services/costing-batch.service";

export default function CostingBatchWorkspace({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [batch, setBatch] = useState<CostingBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [customerEditorOpen, setCustomerEditorOpen] = useState(false);
  const pendingCustomerPickRef = useRef<CrmCustomerRecord | null>(null);
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [cloneLabel, setCloneLabel] = useState("");
  const [cloneTargets, setCloneTargets] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch(`/api/pricing/costing-batches/${batchId}`)
      .then(async (res) => {
        const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải batch");
        setBatch(data.batch ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!batch?.customer) {
      setSelectedCustomer(null);
      return;
    }
    setSelectedCustomer((prev) =>
      prev?.id === batch.customer!.id
        ? prev
        : minimalCustomerRecord(batch.customer!),
    );
  }, [batch?.customer?.id, batch?.customer?.name, batch?.customer?.code, batch?.customer]);

  function toggleRow(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleAllCosted() {
    if (!batch) return;
    const costed = batch.rows.filter((r) => r.calculationId);
    if (selected.size === costed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(costed.map((r) => r.itemId)));
    }
  }

  async function finalizeRow(itemId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể chốt giá vốn");
      setBatch(data.batch ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chốt giá vốn");
    } finally {
      setBusy(false);
    }
  }

  async function runClone() {
    if (!cloneSourceId) return;
    setBusy(true);
    setError(null);
    try {
      const targets = cloneTargets
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const body =
        targets.length > 1
          ? { action: "clone", targets: targets.map((label) => ({ label })) }
          : {
              action: "clone",
              label: cloneLabel.trim() || targets[0] || undefined,
            };

      const res = await fetch(
        `/api/pricing/costing-batches/${batchId}/items/${cloneSourceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể nhân bản");
      setBatch(data.batch ?? null);
      setCloneSourceId(null);
      setCloneLabel("");
      setCloneTargets("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể nhân bản");
    } finally {
      setBusy(false);
    }
  }

  async function createQuote(confirmAcceptedRisk = false) {
    setBusy(true);
    setError(null);
    try {
      let confirmed = confirmAcceptedRisk;
      for (;;) {
        const itemIds = selected.size > 0 ? [...selected] : undefined;
        const res = await fetch(`/api/pricing/costing-batches/${batchId}/create-quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemIds, confirmAcceptedRisk: confirmed }),
        });
        const data = await res.json() as {
          quote?: { id: string };
          message?: string;
          code?: string;
        };
        if (res.status === 409 && data.code === "ACCEPTED_QUOTE_EXISTS" && !confirmed) {
          const ok = window.confirm(
            `${data.message ?? "Batch đã có báo giá ACCEPTED kèm đơn hàng."}\n\nVẫn tạo báo giá mới?`,
          );
          if (!ok) return;
          confirmed = true;
          continue;
        }
        if (!res.ok) throw new Error(data.message ?? "Không thể tạo báo giá");
        if (data.quote?.id) router.push(`/admin/quotes/${data.quote.id}`);
        else await load();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo báo giá");
    } finally {
      setBusy(false);
    }
  }

  async function updateCustomerSelection(
    customer: CrmCustomerRecord | null,
    contact: CrmContactRecord | null,
  ) {
    setSelectedCustomer(customer);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id ?? null,
          contactId: contact?.id ?? null,
        }),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật khách hàng");
      setBatch(data.batch ?? null);
      setCustomerEditorOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải batch costing…" />;
  if (error && !batch) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error}</p>
        <Link href="/admin/pricing/costing/batch" className="admin-btn">Quay lại</Link>
      </div>
    );
  }
  if (!batch) return null;

  const current = batch;
  const styleCount = current.rows.filter((r) => !r.isIncomplete).length;
  const quoteCount =
    selected.size > 0 ? selected.size : current.rows.filter((r) => r.calculationId).length;
  const hasCost = current.totals.hasCostTotals;
  const quoteHistory = current.quotes;

  function renderQuoteAction() {
    if (!current.quoteId) {
      return (
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--xs"
          disabled={busy || quoteCount === 0}
          onClick={() => void createQuote()}
        >
          Tạo báo giá ({quoteCount})
        </button>
      );
    }

    if (!current.changedSinceQuote) {
      return (
        <div className="costing-batch-quote-actions">
          <Link
            href={`/admin/quotes/${current.quoteId}`}
            className="admin-btn admin-btn--secondary admin-btn--xs"
          >
            Xem {current.quoteNo ?? "báo giá"}
          </Link>
          <span className="admin-field-hint">Không có thay đổi mới</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        className="admin-btn admin-btn--primary admin-btn--xs"
        disabled={busy || quoteCount === 0}
        onClick={() => void createQuote()}
      >
        Tạo báo giá mới ({quoteCount})
      </button>
    );
  }

  return (
    <div className="costing-batch-workspace">
      <header className="costing-batch-ops-header">
        <div className="costing-batch-ops-header__top">
          <div className="costing-batch-ops-header__identity">
            <Link href="/admin/pricing/costing/batch" className="costing-batch-ops-header__back">
              ← Batch
            </Link>
            <span className="costing-batch-ops-header__code">{current.code}</span>
            {current.title?.trim() && (
              <span className="costing-batch-ops-header__title">{current.title.trim()}</span>
            )}
            <span className="costing-batch-ops-header__status">{current.status}</span>
          </div>
        </div>

        {current.quoteId ? (
          <div className="costing-batch-quote-lifecycle">
            <span>
              Báo giá gần nhất:{" "}
              <Link href={`/admin/quotes/${current.quoteId}`} className="admin-link">
                {current.quoteNo ?? "—"}
              </Link>
              {" · "}
              {current.changedSinceQuote ? (
                <span className="costing-batch-quote-lifecycle__dirty">
                  ● Có thay đổi sau báo giá
                </span>
              ) : (
                <span className="costing-batch-quote-lifecycle__clean">
                  Không có thay đổi
                </span>
              )}
            </span>
            {quoteHistory.length > 0 ? (
              <details className="costing-batch-quote-history">
                <summary>Lịch sử báo giá ({quoteHistory.length})</summary>
                <ul>
                  {quoteHistory.map((q) => (
                    <li key={q.id}>
                      <Link href={`/admin/quotes/${q.id}`} className="admin-link">
                        {q.quoteNo}
                      </Link>
                      {q.isLatest ? " · mới nhất" : ""}
                      {q.status === "ACCEPTED" ? " · ACCEPTED" : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}

        <div className="costing-batch-ops-header__customer">
          {customerEditorOpen ? (
            <div className="costing-batch-ops-header__customer-editor">
              <CustomerSearchField
                value={selectedCustomer}
                onSelect={(customer) => {
                  if (!customer) {
                    pendingCustomerPickRef.current = null;
                    void updateCustomerSelection(null, null);
                    return;
                  }
                  pendingCustomerPickRef.current = customer;
                  setSelectedCustomer(customer);
                }}
                onContactSelect={(contact) => {
                  const customer = pendingCustomerPickRef.current;
                  if (!customer) return;
                  pendingCustomerPickRef.current = null;
                  void updateCustomerSelection(customer, contact);
                }}
                disabled={busy}
                label="Khách hàng"
                hideHint
                allowQuickCreate
                quickCreateContextLabel="batch costing này"
              />
              <button
                type="button"
                className="admin-btn admin-btn--xs admin-btn--secondary"
                onClick={() => setCustomerEditorOpen(false)}
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              <span className="costing-batch-ops-header__customer-line">
                {batch.customer ? (
                  <>
                    {batch.customer.name}
                    <span className="admin-field-hint"> · {batch.customer.code}</span>
                    {batch.contact && (
                      <span className="admin-field-hint"> · {batch.contact.fullName}</span>
                    )}
                  </>
                ) : (
                  <span className="admin-field-hint">Chưa chọn khách hàng</span>
                )}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn--xs admin-btn--secondary"
                disabled={busy}
                onClick={() => setCustomerEditorOpen(true)}
              >
                Đổi khách hàng
              </button>
            </>
          )}
        </div>

        <div className="costing-batch-kpi-strip" aria-label="Tổng hợp batch">
          <span>
            <em>{styleCount}</em> style
          </span>
          <span>
            <em>{batch.totals.totalQuantity.toLocaleString("vi-VN")}</em> SL
          </span>
          <span>
            Doanh thu <em>{formatPricingCurrency(batch.totals.totalRevenue)}</em>
          </span>
          <span>
            Cost{" "}
            <em>{hasCost ? formatPricingCurrency(batch.totals.totalCost) : "—"}</em>
          </span>
          <span>
            LN{" "}
            <em>{hasCost ? formatPricingCurrency(batch.totals.totalProfit) : "—"}</em>
          </span>
          <span>
            Margin{" "}
            <em>{hasCost ? formatPricingPercent(batch.totals.averageMarginRate) : "—"}</em>
          </span>
        </div>
      </header>

      {error && <p className="admin-error costing-batch-workspace__error">{error}</p>}

      <CostingBatchSpreadsheetTable
        batchId={batchId}
        batch={batch}
        selected={selected}
        onBatchUpdate={setBatch}
        onError={setError}
        onToggleRow={toggleRow}
        onToggleAllCosted={toggleAllCosted}
        onCloneStart={(itemId) => {
          setCloneSourceId(itemId);
          setCloneLabel("");
          setCloneTargets("");
        }}
        onFinalizeRow={(itemId) => void finalizeRow(itemId)}
        quoteAction={renderQuoteAction()}
      />

      {cloneSourceId && (
        <div className="costing-picker-backdrop" role="presentation" onClick={() => setCloneSourceId(null)}>
          <div
            className="costing-picker costing-picker--form"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="costing-picker__title">Nhân bản costing</h3>
            <p className="admin-field-hint">Một style đích hoặc nhiều dòng (mỗi dòng một tên style).</p>
            <div className="admin-field" style={{ marginTop: 12 }}>
              <label className="admin-label">Tên style đích (đơn)</label>
              <input className="admin-input" value={cloneLabel} onChange={(e) => setCloneLabel(e.target.value)} />
            </div>
            <div className="admin-field" style={{ marginTop: 12 }}>
              <label className="admin-label">Nhiều style (mỗi dòng)</label>
              <textarea
                className="admin-input"
                rows={4}
                placeholder="T-Shirt Charcoal&#10;T-Shirt Black"
                value={cloneTargets}
                onChange={(e) => setCloneTargets(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={() => void runClone()}>
                Nhân bản
              </button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCloneSourceId(null)}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
