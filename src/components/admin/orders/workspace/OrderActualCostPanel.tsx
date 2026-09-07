"use client";

import { useMemo, useState } from "react";
import type { OrderActualCostCategory } from "@prisma/client";
import {
  ORDER_ACTUAL_COST_CATEGORIES,
  ORDER_ACTUAL_COST_CATEGORY_LABELS,
} from "@/features/orders/order-actual-cost-labels";
import type { OrderActualCostSummary } from "@/features/orders/order-actual-cost.types";
import { formatOrderCurrency } from "@/features/orders/order-format";
import { formatPricingPercent } from "@/features/pricing/format";

type Props = {
  orderId: string;
  currency: string;
  canEdit: boolean;
  canCloseOrReopen: boolean;
  summary: OrderActualCostSummary | null;
  onClose: () => void;
  onSummaryChange: (summary: OrderActualCostSummary) => void;
  refreshSummary: () => Promise<OrderActualCostSummary>;
};

type DraftEntry = {
  orderItemId: string | null;
  category: OrderActualCostCategory;
  label: string;
  description: string;
  amount: string;
};

const emptyDraft = (orderItemId: string | null = null): DraftEntry => ({
  orderItemId,
  category: "PRODUCTION",
  label: "",
  description: "",
  amount: "",
});

export default function OrderActualCostPanel({
  orderId,
  currency,
  canEdit,
  canCloseOrReopen,
  summary,
  onClose,
  onSummaryChange,
  refreshSummary,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const closed = summary?.status === "CLOSED";
  const sharedEntries = useMemo(
    () => summary?.entries.filter((entry) => entry.orderItemId == null) ?? [],
    [summary],
  );

  async function mutate(
    url: string,
    init: RequestInit,
  ): Promise<OrderActualCostSummary> {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Thao tác thất bại");
    return data.actualCost as OrderActualCostSummary;
  }

  async function saveDraft() {
    if (!draft) return;
    const amount = Number(String(draft.amount).replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Số tiền chi phí phải lớn hơn hoặc bằng 0.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = {
        orderItemId: draft.orderItemId,
        category: draft.category,
        label: draft.label || null,
        description: draft.description || null,
        amount,
      };
      const next = editingId
        ? await mutate(`/api/orders/${orderId}/actual-cost/entries/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await mutate(`/api/orders/${orderId}/actual-cost`, {
            method: "POST",
            body: JSON.stringify(body),
          });
      onSummaryChange(next);
      setDraft(null);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entryId: string) {
    if (!window.confirm("Xóa dòng chi phí này?")) return;
    setBusy(true);
    setError(null);
    try {
      const next = await mutate(`/api/orders/${orderId}/actual-cost/entries/${entryId}`, {
        method: "DELETE",
      });
      onSummaryChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa");
    } finally {
      setBusy(false);
    }
  }

  async function closeCost() {
    setBusy(true);
    setError(null);
    try {
      const next = await mutate(`/api/orders/${orderId}/actual-cost/close`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      onSummaryChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể chốt");
    } finally {
      setBusy(false);
    }
  }

  async function reopenCost() {
    setBusy(true);
    setError(null);
    try {
      const next = await mutate(`/api/orders/${orderId}/actual-cost/reopen`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      onSummaryChange(next);
      await refreshSummary().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể mở lại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết chi phí"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          height: "100%",
          background: "#fff",
          overflow: "auto",
          padding: 20,
          boxShadow: "-8px 0 24px rgba(15,23,42,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Chi tiết chi phí</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              {closed ? "ĐÃ CHỐT" : "CHƯA CHỐT"} · {summary?.orderNo}
            </p>
          </div>
          <button type="button" onClick={onClose} className="admin-btn">
            Đóng
          </button>
        </div>

        {error && (
          <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 0 }} role="alert">
            {error}
          </p>
        )}

        <section style={{ marginBottom: 16, fontSize: 13 }}>
          <div>Giá trị đơn hàng: <strong>{formatOrderCurrency(summary?.commercialValue ?? 0, currency)}</strong></div>
          <div>
            Chi phí dự kiến:{" "}
            <strong>
              {summary?.hasEstimatedCost
                ? formatOrderCurrency(summary.estimatedCost, currency)
                : "Chưa có"}
            </strong>
            {summary?.estimatedGrossMargin != null && (
              <> · Lãi gộp dự kiến {formatOrderCurrency(summary.estimatedGrossMargin, currency)}
                {summary.estimatedGrossMarginRate != null
                  ? ` (${formatPricingPercent(summary.estimatedGrossMarginRate)})`
                  : ""}
              </>
            )}
          </div>
          <div>
            Chi phí thực tế:{" "}
            <strong>
              {summary?.actualCostTotal == null
                ? "Chưa nhập"
                : formatOrderCurrency(summary.actualCostTotal, currency)}
            </strong>
            {summary?.actualGrossMargin != null && (
              <> · Lãi gộp thực tế {formatOrderCurrency(summary.actualGrossMargin, currency)}
                {summary.actualGrossMarginRate != null
                  ? ` (${formatPricingPercent(summary.actualGrossMarginRate)})`
                  : ""}
              </>
            )}
          </div>
          <div>
            Chênh lệch chi phí:{" "}
            <strong>
              {summary?.costVariance == null
                ? "—"
                : `${summary.costVariance > 0 ? "+" : ""}${formatOrderCurrency(summary.costVariance, currency)}`}
            </strong>
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Chi phí theo sản phẩm</h3>
          {(summary?.itemRollups ?? []).map((item) => {
            const itemEntries =
              summary?.entries.filter((entry) => entry.orderItemId === item.orderItemId) ?? [];
            return (
              <div
                key={item.orderItemId}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 600 }}>{item.productName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {item.quantity} {item.unit} · Dự kiến{" "}
                  {item.estimatedCost == null
                    ? "Chưa có"
                    : formatOrderCurrency(item.estimatedCost, currency)}{" "}
                  · Thực tế {formatOrderCurrency(item.actualAttributedCost, currency)}
                  {item.costVariance != null &&
                    ` · Chênh ${item.costVariance > 0 ? "+" : ""}${formatOrderCurrency(item.costVariance, currency)}`}
                </div>
                <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
                  {itemEntries.map((entry) => (
                    <li key={entry.id} style={{ marginBottom: 4 }}>
                      {ORDER_ACTUAL_COST_CATEGORY_LABELS[entry.category]}
                      {entry.label ? ` — ${entry.label}` : ""}:{" "}
                      {formatOrderCurrency(entry.amount, currency)}
                      {canEdit && (
                        <>
                          {" "}
                          <button
                            type="button"
                            className="order-workspace-summary-card__link"
                            disabled={busy}
                            onClick={() => {
                              setEditingId(entry.id);
                              setDraft({
                                orderItemId: entry.orderItemId,
                                category: entry.category,
                                label: entry.label ?? "",
                                description: entry.description ?? "",
                                amount: String(entry.amount),
                              });
                            }}
                          >
                            Sửa
                          </button>{" "}
                          <button
                            type="button"
                            className="order-workspace-summary-card__link"
                            disabled={busy}
                            onClick={() => void removeEntry(entry.id)}
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {canEdit && (
                  <button
                    type="button"
                    className="admin-btn"
                    disabled={busy}
                    onClick={() => {
                      setEditingId(null);
                      setDraft(emptyDraft(item.orderItemId));
                    }}
                  >
                    Thêm chi phí
                  </button>
                )}
              </div>
            );
          })}
        </section>

        <section style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Chi phí chung của đơn</h3>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0 }}>
            Không phân bổ tự động vào từng sản phẩm.
          </p>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
            {sharedEntries.map((entry) => (
              <li key={entry.id} style={{ marginBottom: 4 }}>
                {ORDER_ACTUAL_COST_CATEGORY_LABELS[entry.category]}
                {entry.label ? ` — ${entry.label}` : ""}:{" "}
                {formatOrderCurrency(entry.amount, currency)}
                {canEdit && (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="order-workspace-summary-card__link"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(entry.id);
                        setDraft({
                          orderItemId: null,
                          category: entry.category,
                          label: entry.label ?? "",
                          description: entry.description ?? "",
                          amount: String(entry.amount),
                        });
                      }}
                    >
                      Sửa
                    </button>{" "}
                    <button
                      type="button"
                      className="order-workspace-summary-card__link"
                      disabled={busy}
                      onClick={() => void removeEntry(entry.id)}
                    >
                      Xóa
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => {
                setEditingId(null);
                setDraft(emptyDraft(null));
              }}
            >
              Thêm chi phí chung
            </button>
          )}
        </section>

        {draft && canEdit && (
          <section
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              display: "grid",
              gap: 8,
            }}
          >
            <strong>{editingId ? "Sửa chi phí" : "Thêm chi phí"}</strong>
            <label style={{ fontSize: 13 }}>
              Loại
              <select
                className="admin-input"
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value as OrderActualCostCategory })
                }
              >
                {ORDER_ACTUAL_COST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {ORDER_ACTUAL_COST_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>
              Nhãn (tuỳ chọn)
              <input
                className="admin-input"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="VD: Xưởng A"
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Số tiền ({currency})
              <input
                className="admin-input"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </label>
            <label style={{ fontSize: 13 }}>
              Ghi chú
              <textarea
                className="admin-input"
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={() => void saveDraft()}>
                Lưu
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={busy}
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
              >
                Huỷ
              </button>
            </div>
          </section>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canCloseOrReopen && !closed && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              disabled={busy}
              onClick={() => void closeCost()}
            >
              Chốt chi phí
            </button>
          )}
          {canCloseOrReopen && closed && (
            <button type="button" className="admin-btn" disabled={busy} onClick={() => void reopenCost()}>
              Mở lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
