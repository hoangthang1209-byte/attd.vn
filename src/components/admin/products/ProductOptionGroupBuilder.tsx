"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MediaPicker from "@/components/admin/media/MediaPicker";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  generateOptionGroupSlug,
  generateOptionValueCode,
} from "@/features/products/product-option-code.utils";
import {
  ATTRIBUTE_VALUE_DUPLICATE_MESSAGE,
  isColorAttribute,
  isValidHexColor,
  suggestAttributeValueCode,
  suggestColorHex,
} from "@/features/products/attribute-color-utils";
import {
  createClientKey,
  normalizeOptionName,
} from "@/features/products/product-variant-matrix.utils";
import { fieldErrorInputClass } from "@/features/products/product-catalog-form-validation";
import {
  legacyKeysForOptionGroup,
  legacyKeysForOptionValue,
  optionGroupFieldKey,
  optionValueFieldKey,
  resolveFieldError,
} from "@/features/products/product-form-row-error-keys";
import { InlineLoading } from "@/components/ui/loading/ContextLoading";

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
  isVariantAttribute?: boolean;
  isSpecificationAttribute?: boolean;
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
  sharedAttributesLoading?: boolean;
  sharedAttributesError?: string | null;
  onRefreshSharedAttributes?: () => void;
  variantUsageByValueId: Record<string, number>;
  fieldErrors?: Record<string, string>;
  onChange: (groups: OptionGroupFormRow[]) => void;
};

export default function ProductOptionGroupBuilder({
  groups,
  sharedAttributes = [],
  sharedAttributesLoading = false,
  sharedAttributesError = null,
  onRefreshSharedAttributes,
  variantUsageByValueId,
  fieldErrors = {},
  onChange,
}: Props) {
  const [selectedAttributeId, setSelectedAttributeId] = useState("");
  const [selectedSharedValueIds, setSelectedSharedValueIds] = useState<Set<string>>(new Set());
  const [valueSearch, setValueSearch] = useState("");
  const [quickValueNameVi, setQuickValueNameVi] = useState("");
  const [quickValueNameEn, setQuickValueNameEn] = useState("");
  const [quickValueCode, setQuickValueCode] = useState("");
  const [quickValueHex, setQuickValueHex] = useState("");
  const [quickValueError, setQuickValueError] = useState<string | null>(null);
  const [quickValueSaving, setQuickValueSaving] = useState(false);
  const [quickValueCodeTouched, setQuickValueCodeTouched] = useState(false);

  const variantSharedAttributes = useMemo(
    () => sharedAttributes.filter((attribute) => attribute.isVariantAttribute === true),
    [sharedAttributes],
  );

  const selectedAttribute = useMemo(
    () => variantSharedAttributes.find((item) => item.id === selectedAttributeId) ?? null,
    [variantSharedAttributes, selectedAttributeId],
  );

  const activeValues = useMemo(() => {
    if (!selectedAttribute) return [];
    const q = valueSearch.trim().toLowerCase();
    return selectedAttribute.values
      .filter((value) => value.status === "ACTIVE")
      .filter((value) => !q || value.name.toLowerCase().includes(q) || value.code.toLowerCase().includes(q));
  }, [selectedAttribute, valueSearch]);

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
    if (!attribute.isVariantAttribute) return;
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

  function resetQuickValueForm() {
    setQuickValueNameVi("");
    setQuickValueNameEn("");
    setQuickValueCode("");
    setQuickValueHex("");
    setQuickValueError(null);
    setQuickValueCodeTouched(false);
  }

  function onQuickValueNameChange(patch: { nameVi?: string; nameEn?: string }) {
    if (!selectedAttribute) return;
    const nameVi = patch.nameVi !== undefined ? patch.nameVi : quickValueNameVi;
    const nameEn = patch.nameEn !== undefined ? patch.nameEn : quickValueNameEn;
    const isColor = isColorAttribute(selectedAttribute);
    const isSize = selectedAttribute.displayType === "SIZE" || selectedAttribute.code === "SIZE";
    const code = quickValueCodeTouched
      ? quickValueCode
      : suggestAttributeValueCode({
          nameVi,
          nameEn,
          isColor,
          isSize,
          existingCodes: selectedAttribute.values.map((value) => value.code),
        });
    setQuickValueNameVi(nameVi);
    setQuickValueNameEn(nameEn);
    setQuickValueCode(code);
    if (isColor) {
      setQuickValueHex(suggestColorHex(nameEn || nameVi || code));
    }
    setQuickValueError(null);
  }

  async function submitQuickSharedValue() {
    if (!selectedAttribute || !onRefreshSharedAttributes) return;
    const name = quickValueNameVi.trim();
    if (!name) {
      setQuickValueError("Tên tiếng Việt là bắt buộc.");
      return;
    }
    if (quickValueHex.trim() && !isValidHexColor(quickValueHex)) {
      setQuickValueError("Mã màu HEX không hợp lệ.");
      return;
    }
    const duplicate = selectedAttribute.values.some(
      (value) =>
        value.name.trim().toLowerCase() === name.toLowerCase() ||
        (quickValueCode.trim() && value.code.trim().toUpperCase() === quickValueCode.trim().toUpperCase()),
    );
    if (duplicate) {
      setQuickValueError(ATTRIBUTE_VALUE_DUPLICATE_MESSAGE);
      return;
    }

    setQuickValueSaving(true);
    setQuickValueError(null);
    try {
      const res = await fetch(`/api/admin/attributes/${selectedAttribute.id}/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nameEn: quickValueNameEn.trim() || undefined,
          code: quickValueCode.trim() || undefined,
          hexCode: quickValueHex.trim() || undefined,
          status: "ACTIVE",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
      } | null;
      if (!res.ok || !data?.id) {
        const message =
          data?.fieldErrors?.name ||
          data?.fieldErrors?.code ||
          data?.message ||
          "Không thể tạo giá trị.";
        setQuickValueError(/đã tồn tại/i.test(message) ? ATTRIBUTE_VALUE_DUPLICATE_MESSAGE : message);
        return;
      }
      resetQuickValueForm();
      onRefreshSharedAttributes();
      setSelectedSharedValueIds((prev) => new Set(prev).add(data.id!));
    } catch {
      setQuickValueError("Lỗi mạng khi tạo giá trị thuộc tính.");
    } finally {
      setQuickValueSaving(false);
    }
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

  const usedAttributeIds = new Set(groups.map((group) => group.attributeId).filter(Boolean));

  return (
    <section className="admin-product-section admin-product-attr-guided">
      <div className="admin-section-head">
        <h3>Thuộc tính &amp; biến thể</h3>
      </div>

      <div className="admin-product-attr-step">
        <h4 className="admin-subtitle">1. Chọn thuộc tính dùng chung</h4>
        <div className="admin-product-attr-step-actions">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={sharedAttributesLoading || variantSharedAttributes.length === 0}
            onClick={() => {
              const first = variantSharedAttributes.find((item) => !usedAttributeIds.has(item.id));
              if (first) setSelectedAttributeId(first.id);
            }}
          >
            Thêm thuộc tính dùng chung
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={addGroup}>
            Tạo thuộc tính riêng cho sản phẩm
          </button>
          {onRefreshSharedAttributes && (
            <button type="button" className="btn-tertiary btn-sm" onClick={onRefreshSharedAttributes}>
              Làm mới danh sách thuộc tính
            </button>
          )}
          <Link href="/admin/attributes" className="btn-tertiary btn-sm" data-testid="manage-colors-link">
            Quản lý màu sắc
          </Link>
          <Link href="/admin/attributes" className="btn-tertiary btn-sm">
            Quản lý thuộc tính sản phẩm
          </Link>
        </div>
        <p className="admin-field-hint">
          Thuộc tính riêng chỉ dùng cho sản phẩm này và không xuất hiện trong danh mục thuộc tính chung.
        </p>

        {sharedAttributesLoading && (
          <InlineLoading title="Đang tải thuộc tính dùng chung..." tone="admin" />
        )}
        {sharedAttributesError && <p className="admin-error" role="alert">{sharedAttributesError}</p>}

        {!sharedAttributesLoading && variantSharedAttributes.length === 0 && (
          <div className="admin-shared-attribute-empty">
            <p>Chưa có thuộc tính dùng chung phù hợp để tạo biến thể.</p>
            <Link href="/admin/attributes" className="btn-secondary btn-sm">
              Quản lý thuộc tính sản phẩm
            </Link>
          </div>
        )}

        {variantSharedAttributes.length > 0 && (
          <div className="admin-shared-attribute-card-grid">
            {variantSharedAttributes.map((attribute) => {
              const activeCount = attribute.values.filter((value) => value.status === "ACTIVE").length;
              const isSelected = selectedAttributeId === attribute.id;
              const isUsed = usedAttributeIds.has(attribute.id);
              return (
                <button
                  key={attribute.id}
                  type="button"
                  className={`admin-shared-attribute-card${isSelected ? " admin-shared-attribute-card--selected" : ""}${isUsed ? " admin-shared-attribute-card--used" : ""}`}
                  onClick={() => {
                    setSelectedAttributeId(attribute.id);
                    setSelectedSharedValueIds(new Set());
                    setValueSearch("");
                  }}
                >
                  <strong>{attribute.name}</strong>
                  <code className="admin-catalog-code">{attribute.code}</code>
                  <span className="admin-field-hint">{activeCount} giá trị đang hoạt động</span>
                  <div className="admin-attribute-preset-badges">
                    {attribute.isVariantAttribute && (
                      <span className="admin-kb-badge admin-kb-badge--verified">Dùng tạo biến thể</span>
                    )}
                    {attribute.isSpecificationAttribute && (
                      <span className="admin-kb-badge">Dùng làm thông số</span>
                    )}
                  </div>
                  {isUsed && <span className="admin-field-hint">Đã thêm vào sản phẩm</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedAttribute && (
        <div className="admin-product-attr-step">
          <h4 className="admin-subtitle">2. Chọn giá trị áp dụng — {selectedAttribute.name}</h4>
          <span className="admin-kb-badge admin-kb-badge--verified">Thuộc tính dùng chung</span>
          {!selectedAttribute.isVariantAttribute && (
            <p className="admin-field-hint admin-shared-attribute-conflict-hint">
              Thuộc tính này dùng làm thông số sản phẩm, không dùng để tạo tổ hợp biến thể.
            </p>
          )}
          <input
            className="form-input"
            value={valueSearch}
            onChange={(e) => setValueSearch(e.target.value)}
            placeholder="Tìm giá trị…"
          />
          <div className="admin-shared-attribute-bulk-actions">
            <button
              type="button"
              className="btn-tertiary btn-sm"
              data-testid="shared-values-select-all"
              disabled={!selectedAttribute.isVariantAttribute || activeValues.length === 0}
              onClick={() => {
                setSelectedSharedValueIds(new Set(activeValues.map((value) => value.id)));
              }}
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              className="btn-tertiary btn-sm"
              data-testid="shared-values-clear-selection"
              disabled={!selectedAttribute.isVariantAttribute || selectedSharedValueIds.size === 0}
              onClick={() => setSelectedSharedValueIds(new Set())}
            >
              Bỏ chọn
            </button>
            <span className="admin-field-hint">Đã chọn {selectedSharedValueIds.size} / {activeValues.length} giá trị</span>
          </div>
          <div className="admin-shared-attribute-values admin-shared-attribute-values--guided">
            {activeValues.map((value) => {
              const checked = selectedSharedValueIds.has(value.id);
              const isColor = selectedAttribute.displayType === "COLOR_SWATCH";
              const isSize = selectedAttribute.displayType === "SIZE";
              return (
                <label
                  key={value.id}
                  className={`admin-shared-attribute-value${isSize ? " admin-shared-attribute-value--size" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!selectedAttribute.isVariantAttribute}
                    onChange={(e) => {
                      setSelectedSharedValueIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(value.id);
                        else next.delete(value.id);
                        return next;
                      });
                    }}
                  />
                  {isColor && value.hexCode && (
                    <span className="admin-shared-attribute-swatch" style={{ background: value.hexCode }} aria-hidden />
                  )}
                  <span>{value.name}</span>
                  <code>{value.code}</code>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={addSharedGroup}
            disabled={!selectedAttribute.isVariantAttribute || selectedSharedValueIds.size === 0}
          >
            Thêm giá trị đã chọn
          </button>

          {onRefreshSharedAttributes && (
            <div className="admin-shared-attribute-quick-create" data-testid="product-editor-quick-value-create">
              <p className="admin-field-hint">Thêm nhanh giá trị cho thuộc tính đang chọn (dùng chung API thuộc tính).</p>
              <div className="admin-shared-attribute-quick-create__row">
                <input
                  className="form-input"
                  value={quickValueNameVi}
                  placeholder="Tên tiếng Việt"
                  onChange={(e) => onQuickValueNameChange({ nameVi: e.target.value })}
                />
                <input
                  className="form-input"
                  value={quickValueNameEn}
                  placeholder="Tên tiếng Anh"
                  onChange={(e) => onQuickValueNameChange({ nameEn: e.target.value })}
                />
                <input
                  className="form-input"
                  value={quickValueCode}
                  placeholder="Mã"
                  onChange={(e) => {
                    setQuickValueCodeTouched(true);
                    setQuickValueCode(e.target.value.toUpperCase());
                  }}
                />
                {isColorAttribute(selectedAttribute) && (
                  <input
                    className="form-input"
                    value={quickValueHex}
                    placeholder="HEX"
                    onChange={(e) => setQuickValueHex(e.target.value)}
                  />
                )}
                <AdminLoadingButton
                  type="button"
                  variant="secondary"
                  size="xs"
                  pending={quickValueSaving}
                  pendingLabel="Đang thêm..."
                  onClick={() => void submitQuickSharedValue()}
                >
                  Thêm giá trị
                </AdminLoadingButton>
              </div>
              {quickValueError && (
                <p className="admin-field-error" role="alert">{quickValueError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="admin-empty-hint">
          Chưa có nhóm biến thể. Thêm Màu sắc, Kích thước từ thuộc tính dùng chung hoặc tạo thuộc tính riêng.
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
            const groupNameError = resolveFieldError(
              fieldErrors,
              optionGroupFieldKey(group, "name"),
              legacyKeysForOptionGroup(groups, group, "name"),
            );
            const groupErrorCount = Object.keys(fieldErrors).filter((key) =>
              key.startsWith(optionGroupFieldKey(group, "").slice(0, -1)),
            ).length;
            const legacyGroupPrefix = `options.${groupIndex}`;

            return (
              <div
                key={group.clientKey}
                className={`admin-option-group-card${groupErrorCount > 0 ? " admin-option-group-card--has-error" : ""}`}
                data-field-prefix={optionGroupFieldKey(group, "name").replace(/\.name$/, "")}
              >
                <div className="admin-option-group-head">
                  <strong>Nhóm #{groupIndex + 1}</strong>
                  {group.attributeId && (
                    <span className="admin-kb-badge admin-kb-badge--verified">
                      Thuộc tính dùng chung
                    </span>
                  )}
                  <div className="admin-spec-row-actions">
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, -1)}>↑</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, 1)}>↓</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => removeGroup(groupIndex)}>Xóa nhóm</button>
                  </div>
                </div>

                <div className="admin-spec-row" data-field-prefix={legacyGroupPrefix}>
                  <div className="admin-field">
                    <input
                      className={`form-input${fieldErrorInputClass(Boolean(groupNameError))}`}
                      value={group.name}
                      placeholder="VD: Màu sắc"
                      data-field={optionGroupFieldKey(group, "name")}
                      aria-invalid={Boolean(groupNameError)}
                      onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                      onBlur={() => handleGroupNameBlur(groupIndex)}
                      aria-label={`Tên nhóm biến thể ${groupIndex + 1}`}
                      readOnly={Boolean(group.attributeId)}
                    />
                    {groupNameError && (
                      <p className="admin-field-error" role="alert">{groupNameError}</p>
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
                    const labelError = resolveFieldError(
                      fieldErrors,
                      optionValueFieldKey(group, value, "label"),
                      legacyKeysForOptionValue(groups, group, value, "label"),
                    );
                    const valueCodeError = resolveFieldError(
                      fieldErrors,
                      optionValueFieldKey(group, value, "valueCode"),
                      legacyKeysForOptionValue(groups, group, value, "valueCode"),
                    );
                    const imageUrlError = resolveFieldError(
                      fieldErrors,
                      optionValueFieldKey(group, value, "imageUrl"),
                      legacyKeysForOptionValue(groups, group, value, "imageUrl"),
                    );
                    const rowHasError = Boolean(labelError || valueCodeError || imageUrlError);

                    return (
                      <div
                        key={value.clientKey}
                        className={`admin-option-value-row${rowHasError ? " admin-spec-row--has-error" : ""}`}
                      >
                        <input
                          className={`form-input${fieldErrorInputClass(Boolean(labelError))}`}
                          value={value.label}
                          placeholder="Giá trị hiển thị"
                          data-field={optionValueFieldKey(group, value, "label")}
                          aria-invalid={Boolean(labelError)}
                          onChange={(e) => updateValue(groupIndex, valueIndex, { label: e.target.value })}
                          onBlur={() => handleValueLabelBlur(groupIndex, valueIndex)}
                          aria-label={`Giá trị ${valueIndex + 1} nhóm ${group.name}`}
                          readOnly={Boolean(value.attributeValueId)}
                        />
                        {labelError && (
                          <p className="admin-field-error" role="alert">
                            {labelError}
                          </p>
                        )}
                        <input
                          className={`form-input${fieldErrorInputClass(Boolean(valueCodeError))}`}
                          value={value.valueCode}
                          placeholder="Mã hệ thống"
                          data-field={optionValueFieldKey(group, value, "valueCode")}
                          aria-invalid={Boolean(valueCodeError)}
                          onChange={(e) => updateValue(groupIndex, valueIndex, { valueCode: e.target.value.toUpperCase() })}
                          readOnly={Boolean(value.attributeValueId)}
                          title={value.attributeValueId ? "Mã từ thuộc tính chung — không sửa tại sản phẩm" : "Mã nội bộ dùng cho SKU — tự sinh khi nhập tên"}
                        />
                        {valueCodeError && (
                          <p className="admin-field-error" role="alert">
                            {valueCodeError}
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
                            className={`form-input${fieldErrorInputClass(Boolean(imageUrlError))}`}
                            value={value.imageUrl}
                            data-field={optionValueFieldKey(group, value, "imageUrl")}
                            aria-invalid={Boolean(imageUrlError)}
                            onChange={(e) => updateValue(groupIndex, valueIndex, { imageUrl: e.target.value })}
                            placeholder="URL ảnh giá trị"
                          />
                          {imageUrlError && (
                            <p className="admin-field-error" role="alert">{imageUrlError}</p>
                          )}
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

                {!group.attributeId && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => addValue(groupIndex)}>
                    Thêm giá trị
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
