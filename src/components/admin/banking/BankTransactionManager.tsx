"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import type {
  BankTransactionRecord,
  BankTransactionStatus,
} from "@/features/banking/sepay-bank-transactions";

const FILTERS: Array<{ value: "ALL" | BankTransactionStatus; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "UNMATCHED", label: "Chưa khớp" },
  { value: "NEEDS_REVIEW", label: "Cần kiểm tra" },
  { value: "MATCHED", label: "Đã đối soát" },
  { value: "IGNORED", label: "Bỏ qua" },
];

const STATUS_LABELS: Record<BankTransactionStatus, string> = {
  UNMATCHED: "Chưa khớp",
  NEEDS_REVIEW: "Cần kiểm tra",
  MATCHED: "Đã đối soát",
  IGNORED: "Bỏ qua",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status: BankTransactionStatus) {
  switch (status) {
    case "MATCHED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "NEEDS_REVIEW":
      return "bg-amber-50 text-amber-800 ring-amber-600/20";
    case "UNMATCHED":
      return "bg-slate-100 text-slate-700 ring-slate-600/20";
    default:
      return "bg-zinc-100 text-zinc-600 ring-zinc-500/20";
  }
}

export default function BankTransactionManager() {
  const { permissions, loading: permissionsLoading } = useAdminPermissions();
  const [filter, setFilter] = useState<"ALL" | BankTransactionStatus>("ALL");
  const [transactions, setTransactions] = useState<BankTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [manualOrderNo, setManualOrderNo] = useState("");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!permissions.canViewFinancials) return;
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (filter !== "ALL") params.set("status", filter);
      const response = await fetch(`/api/bank-transactions?${params.toString()}`, {
        cache: "no-store",
      });
      const body = await response.json() as {
        transactions?: BankTransactionRecord[];
        message?: string;
      };
      if (!response.ok) throw new Error(body.message ?? "Không thể tải giao dịch ngân hàng");
      setTransactions(body.transactions ?? []);
      setLastUpdatedAt(new Date());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải giao dịch ngân hàng");
    } finally {
      setLoading(false);
    }
  }, [filter, permissions.canViewFinancials]);

  useEffect(() => {
    if (permissionsLoading || !permissions.canViewFinancials) return;
    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(interval);
  }, [load, permissions.canViewFinancials, permissionsLoading]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        acc.count += 1;
        if (transaction.transferType === "in") acc.incoming += transaction.amount;
        if (transaction.matchStatus === "MATCHED") acc.matched += 1;
        if (transaction.matchStatus === "UNMATCHED" || transaction.matchStatus === "NEEDS_REVIEW") {
          acc.attention += 1;
        }
        return acc;
      },
      { count: 0, incoming: 0, matched: 0, attention: 0 },
    );
  }, [transactions]);

  async function reconcile(
    transaction: BankTransactionRecord,
    action: "MATCH" | "IGNORE",
  ) {
    setActionBusyId(transaction.id);
    setError(null);
    try {
      const response = await fetch(`/api/bank-transactions/${transaction.id}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          orderNo: action === "MATCH" ? manualOrderNo : null,
        }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Không thể đối soát giao dịch");
      setMatchingId(null);
      setManualOrderNo("");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể đối soát giao dịch");
    } finally {
      setActionBusyId(null);
    }
  }

  function openManualMatch(transaction: BankTransactionRecord) {
    setMatchingId(transaction.id);
    setManualOrderNo(transaction.matchedOrderNo ?? "");
    setError(null);
  }

  if (permissionsLoading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang kiểm tra quyền truy cập…</div>;
  }

  if (!permissions.canViewFinancials) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Bạn không có quyền xem dữ liệu tài chính.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Đối soát chuyển khoản</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Giao dịch SePay được cập nhật tự động. Hệ thống chỉ tự ghi nhận thanh toán khi tìm thấy mã đơn hàng hợp lệ và số tiền không vượt công nợ.
          </p>
          {lastUpdatedAt ? (
            <p className="mt-2 text-xs text-slate-400">Cập nhật lúc {lastUpdatedAt.toLocaleTimeString("vi-VN")}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Giao dịch đang xem" value={String(totals.count)} />
        <SummaryCard label="Tiền vào" value={`${formatMoney(totals.incoming)} đ`} />
        <SummaryCard label="Đã đối soát" value={String(totals.matched)} />
        <SummaryCard label="Cần xử lý" value={String(totals.attention)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                filter === item.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Ngân hàng</th>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3">Kết quả</th>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Đang tải giao dịch…</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Chưa có giao dịch trong bộ lọc này.</td></tr>
              ) : transactions.map((transaction) => {
                const canReconcile = permissions.canUpdateOrders
                  && transaction.transferType === "in"
                  && (transaction.matchStatus === "UNMATCHED" || transaction.matchStatus === "NEEDS_REVIEW");
                const busy = actionBusyId === transaction.id;
                return (
                  <tr key={transaction.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDateTime(transaction.transactionAt)}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{transaction.gateway}</div>
                      <div className="mt-1 text-xs text-slate-400">…{transaction.accountNumber.slice(-4)}</div>
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <div className="font-medium text-slate-800">{transaction.content || "—"}</div>
                      {transaction.referenceCode ? (
                        <div className="mt-1 text-xs text-slate-400">Ref: {transaction.referenceCode}</div>
                      ) : null}
                      {transaction.matchReason ? (
                        <div className="mt-1 text-xs text-slate-500">{transaction.matchReason}</div>
                      ) : null}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-4 text-right font-semibold ${transaction.transferType === "in" ? "text-emerald-700" : "text-slate-600"}`}>
                      {transaction.transferType === "in" ? "+" : "−"}{formatMoney(transaction.amount)} đ
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusClasses(transaction.matchStatus)}`}>
                        {STATUS_LABELS[transaction.matchStatus]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {transaction.matchedOrderId && transaction.matchedOrderNo ? (
                        <Link className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline" href={`/admin/orders/${transaction.matchedOrderId}`}>
                          {transaction.matchedOrderNo}
                        </Link>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="min-w-[250px] px-4 py-4">
                      {canReconcile ? (
                        matchingId === transaction.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={manualOrderNo}
                              onChange={(event) => setManualOrderNo(event.target.value)}
                              placeholder="DH-000523"
                              className="w-32 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              disabled={busy}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => void reconcile(transaction, "MATCH")}
                              disabled={busy || !manualOrderNo.trim()}
                              className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {busy ? "Đang khớp…" : "Khớp"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMatchingId(null);
                                setManualOrderNo("");
                              }}
                              disabled={busy}
                              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openManualMatch(transaction)}
                              disabled={busy}
                              className="rounded-md border border-indigo-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                            >
                              Khớp thủ công
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Bỏ qua giao dịch này khỏi hàng chờ đối soát?")) {
                                  void reconcile(transaction, "IGNORE");
                                }
                              }}
                              disabled={busy}
                              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {busy ? "Đang xử lý…" : "Bỏ qua"}
                            </button>
                          </div>
                        )
                      ) : transaction.matchStatus === "MATCHED" ? (
                        <span className="text-xs text-emerald-700">Đã ghi nhận Payment</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
