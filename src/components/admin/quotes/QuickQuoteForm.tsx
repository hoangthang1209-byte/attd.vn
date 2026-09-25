"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickQuoteProductLine from "@/components/admin/quotes/QuickQuoteProductLine";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import { emptyQuoteItem, type QuoteItemRow } from "@/components/admin/quotes/QuoteItemFormRow";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";
import { toDateInputValue } from "@/features/quotes/format";
import { formatQuoteCurrency } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import {
  contactToQuoteSnapshots,
  customerToQuoteSnapshots,
} from "@/features/quotes/quote-party-utils";
import { getQuotePublicUrl } from "@/features/quotes/quote-public-link.shared";
import { openQuotePdfInlineAdmin } from "@/features/quotes/pdf/open-quote-pdf.client";
import {
  buildQuickQuotePayload,
  validateQuickQuoteItems,
  type QuickQuoteCommercialState,
  type QuickQuotePartyState,
} from "@/features/quotes/quick-quote/quick-quote-payload";
import {
  clearQuickQuoteDraft,
  loadQuickQuoteDraft,
  saveQuickQuoteDraft,
} from "@/features/quotes/quick-quote/quick-quote-draft";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import "@/styles/quick-quote.css";

type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};

type CreatedQuote = {
  id: string;
  quoteNo: string;
  publicShortCode: string | null;
};

type Step = "customer" | "products" | "preview" | "success";

type Props = {
  prefillParams?: {
    leadId?: string;
    customerId?: string;
  };
};

const EMPTY_PARTY: QuickQuotePartyState = {
  customerId: "",
  contactId: "",
  customerCompany: "",
  customerTaxCode: "",
  customerAddress: "",
  customerContactName: "",
  customerContactTitle: "",
  customerPhone: "",
  customerEmail: "",
};

function defaultCommercial(): QuickQuoteCommercialState {
  return {
    leadId: "",
    title: "Báo giá sản phẩm ATTD",
    validUntil: "",
    quoteDate: toDateInputValue(new Date().toISOString()),
    currency: "VND",
    priceVatType: "EXCLUDING_VAT",
    discountAmount: "0",
    shippingFee: "0",
    vatRate: "0",
    salesRepresentativeId: "",
    salesName: "",
    salesTitle: "",
    salesPhone: "",
    salesEmail: "",
    salesAddress: "",
    customerNote: "",
  };
}

function emptyQuickQuoteItem(): QuoteItemRow {
  return { ...emptyQuoteItem(), quantity: 100 };
}

function toQuoteItemInput(row: QuoteItemRow) {
  const { key: _rowKey, ...item } = row;
  void _rowKey;
  return item;
}

export default function QuickQuoteForm({ prefillParams }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const toast = useAdminToast();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("customer");
  const [party, setParty] = useState<QuickQuotePartyState>(EMPTY_PARTY);
  const [commercial, setCommercial] = useState<QuickQuoteCommercialState>(defaultCommercial);
  const [items, setItems] = useState<QuoteItemRow[]>([emptyQuickQuoteItem()]);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<CreatedQuote | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const preview = useMemo(
    () =>
      computeQuoteFromItems(
        items.map(toQuoteItemInput),
        {
          discountAmount: Number(commercial.discountAmount) || 0,
          shippingFee: Number(commercial.shippingFee) || 0,
          vatRate: Number(commercial.vatRate) || 0,
          manualTotalAmount: null,
        },
      ),
    [items, commercial.discountAmount, commercial.shippingFee, commercial.vatRate],
  );

  const applyCustomer = useCallback((customer: CrmCustomerRecord) => {
    const snapshots = customerToQuoteSnapshots(customer);
    setSelectedCustomer(customer);
    setParty((prev) => ({
      ...prev,
      customerId: customer.id,
      contactId: "",
      customerCompany: snapshots.customerCompanySnapshot ?? customer.name,
      customerTaxCode: snapshots.customerTaxCodeSnapshot ?? "",
      customerAddress: snapshots.customerAddressSnapshot ?? "",
      customerContactName: "",
      customerContactTitle: "",
      customerPhone: snapshots.customerPhoneSnapshot ?? "",
      customerEmail: snapshots.customerEmailSnapshot ?? "",
    }));
  }, []);

  const applyContact = useCallback(
    (contact: CrmContactRecord | null) => {
      if (!contact) {
        setParty((prev) => ({
          ...prev,
          contactId: "",
          customerContactName: "",
          customerContactTitle: "",
        }));
        return;
      }
      const snapshots = contactToQuoteSnapshots(contact, {
        phone: selectedCustomer?.phone,
        email: selectedCustomer?.email,
      });
      setParty((prev) => ({
        ...prev,
        contactId: contact.id,
        customerContactName: snapshots.customerContactNameSnapshot ?? "",
        customerContactTitle: snapshots.customerContactTitleSnapshot ?? "",
        customerPhone: snapshots.customerPhoneSnapshot ?? prev.customerPhone,
        customerEmail: snapshots.customerEmailSnapshot ?? prev.customerEmail,
      }));
    },
    [selectedCustomer],
  );

  async function loadCustomerById(id: string) {
    const res = await fetch(`/api/crm/customers/${id}`);
    const data = (await res.json()) as { customer?: CrmCustomerRecord };
    if (data.customer) applyCustomer(data.customer);
  }

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

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      fetch("/api/employees?active=1&role=SALES&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=ADMIN&limit=200").then((r) => r.json()),
    ]).then(([salesData, adminData]) => {
      if (cancelled) return;
      const sales = (salesData as { employees?: EmployeeRecord[] }).employees ?? [];
      const admins = (adminData as { employees?: EmployeeRecord[] }).employees ?? [];
      const merged = [...sales];
      for (const admin of admins) {
        if (!merged.some((e) => e.id === admin.id)) merged.push(admin);
      }
      setSalesEmployees(merged);
    });

    const timer = window.setTimeout(() => {
      const draft = loadQuickQuoteDraft();
      if (draft && !prefillParams?.leadId && !prefillParams?.customerId) {
        setStep(draft.step);
        setParty(draft.party);
        setCommercial(draft.commercial);
        setItems(draft.items.length ? draft.items : [emptyQuickQuoteItem()]);
        setDraftRestored(true);
        if (draft.party.customerId) void loadCustomerById(draft.party.customerId);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (prefillParams?.leadId) params.set("leadId", prefillParams.leadId);
      if (prefillParams?.customerId) params.set("customerId", prefillParams.customerId);

      void fetch(`/api/quotes/prefill?${params}`)
        .then(async (res) => {
          const data = (await res.json()) as { prefill?: Record<string, unknown> };
          const p = data.prefill;
          if (!p || cancelled) return;
          setCommercial((prev) => ({
            ...prev,
            leadId: String(p.leadId ?? ""),
            title: String(p.title ?? prev.title),
            validUntil: toDateInputValue(p.validUntil as string),
            quoteDate:
              toDateInputValue(p.quoteDate as string) ||
              toDateInputValue(new Date().toISOString()),
            currency: String(p.currency ?? prev.currency),
            priceVatType:
              (p.priceVatType as QuickQuoteCommercialState["priceVatType"]) ??
              prev.priceVatType,
            discountAmount: String(p.discountAmount ?? 0),
            shippingFee: String(p.shippingFee ?? 0),
            vatRate: String(p.vatRate ?? 0),
            salesRepresentativeId: String(p.salesRepresentativeId ?? ""),
            salesName: String(p.salesName ?? ""),
            salesTitle: String(p.salesTitleSnapshot ?? ""),
            salesPhone: String(p.salesPhone ?? ""),
            salesEmail: String(p.salesEmail ?? ""),
            salesAddress: String(p.salesAddress ?? ""),
          }));
          const cid = String(p.customerId ?? "");
          setParty((prev) => ({
            ...prev,
            customerId: cid,
            contactId: String(p.contactId ?? ""),
            customerCompany: String(p.customerCompanySnapshot ?? ""),
            customerTaxCode: String(p.customerTaxCodeSnapshot ?? ""),
            customerAddress: String(p.customerAddressSnapshot ?? ""),
            customerContactName: String(p.customerContactNameSnapshot ?? ""),
            customerContactTitle: String(p.customerContactTitleSnapshot ?? ""),
            customerPhone: String(p.customerPhoneSnapshot ?? ""),
            customerEmail: String(p.customerEmailSnapshot ?? ""),
          }));
          if (cid) void loadCustomerById(cid);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillParams]);

  useEffect(() => {
    if (step === "success") return;
    const timer = window.setTimeout(() => {
      saveQuickQuoteDraft({
        step,
        party,
        commercial,
        items,
        savedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [step, party, commercial, items]);

  function updateItem(index: number, patch: Partial<QuoteItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function validateCustomerStep(): string | null {
    if (!party.customerCompany.trim()) {
      return "Vui lòng chọn hoặc tạo khách hàng.";
    }
    return null;
  }

  function goToProducts() {
    const err = validateCustomerStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep("products");
  }

  function goToPreview() {
    const err = validateQuickQuoteItems(items.map(toQuoteItemInput));
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep("preview");
  }

  function publicUrlForQuote(quote: CreatedQuote): string | null {
    if (!quote.quoteNo || !quote.publicShortCode) return null;
    return getQuotePublicUrl(
      { quoteNo: quote.quoteNo, publicShortCode: quote.publicShortCode },
      typeof window === "undefined" ? undefined : window.location.origin,
    );
  }

  async function copyPublicLink(quote: CreatedQuote) {
    const url = publicUrlForQuote(quote);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Đã sao chép link báo giá.");
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function sharePublicLink(quote: CreatedQuote) {
    const url = publicUrlForQuote(quote);
    if (!url) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Báo giá ${quote.quoteNo}`,
          text: "Xem báo giá từ ATTD",
          url,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyPublicLink(quote);
  }

  async function handleCreate() {
    setError(null);
    const itemErr = validateQuickQuoteItems(items.map(toQuoteItemInput));
    if (itemErr) {
      setError(itemErr);
      setStep("products");
      return;
    }
    const customerErr = validateCustomerStep();
    if (customerErr) {
      setError(customerErr);
      setStep("customer");
      return;
    }

    setSubmitting(true);
    const payload = buildQuickQuotePayload(
      party,
      commercial,
      items.map(toQuoteItemInput),
      "DRAFT",
    );

    const saved = await mutate({
      loadingMessage: "Đang tạo báo giá…",
      successMessage: "Đã tạo báo giá.",
      action: async () => {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (data) => data.quote as CreatedQuote);
      },
    });

    setSubmitting(false);
    if (!saved) {
      setError("Không thể tạo báo giá.");
      return;
    }

    clearQuickQuoteDraft();
    setCreatedQuote(saved);
    setStep("success");
  }

  function applySalesEmployee(employee: EmployeeRecord) {
    setCommercial((prev) => ({
      ...prev,
      salesRepresentativeId: employee.id,
      salesName: employee.fullName,
      salesTitle: employee.jobTitle ?? "",
      salesPhone: employee.phone ?? "",
      salesEmail: employee.email ?? "",
    }));
  }

  if (loading) {
    return (
      <SectionLoading
        title="Đang chuẩn bị Quick Quote…"
        description="Tải thông tin khách hàng và sản phẩm."
        tone="admin"
      />
    );
  }

  const stepOrder: Step[] = ["customer", "products", "preview", "success"];
  const stepIndex = stepOrder.indexOf(step);

  return (
    <div className="quick-quote-page">
      <div className="quick-quote-page__top">
        <AdminBackLink href="/admin/quotes" label="Quay lại danh sách báo giá" />
        <p className="quick-quote-page__hint">
          Tạo báo giá nhanh trên di động — tối ưu cho cuộc gọi khách hàng trực tiếp.
        </p>
        {step !== "success" && (
          <div className="quick-quote-steps" aria-label="Tiến trình">
            {(["customer", "products", "preview"] as const).map((s, i) => (
              <span
                key={s}
                className={[
                  "quick-quote-steps__pill",
                  step === s ? "quick-quote-steps__pill--active" : "",
                  stepIndex > i ? "quick-quote-steps__pill--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {s === "customer" ? "1. Khách hàng" : s === "products" ? "2. Sản phẩm" : "3. Xem trước"}
              </span>
            ))}
          </div>
        )}
      </div>

      {draftRestored && step !== "success" && (
        <p className="admin-toast">Đã khôi phục bản nháp chưa lưu.</p>
      )}
      {error && <p className="admin-error">{error}</p>}

      {step === "customer" && (
        <section className="quick-quote-section">
          <h2 className="quick-quote-section__title">Khách hàng</h2>
          <CustomerSearchField
            value={selectedCustomer}
            allowQuickCreate
            quickCreateContextLabel="Quick Quote"
            hideHint
            label="Tìm hoặc tạo khách hàng"
            onSelect={(customer) => {
              if (customer) applyCustomer(customer);
              else {
                setSelectedCustomer(null);
                setParty(EMPTY_PARTY);
              }
            }}
            onContactSelect={applyContact}
          />
          {party.customerCompany && !selectedCustomer && (
            <div className="admin-field">
              <label className="admin-label">Tên khách / công ty</label>
              <input
                className="admin-input"
                value={party.customerCompany}
                onChange={(e) =>
                  setParty((prev) => ({ ...prev, customerCompany: e.target.value }))
                }
              />
            </div>
          )}
          <div className="admin-field">
            <label className="admin-label">Người liên hệ</label>
            <input
              className="admin-input"
              value={party.customerContactName}
              placeholder="Tên người liên hệ"
              onChange={(e) =>
                setParty((prev) => ({ ...prev, customerContactName: e.target.value }))
              }
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Điện thoại</label>
            <input
              className="admin-input"
              type="tel"
              inputMode="tel"
              value={party.customerPhone}
              onChange={(e) => setParty((prev) => ({ ...prev, customerPhone: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Email</label>
            <input
              className="admin-input"
              type="email"
              inputMode="email"
              value={party.customerEmail}
              onChange={(e) => setParty((prev) => ({ ...prev, customerEmail: e.target.value }))}
            />
          </div>
        </section>
      )}

      {step === "products" && (
        <>
          <section className="quick-quote-section">
            <h2 className="quick-quote-section__title">Sản phẩm</h2>
            <div className="quick-quote-lines">
              {items.map((item, index) => (
                <QuickQuoteProductLine
                  key={item.key}
                  index={index}
                  item={item}
                  variants={item.productId ? variantsMap[item.productId] ?? [] : []}
                  onChange={(patch) => updateItem(index, patch)}
                  onRemove={items.length > 1 ? () => setItems((prev) => prev.filter((_, i) => i !== index)) : undefined}
                  onLoadVariants={loadVariants}
                  onProductSelect={(productId) => loadProductMeta(productId, index)}
                />
              ))}
            </div>
            {items.length < 10 && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setItems((prev) => [...prev, emptyQuickQuoteItem()])}
              >
                + Thêm sản phẩm
              </button>
            )}
          </section>

          <details className="quick-quote-advanced">
            <summary>Chiết khấu, VAT &amp; ghi chú</summary>
            <div className="quick-quote-advanced__body">
              <div className="admin-field">
                <label className="admin-label">Chiết khấu</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={commercial.discountAmount}
                  onChange={(e) =>
                    setCommercial((prev) => ({ ...prev, discountAmount: e.target.value }))
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phí vận chuyển</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={commercial.shippingFee}
                  onChange={(e) =>
                    setCommercial((prev) => ({ ...prev, shippingFee: e.target.value }))
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">VAT (%)</label>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={commercial.vatRate}
                  onChange={(e) =>
                    setCommercial((prev) => ({ ...prev, vatRate: e.target.value }))
                  }
                />
              </div>
              <div className="admin-field admin-field--full">
                <label className="admin-label">Ghi chú cho khách</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={commercial.customerNote}
                  onChange={(e) =>
                    setCommercial((prev) => ({ ...prev, customerNote: e.target.value }))
                  }
                />
              </div>
            </div>
          </details>
        </>
      )}

      {step === "preview" && (
        <section className="quick-quote-section">
          <h2 className="quick-quote-section__title">Xem trước báo giá</h2>
          <p className="admin-field-hint">
            <strong>{party.customerCompany}</strong>
            {party.customerContactName ? ` · ${party.customerContactName}` : ""}
            {party.customerPhone ? ` · ${party.customerPhone}` : ""}
          </p>
          <ul className="quick-quote-preview-list">
            {items.map((item) => (
              <li key={item.key}>
                <span>
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ""} ×{" "}
                  {item.quantity}
                </span>
                <strong>
                  {formatQuoteCurrency((item.unitPrice ?? 0) * item.quantity)}
                </strong>
              </li>
            ))}
          </ul>
          <QuoteTotalsSummary totals={preview.totals} />
          <div className="admin-field" style={{ marginTop: 12 }}>
            <label className="admin-label">Nhân viên tư vấn</label>
            <select
              className="admin-input"
              value={commercial.salesRepresentativeId}
              onChange={(e) => {
                const id = e.target.value;
                const employee = salesEmployees.find((emp) => emp.id === id);
                if (employee) applySalesEmployee(employee);
                else
                  setCommercial((prev) => ({
                    ...prev,
                    salesRepresentativeId: "",
                    salesName: "",
                  }));
              }}
            >
              <option value="">—</option>
              {salesEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--xs"
            onClick={() => setStep("products")}
          >
            Sửa sản phẩm
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-btn--xs"
            onClick={() => setStep("customer")}
          >
            Sửa khách hàng
          </button>
        </section>
      )}

      {step === "success" && createdQuote && (
        <section className="quick-quote-success">
          <h2 className="quick-quote-section__title">Đã tạo báo giá {createdQuote.quoteNo}</h2>
          <p className="admin-field-hint">
            Bạn có thể gửi link hoặc PDF cho khách ngay bây giờ.
          </p>
          <div className="quick-quote-success__actions">
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void copyPublicLink(createdQuote)}
            >
              {copied ? "Đã sao chép!" : "Sao chép link"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => void sharePublicLink(createdQuote)}
            >
              Chia sẻ
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => openQuotePdfInlineAdmin(createdQuote.id)}
            >
              Xem PDF
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => router.push(`/admin/quotes/${createdQuote.id}`)}
            >
              Xem chi tiết
            </button>
            <Link href="/admin/quotes/new" className="admin-btn admin-btn--ghost">
              Form đầy đủ
            </Link>
          </div>
        </section>
      )}

      {step !== "success" && (
        <div className="quick-quote-footer">
          <div className="quick-quote-footer__total">
            <span className="quick-quote-footer__total-label">Tổng tạm tính</span>
            <span className="quick-quote-footer__total-value">
              {formatQuoteCurrency(
                preview.totals.manualOverride && preview.totals.manualTotalAmount != null
                  ? preview.totals.manualTotalAmount
                  : preview.totals.totalAmount,
              )}
            </span>
          </div>
          <div className="quick-quote-footer__actions">
            {step === "products" && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setStep("customer")}
              >
                Quay lại
              </button>
            )}
            {step === "preview" && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setStep("products")}
              >
                Quay lại
              </button>
            )}
            {step === "customer" && (
              <AdminLoadingButton variant="primary" onClick={goToProducts}>
                Tiếp tục
              </AdminLoadingButton>
            )}
            {step === "products" && (
              <AdminLoadingButton variant="primary" onClick={goToPreview}>
                Xem trước
              </AdminLoadingButton>
            )}
            {step === "preview" && (
              <AdminLoadingButton
                variant="primary"
                pending={submitting}
                pendingLabel="Đang tạo báo giá…"
                onClick={() => void handleCreate()}
              >
                Tạo báo giá
              </AdminLoadingButton>
            )}
            <Link href="/admin/quotes/new" className="admin-btn admin-btn--ghost">
              Form đầy đủ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
