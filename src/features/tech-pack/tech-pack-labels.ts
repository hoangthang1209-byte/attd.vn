import type { PatternStatus, TechPackAssetType, TechPackStatus } from "@prisma/client";

export const TECH_PACK_STATUS_LABELS: Record<TechPackStatus, string> = {
  DRAFT: "Bản nháp",
  RELEASED: "Đã phát hành",
  SUPERSEDED: "Bị thay thế",
};

export const PATTERN_STATUS_LABELS: Record<PatternStatus, string> = {
  DRAFT: "Bản nháp",
  APPROVED: "Đã duyệt",
  ARCHIVED: "Lưu trữ",
};

export const TECH_PACK_ASSET_TYPE_LABELS: Record<TechPackAssetType, string> = {
  FLAT_SKETCH_FRONT: "Flat sketch trước",
  FLAT_SKETCH_BACK: "Flat sketch sau",
  LOGO_PLACEMENT: "Placement logo",
  PRINT_PLACEMENT: "Placement in",
  EMBROIDERY_PLACEMENT: "Placement thêu",
  CONSTRUCTION_CALLOUT: "Construction callout",
  MEASUREMENT_DIAGRAM: "Sơ đồ đo",
  ARTWORK_REFERENCE: "Artwork reference",
  OTHER: "Khác",
};

export const PRIVATE_FILE_HINT = "File gốc được lưu riêng tư";

export const TECH_PACK_SOURCE_TYPE_LABELS: Record<string, string> = {
  FROM_QUOTE: "Từ báo giá (chưa có đơn hàng)",
};
