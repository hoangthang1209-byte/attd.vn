"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AttributePresetDialog from "@/components/admin/products/AttributePresetDialog";
import { useAdminAction } from "@/hooks/useAdminAction";

type DisplayType = "TEXT" | "COLOR_SWATCH" | "SIZE" | "SELECT" | "IMAGE_SWATCH";
type Status = "ACTIVE" | "INACTIVE";

const DISPLAY_TYPE_LABELS: Record<DisplayType, string> = {
  TEXT: "text",
  COLOR_SWATCH: "color swatch",
  SIZE: "size",
  SELECT: "select",
  IMAGE_SWATCH: "image swatch",
};

const CODE_SLUG_LOCKED_HINT =
  "Mã không thể thay đổi vì thuộc tính này đang được sử dụng trong sản phẩm, biến thể hoặc dữ liệu liên quan.";

const FORM_SCROLL_MARGIN = 88;

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
  isReferenced: boolean;
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
  isReferenced: boolean;
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
  isReferenced?: boolean;
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
  isReferenced?: boolean;
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

function scrollFormIntoView(node: HTMLElement | null) {
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function ProductAttributesClient() {
  const { toast } = useAdminAction();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [attributeForm, setAttributeForm] = useState<AttributeForm>(defaultAttributeForm());
  const [valueForm, setValueForm] = useState<ValueForm>(defaultValueForm());
  const [isSavingAttribute, setIsSavingAttribute] = useState(false);
  const [isSavingValue, setIsSavingValue] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attributeFieldErrors, setAttributeFieldErrors] = useState<Record<string, string>>({});
  const [valueFieldErrors, setValueFieldErrors] = useState<Record<string, string>>({});
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [editingAttributeId, setEditingAttributeId] = useState<string | null>(null);
  const [editingAttributeName, setEditingAttributeName] = useState<string | null>(null);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editingValueName, setEditingValueName] = useState<string | null>(null);
  const [editingValueAttributeName, setEditingValueAttributeName] = useState<string | null>(null);

  const attributeSectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const attributeFormRef = useRef<HTMLFormElement>(null);
  const valueFormRef = useRef<HTMLFormElement>(null);
  const attributeNameInputRef = useRef<HTMLInputElement>(null);
  const valueNameInputRef = useRef<HTMLInputElement>(null);

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

  function focusAttribute(attributeId: string) {
    const section = attributeSectionRefs.current[attributeId];
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearAttributeFieldError(field: string) {
    setAttributeFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function clearValueFieldError(field: string) {
    setValueFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function startEditAttribute(attribute: Attribute) {
    setAttributeForm({
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
      isReferenced: attribute.isReferenced,
    });
    setEditingAttributeId(attribute.id);
    setEditingAttributeName(attribute.name);
    setAttributeFieldErrors({});
    setError(null);

    window.requestAnimationFrame(() => {
      scrollFormIntoView(attributeFormRef.current);
      window.setTimeout(() => attributeNameInputRef.current?.focus(), 320);
    });
  }

  function cancelAttributeEdit() {
    setAttributeForm(defaultAttributeForm());
    setEditingAttributeId(null);
    setEditingAttributeName(null);
    setAttributeFieldErrors({});
  }

  function startEditValue(attribute: Attribute, value: AttributeValue) {
    setValueForm({
      id: value.id,
      attributeId: attribute.id,
      name: value.name,
      code: value.code,
      slug: value.slug,
      hexCode: value.hexCode ?? "",
      imageUrl: value.imageUrl ?? "",
      status: value.status,
      sortOrder: String(value.sortOrder),
      isReferenced: value.isReferenced,
    });
    setEditingValueId(value.id);
    setEditingValueName(value.name);
    setEditingValueAttributeName(attribute.name);
    setValueFieldErrors({});
    setError(null);

    window.requestAnimationFrame(() => {
      scrollFormIntoView(valueFormRef.current);
      window.setTimeout(() => valueNameInputRef.current?.focus(), 320);
    });
  }

  function cancelValueEdit() {
    const attributeId = valueForm.attributeId;
    setValueForm(defaultValueForm(attributeId));
    setEditingValueId(null);
    setEditingValueName(null);
    setEditingValueAttributeName(null);
    setValueFieldErrors({});
  }

  async function handlePresetSuccess(attributeId: string, successMessage: string) {
    setMessage(successMessage);
    setError(null);
    await load();
    window.setTimeout(() => focusAttribute(attributeId), 100);
  }

  async function handleAttributeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttributeFieldErrors({});
    setError(null);
    if (!attributeForm.name.trim()) {
      setAttributeFieldErrors({ name: "Tên thuộc tính là bắt buộc." });
      return;
    }

    setIsSavingAttribute(true);
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
      const data = await res.json().catch(() => null) as { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok) {
        setAttributeFieldErrors(data?.fieldErrors ?? {});
        setError(data?.message ?? "Không thể lưu thuộc tính.");
        return;
      }

      const wasEdit = Boolean(attributeForm.id);
      setAttributeForm(defaultAttributeForm());
      setEditingAttributeId(null);
      setEditingAttributeName(null);
      setMessage(wasEdit ? "Đã cập nhật thuộc tính." : "Đã tạo thuộc tính.");
      void load();
    } catch {
      setError("Lỗi mạng hoặc lỗi không xác định khi lưu thuộc tính.");
    } finally {
      setIsSavingAttribute(false);
    }
  }

  async function handleValueSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValueFieldErrors({});
    setError(null);
    if (!valueForm.attributeId) {
      setValueFieldErrors({ attributeId: "Vui lòng chọn thuộc tính cha." });
      return;
    }
    if (!valueForm.name.trim()) {
      setValueFieldErrors({ name: "Tên hiển thị là bắt buộc." });
      return;
    }

    setIsSavingValue(true);
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
      const data = await res.json().catch(() => null) as { message?: string; fieldErrors?: Record<string, string> } | null;
      if (!res.ok) {
        setValueFieldErrors(data?.fieldErrors ?? {});
        setError(data?.message ?? "Không thể lưu giá trị thuộc tính.");
        return;
      }

      const wasEdit = Boolean(valueForm.id);
      const parentAttributeId = valueForm.attributeId;
      setValueForm(defaultValueForm(parentAttributeId));
      setEditingValueId(null);
      setEditingValueName(null);
      setEditingValueAttributeName(null);
      setMessage(wasEdit ? "Đã cập nhật giá trị." : "Đã tạo giá trị.");
      void load();
    } catch {
      setError("Lỗi mạng hoặc lỗi không xác định khi lưu giá trị thuộc tính.");
    } finally {
      setIsSavingValue(false);
    }
  }

  async function patchAttribute(attribute: Attribute, patch: Partial<AttributeForm>) {
    try {
      const res = await fetch(`/api/admin/attributes/${attribute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        return;
      }
      toast.success("Đã cập nhật trạng thái thuộc tính.");
      void load();
    } catch {
      toast.error("Không thể cập nhật trạng thái. Vui lòng thử lại.");
    }
  }

  async function patchValue(attribute: Attribute, value: AttributeValue, patch: Partial<ValueForm>) {
    try {
      const res = await fetch(`/api/admin/attributes/${attribute.id}/values/${value.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => null) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Không thể cập nhật trạng thái. Vui lòng thử lại.");
        return;
      }
      toast.success("Đã cập nhật trạng thái giá trị.");
      void load();
    } catch {
      toast.error("Không thể cập nhật trạng thái. Vui lòng thử lại.");
    }
  }

  async function deleteAttribute(attribute: Attribute) {
    if (!window.confirm(`Xóa thuộc tính "${attribute.name}"? Chỉ xóa được khi chưa sử dụng.`)) return;
    const res = await fetch(`/api/admin/attributes/${attribute.id}`, { method: "DELETE" });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa thuộc tính. Hãy ngừng sử dụng thay vì xóa.");
      return;
    }
    if (editingAttributeId === attribute.id) cancelAttributeEdit();
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
    if (editingValueId === value.id) cancelValueEdit();
    setMessage("Đã xóa giá trị.");
    void load();
  }

  const editingValueParentName = attributes.find((attribute) => attribute.id === valueForm.attributeId)?.name
    ?? editingValueAttributeName
    ?? "";

  return (
    <div className="admin-catalog-page">
      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-toolbar-left">
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setPresetDialogOpen(true)}>
            Tạo từ bộ mặc định
          </button>
        </div>
        <label className="admin-catalog-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Hiện thuộc tính ngừng sử dụng
        </label>
      </div>

      <p className="admin-field-hint">
        Thuộc tính đang hoạt động sẽ xuất hiện trong phần &quot;Thuộc tính &amp; biến thể&quot; khi tạo hoặc sửa sản phẩm.
      </p>
      <p className="admin-field-hint">
        Thuộc tính có trạng thái hoạt động và được đánh dấu &quot;Dùng làm thông số&quot; sẽ xuất hiện trong phần &quot;Thông tin thuộc tính sản phẩm&quot; khi tạo hoặc sửa sản phẩm.
      </p>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <form
        ref={attributeFormRef}
        className="admin-catalog-fieldset"
        style={{ scrollMarginTop: FORM_SCROLL_MARGIN }}
        onSubmit={(e) => void handleAttributeSubmit(e)}
      >
        <legend style={{ fontWeight: 600, fontSize: 14 }}>
          {attributeForm.id && editingAttributeName
            ? `Cập nhật thuộc tính: ${editingAttributeName}`
            : attributeForm.id
              ? "Cập nhật thuộc tính"
              : "Thêm thuộc tính mới"}
        </legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Tên thuộc tính <span className="admin-required">*</span></label>
            <input
              ref={attributeNameInputRef}
              className={`admin-input${errorClass(attributeFieldErrors, "name")}`}
              data-field="name"
              value={attributeForm.name}
              onChange={(e) => {
                clearAttributeFieldError("name");
                setAttributeForm((f) => ({ ...f, name: e.target.value }));
              }}
              placeholder="Màu sắc, Kích thước, Form dáng…"
            />
            {attributeFieldErrors.name && <p className="admin-field-error" role="alert">{attributeFieldErrors.name}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã thuộc tính</label>
            <input
              className={`admin-input${errorClass(attributeFieldErrors, "code")}`}
              value={attributeForm.code}
              readOnly={Boolean(attributeForm.isReferenced)}
              onChange={(e) => {
                clearAttributeFieldError("code");
                setAttributeForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
              }}
              placeholder="COLOR, SIZE, FIT…"
            />
            {attributeForm.isReferenced && (
              <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>
            )}
            {attributeFieldErrors.code && <p className="admin-field-error" role="alert">{attributeFieldErrors.code}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input
              className={`admin-input${errorClass(attributeFieldErrors, "slug")}`}
              value={attributeForm.slug}
              readOnly={Boolean(attributeForm.isReferenced)}
              onChange={(e) => {
                clearAttributeFieldError("slug");
                setAttributeForm((f) => ({ ...f, slug: e.target.value }));
              }}
              placeholder="Tự sinh nếu bỏ trống"
            />
            {attributeForm.isReferenced && (
              <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>
            )}
            {attributeFieldErrors.slug && <p className="admin-field-error" role="alert">{attributeFieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Kiểu hiển thị</label>
            <select
              className={`admin-input${errorClass(attributeFieldErrors, "displayType")}`}
              value={attributeForm.displayType}
              onChange={(e) => {
                clearAttributeFieldError("displayType");
                setAttributeForm((f) => ({ ...f, displayType: e.target.value as DisplayType }));
              }}
            >
              {Object.entries(DISPLAY_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {attributeFieldErrors.displayType && <p className="admin-field-error" role="alert">{attributeFieldErrors.displayType}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Thứ tự sắp xếp</label>
            <input
              className={`admin-input${errorClass(attributeFieldErrors, "sortOrder")}`}
              type="number"
              value={attributeForm.sortOrder}
              onChange={(e) => {
                clearAttributeFieldError("sortOrder");
                setAttributeForm((f) => ({ ...f, sortOrder: e.target.value }));
              }}
            />
            {attributeFieldErrors.sortOrder && <p className="admin-field-error" role="alert">{attributeFieldErrors.sortOrder}</p>}
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
          <button type="submit" className="admin-btn admin-btn--primary" disabled={isSavingAttribute}>
            {isSavingAttribute ? "Đang lưu…" : attributeForm.id ? "Cập nhật thuộc tính" : "Thêm thuộc tính"}
          </button>
          {attributeForm.id && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={cancelAttributeEdit}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </form>

      <form
        ref={valueFormRef}
        className="admin-catalog-fieldset"
        style={{ scrollMarginTop: FORM_SCROLL_MARGIN }}
        onSubmit={(e) => void handleValueSubmit(e)}
      >
        <legend style={{ fontWeight: 600, fontSize: 14 }}>
          {valueForm.id && editingValueAttributeName && editingValueName
            ? `Cập nhật giá trị: ${editingValueParentName || editingValueAttributeName} — ${editingValueName}`
            : valueForm.id
              ? "Cập nhật giá trị thuộc tính"
              : "Thêm giá trị thuộc tính"}
        </legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Thuộc tính cha <span className="admin-required">*</span></label>
            <select
              className={`admin-input${errorClass(valueFieldErrors, "attributeId")}`}
              value={valueForm.attributeId}
              disabled={Boolean(valueForm.id)}
              onChange={(e) => {
                clearValueFieldError("attributeId");
                setValueForm((f) => ({ ...f, attributeId: e.target.value }));
              }}
            >
              <option value="">— Chọn thuộc tính —</option>
              {attributes.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name} ({attribute.code})</option>)}
            </select>
            {valueForm.id && (
              <p className="admin-field-hint">Không thể chuyển giá trị sang thuộc tính khác sau khi đã tạo.</p>
            )}
            {valueFieldErrors.attributeId && <p className="admin-field-error" role="alert">{valueFieldErrors.attributeId}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên hiển thị <span className="admin-required">*</span></label>
            <input
              ref={valueNameInputRef}
              className={`admin-input${errorClass(valueFieldErrors, "name")}`}
              value={valueForm.name}
              onChange={(e) => {
                clearValueFieldError("name");
                setValueForm((f) => ({ ...f, name: e.target.value }));
              }}
              placeholder="Đen, Trắng, S, Regular fit…"
            />
            {valueFieldErrors.name && <p className="admin-field-error" role="alert">{valueFieldErrors.name}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã giá trị</label>
            <input
              className={`admin-input${errorClass(valueFieldErrors, "code")}`}
              value={valueForm.code}
              readOnly={Boolean(valueForm.isReferenced)}
              onChange={(e) => {
                clearValueFieldError("code");
                setValueForm((f) => ({ ...f, code: e.target.value.toUpperCase() }));
              }}
              placeholder="BLK, WHT, S…"
            />
            {valueForm.isReferenced && (
              <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>
            )}
            {valueFieldErrors.code && <p className="admin-field-error" role="alert">{valueFieldErrors.code}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input
              className={`admin-input${errorClass(valueFieldErrors, "slug")}`}
              value={valueForm.slug}
              readOnly={Boolean(valueForm.isReferenced)}
              onChange={(e) => {
                clearValueFieldError("slug");
                setValueForm((f) => ({ ...f, slug: e.target.value }));
              }}
              placeholder="Tự sinh nếu bỏ trống"
            />
            {valueForm.isReferenced && (
              <p className="admin-field-hint">{CODE_SLUG_LOCKED_HINT}</p>
            )}
            {valueFieldErrors.slug && <p className="admin-field-error" role="alert">{valueFieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">HEX màu</label>
            <input
              className={`admin-input${errorClass(valueFieldErrors, "hexCode")}`}
              value={valueForm.hexCode}
              onChange={(e) => {
                clearValueFieldError("hexCode");
                setValueForm((f) => ({ ...f, hexCode: e.target.value }));
              }}
              placeholder="#000000"
            />
            {valueFieldErrors.hexCode && <p className="admin-field-error" role="alert">{valueFieldErrors.hexCode}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Ảnh giá trị</label>
            <input className="admin-input" value={valueForm.imageUrl} onChange={(e) => setValueForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="URL ảnh nếu dùng image swatch" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thứ tự</label>
            <input
              className={`admin-input${errorClass(valueFieldErrors, "sortOrder")}`}
              type="number"
              value={valueForm.sortOrder}
              onChange={(e) => {
                clearValueFieldError("sortOrder");
                setValueForm((f) => ({ ...f, sortOrder: e.target.value }));
              }}
            />
            {valueFieldErrors.sortOrder && <p className="admin-field-error" role="alert">{valueFieldErrors.sortOrder}</p>}
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
          <button type="submit" className="admin-btn admin-btn--primary" disabled={isSavingValue}>
            {isSavingValue ? "Đang lưu…" : valueForm.id ? "Cập nhật giá trị" : "Thêm giá trị"}
          </button>
          {valueForm.id && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={cancelValueEdit}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {attributes.map((attribute) => {
            const isEditingAttribute = editingAttributeId === attribute.id;
            return (
              <section
                key={attribute.id}
                ref={(node) => { attributeSectionRefs.current[attribute.id] = node; }}
                className="admin-product-section"
              >
                <div className="admin-section-head">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 className="admin-subtitle" style={{ marginBottom: 0 }}>{attribute.name}</h3>
                      {isEditingAttribute && (
                        <span className="admin-kb-badge admin-kb-badge--verified">Đang chỉnh sửa</span>
                      )}
                    </div>
                    <p className="admin-field-hint">
                      <code className="admin-catalog-code">{attribute.code}</code> · {attribute.slug} · {DISPLAY_TYPE_LABELS[attribute.displayType]} · Đang dùng trong {attribute.usageCount} sản phẩm / biến thể
                    </p>
                  </div>
                  <div className="admin-catalog-actions-cell">
                    {attribute.status === "ACTIVE" && attribute.isSpecificationAttribute && (
                      <Link
                        href={`/admin/products/new?attributeId=${attribute.id}&usage=specification`}
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                      >
                        Dùng cho sản phẩm mới
                      </Link>
                    )}
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => startEditAttribute(attribute)}>
                      Sửa
                    </button>
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
                      {attribute.values.map((value) => {
                        const isEditingValue = editingValueId === value.id;
                        return (
                          <tr key={value.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{value.name}</span>
                                {isEditingValue && (
                                  <span className="admin-kb-badge admin-kb-badge--verified">Đang chỉnh sửa</span>
                                )}
                              </div>
                            </td>
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
                            <td>Đang dùng trong {value.usageCount} sản phẩm / biến thể</td>
                            <td>
                              <div className="admin-catalog-actions-cell">
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => startEditValue(attribute, value)}>
                                  Sửa
                                </button>
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchValue(attribute, value, { status: value.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>
                                  {value.status === "ACTIVE" ? "Ngừng" : "Kích hoạt"}
                                </button>
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void deleteValue(attribute, value)}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

      <AttributePresetDialog
        open={presetDialogOpen}
        onClose={() => setPresetDialogOpen(false)}
        onSuccess={(attributeId, successMessage) => void handlePresetSuccess(attributeId, successMessage)}
        onOpenExisting={(attributeId) => {
          void load().then(() => focusAttribute(attributeId));
        }}
      />
    </div>
  );
}
