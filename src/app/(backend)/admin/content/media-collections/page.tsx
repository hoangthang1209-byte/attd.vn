"use client";

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useCallback, useEffect, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import type { MediaCollectionRecord } from "@/features/media/media-collection.types";

type FormState = {
  code: string;
  name: string;
  description: string;
  color: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  description: "",
  color: "",
  sortOrder: "0",
  isActive: true,
});

export default function MediaCollectionsPage() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<MediaCollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ includeCounts: "1" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/content/media-collections?${params}`);
      const data = (await res.json()) as {
        collections?: MediaCollectionRecord[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải bộ sưu tập.");
      setRows(data.collections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải bộ sưu tập.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: MediaCollectionRecord) {
    setEditingId(row.id);
    setForm({
      code: row.code ?? "",
      name: row.name,
      description: row.description ?? "",
      color: row.color ?? "",
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
        color: form.color.trim() || null,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };
      const res = await fetch(
        editingId
          ? `/api/content/media-collections/${editingId}`
          : "/api/content/media-collections",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId
              ? payload
              : {
                  ...payload,
                  code: form.code.trim() ? normalizeMasterDataCode(form.code) : null,
                },
          ),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu bộ sưu tập.");
      toast.success(editingId ? "Đã cập nhật bộ sưu tập." : "Đã tạo bộ sưu tập.");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu bộ sưu tập.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: MediaCollectionRecord) {
    if (row.isSystem) {
      toast.error("Không thể xóa bộ sưu tập hệ thống.");
      return;
    }
    if (
      !window.confirm(
        `Xóa bộ sưu tập "${row.name}"? Ảnh vẫn được giữ nguyên; chỉ gỡ liên kết.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/content/media-collections/${row.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa bộ sưu tập.");
      toast.success("Đã xóa bộ sưu tập.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa bộ sưu tập.");
    }
  }

  async function toggleActive(row: MediaCollectionRecord) {
    try {
      const res = await fetch(`/api/content/media-collections/${row.id}`, {
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
    <>
      <AdminPageTitle title="Bộ sưu tập ảnh" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Nhóm ảnh theo dự án, chiến dịch, khách hàng hoặc sáng kiến nội dung.</p>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            Thêm bộ sưu tập
          </button>
        </div>

        <div className="admin-catalog-filters">
          <input
            className="admin-input"
            placeholder="Tìm tên hoặc mã…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Lọc
          </button>
        </div>

        {error && !showForm && <p className="admin-message admin-message--error">{error}</p>}

        {loading ? (
          <TableLoading
            title="Đang tải bộ sưu tập…"
            description="Hệ thống đang tải danh sách bộ sưu tập ảnh."
            tone="admin"
          />
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>Tên bộ sưu tập</th>
                  <th>Mã</th>
                  <th>Mô tả</th>
                  <th>Màu nhận diện</th>
                  <th>Thứ tự</th>
                  <th>Số lượng ảnh</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      {row.isSystem && (
                        <span className="admin-badge" style={{ marginLeft: 6 }}>
                          Hệ thống
                        </span>
                      )}
                    </td>
                    <td>{row.code ? <code>{row.code}</code> : "—"}</td>
                    <td>{row.description ?? "—"}</td>
                    <td>
                      {row.color ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              background: row.color,
                              border: "1px solid #d1d5db",
                            }}
                          />
                          {row.color}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
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
                          disabled={row.isSystem}
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
                {editingId ? "Sửa bộ sưu tập" : "Thêm bộ sưu tập"}
              </h3>
              <form onSubmit={(e) => void handleSave(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Tên bộ sưu tập</label>
                  <input
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Mã (tuỳ chọn)</label>
                  <input
                    className="admin-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    disabled={Boolean(editingId)}
                    placeholder="BLACKPINK_2026"
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Mô tả</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Màu nhận diện</label>
                  <input
                    className="admin-input"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="#4f46e5"
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
    </>
  );
}
