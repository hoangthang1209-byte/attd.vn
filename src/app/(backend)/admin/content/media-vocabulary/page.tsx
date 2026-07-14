"use client";

import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useCallback, useEffect, useState } from "react";
import type { MediaVocabularyType } from "@prisma/client";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import type { MediaVocabularyTermRecord } from "@/features/media/services/media-vocabulary.service";

const VOCAB_TYPES: MediaVocabularyType[] = [
  "SUBJECT",
  "MATERIAL",
  "COLOR",
  "TECHNIQUE",
  "INDUSTRY",
  "AUDIENCE",
  "USE_CASE",
];

const VOCAB_TYPE_LABELS: Record<MediaVocabularyType, string> = {
  SUBJECT: "Chủ thể",
  MATERIAL: "Chất liệu",
  COLOR: "Màu sắc",
  TECHNIQUE: "Kỹ thuật",
  INDUSTRY: "Ngành nghề",
  AUDIENCE: "Đối tượng",
  USE_CASE: "Mục đích sử dụng",
};

type FormState = {
  code: string;
  name: string;
  aliases: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  aliases: "",
  description: "",
  sortOrder: "0",
  isActive: true,
});

export default function MediaVocabularyPage() {
  const toast = useAdminToast();
  const [activeType, setActiveType] = useState<MediaVocabularyType>("SUBJECT");
  const [rows, setRows] = useState<MediaVocabularyTermRecord[]>([]);
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
      const params = new URLSearchParams({ type: activeType, includeUsage: "1" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/content/media-vocabulary?${params}`);
      const data = (await res.json()) as {
        terms?: MediaVocabularyTermRecord[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải từ điển metadata ảnh.");
      setRows(data.terms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải từ điển metadata ảnh.");
    } finally {
      setLoading(false);
    }
  }, [activeType, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError(null);
  }

  function openEdit(row: MediaVocabularyTermRecord) {
    setEditingId(row.id);
    setForm({
      code: row.code ?? "",
      name: row.name,
      aliases: row.aliases.join(", "),
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
        aliases: form.aliases
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description: form.description.trim() || null,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };
      const res = await fetch(
        editingId
          ? `/api/content/media-vocabulary/${editingId}`
          : "/api/content/media-vocabulary",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingId
              ? payload
              : {
                  ...payload,
                  type: activeType,
                  code: form.code.trim() ? normalizeMasterDataCode(form.code) : null,
                },
          ),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu thuật ngữ.");
      toast.success(editingId ? "Đã cập nhật thuật ngữ." : "Đã tạo thuật ngữ.");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu thuật ngữ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: MediaVocabularyTermRecord) {
    if (row.isSystem) {
      toast.error("Không thể xóa thuật ngữ hệ thống.");
      return;
    }
    if (!window.confirm(`Xóa thuật ngữ "${row.name}"?`)) return;
    try {
      const res = await fetch(`/api/content/media-vocabulary/${row.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa thuật ngữ.");
      toast.success("Đã xóa thuật ngữ.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa thuật ngữ.");
    }
  }

  async function toggleActive(row: MediaVocabularyTermRecord) {
    try {
      const res = await fetch(`/api/content/media-vocabulary/${row.id}`, {
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
      <AdminPageTitle title="Từ điển metadata ảnh" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Chuẩn hóa chủ thể, chất liệu, màu sắc và các thuật ngữ mô tả dùng cho ảnh trong CMS.</p>
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            Thêm thuật ngữ
          </button>
        </div>

        <div className="admin-catalog-filters" style={{ flexWrap: "wrap" }}>
          {VOCAB_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`admin-btn admin-btn--xs ${activeType === type ? "admin-btn--primary" : "admin-btn--secondary"}`}
              onClick={() => setActiveType(type)}
            >
              {VOCAB_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="admin-catalog-filters">
          <input
            className="admin-input"
            placeholder="Tìm tên, mã hoặc alias…"
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
            title="Đang tải từ điển metadata ảnh…"
            description="Hệ thống đang tải danh sách thuật ngữ."
            tone="admin"
          />
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>Tên thuật ngữ</th>
                  <th>Mã</th>
                  <th>Alias</th>
                  <th>Mô tả</th>
                  <th>Thứ tự</th>
                  <th>Số ảnh dùng</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-field-hint">
                      Chưa có thuật ngữ nào trong loại {VOCAB_TYPE_LABELS[activeType]}.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
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
                      <td>{row.aliases.length ? row.aliases.join(", ") : "—"}</td>
                      <td>{row.description ?? "—"}</td>
                      <td>{row.sortOrder}</td>
                      <td>{row.usageCount ?? 0}</td>
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
                            title={row.isSystem ? "Không thể xóa thuật ngữ hệ thống" : undefined}
                            onClick={() => void handleDelete(row)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="admin-modal-overlay" onClick={() => !saving && setShowForm(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="admin-subtitle">
                {editingId ? "Sửa thuật ngữ" : `Thêm thuật ngữ · ${VOCAB_TYPE_LABELS[activeType]}`}
              </h3>
              <form onSubmit={(e) => void handleSave(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Tên thuật ngữ</label>
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
                    placeholder="AO_SO_MI"
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Alias (phân tách bằng dấu phẩy)</label>
                  <input
                    className="admin-input"
                    value={form.aliases}
                    onChange={(e) => setForm({ ...form, aliases: e.target.value })}
                    placeholder="áo sơ mi, shirt"
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
