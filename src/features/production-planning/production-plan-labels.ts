import type { ProductionPlanPriority, ProductionPlanStatus } from "@prisma/client";
import type {
  ProductionPlanDocStatus,
  ProductionPlanMaterialStatus,
  ProductionPlanQcStatus,
} from "@/features/production-planning/production-plan.types";

export const PRODUCTION_PLAN_STATUS_LABELS: Record<ProductionPlanStatus, string> = {
  NOT_PLANNED: "Chưa lập kế hoạch",
  WAITING_DOCUMENTS: "Thiếu tài liệu",
  WAITING_MATERIALS: "Thiếu vật tư",
  READY_TO_START: "Sẵn sàng bắt đầu",
  IN_PROGRESS: "Đang sản xuất",
  WAITING_QC: "Chờ QC",
  REWORK: "Cần làm lại",
  COMPLETED: "Hoàn thành",
  ON_HOLD: "Tạm dừng",
};

export const PRODUCTION_PLAN_PRIORITY_LABELS: Record<ProductionPlanPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Bình thường",
  HIGH: "Cao",
  URGENT: "Khẩn",
};

export const PRODUCTION_PLAN_DOC_STATUS_LABELS: Record<ProductionPlanDocStatus, string> = {
  ok: "Đủ",
  missing: "Thiếu",
  needs_update: "Cần cập nhật",
};

export const PRODUCTION_PLAN_MATERIAL_STATUS_LABELS: Record<ProductionPlanMaterialStatus, string> = {
  ok: "Đủ",
  shortage: "Thiếu",
  pending: "Chờ xác nhận",
};

export const PRODUCTION_PLAN_QC_STATUS_LABELS: Record<ProductionPlanQcStatus, string> = {
  not_applicable: "Chưa đến bước QC",
  awaiting: "Chờ QC",
  passed: "Đạt",
  rework: "Cần làm lại",
};

export const PRODUCTION_BOARD_COLUMN_LABELS: Record<string, string> = {
  waiting_docs: "Chờ đủ tài liệu",
  waiting_materials: "Chờ vật tư",
  ready_to_start: "Sẵn sàng bắt đầu",
  in_progress: "Đang sản xuất",
  awaiting_qc: "Chờ QC",
  rework: "Cần làm lại",
  completed: "Hoàn thành",
};

export const WORKSHOP_PRESETS = [
  "Xưởng may A",
  "Tổ in",
  "Tổ thêu",
  "Gia công ngoài",
] as const;
