"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPricingDateTime } from "@/features/pricing/format";
import type { PriceGroupRecord } from "@/features/pricing/types";

export default function PriceGroupsManager() {
  const [groups, setGroups] = useState<PriceGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", isDefault: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/price-groups");
      const data = await res.json() as { priceGroups?: PriceGroupRecord[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải nhóm giá");
      setGroups(data.priceGroups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/price-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo nhóm giá");
      setForm({ code: "", name: "", description: "", isDefault: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function patchGroup(id: string, patch: Partial<PriceGroupRecord>) {
    setError(null);
    const res = await fetch(`/api/pricing/price-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể cập nhật");
      return;
    }
    await load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {groups.length} nhóm giá</p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowForm(!showForm)}>
          Thêm nhóm giá
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-catalog-fieldset" onSubmit={(e) => void handleCreate(e)}>
          <h3 className="admin-subtitle">Thêm nhóm giá</h3>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Mã nhóm *</label>
              <input className="admin-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="DEALER_PRICE" required />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tên nhóm *</label>
              <input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Giá đại lý" required />
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Mô tả</label>
            <input className="admin-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Nhóm mặc định
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? <p className="admin-loading">Đang tải...</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã nhóm</th>
                <th>Tên nhóm</th>
                <th>Mặc định</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td><code>{g.code}</code></td>
                  <td>{g.name}</td>
                  <td>{g.isDefault ? "✓ Nhóm mặc định" : "—"}</td>
                  <td>{g.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}</td>
                  <td>{formatPricingDateTime(g.createdAt)}</td>
                  <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {!g.isDefault && (
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchGroup(g.id, { isDefault: true })}>
                        Đặt mặc định
                      </button>
                    )}
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void patchGroup(g.id, { isActive: !g.isActive })}>
                      {g.isActive ? "Ngưng" : "Kích hoạt"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
