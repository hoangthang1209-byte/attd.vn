import type { OrderItemProductionApprovalStatus } from "@prisma/client";

export const PRODUCTION_APPROVAL_STATUS_LABELS: Record<
  OrderItemProductionApprovalStatus,
  string
> = {
  PENDING: "Chưa duyệt sản xuất",
  NEEDS_REVISION: "Cần chỉnh duyệt",
  RELEASED: "Đã duyệt sản xuất",
};
