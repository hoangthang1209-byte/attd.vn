"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import { formatQuoteCurrency, formatQuoteDate } from "@/features/quotes/format";
import { QUOTE_STATUS_LABELS } from "@/features/quotes/labels";
import type { QuoteListRecord } from "@/features/quotes/types";

export default function QuoteListManager() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/quotes?${params}`);
      const data = await res.json() as { quotes?: QuoteListRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải báo giá");
      setQuotes(data.quotes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {quotes.length} báo giá</p>
        <Link href="/admin/quotes/new" className="admin-btn admin-btn--primary">Tạo báo giá</Link>
      </div>

      <form className="admin-crm-filters" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input className="admin-input" placeholder="Tìm mã, khách hàng, lead..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as QuoteStatus | "")}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((s) => (
            <option key={s} value={s}>{QUOTE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>Tìm</button>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <p className="admin-loading">Đang tải...</p> : quotes.length === 0 ? (
        <div className="admin-empty-state"><p>Chưa có báo giá nào</p><Link href="/admin/quotes/new" className="admin-btn admin-btn--primary">Tạo báo giá</Link></div>
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
                  <td>{formatQuoteDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
