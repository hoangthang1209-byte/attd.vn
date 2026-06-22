/** Maximum products per export request. */
export const EXPORT_MAX_PRODUCTS = 500;

export const EXPORT_ENTITY_TYPES = ["product", "variant", "specification", "customization"] as const;
export type ExportEntityType = (typeof EXPORT_ENTITY_TYPES)[number];

export const EXPORT_SCOPE_TYPES = [
  "selected",
  "filtered",
  "single",
  "all",
] as const;

export type ExportScopeType = (typeof EXPORT_SCOPE_TYPES)[number];

export const EXPORT_SCOPE_LABELS: Record<ExportScopeType, string> = {
  selected: "Sản phẩm đã chọn",
  filtered: "Theo bộ lọc hiện tại",
  single: "Một sản phẩm",
  all: "Toàn bộ danh mục",
};

export const EXPORT_FORMATS = ["xlsx", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
