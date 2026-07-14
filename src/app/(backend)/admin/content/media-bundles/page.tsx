"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import {
  MEDIA_BUNDLE_CONTENT_TYPES,
  MEDIA_BUNDLE_CONTENT_TYPE_LABELS,
} from "@/features/media/media-bundle-presets";
import type {
  MediaBundleHealthStatus,
  MediaBundleListItem,
} from "@/features/media/services/media-bundle.service";
import type { MediaBundleContentType, MediaBundleStatus } from "@prisma/client";

const STATUS_LABELS: Record<MediaBundleStatus, string> = {
  DRAFT: "Bản nháp",
  READY: "Sẵn sàng",
  ARCHIVED: "Đã lưu trữ",
};

const HEALTH_LABELS: Record<MediaBundleHealthStatus, string> = {
  INCOMPLETE: "Chưa đủ",
  BASIC: "Cơ bản",
  READY: "Sẵn sàng",
  EXCELLENT: "Xuất sắc",
};

function healthBadgeStyle(status: MediaBundleHealthStatus): React.CSSProperties {
  switch (status) {
    case "EXCELLENT":
      return { background: "#dcfce7", color: "#166534" };
    case "READY":
      return { background: "#dbeafe", color: "#1e40af" };
    case "BASIC":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#fee2e2", color: "#991b1b" };
  }
}

type FormState = {
  name: string;
  code: string;
  description: string;
  contentType: MediaBundleContentType;
  applyPreset: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  description: "",
  contentType: "BLOG_ARTICLE",
  applyPreset: true,
});

export default function MediaBundlesPage() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<MediaBundleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterContentType, setFilterContentType] = useState<MediaBundleContentType | "">("");
  const [filterStatus, setFilterStatus] = useState<MediaBundleStatus | "">("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterContentType) params.set("contentType", filterContentType);
      if (filterStatus) params.set("status", filterStatus);
      if (activeOnly) params.set("activeOnly", "1");
      const res = await fetch(`/api/content/media-bundles?${params.toString()}`);
      const data = (await res.json()) as { bundles?: MediaBundleListItem[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách bộ media");
      setRows(data.bundles ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải danh sách bộ media");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterContentType, filterStatus, activeOnly, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content/media-bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
          contentType: form.contentType,
          applyPreset: form.applyPreset,
        }),
      });
      const data = (await res.json()) as { bundle?: { id: string }; message?: string };
      if (!res.ok || !data.bundle) throw new Error(data.message ?? "Không thể tạo bộ media");
      toast.success("Đã tạo bộ media");
      setShowForm(false);
      window.location.href = `/admin/content/media-bundles/${data.bundle.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo bộ media");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: MediaBundleListItem) {
    if (row.isSystem) {
      toast.error("Không thể xóa bộ media hệ thống.");
      return;
    }
    if (!window.confirm(`Xóa bộ media "${row.name}"? Ảnh vẫn được giữ nguyên; chỉ gỡ liên kết.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/content/media-bundles/${row.id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể xóa bộ media");
      toast.success("Đã xóa bộ media");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể xóa bộ media");
    }
  }

  async function toggleActive(row: MediaBundleListItem) {
    try {
      const res = await fetch(`/api/content/media-bundles/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật trạng thái");
      toast.success(row.isActive ? "Đã vô hiệu hóa" : "Đã kích hoạt");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
    }
  }

  return (
    <>
      <AdminPageTitle title="Gói nội dung hình ảnh" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Quản lý bộ ảnh theo vị trí (slot) dùng cho từng loại nội dung: blog, landing page, sản phẩm, case study…</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/content/media-coverage" className="admin-btn admin-btn--secondary">
              Kiểm tra độ phủ ảnh
            </Link>
            <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
              Tạo bộ media
            </button>
          </div>
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
          <select
            className="admin-input"
            value={filterContentType}
            onChange={(e) => setFilterContentType(e.target.value as MediaBundleContentType | "")}
          >
            <option value="">Tất cả loại nội dung</option>
            {MEDIA_BUNDLE_CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            className="admin-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as MediaBundleStatus | "")}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="admin-field-hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Chỉ đang kích hoạt
          </label>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Lọc
          </button>
        </div>

        {loading ? (
          <TableLoading
            title="Đang tải bộ media…"
            description="Hệ thống đang tải danh sách gói nội dung hình ảnh."
            tone="admin"
          />
        ) : rows.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có bộ media nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>Tên bộ media</th>
                  <th>Loại nội dung</th>
                  <th>Trạng thái</th>
                  <th>Vị trí / Ảnh</th>
                  <th>Sức khỏe</th>
                  <th>Kích hoạt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/content/media-bundles/${row.id}`} className="admin-link">
                        {row.name}
                      </Link>
                      {row.isSystem && (
                        <span className="admin-badge" style={{ marginLeft: 6 }}>
                          Hệ thống
                        </span>
                      )}
                      {row.code && (
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          <code>{row.code}</code>
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge">
                        {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[row.contentType]}
                      </span>
                    </td>
                    <td>{STATUS_LABELS[row.status]}</td>
                    <td>
                      {row.slotCount} vị trí · {row.assetCount} ảnh
                    </td>
                    <td>
                      <span className="admin-badge" style={healthBadgeStyle(row.health.status)}>
                        {HEALTH_LABELS[row.health.status]} ({row.health.score})
                      </span>
                    </td>
                    <td>{row.isActive ? "Đang dùng" : "Vô hiệu"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/content/media-bundles/${row.id}`}
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                        >
                          Mở
                        </Link>
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
              <h3 className="admin-subtitle">Tạo bộ media</h3>
              <form onSubmit={(e) => void handleCreate(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Tên bộ media</label>
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
                    placeholder="BLOG_XUONG_MAY_01"
                  />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Loại nội dung</label>
                  <select
                    className="admin-input"
                    value={form.contentType}
                    onChange={(e) =>
                      setForm({ ...form, contentType: e.target.value as MediaBundleContentType })
                    }
                  >
                    {MEDIA_BUNDLE_CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {MEDIA_BUNDLE_CONTENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
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
                <label className="admin-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={form.applyPreset}
                    onChange={(e) => setForm({ ...form, applyPreset: e.target.checked })}
                  />
                  Áp dụng mẫu vị trí theo loại nội dung
                </label>
                {error && <p className="admin-message admin-message--error">{error}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminLoadingButton type="submit" pending={saving} variant="primary">
                    Tạo bộ media
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
