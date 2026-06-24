"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { RevenueCategoryRecord } from "@/features/revenue-categories/revenue-category.service";

type FormState = {
  code: string;
  name: string;
  parentId: string;
  description: string;
  sortOrder: string;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  parentId: "",
  description: "",
  sortOrder: "0",
});

function flattenTree(
  nodes: RevenueCategoryRecord[],
  depth = 0,
): Array<RevenueCategoryRecord & { depth: number }> {
  const result: Array<RevenueCategoryRecord & { depth: number }> = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

export default function RevenueCategoryAdmin() {
  const toast = useAdminToast();
  const [tree, setTree] = useState<RevenueCategoryRecord[]>([]);
  const [flat, setFlat] = useState<RevenueCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentForChild, setParentForChild] = useState<RevenueCategoryRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/revenue-categories?${params}`);
      const data = (await res.json()) as {
        tree?: RevenueCategoryRecord[];
        flat?: RevenueCategoryRecord[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Không thể tải nhóm doanh thu.");
      setTree(data.tree ?? []);
      setFlat(data.flat ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải nhóm doanh thu.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const displayRows = useMemo(() => flattenTree(tree), [tree]);

  const parentOptions = useMemo(
    () =>
      flat
        .filter((row) => row.id !== editingId)
        .map((row) => ({ value: row.id, label: row.displayPath })),
    [flat, editingId],
  );

  function openCreateRoot() {
    setEditingId(null);
    setParentForChild(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function openCreateChild(parent: RevenueCategoryRecord) {
    setEditingId(null);
    setParentForChild(parent);
    setForm({ ...emptyForm(), parentId: parent.id });
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: RevenueCategoryRecord) {
    setEditingId(row.id);
    setParentForChild(null);
    setForm({
      code: row.code,
      name: row.name,
      parentId: row.parentId ?? "",
      description: row.description ?? "",
      sortOrder: String(row.sortOrder),
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        parentId: form.parentId || null,
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      const url = editingId
        ? `/api/admin/revenue-categories/${editingId}`
        : "/api/admin/revenue-categories";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Không thể lưu nhóm doanh thu.");
      toast.success(editingId ? "Đã cập nhật nhóm doanh thu." : "Đã tạo nhóm doanh thu.");
      setShowForm(false);
      setEditingId(null);
      setParentForChild(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu nhóm doanh thu.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: RevenueCategoryRecord) {
    try {
      const res = await fetch(`/api/admin/revenue-categories/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Không thể cập nhật trạng thái.");
      toast.success(row.isActive ? "Đã ngừng hoạt động nhóm doanh thu." : "Đã kích hoạt nhóm doanh thu.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái.");
    }
  }

  async function handleDelete(row: RevenueCategoryRecord) {
    if (!window.confirm(`Xóa nhóm doanh thu "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/revenue-categories/${row.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Không thể xóa nhóm doanh thu.");
      toast.success("Đã xóa nhóm doanh thu.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa nhóm doanh thu.");
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p className="admin-field-hint">
          Nhóm doanh thu dùng cho báo giá, đơn hàng và báo cáo. Tách biệt với danh mục sản phẩm kho sỉ.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreateRoot}>
            Tạo nhóm gốc
          </button>
        </div>
      </div>

      <form
        className="admin-data-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="admin-input admin-data-toolbar__search"
          placeholder="Tìm theo mã hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn admin-btn--secondary">
          Tìm kiếm
        </button>
      </form>

      {showForm && (
        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
          <legend>
            {editingId
              ? "Chỉnh sửa nhóm doanh thu"
              : parentForChild
                ? `Tạo nhóm con của "${parentForChild.name}"`
                : "Tạo nhóm doanh thu gốc"}
          </legend>
          {error && <p className="admin-error">{error}</p>}
          <form onSubmit={(e) => void handleSave(e)}>
            <div className="admin-seo-brief-form-grid">
              <div className="admin-field">
                <label className="admin-label">Mã *</label>
                <input
                  className="admin-input"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  disabled={Boolean(editingId)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Tên *</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Nhóm cha</label>
                <select
                  className="admin-input"
                  value={form.parentId}
                  onChange={(e) => setForm((prev) => ({ ...prev, parentId: e.target.value }))}
                  disabled={Boolean(parentForChild)}
                >
                  <option value="">— Nhóm gốc —</option>
                  {parentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Thứ tự</label>
                <input
                  className="admin-input"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                />
              </div>
              <div className="admin-field admin-field--full">
                <label className="admin-label">Mô tả</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setParentForChild(null);
                  setError(null);
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </fieldset>
      )}

      {loading ? (
        <p className="admin-loading">Đang tải...</p>
      ) : displayRows.length === 0 ? (
        <p className="admin-field-hint">Chưa có nhóm doanh thu.</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginTop: 16 }}>
          <div className="revenue-category-admin__tree">
            {displayRows.map((row) => (
              <div
                key={row.id}
                className={`revenue-category-admin__row${row.isActive ? "" : " revenue-category-admin__row--inactive"}`}
              >
                <div
                  className="revenue-category-admin__name"
                  style={{ paddingLeft: row.depth * 20 }}
                >
                  <strong>{row.name}</strong>
                  <span className="revenue-category-admin__code">{row.code}</span>
                  {row.description && (
                    <span className="admin-field-hint">{row.description}</span>
                  )}
                </div>
                <div className="revenue-category-admin__usage">
                  ĐH: {row.orderItemCount} · BG: {row.quoteItemCount}
                </div>
                <div>
                  {row.isActive ? (
                    <span className="admin-badge admin-badge--ok">Hoạt động</span>
                  ) : (
                    <span className="admin-badge">Ngừng</span>
                  )}
                  {row.isSystem && <span className="admin-badge">Hệ thống</span>}
                </div>
                <div className="revenue-category-admin__actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost admin-btn--xs"
                    onClick={() => openCreateChild(row)}
                  >
                    + Con
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost admin-btn--xs"
                    onClick={() => openEdit(row)}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost admin-btn--xs"
                    onClick={() => void toggleActive(row)}
                  >
                    {row.isActive ? "Ngừng" : "Kích hoạt"}
                  </button>
                  {!row.isSystem && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--xs"
                      onClick={() => void handleDelete(row)}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
