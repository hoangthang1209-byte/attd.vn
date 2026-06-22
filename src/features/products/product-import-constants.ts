/** Explicit token to clear a field on update imports. */
export const IMPORT_CLEAR_TOKEN = "__CLEAR__";

export const IMPORT_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMPORT_MAX_ROWS = 5000;
export const IMPORT_PREVIEW_PAGE_SIZE = 50;
export const IMPORT_EXECUTE_BATCH_SIZE = 25;

export const PRODUCT_IMPORT_MODES = [
  "create-product",
  "update-product",
  "import-variants",
  "update-variants-bulk",
] as const;

export type ProductImportMode = (typeof PRODUCT_IMPORT_MODES)[number];

export const PRODUCT_IMPORT_MODE_LABELS: Record<ProductImportMode, string> = {
  "create-product": "Tạo sản phẩm mới",
  "update-product": "Cập nhật sản phẩm",
  "import-variants": "Nhập biến thể cho sản phẩm",
  "update-variants-bulk": "Cập nhật biến thể hàng loạt",
};

export const PRODUCT_IMPORT_MODE_HINTS: Record<ProductImportMode, string> = {
  "create-product":
    "Tạo mới: chỉ các dòng hợp lệ trong sheet Sản phẩm/Biến thể/Thông số/Tùy chỉnh được tạo. Không cập nhật sản phẩm đã tồn tại trừ khi chọn xử lý trùng = Cập nhật.",
  "update-product":
    "Cập nhật: khớp theo productCode/systemCode/slug. Ô trống giữ nguyên giá trị hiện có. Dùng __CLEAR__ để xóa giá trị được hỗ trợ. Không tự kích hoạt lại biến thể ngừng/lưu trữ.",
  "import-variants":
    "Nhập biến thể: thêm hoặc cập nhật biến thể cho sản phẩm đã có. Không tạo sản phẩm mới. optionValues: Màu sắc=Đen | Kích thước=M",
  "update-variants-bulk":
    "Cập nhật hàng loạt: tồn kho, MOQ, lead time, SKU, ảnh theo SKU hoặc optionValues. Ô trống giữ nguyên; __CLEAR__ để xóa override.",
};

export const IMPORT_ENTITY_TYPES = [
  "product",
  "variant",
  "specification",
  "customization",
] as const;

export type ProductImportEntityType = (typeof IMPORT_ENTITY_TYPES)[number];

export const IMPORT_SHEET_NAMES: Record<ProductImportEntityType | "guide", string> = {
  guide: "Hướng dẫn",
  product: "Sản phẩm",
  variant: "Biến thể",
  specification: "Thông số",
  customization: "Tùy chỉnh",
};

export const IMPORT_PROGRESS_STAGES = [
  "reading",
  "validating",
  "ready",
  "executing",
  "done",
] as const;

export type ImportProgressStage = (typeof IMPORT_PROGRESS_STAGES)[number];

export const IMPORT_PROGRESS_LABELS: Record<ImportProgressStage, string> = {
  reading: "Đang đọc tệp",
  validating: "Đang kiểm tra dữ liệu",
  ready: "Sẵn sàng nhập",
  executing: "Đang nhập dữ liệu",
  done: "Hoàn tất",
};
