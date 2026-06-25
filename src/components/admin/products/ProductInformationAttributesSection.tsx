"use client";

import Link from "next/link";
import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  B2B_MANAGED_SHARED_ATTRIBUTE_CODES,
} from "@/features/products/product-b2b-attribute-controls.utils";
import type { ProductAttributeAssignmentFormRow } from "@/features/products/product-catalog-form-mappers";
import { fieldErrorInputClass } from "@/features/products/product-catalog-form-validation";
import {
  assignmentFieldKey,
  legacyKeysForAssignment,
  resolveFieldError,
} from "@/features/products/product-form-row-error-keys";

type Props = {
  rows: ProductAttributeAssignmentFormRow[];
  sharedAttributes: SharedAttributePickerOption[];
  sharedAttributesLoading?: boolean;
  sharedAttributesError?: string | null;
  fieldErrors?: Record<string, string>;
  onChange: (rows: ProductAttributeAssignmentFormRow[]) => void;
  onRefreshSharedAttributes?: () => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
};

function createClientKey(): string {
  return `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProductInformationAttributesSection({
  rows,
  sharedAttributes,
  sharedAttributesLoading = false,
  sharedAttributesError = null,
  fieldErrors = {},
  onChange,
  onRefreshSharedAttributes,
  sectionRef,
}: Props) {
  const managedInB2BSection = new Set<string>(B2B_MANAGED_SHARED_ATTRIBUTE_CODES);
  const assignedAttributeIds = new Set(rows.map((row) => row.attributeId));
  const specificationAttributes = sharedAttributes.filter(
    (attr) => attr.isSpecificationAttribute && !managedInB2BSection.has(attr.code),
  );
  const visibleRows = rows.filter((row) => {
    const attribute = sharedAttributes.find((item) => item.id === row.attributeId);
    return attribute && !managedInB2BSection.has(attribute.code);
  });
  const availableAttributes = specificationAttributes.filter((attr) => !assignedAttributeIds.has(attr.id));

  function updateRow(clientKey: string, patch: Partial<ProductAttributeAssignmentFormRow>) {
    onChange(rows.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row)));
  }

  function removeRow(clientKey: string) {
    onChange(rows.filter((row) => row.clientKey !== clientKey));
  }

  function addAttribute(attributeId: string) {
    const attribute = specificationAttributes.find((item) => item.id === attributeId);
    if (!attribute || assignedAttributeIds.has(attributeId)) return;
    onChange([
      ...rows,
      {
        clientKey: createClientKey(),
        attributeId,
        useCustomValue: false,
        sortOrder: rows.length,
      },
    ]);
  }

  return (
    <section ref={sectionRef} className="admin-product-section" data-field-prefix="attributeAssignments">
      <div className="admin-section-head">
        <div>
          <h3 className="admin-subtitle" style={{ marginBottom: 4 }}>Thông tin thuộc tính sản phẩm</h3>
          <p className="admin-field-hint">
            Chọn thuộc tính dùng chung được đánh dấu &quot;Dùng làm thông số&quot; để hiển thị trên PDP.
          </p>
        </div>
        <div className="admin-catalog-actions-cell">
          <Link href="/admin/attributes" className="admin-btn admin-btn--secondary admin-btn--xs">
            Quản lý thuộc tính sản phẩm
          </Link>
          {onRefreshSharedAttributes && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onRefreshSharedAttributes}>
              Làm mới danh sách thuộc tính
            </button>
          )}
        </div>
      </div>

      {sharedAttributesError && <p className="admin-field-error" role="alert">{sharedAttributesError}</p>}
      {sharedAttributesLoading && <p className="admin-field-hint">Đang tải thuộc tính dùng chung…</p>}

      {visibleRows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          {visibleRows.map((row) => {
            const attribute = specificationAttributes.find((item) => item.id === row.attributeId);
            const activeValues = (attribute?.values ?? []).filter((value) => value.status === "ACTIVE");
            const attrError = resolveFieldError(
              fieldErrors,
              assignmentFieldKey(row, "attributeId"),
              legacyKeysForAssignment(rows, row, "attributeId"),
            );
            const valueError =
              resolveFieldError(
                fieldErrors,
                assignmentFieldKey(row, "attributeValueId"),
                legacyKeysForAssignment(rows, row, "attributeValueId"),
              ) ??
              resolveFieldError(
                fieldErrors,
                assignmentFieldKey(row, "customValue"),
                legacyKeysForAssignment(rows, row, "customValue"),
              );
            const rowHasError = Boolean(attrError || valueError);

            return (
              <div
                key={row.clientKey}
                className={`admin-catalog-fieldset${rowHasError ? " admin-section--has-error" : ""}`}
                data-field={assignmentFieldKey(row, "attributeValueId")}
              >
                <div className="admin-section-head">
                  <div>
                    <strong>{attribute?.name ?? "Thuộc tính"}</strong>
                    {attribute?.code && (
                      <p className="admin-field-hint" style={{ marginTop: 4 }}>
                        <code className="admin-catalog-code">{attribute.code}</code>
                        <span className="admin-kb-badge admin-kb-badge--verified" style={{ marginLeft: 8 }}>
                          Thuộc tính dùng chung
                        </span>
                        <span className="admin-kb-badge" style={{ marginLeft: 6 }}>
                          Dùng làm thông số
                        </span>
                        {attribute?.isVariantAttribute && (
                          <span className="admin-kb-badge" style={{ marginLeft: 6 }}>
                            Có thể dùng tạo biến thể
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => removeRow(row.clientKey)}>
                    Xóa
                  </button>
                </div>

                {attrError && <p className="admin-field-error" role="alert">{attrError}</p>}

                {!row.useCustomValue ? (
                  <div className="admin-field">
                    <label className="admin-label">Giá trị</label>
                    <select
                      className={`admin-input${fieldErrorInputClass(Boolean(valueError))}`}
                      value={row.attributeValueId ?? ""}
                      aria-invalid={Boolean(valueError)}
                      data-field={assignmentFieldKey(row, "attributeValueId")}
                      onChange={(e) =>
                        updateRow(row.clientKey, {
                          attributeValueId: e.target.value || undefined,
                          customValue: undefined,
                        })
                      }
                    >
                      <option value="">— Chọn giá trị —</option>
                      {activeValues.map((value) => (
                        <option key={value.id} value={value.id}>{value.name}</option>
                      ))}
                    </select>
                    {valueError && <p className="admin-field-error" role="alert">{valueError}</p>}
                  </div>
                ) : (
                  <div className="admin-field" data-field={assignmentFieldKey(row, "customValue")}>
                    <label className="admin-label">Giá trị riêng cho sản phẩm</label>
                    <input
                      className={`admin-input${fieldErrorInputClass(Boolean(valueError))}`}
                      value={row.customValue ?? ""}
                      aria-invalid={Boolean(valueError)}
                      data-field={assignmentFieldKey(row, "customValue")}
                      onChange={(e) =>
                        updateRow(row.clientKey, {
                          customValue: e.target.value,
                          attributeValueId: undefined,
                        })
                      }
                      placeholder="Nhập giá trị chỉ dùng cho sản phẩm này"
                    />
                    <p className="admin-field-hint">
                      Giá trị này chỉ dùng cho sản phẩm hiện tại và không được thêm vào danh mục thuộc tính chung.
                    </p>
                    {valueError && <p className="admin-field-error" role="alert">{valueError}</p>}
                  </div>
                )}

                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() =>
                    updateRow(row.clientKey, {
                      useCustomValue: !row.useCustomValue,
                      attributeValueId: undefined,
                      customValue: undefined,
                    })
                  }
                >
                  {row.useCustomValue ? "Chọn giá trị dùng chung" : "Thêm giá trị riêng cho sản phẩm"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {availableAttributes.length > 0 ? (
        <div className="admin-catalog-fieldset">
          <p className="admin-field-hint" style={{ marginBottom: 8 }}>Chọn thuộc tính để thêm:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {availableAttributes.map((attribute) => {
              const activeValueCount = attribute.values.filter((value) => value.status === "ACTIVE").length;
              return (
                <button
                  key={attribute.id}
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  style={{ justifyContent: "flex-start", textAlign: "left" }}
                  onClick={() => addAttribute(attribute.id)}
                >
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                    <span>
                      <strong>{attribute.name}</strong>{" "}
                      <code className="admin-catalog-code">{attribute.code}</code>
                    </span>
                    <span className="admin-field-hint">
                      {activeValueCount} giá trị hoạt động
                      <span className="admin-kb-badge" style={{ marginLeft: 8 }}>Dùng làm thông số</span>
                      {attribute.isVariantAttribute && (
                        <span className="admin-kb-badge" style={{ marginLeft: 6 }}>Có thể dùng tạo biến thể</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        !sharedAttributesLoading && (
          <p className="admin-field-hint">
            {specificationAttributes.length === 0
              ? "Chưa có thuộc tính nào được đánh dấu “Dùng làm thông số”. Tạo hoặc cập nhật tại Quản lý thuộc tính."
              : visibleRows.length > 0
                ? "Đã thêm tất cả thuộc tính thông tin khả dụng."
                : "Không có thuộc tính thông tin khả dụng."}
          </p>
        )
      )}

      {visibleRows.length === 0 && availableAttributes.length > 0 && (
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          style={{ marginTop: 12 }}
          onClick={() => addAttribute(availableAttributes[0].id)}
        >
          Thêm thuộc tính thông tin
        </button>
      )}
    </section>
  );
}
