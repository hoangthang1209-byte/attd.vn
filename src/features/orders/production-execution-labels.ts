import type {
  ProductionStageStatus,
  ProductionStageType,
  QcEvidenceType,
  QcInspectionStatus,
} from "@prisma/client";

export const PRODUCTION_STAGE_TYPE_LABELS: Record<ProductionStageType, string> = {
  CUTTING: "Cắt",
  SEWING: "May",
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  FINISHING: "Hoàn thiện",
  QC: "Kiểm tra chất lượng",
  PACKING: "Đóng gói",
  OTHER: "Khác",
};

export const PRODUCTION_STAGE_STATUS_LABELS: Record<ProductionStageStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  BLOCKED: "Tạm dừng",
  COMPLETED: "Hoàn thành",
  SKIPPED: "Không áp dụng",
};

export const QC_INSPECTION_STATUS_LABELS: Record<QcInspectionStatus, string> = {
  DRAFT: "Chưa hoàn tất",
  PASSED: "Đạt",
  PASSED_WITH_NOTE: "Đạt có ghi chú",
  FAILED: "Không đạt",
  REWORK_REQUIRED: "Cần làm lại",
};

export const QC_EVIDENCE_TYPE_LABELS: Record<QcEvidenceType, string> = {
  DEFECT: "Lỗi phát hiện",
  PASSED_SAMPLE: "Mẫu đạt",
  PACKING: "Đóng gói",
  FINAL_PRODUCT: "Thành phẩm cuối",
  OTHER: "Khác",
};

export const DEFAULT_PRODUCTION_STAGE_TYPES: ProductionStageType[] = [
  "CUTTING",
  "SEWING",
  "PRINTING",
  "EMBROIDERY",
  "FINISHING",
  "QC",
  "PACKING",
];

export const DEFAULT_STAGE_SORT_ORDER: Record<ProductionStageType, number> = {
  CUTTING: 0,
  SEWING: 1,
  PRINTING: 2,
  EMBROIDERY: 3,
  FINISHING: 4,
  QC: 5,
  PACKING: 6,
  OTHER: 99,
};

export type HandoverReadinessState =
  | "NOT_READY"
  | "NEEDS_QC"
  | "NEEDS_REWORK"
  | "READY"
  | "HANDED_OVER";

export const HANDOVER_READINESS_LABELS: Record<HandoverReadinessState, string> = {
  NOT_READY: "Chưa đủ điều kiện",
  NEEDS_QC: "Cần QC",
  NEEDS_REWORK: "Cần làm lại",
  READY: "Đủ điều kiện bàn giao",
  HANDED_OVER: "Đã bàn giao sang giao hàng",
};

export type ProductionBoardQcFilter =
  | "all"
  | "no_qc"
  | "passed"
  | "rework"
  | "not_ready"
  | "ready";

export const PRODUCTION_BOARD_QC_FILTER_LABELS: Record<ProductionBoardQcFilter, string> = {
  all: "Tất cả",
  no_qc: "Chưa QC",
  passed: "Đạt QC",
  rework: "Cần làm lại",
  not_ready: "Chưa đủ điều kiện bàn giao",
  ready: "Đủ điều kiện bàn giao",
};
