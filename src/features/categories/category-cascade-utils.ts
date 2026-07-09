export type ProductCategoryPickerItem = {
  id: string;
  name: string;
  nameEn?: string | null;
  skuCode?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  imageUrl?: string | null;
};

export function formatProductCategoryOptionLabel(category: ProductCategoryPickerItem): string {
  const english = category.nameEn?.trim();
  const code = category.skuCode?.trim();
  let label = category.name;
  if (english) {
    label = `${category.name} — ${english}`;
  }
  if (code) {
    label += ` (${code})`;
  }
  return label;
}

export function isCategoryActive(category: ProductCategoryPickerItem): boolean {
  return category.isActive !== false;
}

export function getActiveParentCategories(
  categories: ProductCategoryPickerItem[],
): ProductCategoryPickerItem[] {
  return categories
    .filter((category) => !category.parentId && isCategoryActive(category))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function getActiveChildrenOfParent(
  categories: ProductCategoryPickerItem[],
  parentId: string,
): ProductCategoryPickerItem[] {
  return categories
    .filter(
      (category) => category.parentId === parentId && isCategoryActive(category),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function parentHasActiveChildren(
  categories: ProductCategoryPickerItem[],
  parentId: string,
): boolean {
  return getActiveChildrenOfParent(categories, parentId).length > 0;
}

export type CategoryPickerSelection = {
  parentId: string;
  childId: string;
  isParentOnly: boolean;
};

export function resolveCategoryPickerSelection(
  categoryId: string,
  categories: ProductCategoryPickerItem[],
): CategoryPickerSelection {
  if (!categoryId) {
    return { parentId: "", childId: "", isParentOnly: false };
  }

  const selected = categories.find((category) => category.id === categoryId);
  if (!selected) {
    return { parentId: "", childId: "", isParentOnly: false };
  }

  if (selected.parentId) {
    return {
      parentId: selected.parentId,
      childId: selected.id,
      isParentOnly: false,
    };
  }

  return {
    parentId: selected.id,
    childId: "",
    isParentOnly: true,
  };
}

export function resolveFinalCategoryId(
  parentId: string,
  childId: string,
  categories: ProductCategoryPickerItem[],
): string {
  if (childId) return childId;
  if (!parentId) return "";
  if (parentHasActiveChildren(categories, parentId)) return "";
  return parentId;
}

export const CATEGORY_CHILD_REQUIRED_ERROR =
  "Vui lòng chọn form dáng hoặc công dụng cho loại sản phẩm này.";

export function validateProductCategorySelection(
  categoryId: string,
  categories: ProductCategoryPickerItem[],
): string | null {
  if (!categoryId) {
    return "Vui lòng chọn danh mục.";
  }

  const selected = categories.find((category) => category.id === categoryId);
  if (!selected) {
    return "Danh mục không hợp lệ.";
  }

  if (!selected.parentId) {
    if (parentHasActiveChildren(categories, selected.id)) {
      return CATEGORY_CHILD_REQUIRED_ERROR;
    }
  }

  return null;
}
