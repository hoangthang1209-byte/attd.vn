"use client";

import MediaPicker from "@/components/admin/media/MediaPicker";
import {
  createClientKey,
  normalizeOptionName,
} from "@/features/products/product-variant-matrix.utils";

export type OptionValueFormRow = {
  id?: string;
  clientKey: string;
  label: string;
  valueCode: string;
  imageUrl: string;
  sortOrder: number;
};

export type OptionGroupFormRow = {
  id?: string;
  clientKey: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: OptionValueFormRow[];
};

type Props = {
  groups: OptionGroupFormRow[];
  variantUsageByValueId: Record<string, number>;
  onChange: (groups: OptionGroupFormRow[]) => void;
};

function isColorGroupName(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes("màu") || normalized.includes("mau");
}

export default function ProductOptionGroupBuilder({
  groups,
  variantUsageByValueId,
  onChange,
}: Props) {
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
          Thêm nhóm
        </button>
      </div>

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
                  <div className="admin-spec-row-actions">
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, -1)}>↑</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => moveGroup(groupIndex, 1)}>↓</button>
                    <button type="button" className="btn-tertiary btn-sm" onClick={() => removeGroup(groupIndex)}>Xóa nhóm</button>
                  </div>
                </div>

                <div className="admin-spec-row">
                  <input
                    className="form-input"
                    value={group.name}
                    placeholder="VD: Màu sắc"
                    onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                    aria-label={`Tên nhóm biến thể ${groupIndex + 1}`}
                  />
                  <input
                    className="form-input"
                    value={group.slug}
                    placeholder="Slug nội bộ (tuỳ chọn)"
                    onChange={(e) => updateGroup(groupIndex, { slug: e.target.value })}
                    aria-label={`Slug nhóm ${groupIndex + 1}`}
                  />
                </div>
                {duplicateName && (
                  <p className="admin-error" role="alert">Tên nhóm bị trùng với nhóm khác.</p>
                )}

                <div className="admin-option-values">
                  {group.values.map((value, valueIndex) => {
                    const usage = value.id ? variantUsageByValueId[value.id] ?? 0 : 0;
                    const showColorCode = isColorGroupName(group.name);
                    return (
                      <div key={value.clientKey} className="admin-option-value-row">
                        <input
                          className="form-input"
                          value={value.label}
                          placeholder="Giá trị hiển thị"
                          onChange={(e) => updateValue(groupIndex, valueIndex, { label: e.target.value })}
                          aria-label={`Giá trị ${valueIndex + 1} nhóm ${group.name}`}
                        />
                        <input
                          className="form-input"
                          value={value.valueCode}
                          placeholder={showColorCode ? "Mã màu (#000000 hoặc BLK)" : "Mã giá trị"}
                          onChange={(e) => updateValue(groupIndex, valueIndex, { valueCode: e.target.value })}
                        />
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
