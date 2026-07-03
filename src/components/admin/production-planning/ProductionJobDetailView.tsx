"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import OrderItemExecutionCard from "@/components/admin/orders/OrderItemExecutionCard";
import OrderProductionPackSection from "@/components/admin/orders/OrderProductionPackSection";
import OrderItemReadinessBadge from "@/components/admin/orders/OrderItemReadinessBadge";
import ProductionPlanEditor from "@/components/admin/production-planning/ProductionPlanEditor";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import { formatOrderDate } from "@/features/orders/order-format";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import { PRODUCTION_PLAN_PRIORITY_LABELS, PRODUCTION_PLAN_STATUS_LABELS } from "@/features/production-planning/production-plan-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { ORDER_ITEM_READINESS_LABELS, type OrderItemReadinessState } from "@/features/orders/order-item-readiness";

type TabKey = "overview" | "plan" | "production" | "documents" | "materials" | "qc" | "history";

type Props = { orderItemId: string };

export default function ProductionJobDetailView({ orderItemId }: Props) {
  const [plan, setPlan] = useState<ProductionPlanDetail | null>(null);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [bundle, setBundle] = useState<ProductionExecutionBundle | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planRes = await fetch(`/api/production/plans/${orderItemId}`);
      const planBody = await planRes.json();
      if (!planRes.ok) throw new Error(planBody.message ?? "Không tìm thấy công việc");
      const planData = planBody.plan as ProductionPlanDetail;
      setPlan(planData);

      const [orderRes, bundleRes, empRes] = await Promise.all([
        fetch(`/api/orders/${planData.orderId}`),
        fetch(`/api/orders/${planData.orderId}/production-execution`),
        fetch("/api/employees?active=1&role=PRODUCTION&limit=200"),
      ]);
      const orderBody = await orderRes.json();
      const bundleBody = await bundleRes.json();
      const empBody = await empRes.json();
      if (!orderRes.ok) throw new Error(orderBody.message ?? "Không tải được đơn hàng");
      setOrder(orderBody.order as OrderDetailRecord);
      setBundle(bundleBody.bundle as ProductionExecutionBundle);
      setEmployees(empBody.employees ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [orderItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <AdminPageSkeleton message="Đang tải công việc sản xuất…" />;
  if (error || !plan || !order) {
    return <AdminErrorRecovery message={error ?? "Không tìm thấy công việc"} onRetry={() => void load()} />;
  }

  const itemBundle = bundle?.items.find((i) => i.orderItemId === orderItemId) ?? null;
  const readinessState = (plan.readinessLabel as OrderItemReadinessState) ?? "AWAITING_PRODUCTION";
  const readinessLabel = ORDER_ITEM_READINESS_LABELS[readinessState] ?? plan.readinessLabel;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Tổng quan" },
    { key: "plan", label: "Kế hoạch" },
    { key: "production", label: "Sản xuất" },
    { key: "documents", label: "Tài liệu" },
    { key: "materials", label: "Vật tư" },
    { key: "qc", label: "QC" },
    { key: "history", label: "Lịch sử" },
  ];

  return (
    <div className="prod-job">
      <nav className="prod-job__breadcrumb">
        <Link href="/admin/production">Sản xuất</Link>
        <span> / </span>
        <Link href="/admin/production/plan">Kế hoạch</Link>
        <span> / </span>
        <span>{plan.jobCode}</span>
      </nav>

      <header className="prod-job__header">
        <div>
          <h1 className="prod-job__title">{plan.jobCode}</h1>
          <p className="prod-job__product">{plan.productName}</p>
          <div className="prod-job__meta">
            <Link href={`/admin/orders/${plan.orderId}`}>{plan.orderNo}</Link>
            <span>· Giao: {plan.deliveryDeadline ? formatOrderDate(plan.deliveryDeadline) : "—"}</span>
            <span>· Hạn SX: {plan.internalDeadline ? formatOrderDate(plan.internalDeadline) : "Chưa có hạn nội bộ"}</span>
          </div>
        </div>
        <div className="prod-job__badges">
          <span className={`prod-plan-status prod-plan-status--${plan.status.toLowerCase()}`}>
            {PRODUCTION_PLAN_STATUS_LABELS[plan.status]}
          </span>
          <span className="prod-plan-priority">{PRODUCTION_PLAN_PRIORITY_LABELS[plan.priority]}</span>
          {plan.risks.map((r) => (
            <span key={r} className={`prod-plan-risk prod-plan-risk--${plan.riskTone}`}>{r}</span>
          ))}
        </div>
      </header>

      <div className="prod-job__tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "is-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="prod-job__content">
        {tab === "overview" && (
          <div className="prod-job__overview">
            <dl className="prod-job__dl">
              <div><dt>Số lượng</dt><dd>{plan.quantity.toLocaleString("vi-VN")} {plan.quantityUnit}</dd></div>
              <div><dt>Quy cách</dt><dd>{plan.colorSpec ?? "—"}</dd></div>
              <div><dt>Nguồn hàng</dt><dd>{plan.supplySourceLabel}</dd></div>
              <div><dt>Gia công</dt><dd>{plan.processingMethodLabel}</dd></div>
              <div><dt>Người phụ trách</dt><dd>{plan.ownerName ?? "Chưa phân công"}</dd></div>
              <div><dt>Tiến độ</dt><dd>{plan.progressPercent != null ? `${plan.progressPercent}%` : "—"}</dd></div>
              <div><dt>Sẵn sàng</dt><dd><OrderItemReadinessBadge state={readinessState} label={readinessLabel} /></dd></div>
            </dl>
            {plan.warnings.length > 0 && (
              <div className="prod-job__warnings">
                <h3>Cảnh báo</h3>
                <ul>{plan.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
            )}
            {plan.canEditPlan && (
              <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => setEditorOpen(true)}>
                {plan.planId ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch"}
              </button>
            )}
          </div>
        )}

        {tab === "plan" && (
          <div className="prod-job__plan">
            <dl className="prod-job__dl">
              <div><dt>Bắt đầu dự kiến</dt><dd>{plan.plannedStartAt ? formatOrderDate(plan.plannedStartAt) : "—"}</dd></div>
              <div><dt>Kết thúc dự kiến</dt><dd>{plan.plannedEndAt ? formatOrderDate(plan.plannedEndAt) : "—"}</dd></div>
              <div><dt>Xưởng / tổ</dt><dd>{plan.workshopName ?? "—"}</dd></div>
              <div><dt>Lead time</dt><dd>{plan.estimatedLeadDays != null ? `${plan.estimatedLeadDays} ngày` : "—"}</dd></div>
              <div><dt>Ghi chú kế hoạch</dt><dd>{plan.planningNote ?? "—"}</dd></div>
              <div><dt>Ghi chú rủi ro</dt><dd>{plan.riskNote ?? "—"}</dd></div>
            </dl>
            {plan.canEditPlan && (
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setEditorOpen(true)}>
                Chỉnh sửa kế hoạch
              </button>
            )}
          </div>
        )}

        {tab === "production" && itemBundle && (
          <OrderItemExecutionCard
            orderId={plan.orderId}
            item={itemBundle}
            expanded
            onToggle={() => {}}
            employees={employees}
            productionOwnerName={plan.ownerName}
            onUpdated={() => void load()}
            isLegacySharedData={bundle?.isLegacy}
          />
        )}

        {(tab === "documents" || tab === "materials") && (
          <OrderProductionPackSection orderId={plan.orderId} order={order} />
        )}

        {tab === "qc" && itemBundle && (
          <OrderItemExecutionCard
            orderId={plan.orderId}
            item={itemBundle}
            expanded
            onToggle={() => {}}
            employees={employees}
            productionOwnerName={plan.ownerName}
            onUpdated={() => void load()}
            isLegacySharedData={bundle?.isLegacy}
          />
        )}

        {tab === "history" && (
          <p className="prod-plan-muted">
            Lịch sử thay đổi kế hoạch, công đoạn và QC sẽ hiển thị khi dữ liệu hoạt động có sẵn.
          </p>
        )}
      </div>

      <ProductionPlanEditor
        open={editorOpen}
        row={plan}
        canEdit={plan.canEditPlan}
        onClose={() => setEditorOpen(false)}
        onSaved={(p) => {
          setPlan(p);
          void load();
        }}
      />
    </div>
  );
}
