import {
  ArtworkPlacementType,
  TechPackBomCategory,
  TechPackReleaseAction,
} from "@prisma/client";

export const TECH_PACK_BOM_CATEGORY_LABELS: Record<TechPackBomCategory, string> = {
  MAIN_FABRIC: "Vải chính",
  RIB: "Bo cổ/tay",
  COLLAR: "Cổ áo",
  CUFF: "Bo tay",
  NECK_LABEL: "Mác cổ",
  CARE_LABEL: "Mác giặt",
  HANG_TAG: "Thẻ treo",
  POLY_BAG: "Túi poly",
  CARTON: "Thùng carton",
  THREAD: "Chỉ may",
  BUTTON: "Nút/cúc",
  ZIPPER: "Khóa kéo",
  DRAWCORD: "Dây rút",
  ELASTIC: "Thun",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export const ARTWORK_PLACEMENT_TYPE_LABELS: Record<ArtworkPlacementType, string> = {
  PRINT: "In",
  EMBROIDERY: "Thêu",
  LABEL: "Nhãn",
  PATCH: "Patch",
  HEAT_TRANSFER: "Ép nhiệt",
  SUBLIMATION: "Sublimation",
  OTHER: "Khác",
};

export const TECH_PACK_RELEASE_ACTION_LABELS: Record<TechPackReleaseAction, string> = {
  CREATED: "Đã tạo",
  UPDATED: "Đã cập nhật",
  RELEASED: "Đã phát hành",
  SUPERSEDED: "Bị thay thế",
  NEW_VERSION: "Tạo version mới",
  SELECT_PATTERN: "Chọn rập",
  COPY_TEMPLATE: "Áp dụng mẫu thông số",
};

export const TECH_PACK_BOM_CATEGORIES = Object.keys(
  TECH_PACK_BOM_CATEGORY_LABELS,
) as TechPackBomCategory[];

export const ARTWORK_PLACEMENT_TYPES = Object.keys(
  ARTWORK_PLACEMENT_TYPE_LABELS,
) as ArtworkPlacementType[];
