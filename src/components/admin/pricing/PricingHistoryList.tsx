"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PricingCalculationStatus } from "@prisma/client";
import { getPricingStatusLabel, PRICING_STATUS_LABELS } from "@/features/pricing/labels";
import { formatPricingCurrency, formatPricingDateTime } from "@/features/pricing/format";
import type { PricingCalculationListRecord } from "@/features/pricing/types";

export default function PricingHistoryList() {
  const router = useRouter();
  const [rows, setRows] = useState<PricingCalculationListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PricingCalculationStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/pricing/calculations?${params}`);
      const data = await res.json() as { calculations?: PricingCalculationListRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải lịch sử");
      setRows(data.calculations ?? []);
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
        <p>Tổng: {rows.length} bản tính</p>
        <Link href="/admin/pricing/calculator" className="admin-btn admin-btn--primary">Bộ tính giá</Link>
      </div>

      <form className="admin-crm-filters" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input className="admin-input" placeholder="Tìm mã, khách hàng, lead..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value as PricingCalculationStatus | "")}>
          <option value="">Tất cả trạng thái</option>
          {(Object.keys(PRICING_STATUS_LABELS) as PricingCalculationStatus[]).map((s) => (
            <option key={s} value={s}>{getPricingStatusLabel(s)}</option>
          ))}
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">Tìm</button>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading ? <p className="admin-loading">Đang tải...</p> : rows.length === 0 ? (
        <div className="admin-empty-state"><p>Chưa có bản tính giá nào.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã bản tính</th>
                <th>Lead</th>
                <th>Khách hàng</th>
                <th>Nhóm giá</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/admin/pricing/history/${r.id}`)}>
                  <td><code>{r.code}</code></td>
                  <td>{r.leadLabel ?? "—"}</td>
                  <td>{r.customerLabel ?? "—"}</td>
                  <td>{r.priceGroupName ?? "—"}</td>
                  <td>{formatPricingCurrency(r.manualOverride && r.manualTotalAmount != null ? r.manualTotalAmount : r.totalAmount)}</td>
                  <td>{getPricingStatusLabel(r.status)}</td>
                  <td>{formatPricingDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
