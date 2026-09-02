"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import {
  formatPricingCurrency,
  formatPricingPercent,
} from "@/features/pricing/format";
import type {
  CostingBatchDetail,
  CostingBatchRowView,
} from "@/features/pricing/services/costing-batch.service";

type CustomerOption = { id: string; name: string; code: string };

function groupRows(rows: CostingBatchRowView[]) {
  const groups = new Map<string, CostingBatchRowView[]>();
  for (const row of rows) {
    const key = row.groupLabel?.trim() || "";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "vi"));
}

export default function CostingBatchWorkspace({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [batch, setBatch] = useState<CostingBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [cloneLabel, setCloneLabel] = useState("");
  const [cloneTargets, setCloneTargets] = useState("");
  const [sellEdits, setSellEdits] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch(`/api/pricing/costing-batches/${batchId}`)
      .then(async (res) => {
        const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải batch");
        setBatch(data.batch ?? null);
        if (data.batch) {
          const nextSell: Record<string, string> = {};
          for (const row of data.batch.rows) {
            if (row.sellingPricePerUnit != null) {
              nextSell[row.itemId] = String(row.sellingPricePerUnit);
            }
          }
          setSellEdits(nextSell);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => {
    void load();
    void fetch("/api/crm/customers?limit=200")
      .then((r) => r.json())
      .then((data: { customers?: CustomerOption[] }) => setCustomers(data.customers ?? []));
  }, [load]);

  const grouped = useMemo(() => (batch ? groupRows(batch.rows) : []), [batch]);

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

  async function addRow() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể thêm dòng");
      setBatch(data.batch ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thêm dòng");
    } finally {
      setBusy(false);
    }
  }

  async function saveSellingPrice(itemId: string) {
    const raw = sellEdits[itemId]?.trim();
    if (!raw) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sellingPrice", sellingPricePerUnit: Number(raw) }),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật giá bán");
      setBatch(data.batch ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật giá bán");
    } finally {
      setBusy(false);
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

  async function createQuote() {
    setBusy(true);
    setError(null);
    try {
      const itemIds = selected.size > 0 ? [...selected] : undefined;
      const res = await fetch(`/api/pricing/costing-batches/${batchId}/create-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      const data = await res.json() as { quote?: { id: string }; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo báo giá");
      if (data.quote?.id) router.push(`/admin/quotes/${data.quote.id}`);
      else await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo báo giá");
    } finally {
      setBusy(false);
    }
  }

  async function updateCustomer(customerId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/pricing/costing-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId || null }),
      });
      const data = await res.json() as { batch?: CostingBatchDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật khách hàng");
      setBatch(data.batch ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật");
    } finally {
      setBusy(false);
    }
  }

  function costingHref(row: CostingBatchRowView) {
    const params = new URLSearchParams({
      batchId,
      batchItemId: row.itemId,
    });
    if (row.calculationId) params.set("fromCalculation", row.calculationId);
    return `/admin/pricing/costing?${params.toString()}`;
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

  return (
    <div className="costing-batch-workspace">
      <div className="costing-batch-workspace__header admin-panel">
        <div className="admin-section-header">
          <div>
            <h3 className="admin-subtitle" style={{ margin: 0 }}>
              {batch.title?.trim() || batch.code}
            </h3>
            <p className="admin-field-hint">
              {batch.code} · {batch.status}
              {batch.quoteNo && (
                <> · Báo giá <Link href={`/admin/quotes`}>{batch.quoteNo}</Link></>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/pricing/costing/batch" className="admin-btn admin-btn--secondary">
              ← Danh sách batch
            </Link>
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void addRow()}>
              Thêm style
            </button>
            {!batch.quoteId && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy}
                onClick={() => void createQuote()}
              >
                Tạo báo giá ({selected.size > 0 ? selected.size : batch.rows.filter((r) => r.calculationId).length})
              </button>
            )}
          </div>
        </div>

        <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
          <div className="admin-field">
            <label className="admin-label">Khách hàng</label>
            <select
              className="admin-input"
              value={batch.customer?.id ?? ""}
              onChange={(e) => void updateCustomer(e.target.value)}
              disabled={busy}
            >
              <option value="">— Chọn khách hàng —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <span className="admin-field-hint">Tổng SL</span>
            <br /><strong>{batch.totals.totalQuantity.toLocaleString("vi-VN")}</strong>
          </div>
          <div>
            <span className="admin-field-hint">Doanh thu</span>
            <br /><strong>{formatPricingCurrency(batch.totals.totalRevenue)}</strong>
          </div>
          <div>
            <span className="admin-field-hint">Tổng cost ước tính</span>
            <br /><strong>{formatPricingCurrency(batch.totals.totalCost)}</strong>
          </div>
          <div>
            <span className="admin-field-hint">Lợi nhuận ước tính</span>
            <br /><strong>{formatPricingCurrency(batch.totals.totalProfit)}</strong>
          </div>
          <div>
            <span className="admin-field-hint">Margin TB</span>
            <br /><strong>{formatPricingPercent(batch.totals.averageMarginRate)}</strong>
          </div>
        </div>
      </div>

      {error && <p className="admin-error" style={{ marginTop: 12 }}>{error}</p>}

      <div className="admin-table-wrap costing-batch-table-wrap" style={{ marginTop: 16 }}>
        <table className="admin-table costing-batch-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  onChange={() => toggleAllCosted()}
                  checked={
                    batch.rows.filter((r) => r.calculationId).length > 0 &&
                    selected.size === batch.rows.filter((r) => r.calculationId).length
                  }
                />
              </th>
              <th>Style / SP</th>
              <th>SL</th>
              <th>Cost / SP</th>
              <th>Tổng cost</th>
              <th>Giá bán / SP</th>
              <th>Doanh thu</th>
              <th>Lợi nhuận</th>
              <th>Margin</th>
              <th>Revision</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {grouped.flatMap(([groupLabel, rows]) => {
              const header =
                groupLabel
                  ? (
                      <tr key={`group-${groupLabel}`} className="costing-batch-table__group-row">
                        <td colSpan={11}><strong>{groupLabel}</strong></td>
                      </tr>
                    )
                  : null;
              const rowNodes = rows.map((row) => (
                <tr key={row.itemId}>
                  <td>
                    {row.calculationId && (
                      <input
                        type="checkbox"
                        checked={selected.has(row.itemId)}
                        onChange={() => toggleRow(row.itemId)}
                        aria-label={`Chọn ${row.productName}`}
                      />
                    )}
                  </td>
                  <td>
                    <strong>{row.productName}</strong>
                    {row.calculationCode && (
                      <span className="admin-field-hint"> · {row.calculationCode}</span>
                    )}
                  </td>
                  <td>{row.quantity != null ? `${row.quantity} ${row.unit ?? ""}` : "—"}</td>
                  <td>{row.costPerUnit != null ? formatPricingCurrency(row.costPerUnit) : "—"}</td>
                  <td>{row.totalCost != null ? formatPricingCurrency(row.totalCost) : "—"}</td>
                  <td>
                    {row.calculationId ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          className="admin-input admin-input--xs"
                          type="number"
                          min="0"
                          value={sellEdits[row.itemId] ?? ""}
                          onChange={(e) =>
                            setSellEdits((prev) => ({ ...prev, [row.itemId]: e.target.value }))
                          }
                          style={{ width: 110 }}
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--secondary"
                          disabled={busy}
                          onClick={() => void saveSellingPrice(row.itemId)}
                        >
                          Lưu
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.revenue != null ? formatPricingCurrency(row.revenue) : "—"}</td>
                  <td>{row.profit != null ? formatPricingCurrency(row.profit) : "—"}</td>
                  <td>{formatPricingPercent(row.marginRate)}</td>
                  <td>
                    {row.revisionDisplay ?? "—"}
                    {row.isFinal && <span className="admin-kb-badge admin-kb-badge--verified">FINAL</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <Link href={costingHref(row)} className="admin-btn admin-btn--xs admin-btn--secondary">
                        {row.calculationId ? "Sửa costing" : "Tính giá"}
                      </Link>
                      {row.calculationId && !row.isFinal && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--secondary"
                          disabled={busy}
                          onClick={() => void finalizeRow(row.itemId)}
                        >
                          Chốt
                        </button>
                      )}
                      {row.calculationId && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--xs admin-btn--secondary"
                          disabled={busy}
                          onClick={() => {
                            setCloneSourceId(row.itemId);
                            setCloneLabel("");
                            setCloneTargets("");
                          }}
                        >
                          Nhân bản
                        </button>
                      )}
                      {row.calculationId && (
                        <Link
                          href={`/admin/pricing/history/${row.calculationId}`}
                          className="admin-btn admin-btn--xs admin-btn--secondary"
                        >
                          Chi tiết
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ));
              return header ? [header, ...rowNodes] : rowNodes;
            })}
            {batch.rows.length === 0 && (
              <tr>
                <td colSpan={11} className="admin-field-hint">Chưa có dòng. Thêm style để bắt đầu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
