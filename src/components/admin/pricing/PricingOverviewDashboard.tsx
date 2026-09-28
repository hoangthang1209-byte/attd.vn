"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPricingCurrency, formatPricingDateTime } from "@/features/pricing/format";
import { getPricingStatusLabel } from "@/features/pricing/labels";
import {
  pricingCalculationMethodBadgeClass,
  pricingCalculationMethodLabel,
} from "@/features/pricing/pricing-calculation-method";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import type { PricingOverviewStats } from "@/features/pricing/types";

export default function PricingOverviewDashboard() {
  const [stats, setStats] = useState<PricingOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    setError(null);
    void fetch("/api/pricing/overview")
      .then(async (res) => {
        const data = (await res.json()) as PricingOverviewStats & { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải dữ liệu");
        setStats(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial dashboard fetch on mount
    reload();
  }, []);

  if (loading) return <AdminLoadingState label="Đang tải tổng quan giá…" />;
  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được tổng quan giá"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => reload()}>
            Thử lại
          </button>
        }
      />
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
        <h3 className="admin-subtitle">Luồng tính giá chính</h3>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">
          Tính giá nhanh
        </Link>
        <Link href="/admin/pricing/costing/batch" className="admin-btn admin-btn--primary">
          Tính giá nhiều sản phẩm
        </Link>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--primary">
          Lịch sử tính giá
        </Link>
      </div>

      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <div>
          <h3 className="admin-subtitle">Cấu hình giá</h3>
          <p className="admin-field-hint">Thiết lập nhóm giá, bảng giá chuẩn, thư viện chi phí và phí dịch vụ.</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/pricing/price-groups" className="admin-btn admin-btn--secondary">
          Nhóm giá
        </Link>
        <Link href="/admin/pricing/product-tiers" className="admin-btn admin-btn--secondary">
          Bảng giá chuẩn
        </Link>
        <Link href="/admin/pricing/cost-library" className="admin-btn admin-btn--secondary">
          Thư viện chi phí
        </Link>
        <Link href="/admin/pricing/service-rules" className="admin-btn admin-btn--secondary">
          Phí dịch vụ
        </Link>
      </div>

      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <div>
          <h3 className="admin-subtitle">Công cụ bảng giá (tương thích)</h3>
          <p className="admin-field-hint">
            Bộ tính theo bảng giá sản phẩm và quy tắc phí dịch vụ — không thay thế costing V2.
          </p>
        </div>
        <Link href="/admin/pricing/calculator" className="admin-btn admin-btn--secondary admin-btn--xs">
          Mở bộ tính bảng giá
        </Link>
      </div>

      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h3 className="admin-subtitle">Bản tính giá gần đây</h3>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary admin-btn--xs">
          Xem tất cả
        </Link>
      </div>

      {(stats?.recentCalculations.length ?? 0) === 0 ? (
        <EmptyState
          title="Chưa có bản tính giá nào"
          description="Khi có bản tính giá, danh sách gần đây sẽ hiển thị tại đây."
          action={
            <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">
              Tạo costing đầu tiên
            </Link>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Loại</th>
                <th>Lead / KH</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {stats!.recentCalculations.map((row) => {
                const method = row.calculationMethod;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/pricing/history/${row.id}`}>{row.code}</Link>
                    </td>
                    <td>
                      <span className={pricingCalculationMethodBadgeClass(method)}>
                        {pricingCalculationMethodLabel(method)}
                      </span>
                    </td>
                    <td>{row.leadLabel ?? row.customerLabel ?? "—"}</td>
                    <td>{formatPricingCurrency(row.totalAmount)}</td>
                    <td>{getPricingStatusLabel(row.status)}</td>
                    <td>{formatPricingDateTime(row.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
