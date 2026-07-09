"use client";

import { useCallback, useEffect, useState } from "react";
import type { PricingCalculationType, PricingServiceType } from "@prisma/client";
import {
  getCalculationTypeLabel,
  getServiceTypeLabel,
  PRICING_CALCULATION_TYPE_LABELS,
  PRICING_SERVICE_TYPE_LABELS,
} from "@/features/pricing/labels";
import { formatPricingCurrency } from "@/features/pricing/format";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { PriceGroupRecord, ServicePriceRuleRecord } from "@/features/pricing/types";

export default function ServiceRulesManager() {
  const [rules, setRules] = useState<ServicePriceRuleRecord[]>([]);
  const [groups, setGroups] = useState<PriceGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    serviceType: "PRINT_DTF" as PricingServiceType,
    name: "",
    priceGroupId: "",
    calculationType: "PER_ITEM" as PricingCalculationType,
    minQuantity: "1",
    maxQuantity: "",
    unitPrice: "",
    setupFee: "0",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("serviceType", filterType);
      if (filterGroup) params.set("priceGroupId", filterGroup);
      const [rulesRes, groupsRes] = await Promise.all([
        fetch(`/api/pricing/service-rules?${params}`),
        fetch("/api/pricing/price-groups"),
      ]);
      const rulesData = await rulesRes.json() as { rules?: ServicePriceRuleRecord[]; message?: string };
      const groupsData = await groupsRes.json() as { priceGroups?: PriceGroupRecord[] };
      if (!rulesRes.ok) throw new Error(rulesData.message ?? "Không thể tải phí dịch vụ");
      setRules(rulesData.rules ?? []);
      setGroups(groupsData.priceGroups ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterGroup]);

  useEffect(() => { void load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/service-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          priceGroupId: form.priceGroupId || null,
          maxQuantity: form.maxQuantity.trim() || null,
        }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo quy tắc phí");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/pricing/service-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {rules.length} quy tắc</p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowForm(!showForm)}>Thêm phí dịch vụ</button>
      </div>

      <form className="admin-crm-filters" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <select className="admin-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Tất cả loại dịch vụ</option>
          {(Object.keys(PRICING_SERVICE_TYPE_LABELS) as PricingServiceType[]).map((t) => (
            <option key={t} value={t}>{getServiceTypeLabel(t)}</option>
          ))}
        </select>
        <select className="admin-input" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
          <option value="">Tất cả nhóm giá</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">Lọc</button>
      </form>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-catalog-fieldset" onSubmit={(e) => void handleCreate(e)}>
          <h3 className="admin-subtitle">Thêm phí dịch vụ</h3>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Loại dịch vụ</label>
              <select className="admin-input" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value as PricingServiceType })}>
                {(Object.keys(PRICING_SERVICE_TYPE_LABELS) as PricingServiceType[]).map((t) => (
                  <option key={t} value={t}>{getServiceTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Tên phí *</label>
              <input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">Nhóm giá</label>
              <select className="admin-input" value={form.priceGroupId} onChange={(e) => setForm({ ...form, priceGroupId: e.target.value })}>
                <option value="">Toàn cục (mọi nhóm)</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Cách tính</label>
              <select className="admin-input" value={form.calculationType} onChange={(e) => setForm({ ...form, calculationType: e.target.value as PricingCalculationType })}>
                {(Object.keys(PRICING_CALCULATION_TYPE_LABELS) as PricingCalculationType[]).map((t) => (
                  <option key={t} value={t}>{getCalculationTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Đơn giá</label>
              <input className="admin-input" type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Phí setup</label>
              <input className="admin-input" type="number" min="0" value={form.setupFee} onChange={(e) => setForm({ ...form, setupFee: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <AdminLoadingButton type="submit" variant="primary" pending={saving} pendingLabel="Đang lưu quy tắc…">Lưu</AdminLoadingButton>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? <AdminLoadingState label="Đang tải quy tắc dịch vụ…" /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên phí</th>
                <th>Loại dịch vụ</th>
                <th>Nhóm giá</th>
                <th>Cách tính</th>
                <th>Đơn giá</th>
                <th>Phí setup</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{getServiceTypeLabel(r.serviceType)}</td>
                  <td>{r.priceGroupName ?? "Toàn cục"}</td>
                  <td>{getCalculationTypeLabel(r.calculationType)}</td>
                  <td>{formatPricingCurrency(r.unitPrice)}</td>
                  <td>{formatPricingCurrency(r.setupFee)}</td>
                  <td>{r.isActive ? "Đang hoạt động" : "Ngưng"}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void toggleActive(r.id, r.isActive)}>
                      {r.isActive ? "Ngưng" : "Kích hoạt"}
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
