"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { toDateInputValue } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import type { QuoteItemInput } from "@/features/quotes/types";

type ProductOption = { id: string; name: string };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };
type LeadOption = { id: string; fullName: string; companyName: string | null; company: string | null };
type CustomerOption = { id: string; name: string; code: string };
type ContactOption = { id: string; fullName: string };

type ItemRow = QuoteItemInput & { key: string };

const emptyItem = (): ItemRow => ({
  key: crypto.randomUUID(),
  productNameSnapshot: "",
  quantity: 100,
  unit: "cái",
  baseUnitPrice: 0,
  serviceFee: 0,
  setupFee: 0,
  unitPrice: 0,
  discountAmount: 0,
});

type Props = {
  mode: "create" | "edit";
  quoteId?: string;
  prefillParams?: {
    pricingCalculationId?: string;
    leadId?: string;
    customerId?: string;
  };
};

export default function QuoteForm({ mode, quoteId, prefillParams }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  const [sourceType, setSourceType] = useState("MANUAL");
  const [pricingCalculationId, setPricingCalculationId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("Báo giá sản phẩm ATTD");
  const [validUntil, setValidUntil] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [shippingFee, setShippingFee] = useState("0");
  const [vatRate, setVatRate] = useState("0");
  const [manualTotalAmount, setManualTotalAmount] = useState("");
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [terms, setTerms] = useState(DEFAULT_QUOTE_TERMS);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [status, setStatus] = useState<string>("DRAFT");

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/crm/leads").then((r) => r.json()),
      fetch("/api/crm/customers").then((r) => r.json()),
    ]).then(([productsData, leadsData, customersData]) => {
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
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

  useEffect(() => {
    if (mode === "edit" && quoteId) {
      void fetch(`/api/quotes/${quoteId}`)
        .then(async (res) => {
          const data = await res.json() as { quote?: Record<string, unknown>; message?: string };
          if (!res.ok) throw new Error(data.message ?? "Không tải được báo giá");
          const q = data.quote!;
          setSourceType(String(q.sourceType));
          setPricingCalculationId((q.pricingCalculationId as string) ?? null);
          setLeadId((q.leadId as string) ?? "");
          setCustomerId((q.customerId as string) ?? "");
          setContactId((q.contactId as string) ?? "");
          setTitle(String(q.title ?? ""));
          setValidUntil(toDateInputValue(q.validUntil as string));
          setDiscountAmount(String(q.discountAmount ?? 0));
          setShippingFee(String(q.shippingFee ?? 0));
          setVatRate(String(q.vatRate ?? 0));
          setManualTotalAmount(q.manualTotalAmount != null ? String(q.manualTotalAmount) : "");
          setManualOverrideReason(String(q.manualOverrideReason ?? ""));
          setCustomerNote(String(q.customerNote ?? ""));
          setInternalNote(String(q.internalNote ?? ""));
          setTerms(String(q.terms ?? DEFAULT_QUOTE_TERMS));
          setStatus(String(q.status ?? "DRAFT"));
          if (q.status === "ACCEPTED" || q.status === "REJECTED") {
            setWarning("Báo giá đã có phản hồi. Nếu thay đổi lớn, nên tạo báo giá mới.");
          }
          const rawItems = Array.isArray(q.items) ? q.items as Array<Record<string, unknown>> : [];
          setItems(rawItems.map((item) => ({
            key: String(item.id ?? crypto.randomUUID()),
            pricingCalculationItemId: (item.pricingCalculationItemId as string) ?? null,
            productId: (item.productId as string) ?? null,
            variantId: (item.variantId as string) ?? null,
            productNameSnapshot: String(item.productNameSnapshot ?? ""),
            variantNameSnapshot: (item.variantNameSnapshot as string) ?? null,
            description: (item.description as string) ?? null,
            quantity: Number(item.quantity ?? 1),
            unit: String(item.unit ?? "cái"),
            baseUnitPrice: Number(item.baseUnitPrice ?? 0),
            serviceFee: Number(item.serviceFee ?? 0),
            setupFee: Number(item.setupFee ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            discountAmount: Number(item.discountAmount ?? 0),
            manualUnitPrice: item.manualUnitPrice != null ? Number(item.manualUnitPrice) : null,
            manualOverrideReason: (item.manualOverrideReason as string) ?? null,
            sortOrder: Number(item.sortOrder ?? 0),
          })));
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    const params = new URLSearchParams();
    if (prefillParams?.pricingCalculationId) params.set("pricingCalculationId", prefillParams.pricingCalculationId);
    if (prefillParams?.leadId) params.set("leadId", prefillParams.leadId);
    if (prefillParams?.customerId) params.set("customerId", prefillParams.customerId);

    void fetch(`/api/quotes/prefill?${params}`)
      .then(async (res) => {
        const data = await res.json() as { prefill?: Record<string, unknown> };
        const p = data.prefill;
        if (!p) return;
        setSourceType(String(p.sourceType ?? "MANUAL"));
        setPricingCalculationId((p.pricingCalculationId as string) ?? null);
        setLeadId((p.leadId as string) ?? "");
        setCustomerId((p.customerId as string) ?? "");
        setContactId((p.contactId as string) ?? "");
        setTitle(String(p.title ?? "Báo giá sản phẩm ATTD"));
        setValidUntil(toDateInputValue(p.validUntil as string));
        setDiscountAmount(String(p.discountAmount ?? 0));
        setShippingFee(String(p.shippingFee ?? 0));
        setVatRate(String(p.vatRate ?? 0));
        setManualTotalAmount(p.manualTotalAmount != null ? String(p.manualTotalAmount) : "");
        setManualOverrideReason(String(p.manualOverrideReason ?? ""));
        setInternalNote(String(p.internalNote ?? ""));
        const rawItems = Array.isArray(p.items) ? p.items as Array<Record<string, unknown>> : [];
        if (rawItems.length) {
          setItems(rawItems.map((item) => ({
            key: crypto.randomUUID(),
            pricingCalculationItemId: (item.pricingCalculationItemId as string) ?? null,
            productId: (item.productId as string) ?? null,
            variantId: (item.variantId as string) ?? null,
            productNameSnapshot: String(item.productNameSnapshot ?? ""),
            variantNameSnapshot: (item.variantNameSnapshot as string) ?? null,
            quantity: Number(item.quantity ?? 100),
            unit: String(item.unit ?? "cái"),
            baseUnitPrice: Number(item.baseUnitPrice ?? 0),
            serviceFee: Number(item.serviceFee ?? 0),
            setupFee: Number(item.setupFee ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            discountAmount: Number(item.discountAmount ?? 0),
            manualUnitPrice: item.manualUnitPrice != null ? Number(item.manualUnitPrice) : null,
            manualOverrideReason: (item.manualOverrideReason as string) ?? null,
            sortOrder: Number(item.sortOrder ?? 0),
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [mode, quoteId, prefillParams]);

  async function loadVariants(productId: string) {
    if (!productId || variantsMap[productId]) return;
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = await res.json() as { variants?: VariantOption[] };
    setVariantsMap((prev) => ({ ...prev, [productId]: data.variants ?? [] }));
  }

  const preview = useMemo(() => computeQuoteFromItems(
    items.map(({ key: _k, ...item }) => item),
    {
      discountAmount: Number(discountAmount) || 0,
      shippingFee: Number(shippingFee) || 0,
      vatRate: Number(vatRate) || 0,
      manualTotalAmount: manualTotalAmount.trim() ? Number(manualTotalAmount) : null,
    }
  ), [items, discountAmount, shippingFee, vatRate, manualTotalAmount]);

  function buildPayload(statusOverride?: string) {
    return {
      sourceType,
      pricingCalculationId,
      leadId: leadId || null,
      customerId: customerId || null,
      contactId: contactId || null,
      title,
      validUntil: validUntil || null,
      discountAmount: Number(discountAmount) || 0,
      shippingFee: Number(shippingFee) || 0,
      vatRate: Number(vatRate) || 0,
      manualTotalAmount: manualTotalAmount.trim() ? Number(manualTotalAmount) : null,
      manualOverrideReason: manualOverrideReason || null,
      customerNote: customerNote || null,
      internalNote: internalNote || null,
      terms,
      status: statusOverride ?? status,
      items: items.map(({ key: _k, ...item }) => item),
    };
  }

  async function handleSave(draft = true) {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(draft ? "DRAFT" : status);
      const url = mode === "edit" && quoteId ? `/api/quotes/${quoteId}` : "/api/quotes";
      const method = mode === "edit" ? "PATCH" : "POST";
      const body = mode === "create" && prefillParams?.pricingCalculationId
        ? { ...payload, fromPricingCalculationId: prefillParams.pricingCalculationId }
        : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { quote?: { id: string }; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu báo giá");
      router.push(`/admin/quotes/${data.quote!.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;

  return (
    <div className="admin-panel">
      {error && <p className="admin-error">{error}</p>}
      {warning && <p className="admin-field-hint" style={{ color: "var(--admin-warning, #b45309)" }}>{warning}</p>}

      <fieldset className="admin-catalog-fieldset">
        <legend>Thông tin khách hàng</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Lead</label>
            <select className="admin-input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.fullName}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Khách hàng</label>
            <select className="admin-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <label className="admin-label">Tiêu đề báo giá</label>
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Hiệu lực đến</label>
            <input className="admin-input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Sản phẩm / dịch vụ</legend>
        {items.map((item, i) => (
          <div key={item.key} className="admin-catalog-variant-row" style={{ marginBottom: 12 }}>
            <div className="admin-catalog-variant-header">
              <strong>Dòng #{i + 1}</strong>
              {items.length > 1 && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>Xóa</button>
              )}
            </div>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Sản phẩm</label>
                <select className="admin-input" value={item.productId ?? ""} onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  updateItem(i, { productId: e.target.value || null, variantId: null, productNameSnapshot: product?.name ?? item.productNameSnapshot });
                  void loadVariants(e.target.value);
                }}>
                  <option value="">— Tùy chỉnh —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Biến thể</label>
                <select className="admin-input" value={item.variantId ?? ""} onChange={(e) => {
                  const variant = (variantsMap[item.productId ?? ""] ?? []).find((v) => v.id === e.target.value);
                  updateItem(i, { variantId: e.target.value || null, variantNameSnapshot: variant ? [variant.sku, variant.colorName, variant.sizeName].filter(Boolean).join(" · ") : null });
                }}>
                  <option value="">— Không chọn —</option>
                  {(variantsMap[item.productId ?? ""] ?? []).map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Tên hiển thị *</label>
                <input className="admin-input" value={item.productNameSnapshot ?? ""} onChange={(e) => updateItem(i, { productNameSnapshot: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mô tả</label>
                <input className="admin-input" value={item.description ?? ""} onChange={(e) => updateItem(i, { description: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Số lượng</label>
                <input className="admin-input" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value, 10) || 1 })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Đơn vị</label>
                <input className="admin-input" value={item.unit ?? "cái"} onChange={(e) => updateItem(i, { unit: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Đơn giá gốc</label>
                <input className="admin-input" type="number" min="0" value={item.baseUnitPrice ?? 0} onChange={(e) => updateItem(i, { baseUnitPrice: Number(e.target.value) || 0, unitPrice: Number(e.target.value) || 0 })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phí dịch vụ</label>
                <input className="admin-input" type="number" min="0" value={item.serviceFee ?? 0} onChange={(e) => updateItem(i, { serviceFee: Number(e.target.value) || 0 })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phí setup</label>
                <input className="admin-input" type="number" min="0" value={item.setupFee ?? 0} onChange={(e) => updateItem(i, { setupFee: Number(e.target.value) || 0 })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá chỉnh tay / đơn vị</label>
                <input className="admin-input" type="number" min="0" value={item.manualUnitPrice ?? ""} onChange={(e) => updateItem(i, { manualUnitPrice: e.target.value.trim() ? Number(e.target.value) : null })} />
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setItems([...items, emptyItem()])}>+ Thêm dòng sản phẩm</button>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Chiết khấu / VAT / vận chuyển</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field"><label className="admin-label">Chiết khấu</label><input className="admin-input" type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} /></div>
          <div className="admin-field"><label className="admin-label">Phí vận chuyển</label><input className="admin-input" type="number" min="0" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} /></div>
          <div className="admin-field"><label className="admin-label">VAT (%)</label><input className="admin-input" type="number" min="0" value={vatRate} onChange={(e) => setVatRate(e.target.value)} /></div>
          <div className="admin-field"><label className="admin-label">Tổng chỉnh tay</label><input className="admin-input" type="number" min="0" value={manualTotalAmount} onChange={(e) => setManualTotalAmount(e.target.value)} /></div>
          <div className="admin-field"><label className="admin-label">Lý do chỉnh giá</label><input className="admin-input" value={manualOverrideReason} onChange={(e) => setManualOverrideReason(e.target.value)} /></div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Ghi chú & điều khoản</legend>
        <div className="admin-field"><label className="admin-label">Ghi chú gửi khách</label><textarea className="admin-textarea" rows={2} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} /></div>
        <div className="admin-field"><label className="admin-label">Ghi chú nội bộ</label><textarea className="admin-textarea" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} /></div>
        <div className="admin-field"><label className="admin-label">Điều khoản báo giá</label><textarea className="admin-textarea" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Kết quả báo giá</legend>
        <QuoteTotalsSummary totals={preview.totals} />
      </fieldset>

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void handleSave(true)}>{saving ? "Đang lưu…" : "Lưu nháp"}</button>
        <button type="button" className="admin-btn admin-btn--secondary" disabled={saving} onClick={() => void handleSave(false)}>Lưu và xem chi tiết</button>
      </div>
    </div>
  );
}
