import {
  PrintMethodCategory,
  ProductionMaterialCategory,
  ProductionTrimCategory,
} from "@prisma/client";

export const PRODUCTION_MATERIAL_CATEGORY_LABELS: Record<ProductionMaterialCategory, string> = {
  MAIN_FABRIC: "Vải chính",
  RIB: "Bo cổ/tay",
  LINING: "Lót",
  INTERLINING: "Vải dính",
  MESH: "Lưới",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export const PRODUCTION_TRIM_CATEGORY_LABELS: Record<ProductionTrimCategory, string> = {
  BUTTON: "Nút/cúc",
  ZIPPER: "Khóa kéo",
  LABEL: "Nhãn/mác",
  THREAD: "Chỉ",
  ELASTIC: "Thun",
  DRAWCORD: "Dây rút",
  TAPE: "Viền/dây",
  ACCESSORY: "Phụ kiện",
  OTHER: "Khác",
};

export const PRINT_METHOD_CATEGORY_LABELS: Record<PrintMethodCategory, string> = {
  SCREEN_PRINT: "In lụa",
  DTG: "DTG",
  DTF: "DTF",
  EMBROIDERY: "Thêu",
  HEAT_TRANSFER: "Ép nhiệt",
  SUBLIMATION: "Sublimation",
  PATCH: "Patch",
  OTHER: "Khác",
};

export const PRODUCTION_MATERIAL_CATEGORIES = Object.keys(
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
) as ProductionMaterialCategory[];

export const PRODUCTION_TRIM_CATEGORIES = Object.keys(
  PRODUCTION_TRIM_CATEGORY_LABELS,
) as ProductionTrimCategory[];

export const PRINT_METHOD_CATEGORIES = Object.keys(
  PRINT_METHOD_CATEGORY_LABELS,
) as PrintMethodCategory[];

export const SUPPLIER_CATEGORY_LABELS: Record<string, string> = {
  PATTERN_ROOM: "Phòng rập",
  FABRIC_SUPPLIER: "Nhà cung cấp vải",
  TRIM_SUPPLIER: "Nhà cung cấp phụ liệu",
  PRINT_EMBROIDERY: "In / thêu",
  SEWING_FACTORY: "Xưởng may",
  WASH_FACTORY: "Xưởng giặt",
  LOGISTICS: "Vận chuyển",
  GENERAL: "Chung",
};

export const SUPPLIER_CATEGORIES = Object.keys(SUPPLIER_CATEGORY_LABELS);
