"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import ItemProductionInitModal from "@/components/admin/item-production/ItemProductionInitModal";

type Props = { orderId: string; orderStatus: string };

export default function OrderItemProductionPanel({ orderId, orderStatus }: Props) {
  const { permissions } = useAdminPermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInit, setShowInit] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    averageProgressPercent: number;
    readyQuantity: number;
    plannedQuantity: number;
    totalOrderedQuantity?: number;
    sampleApprovedCount?: number;
    inProductionCount?: number;
    qcCount?: number;
    readyToShipCount?: number;
    atRiskCount: number;
    delayedCount: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/item-production-summary`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được tóm tắt");
      setSummary(json.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!permissions.canViewItemProduction) return;
    queueMicrotask(() => {
      void load();
    });
  }, [load, permissions.canViewItemProduction]);

  if (!permissions.canViewItemProduction) return null;

  return (
    <section className="admin-section-card" style={{ marginTop: 16 }}>
      <div className="admin-section-header">
        <h2 className="admin-subtitle">Tiến độ sản xuất theo item</h2>
        <Link
          href={`/admin/manufacturing/production-timeline?order=${orderId}`}
          className="admin-btn admin-btn--secondary admin-btn--small"
        >
          Xem tiến độ sản xuất
        </Link>
      </div>
      {loading ? (
        <p className="admin-field-hint">Đang tải tóm tắt…</p>
      ) : (
        <>
          {error ? <p className="admin-error">{error}</p> : null}
          {summary && summary.total > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p className="admin-field-hint" style={{ margin: 0 }}>
                {summary.total} item · {summary.totalOrderedQuantity?.toLocaleString("vi-VN") ?? summary.plannedQuantity} pcs · tiến độ TB{" "}
                {summary.averageProgressPercent}%
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span>Mẫu duyệt: {summary.sampleApprovedCount ?? 0}/{summary.total}</span>
                <span>Đang SX: {summary.inProductionCount ?? 0}</span>
                <span>QC: {summary.qcCount ?? 0}</span>
                <span>Sẵn sàng: {summary.readyToShipCount ?? summary.readyQuantity}</span>
                <span>Nguy cơ: {summary.atRiskCount ?? 0}</span>
                <span>Trễ: {summary.delayedCount ?? 0}</span>
              </div>
            </div>
          ) : (
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Chưa khởi tạo theo dõi sản xuất cho các item của đơn này.
            </p>
          )}
          {permissions.canUpdateItemProduction && orderStatus !== "CANCELLED" ? (
            <div style={{ marginTop: 10 }}>
              <AdminLoadingButton pending={false} onClick={() => setShowInit(true)}>
                {summary && summary.total > 0 ? "Khởi tạo item còn thiếu" : "Khởi tạo theo dõi sản xuất"}
              </AdminLoadingButton>
            </div>
          ) : null}
        </>
      )}
      {showInit ? (
        <ItemProductionInitModal
          orderId={orderId}
          onClose={() => setShowInit(false)}
          onInitialized={() => {
            void load();
          }}
        />
      ) : null}
    </section>
  );
}
