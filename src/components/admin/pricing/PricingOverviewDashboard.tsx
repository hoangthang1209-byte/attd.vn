"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPricingCurrency, formatPricingDateTime } from "@/features/pricing/format";
import { getPricingStatusLabel } from "@/features/pricing/labels";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import type { PricingCalculationListRecord, PricingOverviewStats } from "@/features/pricing/types";

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
    reload();
  }, []);

  if (loading) return <AdminLoadingState label="Đang tải khu vực tính giá…" />;
  if (error) {
    return (
      <EmptyState
        tone="error"
        title="Không tải được khu vực tính giá"
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
      <div className="admin-section-header">
        <div>
          <h3 className="admin-subtitle">Tính giá đơn hàng</h3>
          <p className="admin-field-hint">
            Luồng chính: nguyên phụ liệu & giá NCC → BOM sản phẩm → cost → giá bán → báo giá.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">
          + Tính giá mới
        </Link>
        <Link href="/admin/pricing/costing/batch" className="admin-btn admin-btn--secondary">
          Nhiều sản phẩm
        </Link>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary">
          Lịch sử
        </Link>
      </div>

      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <div>
          <h3 className="admin-subtitle">Dữ liệu dùng để tính cost</h3>
          <p className="admin-field-hint">
            Cập nhật nguyên phụ liệu, nhà cung cấp và chi phí gia công trước khi sales chốt giá.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/production-materials" className="admin-btn admin-btn--secondary">
          Nguyên phụ liệu & giá NCC
        </Link>
        <Link href="/admin/pricing/cost-library" className="admin-btn admin-btn--secondary">
          Gia công & dịch vụ
        </Link>
      </div>

      <details className="costing-details" style={{ marginTop: 24 }}>
        <summary>Cấu hình giá cũ / nâng cao</summary>
        <p className="admin-field-hint" style={{ marginTop: 8 }}>
          Các màn hình này được giữ để tương thích dữ liệu cũ, không phải luồng tính giá chính cho sales.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Link href="/admin/pricing/price-groups" className="admin-btn admin-btn--secondary admin-btn--small">
            Nhóm giá
          </Link>
          <Link href="/admin/pricing/product-tiers" className="admin-btn admin-btn--secondary admin-btn--small">
            Bảng giá chuẩn
          </Link>
          <Link href="/admin/pricing/service-rules" className="admin-btn admin-btn--secondary admin-btn--small">
            Quy tắc dịch vụ
          </Link>
          <Link href="/admin/pricing/calculator" className="admin-btn admin-btn--secondary admin-btn--small">
            Bộ tính giá cũ
          </Link>
        </div>
      </details>

      <div className="admin-section-header" style={{ marginTop: 32 }}>
        <h3 className="admin-subtitle">Bản tính gần đây</h3>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary admin-btn--xs">
          Xem tất cả
        </Link>
      </div>

      {(stats?.recentCalculations.length ?? 0) === 0 ? (
        <EmptyState
          title="Chưa có bản tính giá nào"
          description="Tạo cost sheet đầu tiên để bắt đầu lưu lịch sử giá và tạo báo giá."
          action={
            <Link href="/admin/pricing/costing" className="admin-btn admin-btn--primary">
              Tạo bản tính đầu tiên
            </Link>
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Khách hàng / Lead</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentCalculations.map((row: PricingCalculationListRecord) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/admin/pricing/history/${row.id}`}>{row.code}</Link>
                  </td>
                  <td>{row.customerLabel ?? row.leadLabel ?? "—"}</td>
                  <td>
                    {formatPricingCurrency(
                      row.manualOverride && row.manualTotalAmount != null
                        ? row.manualTotalAmount
                        : row.totalAmount,
                    )}
                  </td>
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
