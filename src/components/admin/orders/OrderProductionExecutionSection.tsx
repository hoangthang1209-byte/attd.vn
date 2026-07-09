"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { HandoverReadinessResult } from "@/features/orders/handover-readiness.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import OrderItemExecutionCard from "@/components/admin/orders/OrderItemExecutionCard";
import OrderItemReadinessBadge from "@/components/admin/orders/OrderItemReadinessBadge";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";

type Props = {
  orderId: string;
  order: OrderDetailRecord;
};

export default function OrderProductionExecutionSection({ orderId, order }: Props) {
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<ProductionExecutionBundle | null>(null);
  const [readiness, setReadiness] = useState<HandoverReadinessResult | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bundleRes, readinessRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/production-execution`),
        fetch(`/api/orders/${orderId}/handover-readiness`),
      ]);
      const bundleData = await bundleRes.json();
      const readinessData = await readinessRes.json();
      const nextBundle = bundleData.bundle as ProductionExecutionBundle | undefined;
      setBundle(nextBundle ?? null);
      setReadiness(readinessData.readiness ?? null);

      if (nextBundle?.items.length) {
        setExpandedItems((prev) => {
          const next = { ...prev };
          nextBundle.items.forEach((item, index) => {
            if (next[item.orderItemId] === undefined) {
              next[item.orderItemId] = index === 0;
            }
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/employees?active=1&role=PRODUCTION&limit=200")
      .then((r) => r.json())
      .then((data: { employees?: EmployeeRecord[] }) => {
        setEmployees(data.employees ?? []);
      });
  }, []);

  const showSection =
    order.status === "IN_PRODUCTION" ||
    order.status === "READY_TO_SHIP" ||
    order.status === "SHIPPED" ||
    order.status === "COMPLETED" ||
    (bundle?.items.some((i) => i.stages.length > 0 || i.qc) ?? false) ||
    (bundle?.legacyStages.length ?? 0) > 0 ||
    bundle?.legacyQc != null;

  if (!showSection) return null;

  const productionOwnerName = order.productionOwnerName ?? null;

  return (
    <fieldset className="admin-catalog-fieldset" id="production-execution" style={{ marginTop: 16 }}>
      <legend>Tiến độ sản xuất &amp; QC</legend>

      {bundle && (
        <p className="admin-field-hint" style={{ marginBottom: 12 }}>
          Sẵn sàng tổng thể:{" "}
          <OrderItemReadinessBadge
            state={bundle.orderReadiness.state}
            label={bundle.orderReadiness.stateLabel}
          />
        </p>
      )}

      {bundle?.isLegacy && (
        <p className="admin-field-hint order-item-execution-card__legacy-banner">
          Đơn hàng này dùng công đoạn/QC cấp đơn hàng (dữ liệu cũ). Các sản phẩm hiển thị chung dữ liệu đó — không tự động nhân bản sang từng dòng.
        </p>
      )}

      {loading ? (
        <AdminInlineLoader message="Đang tải tiến độ sản xuất…" />
      ) : (
        <>
          <div className="order-item-execution-list">
            {(bundle?.items ?? []).map((item) => (
              <OrderItemExecutionCard
                key={item.orderItemId}
                orderId={orderId}
                item={item}
                expanded={expandedItems[item.orderItemId] ?? false}
                onToggle={() =>
                  setExpandedItems((prev) => ({
                    ...prev,
                    [item.orderItemId]: !prev[item.orderItemId],
                  }))
                }
                employees={employees}
                productionOwnerName={productionOwnerName}
                onUpdated={() => void load()}
                isLegacySharedData={bundle?.isLegacy ?? false}
              />
            ))}
          </div>

          {readiness && (
            <section className="order-item-execution-handover" style={{ marginTop: 16 }}>
              <h4 className="admin-subtitle">Bàn giao hoàn thành</h4>
              <p>Trạng thái: <strong>{readiness.stateLabel}</strong></p>
              <ul className="production-readiness-list">
                <li>Tổng số lượng đơn hàng: {readiness.expectedOrderQuantity.toLocaleString("vi-VN")}</li>
                <li>Đã hoàn thành sản xuất: {readiness.productionCompletedQuantity.toLocaleString("vi-VN")}</li>
                <li>QC đạt: {readiness.qcPassedQuantity.toLocaleString("vi-VN")}</li>
                <li>Cần làm lại: {readiness.reworkQuantity.toLocaleString("vi-VN")}</li>
                <li>Hàng lỗi/hủy: {readiness.defectAndScrapQuantity.toLocaleString("vi-VN")}</li>
                <li>Đóng gói: {readiness.packingCompleted ? "Hoàn thành" : readiness.packingSkipped ? "Không áp dụng" : "Chưa hoàn thành"}</li>
                <li>Sẵn sàng giao hàng: {readiness.isReady ? "Có" : "Chưa"}</li>
              </ul>
              {!readiness.isReady && readiness.missingConditions.length > 0 && (
                <>
                  <p className="admin-field-hint">Điều kiện còn thiếu:</p>
                  <ul>
                    {readiness.missingConditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </>
      )}
    </fieldset>
  );
}
