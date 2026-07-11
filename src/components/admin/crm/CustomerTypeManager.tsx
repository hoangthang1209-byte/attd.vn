"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { normalizeCustomerTypeCode } from "@/features/crm/customer-type-input";
import type { CustomerTypeRecord } from "@/features/crm/customer-type-types";

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

export default function CustomerTypeManager() {
  const toast = useAdminToast();
  const [types, setTypes] = useState<CustomerTypeRecord[]>([]);
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
      const res = await fetch("/api/crm/customer-types?includeCounts=1");
      const data = (await res.json()) as { types?: CustomerTypeRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải loại khách hàng.");
      setTypes(data.types ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải loại khách hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: CustomerTypeRecord) {
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
      const res = await fetch(
        editingId ? `/api/crm/customer-types/${editingId}` : "/api/crm/customer-types",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId
              ? payload
              : { ...payload, code: normalizeCustomerTypeCode(form.code || form.name) },
          ),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu loại khách hàng.");
      toast.success(editingId ? "Đã cập nhật loại khách hàng." : "Đã tạo loại khách hàng.");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu loại khách hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: CustomerTypeRecord) {
    if (
      !window.confirm(
        row.isSystem
          ? "Loại hệ thống không thể xóa."
          : `Xóa loại khách hàng "${row.name}"?`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/crm/customer-types/${row.id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa loại khách hàng.");
      toast.success("Đã xóa loại khách hàng.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa loại khách hàng.");
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Quản lý loại khách hàng dùng cho phân loại CRM.</p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          Thêm loại khách hàng
        </button>
      </div>

      {error && !showForm && <p className="admin-message admin-message--error">{error}</p>}

      {loading ? (
        <TableLoading
          title="Đang tải loại khách hàng..."
          description="Hệ thống đang tải danh sách loại khách hàng."
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
                <th>Trạng thái</th>
                <th>Khách hàng</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {types.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>
                    {row.name}
                    {row.isSystem ? (
                      <span className="admin-badge admin-badge--muted" style={{ marginLeft: 8 }}>
                        Hệ thống
                      </span>
                    ) : null}
                  </td>
                  <td>{row.description || "—"}</td>
                  <td>{row.sortOrder}</td>
                  <td>{row.isActive ? "Đang dùng" : "Ngưng"}</td>
                  <td>{row.customerCount ?? 0}</td>
                  <td>
                    <div className="admin-crm-contact-card__actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => openEdit(row)}
                      >
                        Sửa
                      </button>
                      {!row.isSystem ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger admin-btn--small"
                          onClick={() => void handleDelete(row)}
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <section className="admin-section-card" style={{ marginTop: 16 }}>
          <h2>{editingId ? "Sửa loại khách hàng" : "Thêm loại khách hàng"}</h2>
          <form className="admin-form admin-form--compact admin-form-grid" onSubmit={handleSave}>
            {!editingId ? (
              <label>
                Mã *
                <input
                  className="admin-input"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="VD: BRAND"
                  required
                />
              </label>
            ) : (
              <label>
                Mã
                <input className="admin-input" value={form.code} readOnly />
              </label>
            )}
            <label>
              Tên *
              <input
                className="admin-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="admin-form-grid-span-2">
              Mô tả
              <textarea
                className="admin-input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label>
              Thứ tự
              <input
                className="admin-input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              />
            </label>
            <label className="admin-checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              Đang sử dụng
            </label>
            {error ? <p className="admin-message admin-message--error admin-form-grid-span-2">{error}</p> : null}
            <div className="admin-form-actions admin-form-grid-span-2">
              <AdminLoadingButton type="submit" variant="primary" pending={saving} pendingLabel="Đang lưu...">
                Lưu
              </AdminLoadingButton>
              <button type="button" className="admin-btn" onClick={() => setShowForm(false)}>
                Hủy
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  );
}
