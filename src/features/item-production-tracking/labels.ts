import type {
  ItemProductionBatchStatus,
  ItemProductionDeliveryStatus,
  ItemProductionProgressEventType,
  ItemProductionRiskStatus,
  ItemProductionStageStatus,
  ItemProductionStatus,
} from "@prisma/client";

export const ITEM_PRODUCTION_STATUS_LABELS: Record<ItemProductionStatus, string> = {
  DRAFT: "Nháp",
  PLANNED: "Đã lên kế hoạch",
  IN_PRODUCTION: "Đang sản xuất",
  FINISHING: "Đang hoàn thiện",
  COMPLETED: "Hoàn thành",
  ON_HOLD: "Tạm dừng",
  CANCELLED: "Đã hủy",
};

export const ITEM_PRODUCTION_STAGE_STATUS_LABELS: Record<ItemProductionStageStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  BLOCKED: "Bị chặn",
  SKIPPED: "Không áp dụng",
};

export const ITEM_PRODUCTION_DELIVERY_STATUS_LABELS: Record<ItemProductionDeliveryStatus, string> = {
  NOT_READY: "Chưa sẵn sàng",
  PARTIALLY_READY: "Sẵn sàng một phần",
  READY: "Sẵn sàng giao",
  PARTIALLY_SHIPPED: "Đã giao một phần",
  SHIPPED: "Đã giao",
};

export const ITEM_PRODUCTION_RISK_LABELS: Record<ItemProductionRiskStatus, string> = {
  ON_TRACK: "Đúng tiến độ",
  NEEDS_ATTENTION: "Cần chú ý",
  AT_RISK: "Nguy cơ trễ",
  DELAYED: "Đã trễ",
  BLOCKED: "Bị chặn",
};

export const ITEM_PRODUCTION_EVENT_LABELS: Record<ItemProductionProgressEventType, string> = {
  START: "Bắt đầu công đoạn",
  PROGRESS_UPDATE: "Cập nhật tiến độ",
  COMPLETE: "Hoàn thành công đoạn",
  BLOCK: "Đánh dấu bị chặn",
  UNBLOCK: "Bỏ chặn",
  REOPEN: "Mở lại công đoạn",
  SKIP: "Bỏ qua công đoạn",
  NOTE: "Ghi chú",
};

export const ITEM_PRODUCTION_BATCH_STATUS_LABELS: Record<ItemProductionBatchStatus, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ITEM_PRODUCTION_SAMPLE_STATUS_LABELS: Record<
  import("@prisma/client").ItemProductionSampleStatus,
  string
> = {
  NOT_STARTED: "Chưa làm mẫu",
  IN_PROGRESS: "Đang làm mẫu",
  WAITING_CUSTOMER: "Chờ khách duyệt",
  NEEDS_REVISION: "Cần chỉnh mẫu",
  APPROVED: "Đã duyệt",
};

export const ITEM_PRODUCTION_ISSUE_TYPE_LABELS: Record<
  import("@prisma/client").ItemProductionIssueType,
  string
> = {
  MISSING_MATERIAL: "Thiếu nguyên liệu",
  FACTORY_DELAY: "Xưởng chậm",
  WRONG_COLOR: "Sai màu",
  PRINT_DEFECT: "In lỗi",
  EMBROIDERY_DEFECT: "Thêu lỗi",
  WASH_DEFECT: "Wash lỗi",
  SEWING_DEFECT: "May lỗi",
  QC_DEFECT: "QC lỗi",
  WAITING_CUSTOMER: "Chờ khách duyệt",
  WAITING_SUPPLIER: "Chờ nhà cung cấp",
  OTHER: "Khác",
};
