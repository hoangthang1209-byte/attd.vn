"use client";

import { useCallback, useEffect, useState } from "react";
import OrderItemExecutionCard from "@/components/admin/orders/OrderItemExecutionCard";
import OrderProductionPackSection from "@/components/admin/orders/OrderProductionPackSection";
import ProductionPlanEditor from "@/components/admin/production-planning/ProductionPlanEditor";
import ProductionJobHeader from "@/components/admin/production-planning/ProductionJobHeader";
import ProductionJobOperationalStrip from "@/components/admin/production-planning/ProductionJobOperationalStrip";
import ProductionJobOverviewTab from "@/components/admin/production-planning/ProductionJobOverviewTab";
import ProductionJobPlanTab from "@/components/admin/production-planning/ProductionJobPlanTab";
import ProductionJobHistoryTab from "@/components/admin/production-planning/ProductionJobHistoryTab";
import ProductionJobPageSkeleton from "@/components/admin/production-planning/ProductionJobPageSkeleton";
import AdminErrorRecovery from "@/components/admin/feedback/AdminErrorRecovery";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import {
  getDefaultProductionJobTab,
  isProductionJobTabKey,
  PRODUCTION_JOB_TABS,
  productionJobTabStorageKey,
  type ProductionJobTabKey,
} from "@/components/admin/production-planning/production-job-workspace";

type Props = { orderItemId: string };

export default function ProductionJobDetailView({ orderItemId }: Props) {
  const { roleCode } = useAdminPermissions();
  const [plan, setPlan] = useState<ProductionPlanDetail | null>(null);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [bundle, setBundle] = useState<ProductionExecutionBundle | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [tab, setTab] = useState<ProductionJobTabKey | null>(null);
  const [mountedTabs, setMountedTabs] = useState<Set<ProductionJobTabKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const storageKey = productionJobTabStorageKey(orderItemId);

  const loadPlan = useCallback(async () => {
    const planRes = await fetch(`/api/production/plans/${orderItemId}`);
    const planBody = await planRes.json();
    if (!planRes.ok) throw new Error(planBody.message ?? "Không tìm thấy công việc");
    const planData = planBody.plan as ProductionPlanDetail;
    setPlan(planData);
    return planData;
  }, [orderItemId]);

  const loadBundle = useCallback(async (orderId: string) => {
    const bundleRes = await fetch(`/api/orders/${orderId}/production-execution`);
    const bundleBody = await bundleRes.json();
    if (!bundleRes.ok) throw new Error(bundleBody.message ?? "Không tải được tiến độ sản xuất");
    setBundle(bundleBody.bundle as ProductionExecutionBundle);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planData = await loadPlan();
      const [orderRes, empRes] = await Promise.all([
        fetch(`/api/orders/${planData.orderId}`),
        fetch("/api/employees?active=1&role=PRODUCTION&limit=200"),
      ]);
      const orderBody = await orderRes.json();
      const empBody = await empRes.json();
      if (!orderRes.ok) throw new Error(orderBody.message ?? "Không tải được đơn hàng");
      setOrder(orderBody.order as OrderDetailRecord);
      setEmployees(empBody.employees ?? []);
      await loadBundle(planData.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải công việc sản xuất. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, [loadPlan, loadBundle]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!plan || tab !== null) return;
    const saved = sessionStorage.getItem(storageKey);
    if (saved && isProductionJobTabKey(saved)) {
      setTab(saved);
    } else {
      setTab(getDefaultProductionJobTab({ roleCode, plan }));
    }
  }, [plan, roleCode, storageKey, tab]);

  useEffect(() => {
    if (tab === null) return;
    sessionStorage.setItem(storageKey, tab);
    setMountedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab, storageKey]);

  const refreshExecution = useCallback(async () => {
    if (!plan) return;
    try {
      await Promise.all([loadPlan(), loadBundle(plan.orderId)]);
    } catch {
      // keep current UI; user can retry from tab
    }
  }, [plan, loadPlan, loadBundle]);

  if (loading) return <ProductionJobPageSkeleton />;
  if (error || !plan || !order || tab === null) {
    return (
      <AdminErrorRecovery
        message={error ?? "Không thể tải công việc sản xuất. Vui lòng thử lại."}
        onRetry={() => void load()}
      />
    );
  }

  const itemBundle = bundle?.items.find((i) => i.orderItemId === orderItemId) ?? null;
  const canManagePlan = plan.canEditPlan;

  function openTab(next: ProductionJobTabKey) {
    setTab(next);
  }

  return (
    <div className="prod-job">
      <ProductionJobHeader
        plan={plan}
        canManagePlan={canManagePlan}
        onEditPlan={() => setEditorOpen(true)}
        onAssign={() => setEditorOpen(true)}
      />

      <ProductionJobOperationalStrip
        plan={plan}
        itemBundle={itemBundle}
        onNavigate={openTab}
      />

      <div className="prod-job__tabs prod-job-tabs" role="tablist" aria-label="Công việc sản xuất">
        {PRODUCTION_JOB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? "is-active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="prod-job__content" role="tabpanel">
        {mountedTabs.has("overview") && (
          <div hidden={tab !== "overview"}>
            <ProductionJobOverviewTab
              plan={plan}
              itemBundle={itemBundle}
              canEditPlan={canManagePlan}
              onOpenTab={openTab}
              onEditPlan={() => setEditorOpen(true)}
            />
          </div>
        )}

        {mountedTabs.has("plan") && (
          <div hidden={tab !== "plan"}>
            <ProductionJobPlanTab
              plan={plan}
              canEditPlan={canManagePlan}
              onEditPlan={() => setEditorOpen(true)}
            />
          </div>
        )}

        {mountedTabs.has("production") && itemBundle && (
          <div hidden={tab !== "production"}>
            <OrderItemExecutionCard
              orderId={plan.orderId}
              item={itemBundle}
              expanded
              onToggle={() => {}}
              employees={employees}
              productionOwnerName={plan.ownerName}
              onUpdated={() => void refreshExecution()}
              isLegacySharedData={bundle?.isLegacy}
              variant="workspace-stages"
            />
          </div>
        )}

        {mountedTabs.has("documents") && (
          <div hidden={tab !== "documents"}>
            <OrderProductionPackSection
              orderId={plan.orderId}
              order={order}
              embeddedTab="files"
              focusOrderItemId={orderItemId}
              embedMode
            />
          </div>
        )}

        {mountedTabs.has("materials") && (
          <div hidden={tab !== "materials"}>
            <OrderProductionPackSection
              orderId={plan.orderId}
              order={order}
              embeddedTab="materials"
              focusOrderItemId={orderItemId}
              embedMode
            />
          </div>
        )}

        {mountedTabs.has("qc") && itemBundle && (
          <div hidden={tab !== "qc"}>
            <div className="prod-job-qc-summary">
              <span className={`prod-job-qc-summary__state prod-job-qc-summary__state--${plan.qcStatus}`}>
                {plan.qcStatusLabel}
              </span>
            </div>
            <OrderItemExecutionCard
              orderId={plan.orderId}
              item={itemBundle}
              expanded
              onToggle={() => {}}
              employees={employees}
              productionOwnerName={plan.ownerName}
              onUpdated={() => void refreshExecution()}
              isLegacySharedData={bundle?.isLegacy}
              variant="workspace-qc"
            />
          </div>
        )}

        {mountedTabs.has("history") && (
          <div hidden={tab !== "history"}>
            <ProductionJobHistoryTab
              orderId={plan.orderId}
              orderItemId={orderItemId}
              itemBundle={itemBundle}
            />
          </div>
        )}
      </div>

      <ProductionPlanEditor
        open={editorOpen}
        row={plan}
        canEdit={plan.canEditPlan}
        onClose={() => setEditorOpen(false)}
        onSaved={(p) => {
          setPlan(p);
          void loadPlan();
        }}
      />
    </div>
  );
}
