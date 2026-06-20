"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { toDateInputValue } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import {
  contactToQuoteSnapshots,
  customerToQuoteSnapshots,
} from "@/features/quotes/quote-party-utils";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import QuoteItemFormRow, {
  emptyQuoteItem,
  type QuoteItemRow,
} from "@/components/admin/quotes/QuoteItemFormRow";
import QuickAddContactModal from "@/components/admin/quotes/QuickAddContactModal";
import type { SalesRepresentativeRecord } from "@/features/sales/types";

type ProductOption = { id: string; name: string };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};
type LeadOption = {
  id: string;
  fullName: string;
  companyName: string | null;
  company: string | null;
};

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
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const skipContactAutofill = useRef(false);

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
  const [sampleFee, setSampleFee] = useState("");
  const [sampleLeadTime, setSampleLeadTime] = useState("");
  const [sampleRefundCondition, setSampleRefundCondition] = useState("");
  const [items, setItems] = useState<QuoteItemRow[]>([emptyQuoteItem()]);
  const [status, setStatus] = useState<string>("DRAFT");
  const [quoteDate, setQuoteDate] = useState(toDateInputValue(new Date().toISOString()));
  const [currency, setCurrency] = useState("VND");
  const [priceVatType, setPriceVatType] = useState("EXCLUDING_VAT");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerTaxCode, setCustomerTaxCode] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerContactName, setCustomerContactName] = useState("");
  const [customerContactTitle, setCustomerContactTitle] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [salesRepresentativeId, setSalesRepresentativeId] = useState("");
  const [salesTitle, setSalesTitle] = useState("");
  const [salesReps, setSalesReps] = useState<SalesRepresentativeRecord[]>([]);
  const [quickAddContactOpen, setQuickAddContactOpen] = useState(false);
  const [salesName, setSalesName] = useState("");
  const [salesPhone, setSalesPhone] = useState("");
  const [salesEmail, setSalesEmail] = useState("");
  const [salesAddress, setSalesAddress] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  function applySalesRep(rep: SalesRepresentativeRecord) {
    setSalesRepresentativeId(rep.id);
    setSalesName(rep.fullName);
    setSalesTitle(rep.title ?? "");
    setSalesPhone(rep.phone ?? "");
    setSalesEmail(rep.email ?? "");
    setSalesAddress(rep.address ?? "");
  }

  async function loadCustomerContacts(id: string) {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    setContacts(data.contacts ?? []);
  }

  function applyCustomer(customer: CrmCustomerRecord) {
    const snapshots = customerToQuoteSnapshots(customer);
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerCompany(snapshots.customerCompanySnapshot ?? "");
    setCustomerTaxCode(snapshots.customerTaxCodeSnapshot ?? "");
    setCustomerAddress(snapshots.customerAddressSnapshot ?? "");
    setCustomerContactName("");
    setCustomerContactTitle("");
    setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
    setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
    setContactId("");
    void loadCustomerContacts(customer.id);
  }

  function applyContact(contact: CrmContactRecord) {
    const snapshots = contactToQuoteSnapshots(contact, {
      phone: selectedCustomer?.phone,
      email: selectedCustomer?.email,
    });
    setContactId(contact.id);
    setCustomerContactName(snapshots.customerContactNameSnapshot ?? "");
    setCustomerContactTitle(snapshots.customerContactTitleSnapshot ?? "");
    setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
    setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
  }

  async function loadCustomerById(id: string, keepSnapshots = true) {
    const res = await fetch(`/api/crm/customers/${id}`);
    const data = (await res.json()) as { customer?: CrmCustomerRecord };
    if (!data.customer) return;
    setSelectedCustomer(data.customer);
    await loadCustomerContacts(id);
    if (!keepSnapshots) applyCustomer(data.customer);
  }

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/crm/leads").then((r) => r.json()),
      fetch("/api/admin/sales?active=1").then((r) => r.json()),
    ]).then(([productsData, leadsData, salesData]) => {
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
      setLeads((leadsData as { leads?: LeadOption[] }).leads ?? []);
      setSalesReps((salesData as { salesReps?: SalesRepresentativeRecord[] }).salesReps ?? []);
    });
  }, []);

  useEffect(() => {
    if (skipContactAutofill.current) {
      skipContactAutofill.current = false;
      return;
    }
    if (!contactId) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) applyContact(contact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    if (mode === "edit" && quoteId) {
      void fetch(`/api/quotes/${quoteId}`)
        .then(async (res) => {
          const data = (await res.json()) as {
            quote?: Record<string, unknown>;
            message?: string;
          };
          if (!res.ok) throw new Error(data.message ?? "Không tải được báo giá");
          const q = data.quote!;
          setSourceType(String(q.sourceType));
          setPricingCalculationId((q.pricingCalculationId as string) ?? null);
          setLeadId((q.leadId as string) ?? "");
          const cid = (q.customerId as string) ?? "";
          setCustomerId(cid);
          skipContactAutofill.current = true;
          setContactId((q.contactId as string) ?? "");
          setTitle(String(q.title ?? ""));
          setValidUntil(toDateInputValue(q.validUntil as string));
          setQuoteDate(
            toDateInputValue(q.quoteDate as string) ||
              toDateInputValue(new Date().toISOString()),
          );
          setCurrency(String(q.currency ?? "VND"));
          setPriceVatType(String(q.priceVatType ?? "EXCLUDING_VAT"));
          setCustomerCompany(String(q.customerCompanySnapshot ?? ""));
          setCustomerTaxCode(String(q.customerTaxCodeSnapshot ?? ""));
          setCustomerAddress(String(q.customerAddressSnapshot ?? ""));
          setCustomerContactName(String(q.customerContactNameSnapshot ?? ""));
          setCustomerContactTitle(String(q.customerContactTitleSnapshot ?? ""));
          setCustomerPhone(String(q.customerPhoneSnapshot ?? ""));
          setCustomerEmail(String(q.customerEmailSnapshot ?? ""));
          setSalesRepresentativeId((q.salesRepresentativeId as string) ?? "");
          setSalesName(String(q.salesName ?? ""));
          setSalesTitle(String(q.salesTitleSnapshot ?? ""));
          setSalesPhone(String(q.salesPhone ?? ""));
          setSalesEmail(String(q.salesEmail ?? ""));
          setSalesAddress(String(q.salesAddress ?? ""));
          setPreparedBy(String(q.preparedBy ?? ""));
          setDiscountAmount(String(q.discountAmount ?? 0));
          setShippingFee(String(q.shippingFee ?? 0));
          setVatRate(String(q.vatRate ?? 0));
          setManualTotalAmount(
            q.manualTotalAmount != null ? String(q.manualTotalAmount) : "",
          );
          setManualOverrideReason(String(q.manualOverrideReason ?? ""));
          setCustomerNote(String(q.customerNote ?? ""));
          setInternalNote(String(q.internalNote ?? ""));
          setTerms(String(q.terms ?? DEFAULT_QUOTE_TERMS));
          setSampleFee(q.sampleFee != null ? String(q.sampleFee) : "");
          setSampleLeadTime(String(q.sampleLeadTime ?? ""));
          setSampleRefundCondition(String(q.sampleRefundCondition ?? ""));
          setStatus(String(q.status ?? "DRAFT"));
          if (q.status === "ACCEPTED" || q.status === "REJECTED") {
            setWarning(
              "Báo giá đã có phản hồi. Nếu thay đổi lớn, nên tạo báo giá mới.",
            );
          }
          const rawItems = Array.isArray(q.items)
            ? (q.items as Array<Record<string, unknown>>)
            : [];
          setItems(
            rawItems.map((item) => ({
              key: String(item.id ?? crypto.randomUUID()),
              pricingCalculationItemId:
                (item.pricingCalculationItemId as string) ?? null,
              productId: (item.productId as string) ?? null,
              variantId: (item.variantId as string) ?? null,
              productNameSnapshot: String(item.productNameSnapshot ?? ""),
              variantNameSnapshot: (item.variantNameSnapshot as string) ?? null,
              description: (item.description as string) ?? null,
              skuSnapshot: (item.skuSnapshot as string) ?? null,
              colorSnapshot: (item.colorSnapshot as string) ?? null,
              categorySnapshot: (item.categorySnapshot as string) ?? null,
              genderSnapshot: (item.genderSnapshot as string) ?? null,
              moqSnapshot:
                item.moqSnapshot != null ? Number(item.moqSnapshot) : null,
              itemNote: (item.itemNote as string) ?? null,
              designImageUrl: (item.designImageUrl as string) ?? null,
              productionLeadTime: (item.productionLeadTime as string) ?? null,
              sampleFee: item.sampleFee != null ? Number(item.sampleFee) : null,
              sampleLeadTime: (item.sampleLeadTime as string) ?? null,
              quantity: Number(item.quantity ?? 1),
              unit: String(item.unit ?? "cái"),
              baseUnitPrice: Number(item.baseUnitPrice ?? 0),
              serviceFee: Number(item.serviceFee ?? 0),
              setupFee: Number(item.setupFee ?? 0),
              unitPrice: Number(item.unitPrice ?? 0),
              discountAmount: Number(item.discountAmount ?? 0),
              manualUnitPrice:
                item.manualUnitPrice != null ? Number(item.manualUnitPrice) : null,
              manualOverrideReason: (item.manualOverrideReason as string) ?? null,
              sortOrder: Number(item.sortOrder ?? 0),
            })),
          );
          if (cid) void loadCustomerById(cid, true);
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    const params = new URLSearchParams();
    if (prefillParams?.pricingCalculationId)
      params.set("pricingCalculationId", prefillParams.pricingCalculationId);
    if (prefillParams?.leadId) params.set("leadId", prefillParams.leadId);
    if (prefillParams?.customerId) params.set("customerId", prefillParams.customerId);

    void fetch(`/api/quotes/prefill?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as { prefill?: Record<string, unknown> };
        const p = data.prefill;
        if (!p) return;
        setSourceType(String(p.sourceType ?? "MANUAL"));
        setPricingCalculationId((p.pricingCalculationId as string) ?? null);
        setLeadId((p.leadId as string) ?? "");
        const cid = (p.customerId as string) ?? "";
        setCustomerId(cid);
        skipContactAutofill.current = true;
        setContactId((p.contactId as string) ?? "");
        setTitle(String(p.title ?? "Báo giá sản phẩm ATTD"));
        setValidUntil(toDateInputValue(p.validUntil as string));
        setQuoteDate(
          toDateInputValue(p.quoteDate as string) ||
            toDateInputValue(new Date().toISOString()),
        );
        setCurrency(String(p.currency ?? "VND"));
        setPriceVatType(String(p.priceVatType ?? "EXCLUDING_VAT"));
        setCustomerCompany(String(p.customerCompanySnapshot ?? ""));
        setCustomerTaxCode(String(p.customerTaxCodeSnapshot ?? ""));
        setCustomerAddress(String(p.customerAddressSnapshot ?? ""));
        setCustomerContactName(String(p.customerContactNameSnapshot ?? ""));
        setCustomerContactTitle(String(p.customerContactTitleSnapshot ?? ""));
        setCustomerPhone(String(p.customerPhoneSnapshot ?? ""));
        setCustomerEmail(String(p.customerEmailSnapshot ?? ""));
        setSalesRepresentativeId((p.salesRepresentativeId as string) ?? "");
        setSalesName(String(p.salesName ?? ""));
        setSalesTitle(String(p.salesTitleSnapshot ?? ""));
        setSalesPhone(String(p.salesPhone ?? ""));
        setSalesEmail(String(p.salesEmail ?? ""));
        setSalesAddress(String(p.salesAddress ?? ""));
        setDiscountAmount(String(p.discountAmount ?? 0));
        setShippingFee(String(p.shippingFee ?? 0));
        setVatRate(String(p.vatRate ?? 0));
        setManualTotalAmount(
          p.manualTotalAmount != null ? String(p.manualTotalAmount) : "",
        );
        setManualOverrideReason(String(p.manualOverrideReason ?? ""));
        setInternalNote(String(p.internalNote ?? ""));
        const rawItems = Array.isArray(p.items)
          ? (p.items as Array<Record<string, unknown>>)
          : [];
        if (rawItems.length) {
          setItems(
            rawItems.map((item) => ({
              key: crypto.randomUUID(),
              pricingCalculationItemId:
                (item.pricingCalculationItemId as string) ?? null,
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
              manualUnitPrice:
                item.manualUnitPrice != null ? Number(item.manualUnitPrice) : null,
              manualOverrideReason: (item.manualOverrideReason as string) ?? null,
              sortOrder: Number(item.sortOrder ?? 0),
            })),
          );
        }
        if (cid) void loadCustomerById(cid, true);
      })
      .finally(() => setLoading(false));
  }, [mode, quoteId, prefillParams]);

  async function loadProductMeta(productId: string, itemIndex: number) {
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = (await res.json()) as {
      product?: {
        name?: string;
        defaultMoq?: number;
        leadTime?: string | null;
        category?: { name?: string };
      };
      variants?: VariantOption[];
    };
    if (data.variants) {
      setVariantsMap((prev) => ({ ...prev, [productId]: data.variants ?? [] }));
    }
    setItems((prev) =>
      prev.map((row, i) =>
        i === itemIndex
          ? {
              ...row,
              productNameSnapshot: data.product?.name ?? row.productNameSnapshot,
              categorySnapshot: data.product?.category?.name ?? row.categorySnapshot,
              moqSnapshot: data.product?.defaultMoq ?? row.moqSnapshot,
              productionLeadTime: data.product?.leadTime ?? row.productionLeadTime,
            }
          : row,
      ),
    );
  }

  async function loadVariants(productId: string) {
    if (!productId || variantsMap[productId]) return;
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = (await res.json()) as { variants?: VariantOption[] };
    setVariantsMap((prev) => ({ ...prev, [productId]: data.variants ?? [] }));
  }

  const preview = useMemo(
    () =>
      computeQuoteFromItems(
        items.map(({ key: _k, ...item }) => item),
        {
          discountAmount: Number(discountAmount) || 0,
          shippingFee: Number(shippingFee) || 0,
          vatRate: Number(vatRate) || 0,
          manualTotalAmount: manualTotalAmount.trim()
            ? Number(manualTotalAmount)
            : null,
        },
      ),
    [items, discountAmount, shippingFee, vatRate, manualTotalAmount],
  );

  function buildPayload(statusOverride?: string) {
    return {
      sourceType,
      pricingCalculationId,
      leadId: leadId || null,
      customerId: customerId || null,
      contactId: contactId || null,
      title,
      validUntil: validUntil || null,
      quoteDate: quoteDate || null,
      currency,
      priceVatType: priceVatType as "EXCLUDING_VAT" | "INCLUDING_VAT",
      customerCompanySnapshot: customerCompany || null,
      customerTaxCodeSnapshot: customerTaxCode || null,
      customerAddressSnapshot: customerAddress || null,
      customerContactNameSnapshot: customerContactName || null,
      customerContactTitleSnapshot: customerContactTitle || null,
      customerPhoneSnapshot: customerPhone || null,
      customerEmailSnapshot: customerEmail || null,
      salesRepresentativeId: salesRepresentativeId || null,
      salesName: salesName || null,
      salesTitleSnapshot: salesTitle || null,
      salesPhone: salesPhone || null,
      salesEmail: salesEmail || null,
      salesAddress: salesAddress || null,
      preparedBy: preparedBy || null,
      discountAmount: Number(discountAmount) || 0,
      shippingFee: Number(shippingFee) || 0,
      vatRate: Number(vatRate) || 0,
      manualTotalAmount: manualTotalAmount.trim() ? Number(manualTotalAmount) : null,
      manualOverrideReason: manualOverrideReason || null,
      customerNote: customerNote || null,
      internalNote: internalNote || null,
      terms,
      sampleFee: sampleFee.trim() ? Number(sampleFee) : null,
      sampleLeadTime: sampleLeadTime.trim() || null,
      sampleRefundCondition: sampleRefundCondition.trim() || null,
      status: statusOverride ?? status,
      items: items.map(({ key: _k, ...item }) => item),
    };
  }

  async function handleSave(draft = true) {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(draft ? "DRAFT" : status);
      const url =
        mode === "edit" && quoteId ? `/api/quotes/${quoteId}` : "/api/quotes";
      const method = mode === "edit" ? "PATCH" : "POST";
      const body =
        mode === "create" && prefillParams?.pricingCalculationId
          ? { ...payload, fromPricingCalculationId: prefillParams.pricingCalculationId }
          : payload;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { quote?: { id: string }; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể lưu báo giá");
      router.push(`/admin/quotes/${data.quote!.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, patch: Partial<QuoteItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;

  return (
    <div className="quote-form admin-panel">
      <div className="quote-form__actions-top">
        <Link href="/admin/quotes" className="admin-btn admin-btn--secondary">
          Hủy
        </Link>
        <div className="quote-form__actions-top-right">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={saving}
            onClick={() => void handleSave(true)}
          >
            {saving ? "Đang lưu…" : "Lưu nháp"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={saving}
            onClick={() => void handleSave(false)}
          >
            Lưu và xem chi tiết
          </button>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {warning && (
        <p
          className="admin-field-hint"
          style={{ color: "var(--admin-warning, #b45309)" }}
        >
          {warning}
        </p>
      )}

      <div className="quote-form__card">
        <h2 className="quote-form__card-title">Cài đặt báo giá</h2>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Tiêu đề báo giá</label>
            <input
              className="admin-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ngày báo giá</label>
            <input
              className="admin-input"
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Hiệu lực đến</label>
            <input
              className="admin-input"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại tiền</label>
            <select
              className="admin-input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại giá</label>
            <select
              className="admin-input"
              value={priceVatType}
              onChange={(e) => setPriceVatType(e.target.value)}
            >
              <option value="EXCLUDING_VAT">Chưa bao gồm VAT</option>
              <option value="INCLUDING_VAT">Đã bao gồm VAT</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Người lập</label>
            <input
              className="admin-input"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Lead liên kết</label>
            <select
              className="admin-input"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
            >
              <option value="">— Không chọn —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="quote-form__card">
        <CustomerSearchField
          value={selectedCustomer}
          onSelect={(customer) => {
            if (customer) applyCustomer(customer);
            else {
              setSelectedCustomer(null);
              setCustomerId("");
              setContacts([]);
              setContactId("");
            }
          }}
        />
      </div>

      <div className="quote-form__party-grid">
        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Khách hàng</legend>
          <div className="quote-form__party-fields">
            {selectedCustomer?.code && (
              <p className="admin-field-hint">Mã: {selectedCustomer.code}</p>
            )}
            <div className="admin-field">
              <label className="admin-label">Tên công ty</label>
              <input
                className="admin-input"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã số thuế</label>
              <input
                className="admin-input"
                value={customerTaxCode}
                onChange={(e) => setCustomerTaxCode(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Địa chỉ</label>
              <input
                className="admin-input"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </div>
            {selectedCustomer?.phone && (
              <p className="admin-field-hint">
                SĐT công ty (CRM): {selectedCustomer.phone}
              </p>
            )}
            {selectedCustomer?.email && (
              <p className="admin-field-hint">
                Email công ty (CRM): {selectedCustomer.email}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Người liên hệ</legend>
          <div className="quote-form__party-fields">
            {customerId ? (
              <div className="admin-field">
                <label className="admin-label">Chọn người liên hệ</label>
                <select
                  className="admin-input"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                >
                  <option value="">— Chọn người liên hệ —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                      {c.title ? ` · ${c.title}` : ""}
                    </option>
                  ))}
                </select>
                {contacts.length === 0 && (
                  <p className="admin-field-hint">
                    Khách hàng này chưa có người liên hệ
                  </p>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small"
                  onClick={() => setQuickAddContactOpen(true)}
                >
                  Thêm người liên hệ mới
                </button>
              </div>
            ) : (
              <p className="admin-field-hint">Chọn khách hàng để tải danh sách liên hệ</p>
            )}
            <div className="admin-field">
              <label className="admin-label">Tên người liên hệ</label>
              <input
                className="admin-input"
                value={customerContactName}
                onChange={(e) => setCustomerContactName(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chức vụ</label>
              <input
                className="admin-input"
                value={customerContactTitle}
                onChange={(e) => setCustomerContactTitle(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Số điện thoại</label>
              <input
                className="admin-input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Nhân viên tư vấn</legend>
          <div className="quote-form__party-fields">
            <div className="admin-field">
              <label className="admin-label">Chọn nhân viên tư vấn</label>
              <select
                className="admin-input"
                value={salesRepresentativeId}
                onChange={(e) => {
                  const rep = salesReps.find((r) => r.id === e.target.value);
                  if (rep) applySalesRep(rep);
                  else setSalesRepresentativeId("");
                }}
              >
                <option value="">— Chọn nhân viên —</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                    {rep.isDefault ? " (Mặc định)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Họ tên</label>
              <input
                className="admin-input"
                value={salesName}
                onChange={(e) => setSalesName(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chức vụ</label>
              <input
                className="admin-input"
                value={salesTitle}
                onChange={(e) => setSalesTitle(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Số điện thoại</label>
              <input
                className="admin-input"
                value={salesPhone}
                onChange={(e) => setSalesPhone(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                type="email"
                value={salesEmail}
                onChange={(e) => setSalesEmail(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Địa chỉ</label>
              <input
                className="admin-input"
                value={salesAddress}
                onChange={(e) => setSalesAddress(e.target.value)}
              />
            </div>
          </div>
        </fieldset>
      </div>

      {customerId && (
        <QuickAddContactModal
          customerId={customerId}
          open={quickAddContactOpen}
          onClose={() => setQuickAddContactOpen(false)}
          onCreated={(contact) => {
            setContacts((prev) => [...prev, contact]);
            applyContact(contact);
          }}
        />
      )}

      <div className="quote-form__layout">
        <fieldset className="quote-form__items admin-catalog-fieldset">
          <legend>Sản phẩm / dịch vụ</legend>
          {items.map((item, i) => (
            <QuoteItemFormRow
              key={item.key}
              index={i}
              item={item}
              products={products}
              variants={variantsMap[item.productId ?? ""] ?? []}
              onChange={(patch) => updateItem(i, patch)}
              onRemove={
                items.length > 1
                  ? () => setItems(items.filter((_, idx) => idx !== i))
                  : undefined
              }
              onLoadVariants={loadVariants}
              onProductSelect={(productId) => loadProductMeta(productId, i)}
            />
          ))}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setItems([...items, emptyQuoteItem()])}
          >
            + Thêm dòng sản phẩm
          </button>
        </fieldset>

        <div className="quote-form__sidebar">
          <fieldset className="admin-catalog-fieldset">
            <legend>Chiết khấu / VAT</legend>
            <div className="quote-form__party-fields">
              <div className="admin-field">
                <label className="admin-label">Chiết khấu</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phí vận chuyển</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">VAT (%)</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={vatRate}
                  onChange={(e) => setVatRate(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Tổng chỉnh tay</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={manualTotalAmount}
                  onChange={(e) => setManualTotalAmount(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Lý do chỉnh giá</label>
                <input
                  className="admin-input"
                  value={manualOverrideReason}
                  onChange={(e) => setManualOverrideReason(e.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="admin-catalog-fieldset">
            <legend>Kết quả báo giá</legend>
            <QuoteTotalsSummary totals={preview.totals} />
          </fieldset>
        </div>
      </div>

      <fieldset className="quote-form__card admin-catalog-fieldset">
        <legend>Thông tin mẫu</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Phí mẫu</label>
            <input
              className="admin-input"
              type="number"
              min="0"
              value={sampleFee}
              onChange={(e) => setSampleFee(e.target.value)}
              placeholder="VND"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thời gian làm mẫu</label>
            <input
              className="admin-input"
              value={sampleLeadTime}
              onChange={(e) => setSampleLeadTime(e.target.value)}
              placeholder="VD: 5–7 ngày"
            />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Điều kiện hoàn phí</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={sampleRefundCondition}
            onChange={(e) => setSampleRefundCondition(e.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="quote-form__card admin-catalog-fieldset">
        <legend>Ghi chú & điều khoản</legend>
        <div className="admin-field">
          <label className="admin-label">Ghi chú gửi khách</label>
          <textarea
            className="admin-textarea"
            rows={2}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Ghi chú nội bộ</label>
          <textarea
            className="admin-textarea"
            rows={2}
            value={internalNote}
            onChange={(e) => setInternalNote(e.target.value)}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Điều khoản báo giá</label>
          <textarea
            className="admin-textarea"
            rows={4}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
          />
        </div>
      </fieldset>
    </div>
  );
}
