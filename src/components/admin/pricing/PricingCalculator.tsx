"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPricingCurrency, formatPricingPercent } from "@/features/pricing/format";
import type { CalculatePricingResult, PriceGroupRecord, ServicePriceRuleRecord } from "@/features/pricing/types";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };
type LeadOption = { id: string; fullName: string; companyName: string | null; company: string | null };
type CustomerOption = { id: string; name: string; code: string };
type ContactOption = { id: string; fullName: string };

type ItemRow = {
  productId: string;
  variantId: string;
  quantity: string;
  unit: string;
  manualUnitPrice: string;
  manualOverrideReason: string;
  serviceOptions: Array<{ ruleId: string; quantity: string; manualAmount: string }>;
};

type ServiceRow = { ruleId: string; quantity: string; manualAmount: string };

const emptyItem = (): ItemRow => ({
  productId: "", variantId: "", quantity: "100", unit: "cái",
  manualUnitPrice: "", manualOverrideReason: "",
  serviceOptions: [],
});

export default function PricingCalculator() {
  const router = useRouter();
  const [groups, setGroups] = useState<PriceGroupRecord[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [serviceRules, setServiceRules] = useState<ServicePriceRuleRecord[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  const [leadId, setLeadId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactId, setContactId] = useState("");
  const [priceGroupId, setPriceGroupId] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [orderServices, setOrderServices] = useState<ServiceRow[]>([]);
  const [discountAmount, setDiscountAmount] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [vatRate, setVatRate] = useState("0");
  const [manualTotalAmount, setManualTotalAmount] = useState("");
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [result, setResult] = useState<CalculatePricingResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/pricing/price-groups").then((r) => r.json()),
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/pricing/service-rules?activeOnly=1").then((r) => r.json()),
      fetch("/api/crm/leads?limit=100").then((r) => r.json()),
      fetch("/api/crm/customers?limit=100").then((r) => r.json()),
    ]).then(([groupsData, productsData, rulesData, leadsData, customersData]) => {
      const pg = (groupsData as { priceGroups?: PriceGroupRecord[] }).priceGroups ?? [];
      setGroups(pg);
      const defaultGroup = pg.find((g) => g.isDefault);
      if (defaultGroup) setPriceGroupId(defaultGroup.id);
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
      setServiceRules((rulesData as { rules?: ServicePriceRuleRecord[] }).rules ?? []);
      setLeads((leadsData as { leads?: LeadOption[] }).leads ?? []);
      setCustomers((customersData as { customers?: CustomerOption[] }).customers ?? []);
    });
  }, []);

  useEffect(() => {
    if (!customerId) { setContacts([]); setContactId(""); return; }
    void fetch(`/api/crm/customers/${customerId}`)
      .then((r) => r.json())
      .then((data: { customer?: { contacts?: ContactOption[] } }) => setContacts(data.customer?.contacts ?? []));
  }, [customerId]);

  async function loadVariants(productId: string) {
    if (!productId || variantsMap[productId]) return;
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = await res.json() as { variants?: VariantOption[] };
    setVariantsMap((prev) => ({ ...prev, [productId]: data.variants ?? [] }));
  }

  function buildPayload() {
    return {
      leadId: leadId || undefined,
      customerId: customerId || undefined,
      contactId: contactId || undefined,
      priceGroupId: priceGroupId || undefined,
      discountAmount: discountAmount.trim() ? Number(discountAmount) : undefined,
      shippingFee: shippingFee.trim() ? Number(shippingFee) : undefined,
      vatRate: vatRate.trim() ? Number(vatRate) : undefined,
      manualTotalAmount: manualTotalAmount.trim() ? Number(manualTotalAmount) : undefined,
      manualOverrideReason: manualOverrideReason.trim() || undefined,
      internalNote: internalNote.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId || undefined,
        variantId: item.variantId || undefined,
        quantity: parseInt(item.quantity, 10) || 1,
        unit: item.unit || "cái",
        manualUnitPrice: item.manualUnitPrice.trim() ? Number(item.manualUnitPrice) : undefined,
        manualOverrideReason: item.manualOverrideReason.trim() || undefined,
        serviceOptions: [
          ...item.serviceOptions.filter((s) => s.ruleId).map((s) => ({
            ruleId: s.ruleId,
            quantity: s.quantity.trim() ? Number(s.quantity) : undefined,
            manualAmount: s.manualAmount.trim() ? Number(s.manualAmount) : undefined,
          })),
          ...orderServices.filter((s) => s.ruleId).map((s) => ({
            ruleId: s.ruleId,
            quantity: s.quantity.trim() ? Number(s.quantity) : undefined,
            manualAmount: s.manualAmount.trim() ? Number(s.manualAmount) : undefined,
          })),
        ],
      })),
    };
  }

  async function handleCalculate() {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json() as { result?: CalculatePricingResult; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tính giá");
      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tính giá");
    } finally {
      setCalculating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json() as { calculation?: { id: string }; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu bản tính giá");
      if (data.calculation?.id) {
        router.push(`/admin/pricing/history/${data.calculation.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="admin-panel">
      {error && <p className="admin-error">{error}</p>}

      <fieldset className="admin-catalog-fieldset">
        <legend>Khách hàng / Lead</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Chọn lead</label>
            <select className="admin-input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.fullName} {l.companyName ?? l.company ?? ""}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Chọn khách hàng</label>
            <select className="admin-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Liên hệ</label>
            <select className="admin-input" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!customerId}>
              <option value="">— Không chọn —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Nhóm giá</label>
            <select className="admin-input" value={priceGroupId} onChange={(e) => setPriceGroupId(e.target.value)}>
              <option value="">Nhóm mặc định</option>
              {groups.filter((g) => g.isActive).map((g) => (
                <option key={g.id} value={g.id}>{g.name} {g.isDefault ? "(mặc định)" : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Sản phẩm cần tính</legend>
        {items.map((item, i) => (
          <div key={i} className="admin-catalog-variant-row" style={{ marginBottom: 16 }}>
            <div className="admin-catalog-variant-header">
              <strong>Dòng #{i + 1}</strong>
              {items.length > 1 && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>Xóa</button>
              )}
            </div>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Sản phẩm</label>
                <select className="admin-input" value={item.productId} onChange={(e) => {
                  updateItem(i, { productId: e.target.value, variantId: "" });
                  void loadVariants(e.target.value);
                }}>
                  <option value="">— Chọn —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Biến thể</label>
                <select className="admin-input" value={item.variantId} onChange={(e) => updateItem(i, { variantId: e.target.value })}>
                  <option value="">— Chọn —</option>
                  {(variantsMap[item.productId] ?? []).map((v) => (
                    <option key={v.id} value={v.id}>{v.sku} {v.colorName} {v.sizeName}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Số lượng</label>
                <input className="admin-input" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, { quantity: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Đơn vị</label>
                <input className="admin-input" value={item.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá chỉnh tay / đơn vị</label>
                <input className="admin-input" type="number" min="0" value={item.manualUnitPrice} onChange={(e) => updateItem(i, { manualUnitPrice: e.target.value })} placeholder="Để trống = theo bảng giá" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Lý do chỉnh giá</label>
                <input className="admin-input" value={item.manualOverrideReason} onChange={(e) => updateItem(i, { manualOverrideReason: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <label className="admin-label">Phí dịch vụ (dòng)</label>
              {item.serviceOptions.map((s, si) => (
                <div key={si} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <select className="admin-input" value={s.ruleId} onChange={(e) => {
                    const next = [...item.serviceOptions];
                    next[si] = { ...next[si], ruleId: e.target.value };
                    updateItem(i, { serviceOptions: next });
                  }}>
                    <option value="">— Chọn quy tắc —</option>
                    {serviceRules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <input className="admin-input" type="number" placeholder="SL/vị trí" value={s.quantity} onChange={(e) => {
                    const next = [...item.serviceOptions];
                    next[si] = { ...next[si], quantity: e.target.value };
                    updateItem(i, { serviceOptions: next });
                  }} />
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => updateItem(i, { serviceOptions: item.serviceOptions.filter((_, idx) => idx !== si) })}>✕</button>
                </div>
              ))}
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => updateItem(i, { serviceOptions: [...item.serviceOptions, { ruleId: "", quantity: "", manualAmount: "" }] })}>
                Thêm phí dịch vụ
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setItems([...items, emptyItem()])}>+ Thêm dòng sản phẩm</button>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Phí dịch vụ (theo đơn)</legend>
        {orderServices.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <select className="admin-input" value={s.ruleId} onChange={(e) => {
              const next = [...orderServices];
              next[i] = { ...next[i], ruleId: e.target.value };
              setOrderServices(next);
            }}>
              <option value="">— Chọn —</option>
              {serviceRules.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setOrderServices(orderServices.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setOrderServices([...orderServices, { ruleId: "", quantity: "", manualAmount: "" }])}>Thêm phí dịch vụ</button>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Chiết khấu / VAT / vận chuyển</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Chiết khấu (VND)</label>
            <input className="admin-input" type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Phí vận chuyển</label>
            <input className="admin-input" type="number" min="0" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">VAT (%)</label>
            <input className="admin-input" type="number" min="0" max="100" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Giá chỉnh tay (tổng)</label>
            <input className="admin-input" type="number" min="0" value={manualTotalAmount} onChange={(e) => setManualTotalAmount(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Lý do chỉnh giá</label>
            <input className="admin-input" value={manualOverrideReason} onChange={(e) => setManualOverrideReason(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea className="admin-textarea" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => void handleCalculate()} disabled={calculating}>
          {calculating ? "Đang tính…" : "Tính giá"}
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu bản tính giá"}
        </button>
      </div>

      {result && (
        <fieldset className="admin-catalog-fieldset">
          <legend>Kết quả tính giá</legend>
          {result.warnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {result.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SL</th>
                  <th>Đơn giá gốc</th>
                  <th>Phí DV</th>
                  <th>Setup</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                  <th>Biên LN</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.productName}{item.variantName ? ` · ${item.variantName}` : ""}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPricingCurrency(item.baseUnitPrice)}</td>
                    <td>{formatPricingCurrency(item.serviceFee)}</td>
                    <td>{formatPricingCurrency(item.setupFee)}</td>
                    <td>{formatPricingCurrency(item.unitPrice)}</td>
                    <td>{formatPricingCurrency(item.lineTotal)}</td>
                    <td>{item.marginAmount != null ? `${formatPricingCurrency(item.marginAmount)} (${formatPricingPercent(item.marginRate)})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-catalog-kpi-bar" style={{ marginTop: 16 }}>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.subtotal)}</strong><span>Tạm tính</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.discountAmount)}</strong><span>Chiết khấu</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.vatAmount)}</strong><span>VAT</span></div>
            <div className="admin-catalog-kpi admin-catalog-kpi--ok">
              <strong>{formatPricingCurrency(result.manualOverride && result.manualTotalAmount != null ? result.manualTotalAmount : result.totalAmount)}</strong>
              <span>{result.manualOverride ? "Giá chỉnh tay" : "Tổng cộng"}</span>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
