"use client";

import { useState } from "react";
import MediaPicker from "@/components/admin/media/MediaPicker";
import {
  generateOptionGroupSlug,
  generateOptionValueCode,
} from "@/features/products/product-option-code.utils";
import {
  createClientKey,
  normalizeOptionName,
} from "@/features/products/product-variant-matrix.utils";
import { fieldErrorInputClass } from "@/features/products/product-catalog-form-validation";

export type OptionValueFormRow = {
  id?: string;
  attributeValueId?: string;
  clientKey: string;
  label: string;
  valueCode: string;
  imageUrl: string;
  sortOrder: number;
};

export type OptionGroupFormRow = {
  id?: string;
  attributeId?: string;
  clientKey: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: OptionValueFormRow[];
};

export type SharedAttributePickerOption = {
  id: string;
  name: string;
  code: string;
  slug: string;
  displayType: string;
  values: Array<{
    id: string;
    name: string;
    code: string;
    slug: string;
    hexCode: string | null;
    imageUrl: string | null;
    status: "ACTIVE" | "INACTIVE";
    sortOrder: number;
  }>;
};

type Props = {
  groups: OptionGroupFormRow[];
  sharedAttributes?: SharedAttributePickerOption[];
  variantUsageByValueId: Record<string, number>;
  fieldErrors?: Record<string, string>;
  onChange: (groups: OptionGroupFormRow[]) => void;
};

export default function ProductOptionGroupBuilder({
  groups,
  sharedAttributes = [],
  variantUsageByValueId,
  fieldErrors = {},
  onChange,
}: Props) {
  const [selectedAttributeId, setSelectedAttributeId] = useState("");
  const [selectedSharedValueIds, setSelectedSharedValueIds] = useState<Set<string>>(new Set());

  function updateGroup(index: number, patch: Partial<OptionGroupFormRow>) {
    const next = [...groups];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function addGroup() {
    onChange([
      ...groups,
      {
        clientKey: createClientKey("opt"),
        name: "",
        slug: "",
        sortOrder: groups.length,
        values: [],
      },
    ]);
  }

  function addSharedGroup() {
    const attribute = sharedAttributes.find((item) => item.id === selectedAttributeId);
    if (!attribute) return;
    const selectedValues = attribute.values.filter((value) => selectedSharedValueIds.has(value.id));
    if (!selectedValues.length) return;
    const existingGroup = groups.find((group) => group.attributeId === attribute.id);
    if (existingGroup) {
      const existingValueIds = new Set(existingGroup.values.map((value) => value.attributeValueId).filter(Boolean));
      const nextValues = [
        ...existingGroup.values,
        ...selectedValues
          .filter((value) => !existingValueIds.has(value.id))
          .map((value, index) => ({
            attributeValueId: value.id,
            clientKey: createClientKey("val"),
            label: value.name,
            valueCode: value.code,
            imageUrl: value.imageUrl ?? "",
            sortOrder: existingGroup.values.length + index,
          })),
      ];
      onChange(groups.map((group) => group.clientKey === existingGroup.clientKey ? { ...group, values: nextValues } : group));
    } else {
      onChange([
        ...groups,
        {
          attributeId: attribute.id,
          clientKey: createClientKey("opt"),
          name: attribute.name,
          slug: attribute.slug,
          sortOrder: groups.length,
          values: selectedValues.map((value, index) => ({
            attributeValueId: value.id,
            clientKey: createClientKey("val"),
            label: value.name,
            valueCode: value.code,
            imageUrl: value.imageUrl ?? "",
            sortOrder: index,
          })),
        },
      ]);
    }
    setSelectedSharedValueIds(new Set());
  }

  function removeGroup(index: number) {
    const group = groups[index];
    const usage = group.values.reduce(
      (sum, value) => sum + (value.id ? variantUsageByValueId[value.id] ?? 0 : 0),
      0,
    );
    if (usage > 0) {
      window.alert(
        `Không thể xóa nhóm "${group.name}" vì ${usage} biến thể đang dùng giá trị trong nhóm này.`,
      );
      return;
    }
    if (!window.confirm(`Xóa nhóm biến thể "${group.name || "mới"}"?`)) return;
    onChange(
      groups
        .filter((_, i) => i !== index)
        .map((item, sortOrder) => ({ ...item, sortOrder })),
    );
  }

  function moveGroup(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  function addValue(groupIndex: number) {
    const group = groups[groupIndex];
    updateGroup(groupIndex, {
      values: [
        ...group.values,
        {
          clientKey: createClientKey("val"),
          label: "",
          valueCode: "",
          imageUrl: "",
          sortOrder: group.values.length,
        },
      ],
    });
  }

  function updateValue(
    groupIndex: number,
    valueIndex: number,
    patch: Partial<OptionValueFormRow>,
  ) {
    const group = groups[groupIndex];
    const values = [...group.values];
    values[valueIndex] = { ...values[valueIndex], ...patch };
    updateGroup(groupIndex, { values });
  }

  function handleGroupNameBlur(groupIndex: number) {
    const group = groups[groupIndex];
    const name = group.name.trim();
    if (!name) return;
    const patch: Partial<OptionGroupFormRow> = {};
    if (!group.slug.trim()) {
      patch.slug = generateOptionGroupSlug(name);
    }
    if (Object.keys(patch).length) updateGroup(groupIndex, patch);
  }

  function handleValueLabelBlur(groupIndex: number, valueIndex: number) {
    const group = groups[groupIndex];
    const value = group.values[valueIndex];
    const label = value.label.trim();
    if (!label || value.valueCode.trim()) return;
    const existingCodes = group.values
      .filter((_, i) => i !== valueIndex)
      .map((v) => v.valueCode)
      .filter(Boolean);
    const slug = group.slug.trim() || generateOptionGroupSlug(group.name);
    const code = generateOptionValueCode({ name: group.name, slug }, label, existingCodes);
    updateValue(groupIndex, valueIndex, { valueCode: code });
  }

  function removeValue(groupIndex: number, valueIndex: number) {
    const value = groups[groupIndex].values[valueIndex];
    const usage = value.id ? variantUsageByValueId[value.id] ?? 0 : 0;
    if (usage > 0) {
      window.alert(
        `Không thể xóa giá trị "${value.label}" vì ${usage} biến thể đang dùng giá trị này.`,
      );
      return;
    }
    if (!window.confirm(`Xóa giá trị "${value.label || "mới"}"?`)) return;
    const values = groups[groupIndex].values
      .filter((_, i) => i !== valueIndex)
      .map((item, sortOrder) => ({ ...item, sortOrder }));
    updateGroup(groupIndex, { values });
  }

  function moveValue(groupIndex: number, valueIndex: number, dir: -1 | 1) {
    const values = [...groups[groupIndex].values];
    const target = valueIndex + dir;
    if (target < 0 || target >= values.length) return;
    [values[valueIndex], values[target]] = [values[target], values[valueIndex]];
    updateGroup(groupIndex, {
      values: values.map((item, sortOrder) => ({ ...item, sortOrder })),
    });
  }

  return (
    <section className="admin-product-section">
      <div className="admin-section-head">
        <h3>Nhóm biến thể sản phẩm</h3>
        <button type="button" className="btn-secondary btn-sm" onClick={addGroup}>
          Tạo thuộc tính riêng cho sản phẩm
        </button>
      </div>

      {sharedAttributes.length > 0 && (
        <div className="admin-shared-attribute-picker">
          <div className="admin-field">
            <label className="admin-label">Thêm từ thuộc tính chung</label>
            <select
              className="admin-input"
              value={selectedAttributeId}
              onChange={(e) => {
                setSelectedAttributeId(e.target.value);
                setSelectedSharedValueIds(new Set());
              }}
            >
              <option value="">— Chọn thuộc tính —</option>
              {sharedAttributes.map((attribute) => (
                <option key={attribute.id} value={attribute.id}>
                  {attribute.name} ({attribute.code})
                </option>
              ))}
            </select>
          </div>
          {selectedAttributeId && (
            <div className="admin-shared-attribute-values">
              {sharedAttributes
                .find((attribute) => attribute.id === selectedAttributeId)
                ?.values.filter((value) => value.status === "ACTIVE")
                .map((value) => {
                  const checked = selectedSharedValueIds.has(value.id);
                  return (
                    <label key={value.id} className="admin-shared-attribute-value">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedSharedValueIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(value.id);
                            else next.delete(value.id);
                            return next;
                          });
                        }}
                      />
                      {value.hexCode && (
                        <span
                          className="admin-shared-attribute-swatch"
                          style={{ background: value.hexCode }}
                          aria-hidden="true"
                        />
                      )}
                      <span>{value.name}</span>
                      <code>{value.code}</code>
                    </label>
                  );
                })}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={addSharedGroup}
                disabled={selectedSharedValueIds.size === 0}
              >
                Thêm giá trị đã chọn
              </button>
            </div>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="admin-empty-hint">
          Chưa có nhóm biến thể. Thêm Màu sắc, Kích thước hoặc thuộc tính riêng cho sản phẩm này.
        </p>
      ) : (
        <div className="admin-option-groups">
          {groups.map((group, groupIndex) => {
            const duplicateName = groups.some(
              (other, index) =>
                index !== groupIndex &&
                normalizeOptionName(other.name) === normalizeOptionName(group.name) &&
                group.name.trim(),
            );

            return (
              <div key={group.clientKey} className="admin-option-group-card">
                <div className="admin-option-group-head">
                  <strong>Nhóm #{groupIndex + 1}</strong>
                  {group.attributeId && (
                    <span className="admin-kb-badge admin-kb-badge--verified">
                      Thuộc tính chung
                    </span>
                  )}
                  <div className="admin-spec-row-actions">
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, -1)}>↑</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, 1)}>↓</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => removeGroup(groupIndex)}>Xóa nhóm</button>
                  </div>
                </div>

                <div className="admin-spec-row" data-field-prefix={`options.${groupIndex}`}>
                  <div className="admin-field">
                    <input
                      className={`form-input${fieldErrorInputClass(Boolean(fieldErrors[`options.${groupIndex}.name`]))}`}
                      value={group.name}
                      placeholder="VD: Màu sắc"
                      data-field={`options.${groupIndex}.name`}
                      onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                      onBlur={() => handleGroupNameBlur(groupIndex)}
                      aria-label={`Tên nhóm biến thể ${groupIndex + 1}`}
                      readOnly={Boolean(group.attributeId)}
                    />
                    {fieldErrors[`options.${groupIndex}.name`] && (
                      <p className="admin-field-error" role="alert">{fieldErrors[`options.${groupIndex}.name`]}</p>
                    )}
                  </div>
                  <input
                    className="form-input"
                    value={group.slug}
                    placeholder="Slug nội bộ (tự sinh)"
                    readOnly
                    aria-label={`Slug nhóm ${groupIndex + 1}`}
                  />
                </div>
                {duplicateName && (
                  <p className="admin-error" role="alert">Tên nhóm bị trùng với nhóm khác.</p>
                )}

                <div className="admin-option-values">
                  {group.values.map((value, valueIndex) => {
                    const usage = value.id ? variantUsageByValueId[value.id] ?? 0 : 0;
                    return (
                      <div key={value.clientKey} className="admin-option-value-row">
                        <input
                          className={`form-input${fieldErrorInputClass(Boolean(fieldErrors[`options.${groupIndex}.values.${valueIndex}.label`]))}`}
                          value={value.label}
                          placeholder="Giá trị hiển thị"
                          data-field={`options.${groupIndex}.values.${valueIndex}.label`}
                          onChange={(e) => updateValue(groupIndex, valueIndex, { label: e.target.value })}
                          onBlur={() => handleValueLabelBlur(groupIndex, valueIndex)}
                          aria-label={`Giá trị ${valueIndex + 1} nhóm ${group.name}`}
                          readOnly={Boolean(value.attributeValueId)}
                        />
                        {fieldErrors[`options.${groupIndex}.values.${valueIndex}.label`] && (
                          <p className="admin-field-error" role="alert">
                            {fieldErrors[`options.${groupIndex}.values.${valueIndex}.label`]}
                          </p>
                        )}
                        <input
                          className={`form-input${fieldErrorInputClass(Boolean(fieldErrors[`options.${groupIndex}.values.${valueIndex}.valueCode`]))}`}
                          value={value.valueCode}
                          placeholder="Mã hệ thống"
                          data-field={`options.${groupIndex}.values.${valueIndex}.valueCode`}
                          onChange={(e) => updateValue(groupIndex, valueIndex, { valueCode: e.target.value.toUpperCase() })}
                          readOnly={Boolean(value.attributeValueId)}
                          title={value.attributeValueId ? "Mã từ thuộc tính chung — không sửa tại sản phẩm" : "Mã nội bộ dùng cho SKU — tự sinh khi nhập tên"}
                        />
                        {fieldErrors[`options.${groupIndex}.values.${valueIndex}.valueCode`] && (
                          <p className="admin-field-error" role="alert">
                            {fieldErrors[`options.${groupIndex}.values.${valueIndex}.valueCode`]}
                          </p>
                        )}
                        <div className="admin-option-value-media">
                          <MediaPicker
                            value={value.imageUrl}
                            onChange={(url) => updateValue(groupIndex, valueIndex, { imageUrl: url })}
                            label="Ảnh giá trị"
                            folder="products"
                          />
                          <input
                            className="form-input"
                            value={value.imageUrl}
                            onChange={(e) => updateValue(groupIndex, valueIndex, { imageUrl: e.target.value })}
                            placeholder="URL ảnh giá trị"
                          />
                        </div>
                        <div className="admin-option-value-meta">
                          {usage > 0 && (
                            <span className="admin-field-hint">{usage} biến thể đang dùng</span>
                          )}
                          <div className="admin-spec-row-actions">
                            <button type="button" className="btn-tertiary btn-sm" onClick={() => moveValue(groupIndex, valueIndex, -1)}>↑</button>
                            <button type="button" className="btn-tertiary btn-sm" onClick={() => moveValue(groupIndex, valueIndex, 1)}>↓</button>
                            <button type="button" className="btn-tertiary btn-sm" onClick={() => removeValue(groupIndex, valueIndex)}>Xóa</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button type="button" className="btn-secondary btn-sm" onClick={() => addValue(groupIndex)}>
                  Thêm giá trị
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
