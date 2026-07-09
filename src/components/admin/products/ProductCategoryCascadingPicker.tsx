"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  formatProductCategoryOptionLabel,
  getActiveChildrenOfParent,
  getActiveParentCategories,
  parentHasActiveChildren,
  resolveCategoryPickerSelection,
  resolveFinalCategoryId,
  type ProductCategoryPickerItem,
} from "@/features/categories/category-cascade-utils";
import { fieldErrorInputClass } from "@/features/products/product-catalog-form-validation";

type Props = {
  categories: ProductCategoryPickerItem[];
  value: string;
  onChange: (categoryId: string) => void;
  error?: string;
  disabled?: boolean;
  embedded?: boolean;
  onClearError?: () => void;
};

export default function ProductCategoryCascadingPicker({
  categories,
  value,
  onChange,
  error,
  disabled = false,
  embedded = false,
  onClearError,
}: Props) {
  const initialSelection = useMemo(
    () => resolveCategoryPickerSelection(value, categories),
    [value, categories],
  );
  const [parentId, setParentId] = useState(initialSelection.parentId);
  const [childId, setChildId] = useState(initialSelection.childId);
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value === lastExternalValue.current) return;
    lastExternalValue.current = value;
    const next = resolveCategoryPickerSelection(value, categories);
    setParentId(next.parentId);
    setChildId(next.childId);
  }, [value, categories]);

  const parentOptions = useMemo(
    () =>
      getActiveParentCategories(categories).map((category) => ({
        value: category.id,
        label: formatProductCategoryOptionLabel(category),
      })),
    [categories],
  );

  const childOptions = useMemo(() => {
    if (!parentId) return [];
    return getActiveChildrenOfParent(categories, parentId).map((category) => ({
      value: category.id,
      label: formatProductCategoryOptionLabel(category),
    }));
  }, [categories, parentId]);

  const parentHasChildren = parentId ? parentHasActiveChildren(categories, parentId) : false;
  const showParentOnlyState = Boolean(parentId && !childId && !parentHasChildren);
  const showMissingChildState = Boolean(
    parentId && !childId && parentHasChildren && value === parentId,
  );

  function emitCategoryChange(nextParentId: string, nextChildId: string) {
    const finalId = resolveFinalCategoryId(nextParentId, nextChildId, categories);
    lastExternalValue.current = finalId;
    onChange(finalId);
    onClearError?.();
  }

  function handleParentChange(nextParentId: string) {
    setParentId(nextParentId);
    setChildId("");
    emitCategoryChange(nextParentId, "");
  }

  function handleChildChange(nextChildId: string) {
    setChildId(nextChildId);
    emitCategoryChange(parentId, nextChildId);
  }

  const selectedParent = categories.find((category) => category.id === parentId);
  const selectedChild = categories.find((category) => category.id === childId);

  return (
    <div
      className="admin-product-category-picker"
      data-field="categoryId"
      aria-invalid={Boolean(error)}
    >
      <fieldset className="admin-product-category-picker__group">
        {!embedded && (
          <legend className="admin-label">
            Danh mục sản phẩm <span className="admin-required">*</span>
          </legend>
        )}
        <div className="admin-product-category-picker__steps">
          <div className="admin-field" data-field="category-parent">
            {!embedded && (
              <label className="admin-label" htmlFor="product-category-parent">
                Loại sản phẩm
              </label>
            )}
            <AdminSearchableSelect
              id="product-category-parent"
              value={parentId}
              onChange={handleParentChange}
              options={parentOptions}
              placeholder={embedded ? "Tìm danh mục sản phẩm..." : "Chọn loại sản phẩm"}
              searchPlaceholder={embedded ? "Tìm danh mục sản phẩm..." : "Tìm loại sản phẩm…"}
              disabled={disabled}
              fallbackLabel={selectedParent ? formatProductCategoryOptionLabel(selectedParent) : undefined}
              className={fieldErrorInputClass(Boolean(error && !parentId))}
            />
          </div>

          <div className="admin-field" data-field="category-child">
            {!embedded && (
              <label className="admin-label" htmlFor="product-category-child">
                Form dáng / Công dụng
              </label>
            )}
            <AdminSearchableSelect
              id="product-category-child"
              value={childId}
              onChange={handleChildChange}
              options={childOptions}
              placeholder={
                embedded
                  ? parentId
                    ? parentHasChildren
                      ? "Chọn danh mục con (nếu có)"
                      : "Không có danh mục con"
                    : "Chọn loại sản phẩm trước"
                  : parentId
                    ? parentHasChildren
                      ? "Chọn form dáng hoặc công dụng"
                      : "Không có danh mục con — dùng loại sản phẩm đã chọn"
                    : "Vui lòng chọn loại sản phẩm trước"
              }
              searchPlaceholder={embedded ? "Tìm danh mục sản phẩm..." : "Tìm form dáng / công dụng…"}
              disabled={disabled || !parentId || !parentHasChildren}
              emptyMessage={
                parentId && !parentHasChildren
                  ? "Loại sản phẩm này không có danh mục con."
                  : undefined
              }
              fallbackLabel={selectedChild ? formatProductCategoryOptionLabel(selectedChild) : undefined}
              className={fieldErrorInputClass(Boolean(error && parentHasChildren && !childId))}
            />
            {showParentOnlyState && (
              <p className="admin-field-hint">Sản phẩm sẽ gắn với loại sản phẩm đã chọn.</p>
            )}
            {showMissingChildState && (
              <p className="admin-field-hint admin-field-hint--warning">
                Chưa chọn danh mục con
              </p>
            )}
          </div>
        </div>
      </fieldset>
      {error && (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
