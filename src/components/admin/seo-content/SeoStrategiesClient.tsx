"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TableLoading } from "@/components/ui/loading/ContextLoading";
import { SEO_STRATEGY_STATUS_LABELS } from "@/features/content/seo/seo-labels";
import type { SeoStrategyStatus } from "@prisma/client";

type StrategyRow = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  status: SeoStrategyStatus;
  clusterCount: number;
  topicCount: number;
  publishedCount: number;
  approvedCount: number;
  overdueCount: number;
};

type FormState = {
  name: string;
  code: string;
  description: string;
};

const emptyForm = (): FormState => ({ name: "", code: "", description: "" });

export default function SeoStrategiesClient() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SeoStrategyStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/content/seo/strategies?${params.toString()}`);
      const data = (await res.json()) as { strategies?: StrategyRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải chiến lược");
      setRows(data.strategies ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải chiến lược");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content/seo/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      const data = (await res.json()) as { strategy?: { id: string }; message?: string };
      if (!res.ok || !data.strategy) throw new Error(data.message ?? "Không thể tạo chiến lược");
      toast.success("Đã tạo chiến lược");
      setShowForm(false);
      window.location.href = `/admin/content/seo-strategies/${data.strategy.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo chiến lược");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(row: StrategyRow) {
    const nextStatus: SeoStrategyStatus =
      row.status === "ACTIVE" ? "PAUSED" : row.status === "PAUSED" || row.status === "DRAFT" ? "ACTIVE" : row.status;
    if (nextStatus === row.status) {
      toast.error("Không thể thay đổi trạng thái từ trạng thái hiện tại.");
      return;
    }
    try {
      const res = await fetch(`/api/content/seo/strategies/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể cập nhật trạng thái");
      toast.success(nextStatus === "ACTIVE" ? "Đã kích hoạt" : "Đã tạm dừng");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể cập nhật trạng thái");
    }
  }

  return (
    <>
      <AdminPageTitle title="Chiến lược SEO" />
      <div className="admin-panel">
        <div className="admin-section-header">
          <p>Quản lý chiến lược SEO, cụm chủ đề và kế hoạch nội dung theo chiến dịch.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/admin/content/seo" className="admin-btn admin-btn--secondary">
              Dashboard
            </Link>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => {
                setForm(emptyForm());
                setError(null);
                setShowForm(true);
              }}
            >
              Tạo chiến lược
            </button>
          </div>
        </div>

        <div className="admin-catalog-filters">
          <select
            className="admin-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SeoStrategyStatus | "")}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(SEO_STRATEGY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Lọc
          </button>
        </div>

        {loading ? (
          <TableLoading
            title="Đang tải chiến lược…"
            description="Hệ thống đang tải danh sách chiến lược SEO."
            tone="admin"
          />
        ) : rows.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có chiến lược nào.</p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-wrap--crm">
            <table className="admin-table admin-table--crm">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Trạng thái</th>
                  <th>Cụm / Chủ đề</th>
                  <th>Tiến độ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/content/seo-strategies/${row.id}`} className="admin-link">
                        {row.name}
                      </Link>
                      {row.code && (
                        <p className="admin-field-hint" style={{ margin: 0 }}>
                          <code>{row.code}</code>
                        </p>
                      )}
                    </td>
                    <td>{SEO_STRATEGY_STATUS_LABELS[row.status]}</td>
                    <td>
                      {row.clusterCount} cụm · {row.topicCount} chủ đề
                    </td>
                    <td>
                      {row.publishedCount} XB · {row.approvedCount} duyệt
                      {row.overdueCount > 0 && (
                        <span className="admin-badge" style={{ marginLeft: 6, background: "#fee2e2", color: "#991b1b" }}>
                          {row.overdueCount} quá hạn
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Link
                          href={`/admin/content/seo-strategies/${row.id}`}
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                        >
                          Sửa
                        </Link>
                        {(row.status === "ACTIVE" || row.status === "PAUSED" || row.status === "DRAFT") && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                            onClick={() => void toggleStatus(row)}
                          >
                            {row.status === "ACTIVE" ? "Tạm dừng" : "Kích hoạt"}
                          </button>
                        )}
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
              <h3 className="admin-subtitle">Tạo chiến lược SEO</h3>
              <form onSubmit={(e) => void handleCreate(e)} className="admin-form">
                <div className="admin-field">
                  <label className="admin-label">Tên chiến lược</label>
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
                {error && <p className="admin-message admin-message--error">{error}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <AdminLoadingButton type="submit" pending={saving} variant="primary">
                    Tạo chiến lược
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
