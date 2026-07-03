"use client";

import { useState } from "react";
import type { OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import { formatOrderDate } from "@/features/orders/order-format";
import { PRODUCTION_PLAN_PRIORITY_LABELS } from "@/features/production-planning/production-plan-labels";
import {
  deriveCurrentStageLabel,
  deriveDeadlineState,
  deriveNextStageAction,
  deriveStageCompletionSummary,
  type ProductionJobTabKey,
} from "@/components/admin/production-planning/production-job-workspace";
import { formatPlanningCell } from "@/components/admin/production-planning/production-plan-display";

type Props = {
  plan: ProductionPlanDetail;
  itemBundle: OrderItemExecutionBundle | null;
  canEditPlan: boolean;
  onOpenTab: (tab: ProductionJobTabKey) => void;
  onEditPlan: () => void;
};

function NoteBlock({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  const [open, setOpen] = useState(false);
  const text = value?.trim() ? value : empty;
  const isLong = (value?.trim().length ?? 0) > 120;

  if (!value?.trim()) {
    return (
      <div className="prod-job-note">
        <span className="prod-job-note__label">{label}</span>
        <p className="prod-job-note__empty">{empty}</p>
      </div>
    );
  }

  return (
    <div className="prod-job-note">
      <span className="prod-job-note__label">{label}</span>
      {isLong && !open ? (
        <>
          <p className="prod-job-note__text">{value.slice(0, 120)}…</p>
          <button type="button" className="prod-job-link" onClick={() => setOpen(true)}>
            Xem thêm
          </button>
        </>
      ) : (
        <p className="prod-job-note__text">{text}</p>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone,
  action,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "danger" | "muted";
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="prod-job-summary-row">
      <span className="prod-job-summary-row__label">{label}</span>
      <div className="prod-job-summary-row__value">
        <span className={tone ? `prod-job-summary-row__badge prod-job-summary-row__badge--${tone}` : undefined}>
          {value}
        </span>
        {action && (
          <button type="button" className="prod-job-link" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductionJobOverviewTab({
  plan,
  itemBundle,
  canEditPlan,
  onOpenTab,
  onEditPlan,
}: Props) {
  const stages = itemBundle?.stages ?? [];
  const planning = formatPlanningCell(plan);
  const deadline = deriveDeadlineState(plan);

  const docTone =
    plan.docStatus === "ok" ? "ok" : plan.docStatus === "missing" ? "danger" : "warn";
  const matTone =
    plan.materialStatus === "ok" ? "ok" : plan.materialStatus === "shortage" ? "danger" : "warn";
  const qcTone =
    plan.qcStatus === "passed"
      ? "ok"
      : plan.qcStatus === "rework"
        ? "danger"
        : plan.qcStatus === "awaiting"
          ? "warn"
          : "muted";

  return (
    <div className="prod-job-overview">
      <section className="prod-job-overview__col">
        <h2 className="prod-job-section-title">Công việc hiện tại</h2>
        <dl className="prod-job-kv">
          <div>
            <dt>Công đoạn hiện tại</dt>
            <dd>{deriveCurrentStageLabel(stages)}</dd>
          </div>
          <div className="prod-job-kv__highlight">
            <dt>Bước cần làm tiếp</dt>
            <dd>{deriveNextStageAction(stages, plan)}</dd>
          </div>
          <div>
            <dt>Tiến độ công đoạn</dt>
            <dd>{deriveStageCompletionSummary(stages)}</dd>
          </div>
          <div>
            <dt>Kế hoạch SX</dt>
            <dd>{planning.range}</dd>
          </div>
          <div>
            <dt>Hạn SX nội bộ</dt>
            <dd>
              {plan.internalDeadline ? formatOrderDate(plan.internalDeadline) : "Chưa có hạn nội bộ"}
              <span className={`prod-job-deadline prod-job-deadline--${deadline.tone}`}>
                {deadline.label}
              </span>
            </dd>
          </div>
          <div>
            <dt>Phụ trách</dt>
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
        </dl>
        <NoteBlock label="Ghi chú kế hoạch" value={plan.planningNote} empty="Chưa có ghi chú kế hoạch." />
        <NoteBlock label="Ghi chú rủi ro" value={plan.riskNote} empty="Chưa có ghi chú rủi ro." />
      </section>

      <section className="prod-job-overview__col">
        <h2 className="prod-job-section-title">Rủi ro &amp; điều kiện sẵn sàng</h2>
        <SummaryRow
          label="Tài liệu"
          value={plan.docStatusLabel}
          tone={docTone}
          action={{ label: "Mở tài liệu", onClick: () => onOpenTab("documents") }}
        />
        <SummaryRow
          label="Vật tư"
          value={plan.materialStatusLabel}
          tone={matTone}
          action={{ label: "Mở vật tư", onClick: () => onOpenTab("materials") }}
        />
        <SummaryRow
          label="QC"
          value={plan.qcStatusLabel}
          tone={qcTone}
          action={{ label: "Mở QC", onClick: () => onOpenTab("qc") }}
        />
        <SummaryRow
          label="Phân công"
          value={plan.ownerName ? "Đã phân công" : "Chưa phân công"}
          tone={plan.ownerName ? "ok" : "warn"}
        />
        <SummaryRow
          label="Rủi ro hạn"
          value={deadline.label}
          tone={deadline.tone === "danger" ? "danger" : deadline.tone === "warn" ? "warn" : "muted"}
        />
        {plan.warnings.length > 0 && (
          <ul className="prod-job-warnings">
            {plan.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <div className="prod-job-overview__links">
          <button type="button" className="prod-job-link" onClick={() => onOpenTab("production")}>
            Mở sản xuất
          </button>
          {canEditPlan && (
            <button type="button" className="prod-job-link" onClick={onEditPlan}>
              Chỉnh sửa kế hoạch
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
