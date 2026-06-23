"use client";

import { useCallback, useEffect, useState } from "react";

type DisplayType = "TEXT" | "COLOR_SWATCH" | "SIZE" | "SELECT" | "IMAGE_SWATCH";
type Status = "ACTIVE" | "INACTIVE";

const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = {
  TEXT: "text",
  COLOR_SWATCH: "color swatch",
  SIZE: "size",
  SELECT: "select",
  IMAGE_SWATCH: "image swatch",
};

type AttributeValue = {
  id: string;
  name: string;
  code: string;
  slug: string;
  hexCode: string | null;
  imageUrl: string | null;
  status: Status;
  sortOrder: number;
  usageCount: number;
};

type Attribute = {
  id: string;
  name: string;
  code: string;
  slug: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  status: Status;
  sortOrder: number;
  note: string | null;
  usageCount: number;
  values: AttributeValue[];
};

type AttributeForm = {
  id?: string;
  name: string;
  code: string;
  slug: string;
  displayType: DisplayType;
  isVariantAttribute: boolean;
  isSpecificationAttribute: boolean;
  status: Status;
  sortOrder: string;
  note: string;
};

type ValueForm = {
  id?: string;
  attributeId: string;
  name: string;
  code: string;
  slug: string;
  hexCode: string;
  imageUrl: string;
  status: Status;
  sortOrder: string;
};

const defaultAttributeForm = (): AttributeForm => ({
  name: "",
  code: "",
  slug: "",
  displayType: "TEXT",
  isVariantAttribute: true,
  isSpecificationAttribute: false,
  status: "ACTIVE",
  sortOrder: "0",
  note: "",
});

const defaultValueForm = (attributeId = ""): ValueForm => ({
  attributeId,
  name: "",
  code: "",
  slug: "",
  hexCode: "",
  imageUrl: "",
  status: "ACTIVE",
  sortOrder: "0",
});

function errorClass(fieldErrors: Record<string, string>, field: string) {
  return fieldErrors[field] ? " admin-input--error" : "";
}

export default function ProductAttributesClient() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [attributeForm, setAttributeForm] = useState<AttributeForm>(defaultAttributeForm());
  const [valueForm, setValueForm] = useState<ValueForm>(defaultValueForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("includeInactiveValues", "1");
      if (!showInactive) params.set("activeOnly", "1");
      const res = await fetch(`/api/admin/attributes?${params.toString()}`);
      const data = await res.json() as Attribute[];
      setAttributes(Array.isArray(data) ? data : []);
    } catch {
      setAttributes([]);
    }
    setLoading(false);
  }, [showInactive]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function seedDefaults() {
    setMessage(null);
    const res = await fetch("/api/admin/attributes/seed", { method: "POST" });
    const data = await res.json() as { message?: string };
    setMessage(data.message ?? "Đã tạo thuộc tính mặc định.");
    void load();
  }

  async function handleAttributeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    if (!attributeForm.name.trim()) {
      setFieldErrors({ name: "Tên thuộc tính là bắt buộc." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: attributeForm.name.trim(),
        code: attributeForm.code.trim() || undefined,
        slug: attributeForm.slug.trim() || undefined,
        displayType: attributeForm.displayType,
        isVariantAttribute: attributeForm.isVariantAttribute,
        isSpecificationAttribute: attributeForm.isSpecificationAttribute,
        status: attributeForm.status,
        sortOrder: attributeForm.sortOrder,
        note: attributeForm.note.trim() || undefined,
      };

      const res = attributeForm.id
        ? await fetch(`/api/admin/attributes/${attributeForm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        : await fetch("/api/admin/attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      const data = await res.json() as { message?: string; fieldErrors?: Record<string, string> };
      if (!res.ok) {
        setFieldErrors(data.fieldErrors ?? {});
        setError(data.message ?? "Không thể lưu thuộc tính.");
        return;
      }
      setAttributeForm(defaultAttributeForm());
      setMessage(attributeForm.id ? "Đã cập nhật thuộc tính." : "Đã tạo thuộc tính.");
      void load();
    } catch {
      setError("Lỗi lưu thuộc tính.");
    }
    setSaving(false);
  }

  async function handleValueSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    if (!valueForm.attributeId) {
      setFieldErrors({ attributeId: "Vui lòng chọn thuộc tính cha." });
      return;
    }
    if (!valueForm.name.trim()) {
      setFieldErrors({ name: "Tên hiển thị là bắt buộc." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: valueForm.name.trim(),
        code: valueForm.code.trim() || undefined,
        slug: valueForm.slug.trim() || undefined,
        hexCode: valueForm.hexCode.trim() || undefined,
        imageUrl: valueForm.imageUrl.trim() || undefined,
        status: valueForm.status,
        sortOrder: valueForm.sortOrder,
      };
      const res = valueForm.id
        ? await fetch(`/api/admin/attributes/${valueForm.attributeId}/values/${valueForm.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        : await fetch(`/api/admin/attributes/${valueForm.attributeId}/values`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      const data = await res.json() as { message?: string; fieldErrors?: Record<string, string> };
      if (!res.ok) {
        setFieldErrors(data.fieldErrors ?? {});
        setError(data.message ?? "Không thể lưu giá trị thuộc tính.");
        return;
      }
      setValueForm(defaultValueForm(valueForm.attributeId));
      setMessage(valueForm.id ? "Đã cập nhật giá trị." : "Đã tạo giá trị.");
      void load();
    } catch {
      setError("Lỗi lưu giá trị thuộc tính.");
    }
    setSaving(false);
  }

  async function patchAttribute(attribute: Attribute, patch: Partial<AttributeForm>) {
    await fetch(`/api/admin/attributes/${attribute.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    void load();
  }

  async function patchValue(attribute: Attribute, value: AttributeValue, patch: Partial<ValueForm>) {
    await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    void load();
  }

  async function deleteAttribute(attribute: Attribute) {
    if (!window.confirm(`Xóa thuộc tính "${attribute.name}"? Chỉ xóa được khi chưa sử dụng.`)) return;
    const res = await fetch(`/api/admin/attributes/${attribute.id}`, { method: "DELETE" });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa thuộc tính. Hãy ngừng sử dụng thay vì xóa.");
      return;
    }
    setMessage("Đã xóa thuộc tính.");
    void load();
  }

  async function deleteValue(attribute: Attribute, value: AttributeValue) {
    if (!window.confirm(`Xóa giá trị "${value.name}"? Chỉ xóa được khi chưa sử dụng.`)) return;
    const res = await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, { method: "DELETE" });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa giá trị. Hãy ngừng sử dụng thay vì xóa.");
      return;
    }
    setMessage("Đã xóa giá trị.");
    void load();
  }

  return (
    <div className="admin-catalog-page">
      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-toolbar-left">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void seedDefaults()}>
            Tạo bộ mặc định COLOR / SIZE / FIT
          </button>
        </div>
        <label className="admin-catalog-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Hiện thuộc tính ngừng sử dụng
        </label>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <form className="admin-catalog-fieldset" onSubmit={(e) => void handleAttributeSubmit(e)}>
        <legend style={{ fontWeight: 600, fontSize: 14 }}>
          {attributeForm.id ? "Cập nhật thuộc tính" : "Thêm thuộc tính mới"}
        </legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Tên thuộc tính <span className="admin-required">*</span></label>
            <input className={`admin-input${errorClass(fieldErrors, "name")}`} data-field="name" value={attributeForm.name} onChange={(e) => setAttributeForm((f) => ({ ...f, name: e.target.value }))} placeholder="Màu sắc, Kích thước, Form dáng…" />
            {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã thuộc tính</label>
            <input className={`admin-input${errorClass(fieldErrors, "code")}`} value={attributeForm.code} onChange={(e) => setAttributeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="COLOR, SIZE, FIT…" />
            {fieldErrors.code && <p className="admin-field-error" role="alert">{fieldErrors.code}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input className={`admin-input${errorClass(fieldErrors, "slug")}`} value={attributeForm.slug} onChange={(e) => setAttributeForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Tự sinh nếu bỏ trống" />
            {fieldErrors.slug && <p className="admin-field-error" role="alert">{fieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Kiểu hiển thị</label>
            <select className={`admin-input${errorClass(fieldErrors, "displayType")}`} value={attributeForm.displayType} onChange={(e) => setAttributeForm((f) => ({ ...f, displayType: e.target.value as DisplayType }))}>
              {Object.entries(DISPLAY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {fieldErrors.displayType && <p className="admin-field-error" role="alert">{fieldErrors.displayType}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Thứ tự sắp xếp</label>
            <input className={`admin-input${errorClass(fieldErrors, "sortOrder")}`} type="number" value={attributeForm.sortOrder} onChange={(e) => setAttributeForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            {fieldErrors.sortOrder && <p className="admin-field-error" role="alert">{fieldErrors.sortOrder}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={attributeForm.status} onChange={(e) => setAttributeForm((f) => ({ ...f, status: e.target.value as Status }))}>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>
          </div>
        </div>
        <div className="admin-catalog-toggle-grid">
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={attributeForm.isVariantAttribute} onChange={(e) => setAttributeForm((f) => ({ ...f, isVariantAttribute: e.target.checked }))} />
            Dùng để tạo biến thể
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={attributeForm.isSpecificationAttribute} onChange={(e) => setAttributeForm((f) => ({ ...f, isSpecificationAttribute: e.target.checked }))} />
            Dùng làm thông số sản phẩm
          </label>
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú nội bộ</label>
          <textarea className="admin-textarea" value={attributeForm.note} onChange={(e) => setAttributeForm((f) => ({ ...f, note: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? "Đang lưu…" : attributeForm.id ? "Cập nhật thuộc tính" : "Thêm thuộc tính"}
          </button>
          {attributeForm.id && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setAttributeForm(defaultAttributeForm())}>
              Hủy
            </button>
          )}
        </div>
      </form>

      <form className="admin-catalog-fieldset" onSubmit={(e) => void handleValueSubmit(e)}>
        <legend style={{ fontWeight: 600, fontSize: 14 }}>
          {valueForm.id ? "Cập nhật giá trị thuộc tính" : "Thêm giá trị thuộc tính"}
        </legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Thuộc tính cha <span className="admin-required">*</span></label>
            <select className={`admin-input${errorClass(fieldErrors, "attributeId")}`} value={valueForm.attributeId} onChange={(e) => setValueForm((f) => ({ ...f, attributeId: e.target.value }))}>
              <option value="">— Chọn thuộc tính —</option>
              {attributes.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name} ({attribute.code})</option>)}
            </select>
            {fieldErrors.attributeId && <p className="admin-field-error" role="alert">{fieldErrors.attributeId}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên hiển thị <span className="admin-required">*</span></label>
            <input className={`admin-input${errorClass(fieldErrors, "name")}`} value={valueForm.name} onChange={(e) => setValueForm((f) => ({ ...f, name: e.target.value }))} placeholder="Đen, Trắng, S, Regular fit…" />
            {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã giá trị</label>
            <input className={`admin-input${errorClass(fieldErrors, "code")}`} value={valueForm.code} onChange={(e) => setValueForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="BLK, WHT, S…" />
            {fieldErrors.code && <p className="admin-field-error" role="alert">{fieldErrors.code}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input className={`admin-input${errorClass(fieldErrors, "slug")}`} value={valueForm.slug} onChange={(e) => setValueForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Tự sinh nếu bỏ trống" />
            {fieldErrors.slug && <p className="admin-field-error" role="alert">{fieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">HEX màu</label>
            <input className={`admin-input${errorClass(fieldErrors, "hexCode")}`} value={valueForm.hexCode} onChange={(e) => setValueForm((f) => ({ ...f, hexCode: e.target.value }))} placeholder="#000000" />
            {fieldErrors.hexCode && <p className="admin-field-error" role="alert">{fieldErrors.hexCode}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Ảnh giá trị</label>
            <input className="admin-input" value={valueForm.imageUrl} onChange={(e) => setValueForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="URL ảnh nếu dùng image swatch" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thứ tự</label>
            <input className={`admin-input${errorClass(fieldErrors, "sortOrder")}`} type="number" value={valueForm.sortOrder} onChange={(e) => setValueForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            {fieldErrors.sortOrder && <p className="admin-field-error" role="alert">{fieldErrors.sortOrder}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={valueForm.status} onChange={(e) => setValueForm((f) => ({ ...f, status: e.target.value as Status }))}>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng sử dụng</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? "Đang lưu…" : valueForm.id ? "Cập nhật giá trị" : "Thêm giá trị"}
          </button>
          {valueForm.id && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setValueForm(defaultValueForm(valueForm.attributeId))}>
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {attributes.map((attribute) => {
            return (
              <section key={attribute.id} className="admin-product-section">
                <div className="admin-section-head">
                  <div>
                    <h3 className="admin-subtitle" style={{ marginBottom: 4 }}>{attribute.name}</h3>
                    <p className="admin-field-hint">
                      <code className="admin-catalog-code">{attribute.code}</code> · {attribute.slug} · {DISPLAY_TYPE_LABELS[attribute.displayType]} · {attribute.usageCount} nhóm sản phẩm đang dùng
                    </p>
                  </div>
                  <div className="admin-catalog-actions-cell">
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setAttributeForm({
                      id: attribute.id,
                      name: attribute.name,
                      code: attribute.code,
                      slug: attribute.slug,
                      displayType: attribute.displayType,
                      isVariantAttribute: attribute.isVariantAttribute,
                      isSpecificationAttribute: attribute.isSpecificationAttribute,
                      status: attribute.status,
                      sortOrder: String(attribute.sortOrder),
                      note: attribute.note ?? "",
                    })}>Sửa</button>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchAttribute(attribute, { status: attribute.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>
                      {attribute.status === "ACTIVE" ? "Ngừng sử dụng" : "Kích hoạt"}
                    </button>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void deleteAttribute(attribute)}>Xóa</button>
                  </div>
                </div>
                <div className="admin-catalog-table-wrap">
                  <table className="admin-catalog-table">
                    <thead>
                      <tr>
                        <th>Tên hiển thị</th>
                        <th>Mã</th>
                        <th>Slug</th>
                        <th>Màu/ảnh</th>
                        <th>Thứ tự</th>
                        <th>Trạng thái</th>
                        <th>Sử dụng</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attribute.values.map((value) => (
                        <tr key={value.id}>
                          <td>{value.name}</td>
                          <td><code className="admin-catalog-code">{value.code}</code></td>
                          <td>{value.slug}</td>
                          <td>
                            {value.hexCode ? <span style={{ display: "inline-block", width: 16, height: 16, borderRadius: 4, background: value.hexCode, border: "1px solid #d1d5db" }} title={value.hexCode} /> : value.imageUrl ? "Có ảnh" : "—"}
                          </td>
                          <td>{value.sortOrder}</td>
                          <td>
                            <span className={`admin-kb-badge ${value.status === "ACTIVE" ? "admin-kb-badge--verified" : "admin-kb-badge--low"}`}>
                              {value.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng sử dụng"}
                            </span>
                          </td>
                          <td>{value.usageCount}</td>
                          <td>
                            <div className="admin-catalog-actions-cell">
                              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setValueForm({
                                id: value.id,
                                attributeId: attribute.id,
                                name: value.name,
                                code: value.code,
                                slug: value.slug,
                                hexCode: value.hexCode ?? "",
                                imageUrl: value.imageUrl ?? "",
                                status: value.status,
                                sortOrder: String(value.sortOrder),
                              })}>Sửa</button>
                              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchValue(attribute, value, { status: value.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>
                                {value.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                              </button>
                              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void deleteValue(attribute, value)}>Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {attribute.values.length === 0 && (
                        <tr>
                          <td colSpan={8}>Chưa có giá trị. Thêm giá trị ở biểu mẫu phía trên.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
