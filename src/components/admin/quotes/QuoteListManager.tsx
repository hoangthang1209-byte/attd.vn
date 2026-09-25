"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import {
  AdminLoadingState,
  AdminPageShell,
  DataToolbar,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/format";
import { QUOTE_STATUS_LABELS } from "@/features/quotes/labels";
import type { QuoteListRecord } from "@/features/quotes/types";

export default function QuoteListManager() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [fetchParams, setFetchParams] = useState<{ search: string; status: QuoteStatus | "" }>({
    search: "",
    status: "",
  });

  const applyFilters = useCallback(
    (next?: { search: string; status: QuoteStatus | "" }) => {
      setLoading(true);
      setFetchParams(next ?? { search, status });
    },
    [search, status],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams();
        if (fetchParams.search.trim()) params.set("search", fetchParams.search.trim());
        if (fetchParams.status) params.set("status", fetchParams.status);
        const res = await fetch(`/api/quotes?${params}`);
        const data = (await res.json()) as { quotes?: QuoteListRecord[]; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải báo giá");
        if (!cancelled) {
          setError(null);
          setQuotes(data.quotes ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchParams]);

  function handleFiltersSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applyFilters({ search, status });
  }

  function handleStatusChange(nextStatus: QuoteStatus | "") {
    setStatus(nextStatus);
    applyFilters({ search, status: nextStatus });
  }

  return (
    <AdminPageShell>
      <PageHeader
        description="Theo dõi báo giá, thời hạn hiệu lực và giá trị giao dịch."
        meta={<span>Tổng: {quotes.length} báo giá</span>}
        actions={
          <>
            <Link href="/admin/quotes/quick" className="admin-btn admin-btn--secondary">
              Quick Quote
            </Link>
            <Link href="/admin/quotes/new" className="admin-btn admin-btn--primary">
              Tạo báo giá
            </Link>
          </>
        }
      />

      <form onSubmit={handleFiltersSubmit}>
        <DataToolbar>
          <input className="admin-input admin-data-toolbar__search" placeholder="Tìm mã, khách hàng, lead..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="admin-input" value={status} onChange={(e) => handleStatusChange(e.target.value as QuoteStatus | "")}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((s) => (
              <option key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button type="submit" className="admin-btn admin-btn--secondary">Tìm</button>
        </DataToolbar>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <AdminLoadingState label="Đang tải danh sách báo giá…" /> : quotes.length === 0 ? (
        <EmptyState
          title="Chưa có báo giá phù hợp"
          description="Hãy tạo báo giá mới hoặc điều chỉnh bộ lọc để xem thêm kết quả."
          action={<Link href="/admin/quotes/new" className="admin-btn admin-btn--primary">Tạo báo giá</Link>}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã báo giá</th>
                <th>Khách hàng</th>
                <th>Lead</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
                <th>Hiệu lực đến</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/quotes/${q.id}`)}>
                  <td><code>{q.quoteNo}</code></td>
                  <td>{q.customerLabel ?? "—"}</td>
                  <td>{q.leadLabel ?? "—"}</td>
                  <td><QuoteStatusBadge status={q.status} /></td>
                  <td>{formatQuoteCurrency(q.manualOverride && q.manualTotalAmount != null ? q.manualTotalAmount : q.totalAmount)}</td>
                  <td>{formatQuoteDate(q.validUntil)}</td>
                  <td>{formatQuoteDateTime(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
