import type { MaterialStockAdjustmentType, MaterialType, OrderMaterialAllocationStatus, PurchaseRequestStatus } from "@prisma/client";

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  MAIN_FABRIC: "Vải chính",
  RIB_FABRIC: "Vải bo",
  LINING: "Lót",
  THREAD: "Chỉ",
  ZIPPER: "Dây kéo",
  BUTTON: "Nút",
  LABEL: "Nhãn",
  HANGTAG: "Thẻ treo",
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  PACKAGING: "Đóng gói",
  CARTON: "Carton",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export const WAREHOUSE_STATUS_LABELS = {
  undeclared: "Chưa khai báo tồn",
  enough: "Đủ",
  low: "Sắp thiếu",
  shortage: "Thiếu",
} as const;

export const MATERIAL_AVAILABILITY_LABELS = {
  UNKNOWN: "Chưa khai báo tồn kho",
  ENOUGH: "Đủ vật tư",
  SHORTAGE: "Thiếu vật tư",
  RESERVED: "Đã giữ cho đơn",
  ISSUED: "Đã cấp cho sản xuất",
} as const;

export const ALLOCATION_STATUS_LABELS: Record<OrderMaterialAllocationStatus, string> = {
  PENDING: "Chờ xử lý",
  PARTIALLY_RESERVED: "Giữ một phần",
  RESERVED: "Đã giữ",
  PARTIALLY_ISSUED: "Cấp một phần",
  ISSUED: "Đã cấp",
  RELEASED: "Đã trả giữ",
};

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: "Nháp",
  REQUESTED: "Đã gửi yêu cầu",
  ORDERED: "Đã đặt hàng",
  PARTIALLY_RECEIVED: "Nhận một phần",
  RECEIVED: "Đã nhận đủ",
  CANCELLED: "Đã hủy",
};

export const STOCK_ADJUSTMENT_TYPE_LABELS: Record<MaterialStockAdjustmentType, string> = {
  OPENING_BALANCE: "Tồn đầu kỳ",
  RECEIVE: "Nhập kho",
  CORRECTION: "Điều chỉnh",
  ISSUE_TO_PRODUCTION: "Cấp sản xuất",
  RETURN_FROM_PRODUCTION: "Trả từ sản xuất",
};

export const MATERIAL_TYPES = Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[];
