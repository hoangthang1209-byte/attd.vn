import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";
import type { OrderItemReadinessState } from "@/features/orders/order-item-readiness";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import type { ProductionExecutionBundle, OrderItemExecutionBundle } from "@/features/orders/production-execution.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";

export type ProductProgressBadge =
  | "WAITING_DOCS"
  | "PREPARING"
  | "IN_PRODUCTION"
  | "WAITING_QC"
  | "COMPLETED"
  | "OVERDUE";

export const PRODUCT_PROGRESS_LABELS: Record<ProductProgressBadge, string> = {
  WAITING_DOCS: "Chờ tài liệu",
  PREPARING: "Chuẩn bị SX",
  IN_PRODUCTION: "Đang sản xuất",
  WAITING_QC: "Chờ QC",
  COMPLETED: "Hoàn thành",
  OVERDUE: "Quá hạn",
};

export type DocumentStatusLabel = "Đủ" | "Thiếu" | "Cần cập nhật";

export type MaterialStatusLabel = "Đủ" | "Thiếu bo" | "Thiếu vải" | "Chờ xác nhận";

export type QcStatusLabel = "Chờ QC" | "Kiểm tra" | "Đạt" | "Cần làm lại";

export function mapReadinessToProgressBadge(state: OrderItemReadinessState): ProductProgressBadge {
  switch (state) {
    case "MISSING_DOCS":
      return "WAITING_DOCS";
    case "AWAITING_PRODUCTION":
      return "PREPARING";
    case "IN_PRODUCTION":
      return "IN_PRODUCTION";
    case "AWAITING_QC":
      return "WAITING_QC";
    case "READY_TO_SHIP":
      return "COMPLETED";
    case "NEEDS_ATTENTION":
      return "OVERDUE";
    default:
      return "PREPARING";
  }
}

export function deriveDocumentStatus(item: OrderItemExecutionBundle): DocumentStatusLabel {
  if (item.readiness.state === "MISSING_DOCS") return "Thiếu";
  if (item.activeFileCount === 0) return "Thiếu";
  const hasBlockedStage = item.stages.some((s) => s.status === "BLOCKED");
  if (hasBlockedStage) return "Cần cập nhật";
  return "Đủ";
}

export function deriveQcStatus(qc: QcInspectionRecord | null): QcStatusLabel {
  if (!qc) return "Chờ QC";
  switch (qc.status) {
    case "DRAFT":
      return "Kiểm tra";
    case "PASSED":
    case "PASSED_WITH_NOTE":
      return "Đạt";
    case "FAILED":
    case "REWORK_REQUIRED":
      return "Cần làm lại";
    default:
      return "Chờ QC";
  }
}

export function deriveProgressPercent(item: OrderItemExecutionBundle): number | null {
  if (item.stages.length === 0) return null;
  const summary = computeStageProgressSummary(item.stages);
  if (summary.applicableCount === 0) return null;
  return Math.round((summary.completedCount / summary.applicableCount) * 100);
}

type ItemMaterialRow = {
  orderItemId: string;
  materials: Array<{ id: string; materialType: string }>;
};

export function deriveMaterialStatus(
  orderItemId: string,
  itemMaterials: ItemMaterialRow[],
  availabilityRows: MaterialAvailabilityRow[],
): MaterialStatusLabel {
  const itemRow = itemMaterials.find((r) => r.orderItemId === orderItemId);
  if (!itemRow || itemRow.materials.length === 0) return "Chờ xác nhận";

  const requirementIds = new Set(itemRow.materials.map((m) => m.id));
  const relatedRows = availabilityRows.filter((row) =>
    row.orderMaterialRequirementIds.some((reqId) => requirementIds.has(reqId)),
  );

  if (relatedRows.length === 0) {
    if (availabilityRows.length === 0) return "Chờ xác nhận";
    const hasShortage = availabilityRows.some((r) => r.warehouseStatus === "SHORTAGE");
    const allEnough = availabilityRows.every(
      (r) => r.warehouseStatus === "ENOUGH" || r.warehouseStatus === "RESERVED" || r.warehouseStatus === "ISSUED",
    );
    if (allEnough) return "Đủ";
    if (hasShortage) {
      if (availabilityRows.some((r) => r.warehouseStatus === "SHORTAGE" && /FABRIC|vải/i.test(r.materialType))) {
        return "Thiếu vải";
      }
      return "Thiếu bo";
    }
    return "Chờ xác nhận";
  }

  const hasShortage = relatedRows.some((r) => r.warehouseStatus === "SHORTAGE");
  if (!hasShortage) {
    const ok = relatedRows.every(
      (r) => r.warehouseStatus === "ENOUGH" || r.warehouseStatus === "RESERVED" || r.warehouseStatus === "ISSUED",
    );
    if (ok) return "Đủ";
  }
  if (relatedRows.some((r) => r.warehouseStatus === "SHORTAGE" && /FABRIC|vải/i.test(r.materialType))) {
    return "Thiếu vải";
  }
  if (hasShortage) return "Thiếu bo";
  return "Chờ xác nhận";
}

export type ProductionSummaryCounts = {
  total: number;
  preparing: number;
  inProduction: number;
  waitingQc: number;
  completed: number;
  hasIssues: number;
  missingDocs: number;
  missingMaterials: number;
};

export function aggregateProductionSummary(
  bundle: ProductionExecutionBundle | null,
  materialRows: MaterialAvailabilityRow[],
): ProductionSummaryCounts {
  const items = bundle?.items ?? [];
  const counts: ProductionSummaryCounts = {
    total: items.length,
    preparing: 0,
    inProduction: 0,
    waitingQc: 0,
    completed: 0,
    hasIssues: 0,
    missingDocs: 0,
    missingMaterials: 0,
  };

  for (const item of items) {
    switch (item.readiness.state) {
      case "AWAITING_PRODUCTION":
        counts.preparing += 1;
        break;
      case "IN_PRODUCTION":
        counts.inProduction += 1;
        break;
      case "AWAITING_QC":
        counts.waitingQc += 1;
        break;
      case "READY_TO_SHIP":
        counts.completed += 1;
        break;
      case "MISSING_DOCS":
        counts.missingDocs += 1;
        break;
      case "NEEDS_ATTENTION":
        counts.hasIssues += 1;
        break;
      default:
        break;
    }
  }

  if (materialRows.some((r) => r.warehouseStatus === "SHORTAGE")) {
    counts.missingMaterials = items.length > 0 ? 1 : 0;
  }

  return counts;
}

export function findExecutionBundleForItem(
  bundle: ProductionExecutionBundle | null,
  orderItemId: string,
): OrderItemExecutionBundle | null {
  if (!bundle) return null;
  return bundle.items.find((i) => i.orderItemId === orderItemId) ?? null;
}
