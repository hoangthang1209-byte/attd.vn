"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import type { MediaMasterDataRecord } from "@/features/media/media-master-data.types";

type FormState = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  description: "",
  sortOrder: "0",
  isActive: true,
});

type MediaMasterDataManagerProps = {
  kind: "library" | "role";
  listPath: string;
  itemPath: (id: string) => string;
  listKey: "libraries" | "roles";
  createLabel: string;
  entityLabel: string;
};

export default function MediaMasterDataManager({
  kind,
  listPath,
  itemPath,
  listKey,
  createLabel,
  entityLabel,
}: MediaMasterDataManagerProps) {
  const toast = useAdminToast();
  const [rows, setRows] = useState<MediaMasterDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${listPath}?includeCounts=1`);
      const data = (await res.json()) as Record<string, MediaMasterDataRecord[] | string | undefined>;
      if (!res.ok) throw new Error((data.message as string) ?? `Không thể tải ${entityLabel}.`);
      setRows((data[listKey] as MediaMasterDataRecord[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Không thể tải ${entityLabel}.`);
    } finally {
      setLoading(false);
    }
  }, [entityLabel, listKey, listPath]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: MediaMasterDataRecord) {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? "",
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
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
        name: form.name.trim(),
        description: form.description.trim() || null,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };
      const res = await fetch(editingId ? itemPath(editingId) : listPath, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? payload
            : { ...payload, code: normalizeMasterDataCode(form.code || form.name) },
        ),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `Không thể lưu ${entityLabel}.`);
      toast.success(editingId ? `Đã cập nhật ${entityLabel}.` : `Đã tạo ${entityLabel}.`);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Không thể lưu ${entityLabel}.`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: MediaMasterDataRecord) {
    if (row.isSystem) {
      toast.error(`Không thể xóa ${entityLabel} hệ thống.`);
      return;
    }
    if ((row.assetCount ?? 0) > 0) {
      toast.error(`Không thể xóa ${entityLabel} đang có ảnh. Hãy vô hiệu hóa thay vì xóa.`);
      return;
    }
    if (!window.confirm(`Xóa ${entityLabel} "${row.name}"?`)) return;
    try {
      const res = await fetch(itemPath(row.id), { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `Không thể xóa ${entityLabel}.`);
      toast.success(`Đã xóa ${entityLabel}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Không thể xóa ${entityLabel}.`);
    }
  }

  async function toggleActive(row: MediaMasterDataRecord) {
    try {
      const res = await fetch(itemPath(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật trạng thái.");
      toast.success(row.isActive ? "Đã vô hiệu hóa." : "Đã kích hoạt.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái.");
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>
          {kind === "library"
            ? "Quản lý nhóm thư viện ảnh (Library) cho DAM và SEO discovery."
            : "Quản lý vai trò hiển thị ảnh (Role) cho DAM và SEO discovery."}
        </p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          {createLabel}
        </button>
      </div>

      {error && !showForm && <p className="admin-message admin-message--error">{error}</p>}

      {loading ? (
        <TableLoading
          title={`Đang tải ${entityLabel}...`}
          description="Hệ thống đang tải danh sách."
          tone="admin"
        />
      ) : (
        <div className="admin-table-wrap admin-table-wrap--crm">
          <table className="admin-table admin-table--crm">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Mô tả</th>
                <th>Thứ tự</th>
                <th>Số ảnh</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.code}</code>
                    {row.isSystem && (
                      <span className="admin-badge" style={{ marginLeft: 6 }}>
                        Hệ thống
                      </span>
                    )}
                  </td>
                  <td>{row.name}</td>
                  <td>{row.description ?? "—"}</td>
                  <td>{row.sortOrder}</td>
                  <td>{row.assetCount ?? 0}</td>
                  <td>{row.isActive ? "Đang dùng" : "Vô hiệu"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => openEdit(row)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void toggleActive(row)}
                      >
                        {row.isActive ? "Vô hiệu" : "Kích hoạt"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        style={{ color: "#dc2626" }}
                        disabled={row.isSystem || (row.assetCount ?? 0) > 0}
                        onClick={() => void handleDelete(row)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="admin-modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">
              {editingId ? `Sửa ${entityLabel}` : createLabel}
            </h3>
            <form onSubmit={(e) => void handleSave(e)} className="admin-form">
              {!editingId && (
                <div className="admin-field">
                  <label className="admin-label">Mã</label>
                  <input
                    className="admin-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="PRODUCT"
                    required
                  />
                </div>
              )}
              {editingId && (
                <div className="admin-field">
                  <label className="admin-label">Mã</label>
                  <input className="admin-input" value={form.code} disabled />
                </div>
              )}
              <div className="admin-field">
                <label className="admin-label">Tên</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mô tả</label>
                <textarea
                  className="admin-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Thứ tự</label>
                <input
                  className="admin-input"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
              <label className="admin-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Đang kích hoạt
              </label>
              {error && <p className="admin-message admin-message--error">{error}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <AdminLoadingButton type="submit" pending={saving} variant="primary">
                  Lưu
                </AdminLoadingButton>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
