import { formatOrderDate } from "@/features/orders/order-format";
import type { OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { ProductionPlanDetail } from "@/features/production-planning/production-plan.types";
import { PRODUCTION_PLAN_QC_STATUS_LABELS, PRODUCTION_PLAN_STATUS_LABELS } from "@/features/production-planning/production-plan-labels";
import type { OrderProductionFileRecord } from "@/features/orders/production-pack.types";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";

export type ProductionJobTabKey =
  | "overview"
  | "plan"
  | "production"
  | "documents"
  | "materials"
  | "qc"
  | "history";

export const PRODUCTION_JOB_TABS: Array<{ key: ProductionJobTabKey; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "plan", label: "Kế hoạch" },
  { key: "production", label: "Sản xuất" },
  { key: "documents", label: "Tài liệu" },
  { key: "materials", label: "Vật tư" },
  { key: "qc", label: "QC" },
  { key: "history", label: "Lịch sử" },
];

export function productionJobTabStorageKey(orderItemId: string): string {
  return `prod-job-tab:${orderItemId}`;
}

export function isProductionJobTabKey(value: string): value is ProductionJobTabKey {
  return PRODUCTION_JOB_TABS.some((t) => t.key === value);
}

export function documentsBlocking(plan: ProductionPlanDetail): boolean {
  return (
    plan.docStatus === "missing" ||
    plan.docStatus === "needs_update" ||
    plan.status === "WAITING_DOCUMENTS" ||
    plan.risks.some((r) => r.includes("Thiếu") && r.includes("tài liệu")) ||
    plan.risks.includes("Thiếu file")
  );
}

export function materialsBlocking(plan: ProductionPlanDetail): boolean {
  return (
    plan.materialStatus === "shortage" ||
    plan.materialStatus === "pending" ||
    plan.status === "WAITING_MATERIALS" ||
    plan.risks.includes("Thiếu vật tư")
  );
}

export function qcBlocking(plan: ProductionPlanDetail): boolean {
  return (
    plan.qcStatus === "rework" ||
    plan.status === "REWORK" ||
    plan.risks.includes("Cần làm lại") ||
    (plan.qcStatus === "awaiting" && plan.status === "WAITING_QC")
  );
}

export function getDefaultProductionJobTab(input: {
  roleCode: string | null;
  plan: ProductionPlanDetail;
}): ProductionJobTabKey {
  if (documentsBlocking(input.plan)) return "documents";
  if (materialsBlocking(input.plan)) return "materials";
  if (qcBlocking(input.plan)) return "qc";

  if (input.roleCode === "PRODUCTION") return "production";
  return "overview";
}

export function splitHeaderRisks(risks: string[]): { visible: string[]; overflow: string[] } {
  const unique = [...new Set(risks)];
  return {
    visible: unique.slice(0, 3),
    overflow: unique.slice(3),
  };
}

function findFocusStage(stages: ProductionStageRecord[]): ProductionStageRecord | null {
  if (stages.length === 0) return null;
  const inProgress = stages.find((s) => s.status === "IN_PROGRESS");
  if (inProgress) return inProgress;
  const next = stages.find((s) => s.status === "NOT_STARTED" || s.status === "BLOCKED");
  if (next) return next;
  return stages[stages.length - 1] ?? null;
}

export function deriveNextStageAction(
  stages: ProductionStageRecord[],
  plan: ProductionPlanDetail,
): string {
  if (documentsBlocking(plan)) return "Bổ sung tài liệu sản xuất";
  if (materialsBlocking(plan)) return "Xác nhận vật tư sản xuất";

  const focus = findFocusStage(stages);
  if (!focus) {
    if (plan.qcStatus === "awaiting" || plan.status === "WAITING_QC") return "Thực hiện kiểm tra QC";
    if (plan.qcStatus === "rework" || plan.status === "REWORK") return "Xử lý làm lại QC";
    return PRODUCTION_PLAN_STATUS_LABELS[plan.status] ?? "Theo dõi tiến độ";
  }

  if (focus.status === "IN_PROGRESS") return `Hoàn tất công đoạn ${focus.stageTypeLabel}`;
  if (focus.status === "NOT_STARTED" || focus.status === "BLOCKED") {
    return `Bắt đầu công đoạn ${focus.stageTypeLabel}`;
  }
  if (plan.qcStatus === "awaiting") return "Thực hiện kiểm tra QC";
  if (plan.qcStatus === "rework") return "Xử lý làm lại QC";
  return `Theo dõi ${focus.stageTypeLabel}`;
}

export function deriveCurrentStageLabel(stages: ProductionStageRecord[]): string {
  const focus = findFocusStage(stages);
  if (!focus) return "Chưa có công đoạn";
  if (focus.status === "COMPLETED" || focus.status === "SKIPPED") {
    const allDone = stages.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED");
    return allDone ? "Đã hoàn tất công đoạn" : focus.stageTypeLabel;
  }
  return focus.stageTypeLabel;
}

export function deriveStageCompletionSummary(stages: ProductionStageRecord[]): string {
  if (stages.length === 0) return "Chưa có công đoạn";
  const done = stages.filter((s) => s.status === "COMPLETED" || s.status === "SKIPPED").length;
  return `${done}/${stages.length} công đoạn hoàn tất`;
}

export type OperationalStripBlock = {
  label: string;
  primary: string;
  secondary?: string;
  tone?: "default" | "priority" | "warn" | "danger" | "muted";
};

export function deriveOperationalStrip(
  plan: ProductionPlanDetail,
  itemBundle: OrderItemExecutionBundle | null,
): OperationalStripBlock[] {
  const stages = itemBundle?.stages ?? [];
  const progressPrimary =
    plan.progressPercent != null
      ? `${plan.progressPercent}% · ${PRODUCTION_PLAN_STATUS_LABELS[plan.status]}`
      : PRODUCTION_PLAN_STATUS_LABELS[plan.status];

  const nextAction = deriveNextStageAction(stages, plan);

  let docPrimary = plan.docStatusLabel;
  let docTone: OperationalStripBlock["tone"] = "default";
  if (documentsBlocking(plan)) {
    docPrimary = plan.risks.find((r) => r.includes("file") || r.includes("tài liệu")) ?? "Thiếu tài liệu";
    docTone = "warn";
  } else if (plan.docStatus === "ok") {
    const count = itemBundle?.activeFileCount ?? 0;
    docPrimary = count > 0 ? `Đủ ${count} file` : "Đủ tài liệu";
  }

  let matPrimary = plan.materialStatusLabel;
  let matTone: OperationalStripBlock["tone"] = "default";
  if (materialsBlocking(plan)) {
    matPrimary = plan.risks.find((r) => r.includes("vật tư")) ?? plan.materialStatusLabel;
    matTone = "warn";
  } else if (plan.materialStatus === "ok") {
    matPrimary = "Đủ vật tư";
  }

  let qcPrimary = plan.qcStatusLabel;
  let qcTone: OperationalStripBlock["tone"] = "default";
  if (plan.qcStatus === "rework" || plan.risks.includes("Cần làm lại")) {
    qcPrimary = "Cần làm lại";
    qcTone = "danger";
  } else if (plan.qcStatus === "not_applicable") {
    qcPrimary = PRODUCTION_PLAN_QC_STATUS_LABELS.not_applicable;
    qcTone = "muted";
  } else if (plan.qcStatus === "awaiting") {
    qcTone = "warn";
  }

  return [
    { label: "Tiến độ", primary: progressPrimary, tone: "default" },
    { label: "Bước cần làm tiếp", primary: nextAction, tone: "priority" },
    { label: "Tài liệu", primary: docPrimary, tone: docTone },
    { label: "Vật tư", primary: matPrimary, tone: matTone },
    { label: "QC", primary: qcPrimary, tone: qcTone },
  ];
}

export function deriveDeadlineState(plan: ProductionPlanDetail): {
  label: string;
  tone: "default" | "warn" | "danger" | "muted";
} {
  if (plan.risks.includes("Quá hạn")) return { label: "Quá hạn", tone: "danger" };
  if (plan.risks.includes("Sắp trễ")) return { label: "Sắp trễ", tone: "warn" };
  if (!plan.internalDeadline) return { label: "Chưa có hạn SX", tone: "muted" };
  return { label: "Còn hạn", tone: "default" };
}

export type JobHistoryEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
};

export function buildJobHistoryEvents(input: {
  orderItemId: string;
  stages: ProductionStageRecord[];
  qc: QcInspectionRecord | null;
  files: OrderProductionFileRecord[];
}): JobHistoryEvent[] {
  const events: JobHistoryEvent[] = [];

  for (const stage of input.stages) {
    if (stage.startedAt) {
      events.push({
        id: `stage-start-${stage.id}`,
        at: stage.startedAt,
        title: `Bắt đầu công đoạn ${stage.stageTypeLabel}`,
        detail: stage.assignedEmployeeName ? `Phụ trách: ${stage.assignedEmployeeName}` : undefined,
      });
    }
    if (stage.completedAt) {
      events.push({
        id: `stage-done-${stage.id}`,
        at: stage.completedAt,
        title: `Hoàn thành công đoạn ${stage.stageTypeLabel}`,
        detail: `SL HT: ${stage.completedQuantity}`,
      });
    }
  }

  if (input.qc) {
    events.push({
      id: `qc-created-${input.qc.id}`,
      at: input.qc.createdAt,
      title: "Tạo phiếu QC",
      detail: input.qc.statusLabel,
    });
    if (input.qc.inspectedAt) {
      events.push({
        id: `qc-inspected-${input.qc.id}`,
        at: input.qc.inspectedAt,
        title: "Kiểm tra QC",
        detail: input.qc.inspectedByEmployeeName
          ? `${input.qc.statusLabel} · ${input.qc.inspectedByEmployeeName}`
          : input.qc.statusLabel,
      });
    } else if (input.qc.updatedAt !== input.qc.createdAt) {
      events.push({
        id: `qc-updated-${input.qc.id}`,
        at: input.qc.updatedAt,
        title: "Cập nhật QC",
        detail: input.qc.statusLabel,
      });
    }
  }

  for (const file of input.files) {
    const scoped = !file.orderItemId || file.orderItemId === input.orderItemId;
    if (!scoped) continue;

    events.push({
      id: `file-added-${file.id}`,
      at: file.createdAt,
      title: "Thêm tài liệu",
      detail: file.title ?? file.mediaAsset.filename,
    });

    if (file.status === "ARCHIVED" && file.updatedAt !== file.createdAt) {
      events.push({
        id: `file-archived-${file.id}`,
        at: file.updatedAt,
        title: "Lưu trữ tài liệu",
        detail: file.title ?? file.mediaAsset.filename,
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function formatJobQuantity(plan: ProductionPlanDetail): string {
  return `${plan.quantity.toLocaleString("vi-VN")} ${plan.quantityUnit}`;
}

export function formatJobDeadlineLine(plan: ProductionPlanDetail): string {
  const internal = plan.internalDeadline
    ? `Hạn SX: ${formatOrderDate(plan.internalDeadline)}`
    : "Hạn SX: Chưa có";
  const delivery = plan.deliveryDeadline
    ? `Giao khách: ${formatOrderDate(plan.deliveryDeadline)}`
    : null;
  return delivery ? `${internal} · ${delivery}` : internal;
}
