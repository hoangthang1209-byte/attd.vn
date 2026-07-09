"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import { formatQuoteCurrency, formatQuoteDate } from "@/features/quotes/format";
import type { QuoteListRecord } from "@/features/quotes/types";
import { TableLoading } from "@/components/ui/loading/ContextLoading";

type Props = {
  leadId?: string;
  customerId?: string;
  createHref: string;
  title?: string;
};

export default function CrmRelatedQuotes({ leadId, customerId, createHref, title = "Báo giá liên quan" }: Props) {
  const [quotes, setQuotes] = useState<QuoteListRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (customerId) params.set("customerId", customerId);
    void fetch(`/api/quotes?${params}`)
      .then((r) => r.json())
      .then((data: { quotes?: QuoteListRecord[] }) => setQuotes(data.quotes ?? []))
      .finally(() => setLoading(false));
  }, [leadId, customerId]);

  return (
    <div className="admin-section-card">
      <div className="admin-section-header">
        <h3>{title}</h3>
        <Link href={createHref} className="admin-btn admin-btn--secondary admin-btn--xs">Tạo báo giá</Link>
      </div>
      {loading ? (
        <TableLoading title="Đang tải báo giá liên quan..." tone="admin" rows={3} />
      ) : quotes.length === 0 ? (
        <p className="admin-empty-hint">Chưa có báo giá liên quan.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Mã</th><th>Trạng thái</th><th>Tổng</th><th>Hiệu lực</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td><Link href={`/admin/quotes/${q.id}`}>{q.quoteNo}</Link></td>
                  <td><QuoteStatusBadge status={q.status} /></td>
                  <td>{formatQuoteCurrency(q.manualOverride && q.manualTotalAmount != null ? q.manualTotalAmount : q.totalAmount)}</td>
                  <td>{formatQuoteDate(q.validUntil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
