import type {
  DeliveryAttemptResult,
  DeliveryExecutionStatus,
  DeliveryProofType,
} from "@prisma/client";

export const DELIVERY_EXECUTION_STATUS_LABELS: Record<DeliveryExecutionStatus, string> = {
  DRAFT: "Bản nháp",
  READY_TO_DISPATCH: "Sẵn sàng xuất hàng",
  DISPATCHED: "Đã xuất hàng",
  IN_TRANSIT: "Đang giao",
  PARTIALLY_DELIVERED: "Giao một phần",
  DELIVERED: "Giao thành công",
  DELIVERY_FAILED: "Giao thất bại",
  RETURNING: "Đang hoàn hàng",
  RETURNED: "Đã hoàn hàng",
  CANCELLED: "Đã hủy",
};

export const DELIVERY_ATTEMPT_RESULT_LABELS: Record<DeliveryAttemptResult, string> = {
  PENDING: "Chưa có kết quả",
  DELIVERED: "Giao thành công",
  PARTIAL: "Giao một phần",
  FAILED: "Giao thất bại",
  REFUSED: "Khách từ chối nhận",
  NO_RECIPIENT: "Không liên hệ được người nhận",
  WRONG_ADDRESS: "Sai / không tìm thấy địa chỉ",
  DAMAGED: "Hàng hư hỏng khi giao",
  RETURNED: "Hoàn hàng",
};

export const DELIVERY_PROOF_TYPE_LABELS: Record<DeliveryProofType, string> = {
  SIGNED_RECEIPT: "Phiếu ký nhận",
  DELIVERY_PHOTO: "Ảnh giao hàng",
  RECIPIENT_CONFIRMATION: "Xác nhận người nhận",
  DAMAGE_EVIDENCE: "Bằng chứng hư hỏng",
  RETURN_DOCUMENT: "Biên bản hoàn hàng",
  OTHER: "Khác",
};

export type DeliveryCompletionState =
  | "NOT_DISPATCHED"
  | "IN_DELIVERY"
  | "PARTIAL"
  | "FULLY_DELIVERED"
  | "HAS_RETURN_OR_DAMAGE"
  | "CAN_COMPLETE"
  | "NEEDS_ATTENTION";

export const DELIVERY_COMPLETION_STATE_LABELS: Record<DeliveryCompletionState, string> = {
  NOT_DISPATCHED: "Chưa xuất hàng",
  IN_DELIVERY: "Đang giao",
  PARTIAL: "Giao một phần",
  FULLY_DELIVERED: "Đã giao đủ",
  HAS_RETURN_OR_DAMAGE: "Có hàng hoàn / hư hỏng",
  CAN_COMPLETE: "Có thể hoàn tất đơn",
  NEEDS_ATTENTION: "Cần xử lý thêm",
};

export type DeliveryBoardExecutionFilter =
  | "awaiting_dispatch"
  | "in_transit"
  | "partial"
  | "failed"
  | "fully_delivered"
  | "needs_completion";

export type DeliveryBoardAttemptFilter =
  | "pending"
  | "delivered"
  | "partial"
  | "failed"
  | "returned";

export type DeliveryBoardProofFilter = "has_proof" | "missing_proof";

export type DeliveryBoardCompletionFilter =
  | "can_complete"
  | "needs_attention"
  | "not_dispatched";
