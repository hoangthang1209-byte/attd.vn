export const CATEGORY_NAME_VI_REQUIRED = "Vui lòng nhập tên danh mục tiếng Việt.";
export const CATEGORY_NAME_EN_REQUIRED = "Vui lòng nhập tên danh mục tiếng Anh.";
export const CATEGORY_CODE_FORMAT_ERROR = "Mã danh mục phải gồm đúng 4 chữ cái in hoa.";
export const CATEGORY_CODE_DUPLICATE_ERROR =
  "Mã danh mục đã được sử dụng. Vui lòng chọn mã khác.";
export const CATEGORY_CODE_GENERATION_FAILED =
  "Không thể tự tạo mã 4 chữ cái chưa trùng. Vui lòng nhập mã thủ công.";

export const CATEGORY_PARENT_NOT_LEVEL1_ERROR =
  "Chỉ có thể chọn danh mục cấp 1 làm danh mục cha.";

export const CATEGORY_PARENT_HAS_CHILDREN_ERROR =
  "Không thể đặt danh mục cha vì danh mục này đang có danh mục con.";

export const CATEGORY_MAX_DEPTH_ERROR =
  "Danh mục chỉ được có tối đa 2 cấp (loại sản phẩm và form/công dụng).";

export const FOUR_LETTER_CATEGORY_CODE_REGEX = /^[A-Z]{4}$/;

export function isValidFourLetterCategoryCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return false;
  return FOUR_LETTER_CATEGORY_CODE_REGEX.test(code.trim().toUpperCase());
}

export function normalizeFourLetterCategoryCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
}
