"use client";

import { useCallback, useEffect, useState } from "react";

type AttributeType = "COLOR" | "SIZE" | "MATERIAL" | "FORM" | "FIT" | "DIMENSION" | "CAPACITY" | "UNIT";

const TYPE_LABELS: Record<AttributeType, string> = {
  COLOR: "Màu sắc",
  SIZE: "Size",
  MATERIAL: "Chất liệu",
  FORM: "Form / Kiểu dáng",
  FIT: "Fit",
  DIMENSION: "Kích thước",
  CAPACITY: "Dung tích",
  UNIT: "Đơn vị",
};

const ALL_TYPES: AttributeType[] = ["COLOR", "SIZE", "MATERIAL", "FORM", "FIT", "DIMENSION", "CAPACITY", "UNIT"];

type Option = {
  id: string;
  type: AttributeType;
  name: string;
  code: string | null;
  value: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
};

type FormState = {
  type: AttributeType;
  name: string;
  code: string;
  value: string;
  sortOrder: string;
};

const defaultForm = (): FormState => ({ type: "COLOR", name: "", code: "", value: "", sortOrder: "0" });

export default function ProductAttributesClient() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<AttributeType | "">("");
  const [form, setForm] = useState<FormState>(defaultForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    try {
      const res = await fetch(`/api/admin/products/attributes?${params.toString()}`);
      const data = await res.json() as Option[];
      setOptions(Array.isArray(data) ? data : []);
    } catch { setOptions([]); }
    setLoading(false);
  }, [filterType]);

  useEffect(() => { void load(); }, [load]);

  async function seedDefaults() {
    setSeedMsg(null);
    const res = await fetch("/api/admin/products/attributes/seed", { method: "POST" });
    const data = await res.json() as { message?: string };
    setSeedMsg(data.message ?? "Đã tạo thuộc tính mặc định.");
    void load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Tên thuộc tính là bắt buộc."); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        value: form.value.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
      };

      if (editId) {
        await fetch(`/api/admin/products/attributes/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setEditId(null);
      } else {
        await fetch("/api/admin/products/attributes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setForm(defaultForm());
      void load();
    } catch { setError("Lỗi lưu thuộc tính."); }
    setSaving(false);
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await fetch(`/api/admin/products/attributes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    void load();
  }

  function startEdit(opt: Option) {
    setEditId(opt.id);
    setForm({ type: opt.type, name: opt.name, code: opt.code ?? "", value: opt.value ?? "", sortOrder: String(opt.sortOrder) });
  }

  const grouped = ALL_TYPES.reduce<Record<string, Option[]>>((acc, t) => {
    acc[t] = options.filter((o) => o.type === t);
    return acc;
  }, {});

  return (
    <div className="admin-catalog-page">
      {/* Seed button */}
      <div className="admin-catalog-toolbar">
        <div className="admin-catalog-toolbar-left">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void seedDefaults()}>
            Tạo thuộc tính mặc định
          </button>
        </div>
        <div>
          <select className="admin-input" value={filterType} onChange={(e) => setFilterType(e.target.value as AttributeType | "")}>
            <option value="">Tất cả loại</option>
            {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>

      {seedMsg && <p style={{ color: "#059669", fontSize: 13 }}>{seedMsg}</p>}

      {/* Add / Edit form */}
      <form className="admin-catalog-fieldset" onSubmit={(e) => void handleSubmit(e)}>
        <legend style={{ fontWeight: 600, fontSize: 14 }}>{editId ? "Cập nhật thuộc tính" : "Thêm thuộc tính mới"}</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Loại thuộc tính</label>
            <select className="admin-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AttributeType }))}>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên thuộc tính</label>
            <input className="admin-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Đen, M, Cotton 100%…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã thuộc tính</label>
            <input className="admin-input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="BLK, M, CT…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Giá trị (tùy chọn)</label>
            <input className="admin-input" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="#000000 cho màu, 500ml cho dung tích…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thứ tự sắp xếp</label>
            <input className="admin-input" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
          </div>
        </div>
        {error && <p className="admin-error">{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
            {saving ? "Đang lưu…" : editId ? "Cập nhật" : "Thêm thuộc tính"}
          </button>
          {editId && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => { setEditId(null); setForm(defaultForm()); }}>
              Hủy
            </button>
          )}
        </div>
      </form>

      {/* Options list grouped by type */}
      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {ALL_TYPES.filter((t) => !filterType || t === filterType).map((type) => {
            const items = grouped[type] ?? [];
            return (
              <div key={type}>
                <h3 className="admin-subtitle" style={{ marginBottom: 8 }}>
                  {TYPE_LABELS[type]}
                  <span className="admin-field-hint" style={{ marginLeft: 8 }}>({items.length})</span>
                </h3>
                {items.length === 0 ? (
                  <p className="admin-field-hint">Chưa có. Nhấn "Tạo thuộc tính mặc định" hoặc thêm thủ công.</p>
                ) : (
                  <div className="admin-catalog-table-wrap">
                    <table className="admin-catalog-table">
                      <thead>
                        <tr>
                          <th>Tên</th>
                          <th>Mã</th>
                          <th>Giá trị</th>
                          <th>Thứ tự</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((opt) => (
                          <tr key={opt.id}>
                            <td>
                              {opt.type === "COLOR" && opt.value && (
                                <span style={{ display: "inline-block", width: 14, height: 14, background: opt.value, borderRadius: 2, border: "1px solid #ccc", marginRight: 6, verticalAlign: "middle" }} />
                              )}
                              {opt.name}
                            </td>
                            <td><code className="admin-catalog-code">{opt.code ?? "—"}</code></td>
                            <td><span className="admin-field-hint">{opt.value ?? "—"}</span></td>
                            <td>{opt.sortOrder}</td>
                            <td>
                              <span className={`admin-kb-badge ${opt.status === "ACTIVE" ? "admin-kb-badge--verified" : "admin-kb-badge--low"}`}>
                                {opt.status === "ACTIVE" ? "Đang dùng" : "Ngưng"}
                              </span>
                            </td>
                            <td>
                              <div className="admin-catalog-actions-cell">
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => startEdit(opt)}>Sửa</button>
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void toggleStatus(opt.id, opt.status)}>
                                  {opt.status === "ACTIVE" ? "Ngưng" : "Kích hoạt"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
