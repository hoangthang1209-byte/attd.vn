import type { MaterialType, ProductionFileStatus, ProductionFileType } from "@prisma/client";

export const PRODUCTION_FILE_TYPE_LABELS: Record<ProductionFileType, string> = {
  DESIGN_ARTWORK: "File thiết kế in / thêu",
  VECTOR_SOURCE: "File vector gốc",
  TECH_PACK: "Tài liệu kỹ thuật",
  SIZE_CHART: "Bảng size / thông số",
  MOCKUP_REFERENCE: "Mockup / hình tham chiếu",
  MATERIAL_BOM: "BOM / nguyên phụ liệu",
  QC_GUIDE: "Hướng dẫn QC",
  PACKING_GUIDE: "Hướng dẫn đóng gói",
  PRODUCTION_NOTE: "Ghi chú sản xuất",
  OTHER: "Khác",
};

export const PRODUCTION_FILE_STATUS_LABELS: Record<ProductionFileStatus, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang sử dụng",
  ARCHIVED: "Đã lưu trữ",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  MAIN_FABRIC: "Vải chính",
  RIB_FABRIC: "Vải bo",
  LINING: "Vải lót",
  THREAD: "Chỉ may",
  ZIPPER: "Dây kéo",
  BUTTON: "Nút",
  LABEL: "Nhãn",
  HANGTAG: "Thẻ treo",
  PRINTING: "In",
  EMBROIDERY: "Thêu",
  PACKAGING: "Túi đóng gói",
  CARTON: "Thùng carton",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export const PRODUCTION_FILE_TYPES = Object.keys(
  PRODUCTION_FILE_TYPE_LABELS,
) as ProductionFileType[];

export const MATERIAL_TYPES = Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[];

export const DESIGN_FILE_TYPES: ProductionFileType[] = [
  "DESIGN_ARTWORK",
  "VECTOR_SOURCE",
  "TECH_PACK",
  "SIZE_CHART",
  "MOCKUP_REFERENCE",
];
