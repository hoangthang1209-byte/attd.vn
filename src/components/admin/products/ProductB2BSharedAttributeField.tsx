"use client";

import Link from "next/link";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { ProductAttributeAssignmentFormRow } from "@/features/products/product-catalog-form-mappers";
import { fieldErrorInputClass } from "@/features/products/product-catalog-form-validation";
import {
  assignmentFieldError,
  B2B_ATTRIBUTE_UNAVAILABLE_MESSAGES,
  findAssignmentForAttribute,
  findSharedAttributeByCode,
  formatSharedValueLabel,
  listSelectableSharedValues,
  removeAssignmentForAttribute,
  type B2BManagedAttributeCode,
  upsertAssignmentForAttribute,
} from "@/features/products/product-b2b-attribute-controls.utils";

type Props = {
  attributeCode: B2BManagedAttributeCode;
  label: string;
  customValueActionLabel: string;
  assignments: ProductAttributeAssignmentFormRow[];
  sharedAttributes: SharedAttributePickerOption[];
  sharedAttributesLoading?: boolean;
  fieldErrors?: Record<string, string>;
  onAssignmentsChange: (rows: ProductAttributeAssignmentFormRow[]) => void;
  onRefreshSharedAttributes?: () => void;
};

export default function ProductB2BSharedAttributeField({
  attributeCode,
  label,
  customValueActionLabel,
  assignments,
  sharedAttributes,
  sharedAttributesLoading = false,
  fieldErrors = {},
  onAssignmentsChange,
  onRefreshSharedAttributes,
}: Props) {
  const attribute = findSharedAttributeByCode(sharedAttributes, attributeCode);
  const assignment = attribute ? findAssignmentForAttribute(assignments, attribute.id) : undefined;
  const valueError =
    (attribute &&
      (assignmentFieldError(fieldErrors, assignments, attribute.id, "attributeValueId") ??
        assignmentFieldError(fieldErrors, assignments, attribute.id, "customValue"))) ??
    undefined;
  const duplicateError =
    attribute && assignmentFieldError(fieldErrors, assignments, attribute.id, "attributeId");

  const selectableValues = attribute
    ? listSelectableSharedValues(attribute, assignment?.attributeValueId, {
        allowLegacyFitValues: true,
      })
    : [];

  const selectOptions = selectableValues.map((value) => ({
    value: value.id,
    label: formatSharedValueLabel(attributeCode, value.name, value.status),
  }));

  const selectedInactive =
    assignment?.attributeValueId &&
    attribute?.values.find((value) => value.id === assignment.attributeValueId)?.status === "INACTIVE";

  function updateAssignments(next: ProductAttributeAssignmentFormRow[]) {
    onAssignmentsChange(next);
  }

  if (!attribute && !sharedAttributesLoading) {
    return (
      <div className="admin-field" data-field-prefix={`b2b-${attributeCode.toLowerCase()}`}>
        <label className="admin-label">{label}</label>
        <p className="admin-field-error" role="alert">
          {B2B_ATTRIBUTE_UNAVAILABLE_MESSAGES[attributeCode]}
        </p>
        <div className="admin-catalog-actions-cell" style={{ marginTop: 8 }}>
          <Link href="/admin/attributes" className="admin-btn admin-btn--secondary admin-btn--xs">
            Quản lý thuộc tính sản phẩm
          </Link>
          {onRefreshSharedAttributes && (
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={onRefreshSharedAttributes}
            >
              Làm mới danh sách
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-field" data-field-prefix={`b2b-${attributeCode.toLowerCase()}`}>
      <label className="admin-label">{label}</label>
      {sharedAttributesLoading && (
        <p className="admin-field-hint">Đang tải thuộc tính dùng chung…</p>
      )}

      {attribute && !assignment?.useCustomValue && (
        <AdminSearchableSelect
          value={assignment?.attributeValueId ?? ""}
          onChange={(valueId) => {
            if (!valueId) {
              updateAssignments(removeAssignmentForAttribute(assignments, attribute.id));
              return;
            }
            updateAssignments(
              upsertAssignmentForAttribute(assignments, attribute.id, {
                attributeValueId: valueId,
                customValue: undefined,
                useCustomValue: false,
              }),
            );
          }}
          options={selectOptions}
          placeholder="— Chọn —"
          searchPlaceholder="Tìm kiếm…"
          disabled={sharedAttributesLoading}
          className={fieldErrorInputClass(Boolean(valueError))}
        />
      )}

      {attribute && assignment?.useCustomValue && (
        <div className="admin-field">
          <input
            className={`admin-input${fieldErrorInputClass(Boolean(valueError))}`}
            value={assignment.customValue ?? ""}
            onChange={(event) => {
              const customValue = event.target.value;
              if (!customValue.trim()) {
                updateAssignments(removeAssignmentForAttribute(assignments, attribute.id));
                return;
              }
              updateAssignments(
                upsertAssignmentForAttribute(assignments, attribute.id, {
                  customValue,
                  attributeValueId: undefined,
                  useCustomValue: true,
                }),
              );
            }}
            placeholder="Nhập giá trị riêng cho sản phẩm này"
          />
          <p className="admin-field-hint">
            Giá trị này chỉ áp dụng cho sản phẩm hiện tại và không thêm vào danh mục thuộc tính chung.
          </p>
        </div>
      )}

      {attribute && (
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          style={{ marginTop: 8 }}
          onClick={() => {
            if (assignment?.useCustomValue) {
              updateAssignments(
                upsertAssignmentForAttribute(assignments, attribute.id, {
                  useCustomValue: false,
                  customValue: undefined,
                  attributeValueId: undefined,
                }),
              );
              return;
            }
            updateAssignments(
              upsertAssignmentForAttribute(assignments, attribute.id, {
                useCustomValue: true,
                attributeValueId: undefined,
                customValue: assignment?.customValue ?? "",
              }),
            );
          }}
        >
          {assignment?.useCustomValue ? "Chọn giá trị dùng chung" : customValueActionLabel}
        </button>
      )}

      {selectedInactive && (
        <p className="admin-field-error" role="alert">
          Giá trị đã chọn không còn hoạt động.
        </p>
      )}
      {duplicateError && (
        <p className="admin-field-error" role="alert">{duplicateError}</p>
      )}
      {valueError && !selectedInactive && (
        <p className="admin-field-error" role="alert">{valueError}</p>
      )}
    </div>
  );
}
