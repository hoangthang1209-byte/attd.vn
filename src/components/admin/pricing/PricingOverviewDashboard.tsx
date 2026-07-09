"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPricingCurrency, formatPricingDateTime } from "@/features/pricing/format";
import { getPricingStatusLabel } from "@/features/pricing/labels";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import type { PricingCalculationListRecord, PricingOverviewStats } from "@/features/pricing/types";

export default function PricingOverviewDashboard() {
  const [stats, setStats] = useState<PricingOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/pricing/overview")
      .then(async (res) => {
        const data = await res.json() as PricingOverviewStats & { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải dữ liệu");
        setStats(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLoadingState label="Đang tải tổng quan giá…" />;
  if (error) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-catalog-kpi-bar">
        <div className="admin-catalog-kpi">
          <strong>{stats?.activePriceGroups ?? 0}</strong>
          <span>Nhóm giá đang hoạt động</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{stats?.productTierCount ?? 0}</strong>
          <span>Dòng bảng giá sản phẩm</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{stats?.serviceRuleCount ?? 0}</strong>
          <span>Quy tắc phí dịch vụ</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{stats?.recentCalculations.length ?? 0}</strong>
          <span>Bản tính gần đây</span>
        </div>
      </div>

      <div className="admin-section-header" style={{ marginTop: 24 }}>
        <h3 className="admin-subtitle">Truy cập nhanh</h3>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">Costing & báo giá nhanh</Link>
        <Link href="/admin/pricing/calculator" className="admin-btn admin-btn--secondary">Bộ tính giá</Link>
        <Link href="/admin/pricing/price-groups" className="admin-btn admin-btn--secondary">Nhóm giá</Link>
        <Link href="/admin/pricing/product-tiers" className="admin-btn admin-btn--secondary">Bảng giá sản phẩm</Link>
        <Link href="/admin/pricing/service-rules" className="admin-btn admin-btn--secondary">Phí dịch vụ</Link>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary">Lịch sử tính giá</Link>
      </div>

      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h3 className="admin-subtitle">Bản tính giá gần đây</h3>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary admin-btn--xs">Xem tất cả</Link>
      </div>

      {(stats?.recentCalculations.length ?? 0) === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có bản tính giá nào.</p>
          <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">Tạo costing đầu tiên</Link>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã bản tính</th>
                <th>Khách hàng / Lead</th>
                <th>Nhóm giá</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentCalculations.map((row: PricingCalculationListRecord) => (
                <tr key={row.id}>
                  <td><Link href={`/admin/pricing/history/${row.id}`}>{row.code}</Link></td>
                  <td>{row.customerLabel ?? row.leadLabel ?? "—"}</td>
                  <td>{row.priceGroupName ?? "—"}</td>
                  <td>{formatPricingCurrency(row.manualOverride && row.manualTotalAmount != null ? row.manualTotalAmount : row.totalAmount)}</td>
                  <td>{getPricingStatusLabel(row.status)}</td>
                  <td>{formatPricingDateTime(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
