"use client";

import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import { formatOrderDate } from "@/features/orders/order-format";
import { PRODUCTION_PLAN_PRIORITY_LABELS } from "@/features/production-planning/production-plan-labels";

type Props = {
  plan: ProductionPlanDetail;
  canEditPlan: boolean;
  onEditPlan: () => void;
};

export default function ProductionJobPlanTab({ plan, canEditPlan, onEditPlan }: Props) {
  return (
    <div className="prod-job-plan">
      {!canEditPlan && (
        <p className="prod-job-plan__lock" role="status">
          Bạn không có quyền chỉnh sửa kế hoạch sản xuất.
        </p>
      )}

      <dl className="prod-job-kv prod-job-kv--single">
        <div>
          <dt>Hạn SX nội bộ</dt>
          <dd>{plan.internalDeadline ? formatOrderDate(plan.internalDeadline) : "Chưa có hạn nội bộ"}</dd>
        </div>
        <div>
          <dt>Bắt đầu dự kiến</dt>
          <dd>{plan.plannedStartAt ? formatOrderDate(plan.plannedStartAt) : "—"}</dd>
        </div>
        <div>
          <dt>Kết thúc dự kiến</dt>
          <dd>{plan.plannedEndAt ? formatOrderDate(plan.plannedEndAt) : "—"}</dd>
        </div>
        <div>
          <dt>Phụ trách sản xuất</dt>
          <dd>{plan.ownerName ?? "Chưa phân công"}</dd>
        </div>
        <div>
          <dt>Xưởng / tổ</dt>
          <dd>{plan.workshopName ?? "—"}</dd>
        </div>
        <div>
          <dt>Ưu tiên</dt>
          <dd>{PRODUCTION_PLAN_PRIORITY_LABELS[plan.priority]}</dd>
        </div>
        <div>
          <dt>Lead time ước tính</dt>
          <dd>{plan.estimatedLeadDays != null ? `${plan.estimatedLeadDays} ngày` : "—"}</dd>
        </div>
        <div className="prod-job-kv__full">
          <dt>Ghi chú kế hoạch</dt>
          <dd>{plan.planningNote?.trim() ? plan.planningNote : "Chưa có ghi chú kế hoạch."}</dd>
        </div>
        <div className="prod-job-kv__full">
          <dt>Ghi chú rủi ro</dt>
          <dd>{plan.riskNote?.trim() ? plan.riskNote : "Chưa có ghi chú rủi ro."}</dd>
        </div>
      </dl>

      {canEditPlan && (
        <div className="prod-job-plan__actions">
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={onEditPlan}>
            {plan.planId ? "Chỉnh sửa kế hoạch" : "Lập kế hoạch"}
          </button>
        </div>
      )}
    </div>
  );
}
