"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPricingCurrency, formatQuantityRange } from "@/features/pricing/format";
import type { PriceGroupRecord, ProductPriceTierRecord } from "@/features/pricing/types";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };

export default function ProductTiersManager() {
  const [tiers, setTiers] = useState<ProductPriceTierRecord[]>([]);
  const [groups, setGroups] = useState<PriceGroupRecord[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: "", variantId: "", priceGroupId: "", minQuantity: "50", maxQuantity: "",
    unitPrice: "", costPrice: "", note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterGroup) params.set("priceGroupId", filterGroup);
      if (search.trim()) params.set("search", search.trim());
      const [tiersRes, groupsRes, productsRes] = await Promise.all([
        fetch(`/api/pricing/product-tiers?${params}`),
        fetch("/api/pricing/price-groups"),
        fetch("/api/admin/products?limit=200"),
      ]);
      const tiersData = await tiersRes.json() as { tiers?: ProductPriceTierRecord[]; message?: string };
      const groupsData = await groupsRes.json() as { priceGroups?: PriceGroupRecord[] };
      const productsData = await productsRes.json() as { products?: ProductOption[] };
      if (!tiersRes.ok) throw new Error(tiersData.message ?? "Không thể tải bảng giá");
      setTiers(tiersData.tiers ?? []);
      setGroups(groupsData.priceGroups ?? []);
      setProducts(productsData.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filterGroup, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!form.productId) { setVariants([]); return; }
    void fetch(`/api/admin/products/${form.productId}`)
      .then((r) => r.json())
      .then((data: { variants?: VariantOption[] }) => setVariants(data.variants ?? []));
  }, [form.productId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/product-tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variantId: form.variantId || null,
          maxQuantity: form.maxQuantity.trim() || null,
        }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tạo dòng giá");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/pricing/product-tiers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {tiers.length} dòng giá</p>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => setShowForm(!showForm)}>Thêm dòng giá</button>
      </div>

      <form className="admin-crm-filters" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <input className="admin-input" placeholder="Tìm sản phẩm..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="admin-input" value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
          <option value="">Tất cả nhóm giá</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button type="submit" className="admin-btn admin-btn--secondary">Lọc</button>
      </form>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-catalog-fieldset" onSubmit={(e) => void handleCreate(e)}>
          <h3 className="admin-subtitle">Thêm dòng giá</h3>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Sản phẩm *</label>
              <select className="admin-input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value, variantId: "" })} required>
                <option value="">— Chọn —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} {p.productCode ? `(${p.productCode})` : ""}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Biến thể</label>
              <select className="admin-input" value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })}>
                <option value="">Cấp sản phẩm (tất cả biến thể)</option>
                {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} {v.colorName} {v.sizeName}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Nhóm giá *</label>
              <select className="admin-input" value={form.priceGroupId} onChange={(e) => setForm({ ...form, priceGroupId: e.target.value })} required>
                <option value="">— Chọn —</option>
                {groups.filter((g) => g.isActive).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số lượng từ *</label>
              <input className="admin-input" type="number" min="1" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">Số lượng đến</label>
              <input className="admin-input" type="number" min="1" value={form.maxQuantity} onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })} placeholder="Không giới hạn" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Đơn giá *</label>
              <input className="admin-input" type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required />
            </div>
            <div className="admin-field">
              <label className="admin-label">Giá vốn</label>
              <input className="admin-input" type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu"}</button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShowForm(false)}>Hủy</button>
          </div>
        </form>
      )}

      {loading ? <p className="admin-loading">Đang tải...</p> : tiers.length === 0 ? (
        <div className="admin-empty-state"><p>Chưa có dòng giá nào. Thêm bảng giá sản phẩm để bộ tính giá hoạt động.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Biến thể</th>
                <th>Nhóm giá</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Giá vốn</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td>{t.productName ?? t.productId}</td>
                  <td>{t.variantLabel ?? "—"}</td>
                  <td>{t.priceGroupName ?? t.priceGroupCode}</td>
                  <td>{formatQuantityRange(t.minQuantity, t.maxQuantity)}</td>
                  <td>{formatPricingCurrency(t.unitPrice)}</td>
                  <td>{formatPricingCurrency(t.costPrice)}</td>
                  <td>{t.isActive ? "Đang hoạt động" : "Ngưng"}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void toggleActive(t.id, t.isActive)}>
                      {t.isActive ? "Ngưng" : "Kích hoạt"}
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
