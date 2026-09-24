"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickQuoteMobileActionBar from "@/components/admin/quotes/QuickQuoteMobileActionBar";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { useAdminToast } from "@/hooks/useAdminToast";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import {
  contactToQuoteSnapshots,
  customerToQuoteSnapshots,
} from "@/features/quotes/quote-party-utils";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { formatQuoteCurrency, toDateInputValue } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import {
  downloadQuotePdfFromApi,
  quotePdfDownloadFilename,
} from "@/features/quotes/pdf/download-quote-pdf.client";
import { openQuotePdfInlineAdmin } from "@/features/quotes/pdf/open-quote-pdf.client";
import { getQuotePublicUrl } from "@/features/quotes/quote-public-link.shared";
import type { CalculatePricingResult, PriceGroupRecord } from "@/features/pricing/types";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import type { QuoteItemInput } from "@/features/quotes/types";
import {
  buildPricingCalculatePayload,
  mergeLineNotes,
  pricingResultToQuoteItems,
  validateQuickQuoteLine,
} from "@/features/quotes/quick-quote/quick-quote-mapper";
import {
  clearQuickQuoteDraft,
  loadQuickQuoteDraft,
  saveQuickQuoteDraft,
  trackRecentProductIds,
} from "@/features/quotes/quick-quote/quick-quote-draft";
import {
  createEmptyQuickQuoteLine,
  type QuickQuoteLineRow,
  type QuickQuoteStep,
} from "@/features/quotes/quick-quote/quick-quote.types";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";
import "@/styles/quick-quote.css";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  sizeName: string | null;
};
type RecentCustomer = { id: string; name: string; phone: string | null };

type Props = {
  prefillParams?: {
    leadId?: string;
    customerId?: string;
  };
};

const STEPS: Array<{ id: QuickQuoteStep; label: string }> = [
  { id: "customer", label: "Khách hàng" },
  { id: "products", label: "Sản phẩm" },
  { id: "commercial", label: "Thương mại" },
  { id: "preview", label: "Xem trước" },
];

type CreatedQuote = {
  id: string;
  quoteNo: string;
  publicShortCode: string | null;
};

function readInitialDraft(prefillParams?: Props["prefillParams"]) {
  if (prefillParams?.leadId || prefillParams?.customerId) return null;
  return loadQuickQuoteDraft();
}

export default function QuickQuoteForm({ prefillParams }: Props) {
  const mutate = useAdminMutation();
  const toast = useAdminToast();
  const initialDraft = readInitialDraft(prefillParams);

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<QuickQuoteStep>(() => {
    if (!initialDraft) return "customer";
    return initialDraft.step === "success" ? "preview" : initialDraft.step;
  });
  const [error, setError] = useState<string | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdQuote, setCreatedQuote] = useState<CreatedQuote | null>(null);
  const [copied, setCopied] = useState(false);

  const [sourceType, setSourceType] = useState("MANUAL");
  const [leadId, setLeadId] = useState(() => initialDraft?.leadId ?? "");
  const [customerId, setCustomerId] = useState(() => initialDraft?.customerId ?? "");
  const [contactId, setContactId] = useState(() => initialDraft?.contactId ?? "");
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);

  const [customerCompany, setCustomerCompany] = useState(() => initialDraft?.customerCompany ?? "");
  const [customerContactName, setCustomerContactName] = useState(
    () => initialDraft?.customerContactName ?? "",
  );
  const [customerPhone, setCustomerPhone] = useState(() => initialDraft?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(() => initialDraft?.customerEmail ?? "");

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [priceGroups, setPriceGroups] = useState<PriceGroupRecord[]>([]);
  const [priceGroupId, setPriceGroupId] = useState("");
  const [lines, setLines] = useState<QuickQuoteLineRow[]>(
    () => initialDraft?.lines ?? [createEmptyQuickQuoteLine()],
  );
  const [recentProductIds, setRecentProductIds] = useState<string[]>(
    () => initialDraft?.recentProductIds ?? [],
  );
  const [calculatedItems, setCalculatedItems] = useState<QuoteItemInput[]>([]);
  const [pricingWarnings, setPricingWarnings] = useState<string[]>([]);

  const [discountAmount, setDiscountAmount] = useState(() => initialDraft?.discountAmount ?? "0");
  const [shippingFee, setShippingFee] = useState(() => initialDraft?.shippingFee ?? "0");
  const [vatRate, setVatRate] = useState(() => initialDraft?.vatRate ?? "8");
  const [customerNote, setCustomerNote] = useState(() => initialDraft?.customerNote ?? "");
  const [validUntil, setValidUntil] = useState(() => initialDraft?.validUntil ?? "");
  const [salesRepresentativeId, setSalesRepresentativeId] = useState(
    () => initialDraft?.salesRepresentativeId ?? "",
  );
  const [salesName, setSalesName] = useState("");
  const [salesTitle, setSalesTitle] = useState("");
  const [salesPhone, setSalesPhone] = useState("");
  const [salesEmail, setSalesEmail] = useState("");

  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        sublabel: p.productCode ?? undefined,
      })),
    [products],
  );

  const preview = useMemo(
    () =>
      computeQuoteFromItems(calculatedItems, {
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
      }),
    [calculatedItems, discountAmount, shippingFee, vatRate],
  );

  const recentProducts = useMemo(
    () =>
      recentProductIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is ProductOption => Boolean(p)),
    [recentProductIds, products],
  );

  const applySalesEmployee = useCallback((employee: EmployeeRecord) => {
    setSalesRepresentativeId(employee.id);
    setSalesName(employee.fullName);
    setSalesTitle(employee.jobTitle ?? "");
    setSalesPhone(employee.phone ?? "");
    setSalesEmail(employee.email ?? "");
  }, []);

  const loadCustomerContacts = useCallback(async (id: string) => {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    setContacts(data.contacts ?? []);
  }, []);

  const applyCustomer = useCallback(
    (customer: CrmCustomerRecord) => {
      const snapshots = customerToQuoteSnapshots(customer);
      setSelectedCustomer(customer);
      setCustomerId(customer.id);
      setCustomerCompany(snapshots.customerCompanySnapshot ?? "");
      setCustomerContactName("");
      setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
      setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
      setContactId("");
      void loadCustomerContacts(customer.id);
    },
    [loadCustomerContacts],
  );

  const applyContact = useCallback(
    (contact: CrmContactRecord) => {
      const snapshots = contactToQuoteSnapshots(contact, {
        phone: selectedCustomer?.phone,
        email: selectedCustomer?.email,
      });
      setContactId(contact.id);
      setCustomerContactName(snapshots.customerContactNameSnapshot ?? "");
      setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
      setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
    },
    [selectedCustomer],
  );

  const loadVariants = useCallback(async (productId: string) => {
    if (!productId || variantsMap[productId]) return;
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = (await res.json()) as { variants?: VariantOption[] };
    setVariantsMap((prev) => ({ ...prev, [productId]: data.variants ?? [] }));
  }, [variantsMap]);

  const persistDraft = useCallback(() => {
    saveQuickQuoteDraft({
      version: 1,
      step,
      leadId,
      customerId,
      contactId,
      customerCompany,
      customerContactName,
      customerPhone,
      customerEmail,
      lines,
      discountAmount,
      shippingFee,
      vatRate,
      customerNote,
      validUntil,
      salesRepresentativeId,
      recentProductIds,
      updatedAt: new Date().toISOString(),
    });
  }, [
    step,
    leadId,
    customerId,
    contactId,
    customerCompany,
    customerContactName,
    customerPhone,
    customerEmail,
    lines,
    discountAmount,
    shippingFee,
    vatRate,
    customerNote,
    validUntil,
    salesRepresentativeId,
    recentProductIds,
  ]);

  useEffect(() => {
    const timer = setTimeout(persistDraft, 400);
    return () => clearTimeout(timer);
  }, [persistDraft]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=300").then((r) => r.json()),
      fetch("/api/pricing/price-groups").then((r) => r.json()),
      fetch("/api/crm/customers?limit=8").then((r) => r.json()),
      fetch("/api/employees?active=1&role=SALES&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=ADMIN&limit=200").then((r) => r.json()),
    ]).then(([productsData, groupsData, customersData, salesData, adminData]) => {
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
      const groups = (groupsData as { priceGroups?: PriceGroupRecord[] }).priceGroups ?? [];
      setPriceGroups(groups);
      const defaultGroup = groups.find((g) => g.isDefault);
      if (defaultGroup) setPriceGroupId(defaultGroup.id);
      setRecentCustomers(
        ((customersData as { customers?: RecentCustomer[] }).customers ?? []).slice(0, 8),
      );
      const sales = (salesData as { employees?: EmployeeRecord[] }).employees ?? [];
      const admins = (adminData as { employees?: EmployeeRecord[] }).employees ?? [];
      const merged = [...sales];
      for (const admin of admins) {
        if (!merged.some((e) => e.id === admin.id)) merged.push(admin);
      }
      setSalesEmployees(merged);
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (initialDraft?.customerId) {
        void fetch(`/api/crm/customers/${initialDraft.customerId}`)
          .then((r) => r.json())
          .then((data: { customer?: CrmCustomerRecord }) => {
            if (data.customer) {
              setSelectedCustomer(data.customer);
              void loadCustomerContacts(data.customer.id);
            }
          });
      }

      const params = new URLSearchParams();
      if (prefillParams?.leadId) params.set("leadId", prefillParams.leadId);
      if (prefillParams?.customerId) params.set("customerId", prefillParams.customerId);

      void fetch(`/api/quotes/prefill?${params}`)
        .then(async (res) => {
          const data = (await res.json()) as { prefill?: Record<string, unknown> };
          const p = data.prefill;
          if (!p) return;
          setSourceType(String(p.sourceType ?? "MANUAL"));
          setLeadId((p.leadId as string) ?? "");
          const cid = (p.customerId as string) ?? "";
          setCustomerId(cid);
          setContactId((p.contactId as string) ?? "");
          setCustomerCompany(String(p.customerCompanySnapshot ?? ""));
          setCustomerContactName(String(p.customerContactNameSnapshot ?? ""));
          setCustomerPhone(String(p.customerPhoneSnapshot ?? ""));
          setCustomerEmail(String(p.customerEmailSnapshot ?? ""));
          setSalesRepresentativeId((p.salesRepresentativeId as string) ?? "");
          setSalesName(String(p.salesName ?? ""));
          setSalesTitle(String(p.salesTitleSnapshot ?? ""));
          setSalesPhone(String(p.salesPhone ?? ""));
          setSalesEmail(String(p.salesEmail ?? ""));
          setDiscountAmount(String(p.discountAmount ?? 0));
          setShippingFee(String(p.shippingFee ?? 0));
          setVatRate(String(p.vatRate ?? 8));
          setValidUntil(toDateInputValue(p.validUntil as string));
          const rawItems = Array.isArray(p.items)
            ? (p.items as Array<Record<string, unknown>>)
            : [];
          if (rawItems.length) {
            setLines(
              rawItems.map((item) => ({
                key: crypto.randomUUID(),
                productId: (item.productId as string) ?? "",
                variantId: (item.variantId as string) ?? "",
                quantity: String(item.quantity ?? 100),
                itemNote: String(item.itemNote ?? ""),
                manualUnitPrice:
                  item.unitPrice != null && Number(item.unitPrice) > 0
                    ? String(item.unitPrice)
                    : "",
              })),
            );
          }
          if (cid) {
            void fetch(`/api/crm/customers/${cid}`)
              .then((r) => r.json())
              .then((data: { customer?: CrmCustomerRecord }) => {
                if (data.customer) {
                  setSelectedCustomer(data.customer);
                  void loadCustomerContacts(data.customer.id);
                }
              });
          }
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [prefillParams, loadCustomerContacts, initialDraft?.customerId]);

  const runPricing = useCallback(async (): Promise<boolean> => {
    const activeLines = lines.filter((line) => line.productId.trim());
    if (!activeLines.length) {
      setError("Thêm ít nhất một sản phẩm");
      return false;
    }
    for (const line of activeLines) {
      const validationError = validateQuickQuoteLine(line);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }

    setPricingBusy(true);
    setError(null);
    try {
      const payload = buildPricingCalculatePayload({
        leadId: leadId || undefined,
        customerId: customerId || undefined,
        contactId: contactId || undefined,
        priceGroupId: priceGroupId || undefined,
        lines: activeLines,
        discountAmount,
        shippingFee,
        vatRate,
      });
      const res = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        result?: CalculatePricingResult;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tính giá");
      const result = data.result;
      if (!result) throw new Error("Không nhận được kết quả tính giá");
      const mapped = mergeLineNotes(pricingResultToQuoteItems(result), activeLines);
      setCalculatedItems(mapped);
      setPricingWarnings(result.warnings ?? []);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tính giá");
      return false;
    } finally {
      setPricingBusy(false);
    }
  }, [
    lines,
    leadId,
    customerId,
    contactId,
    priceGroupId,
    discountAmount,
    shippingFee,
    vatRate,
  ]);

  function validateCustomerStep(): boolean {
    const hasCustomer =
      customerId.trim() ||
      customerCompany.trim() ||
      customerContactName.trim() ||
      customerPhone.trim() ||
      customerEmail.trim();
    if (!hasCustomer) {
      setError("Chọn khách hàng hoặc nhập tên/công ty và liên hệ tối thiểu");
      return false;
    }
    setError(null);
    return true;
  }

  function validateProductsStep(): boolean {
    const activeLines = lines.filter((line) => line.productId.trim());
    if (!activeLines.length) {
      setError("Thêm ít nhất một sản phẩm");
      return false;
    }
    for (const line of activeLines) {
      const validationError = validateQuickQuoteLine(line);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function goNext() {
    if (step === "customer") {
      if (!validateCustomerStep()) return;
      setStep("products");
      return;
    }
    if (step === "products") {
      if (!validateProductsStep()) return;
      const ok = await runPricing();
      if (!ok) return;
      setStep("commercial");
      return;
    }
    if (step === "commercial") {
      const ok = await runPricing();
      if (!ok) return;
      setStep("preview");
      return;
    }
  }

  function goBack() {
    if (step === "products") setStep("customer");
    else if (step === "commercial") setStep("products");
    else if (step === "preview") setStep("commercial");
  }

  function updateLine(index: number, patch: Partial<QuickQuoteLineRow>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    if (patch.productId) {
      setRecentProductIds((prev) => trackRecentProductIds(prev, patch.productId!));
      void loadVariants(patch.productId);
    }
  }

  function buildCreatePayload(status: "DRAFT" | "SENT") {
    return {
      sourceType,
      leadId: leadId || null,
      customerId: customerId || null,
      contactId: contactId || null,
      priceGroupId: priceGroupId || null,
      status,
      title: "Báo giá sản phẩm ATTD",
      validUntil: validUntil || null,
      quoteDate: toDateInputValue(new Date().toISOString()),
      currency: "VND",
      priceVatType: "EXCLUDING_VAT" as const,
      customerCompanySnapshot: customerCompany || null,
      customerContactNameSnapshot: customerContactName || null,
      customerPhoneSnapshot: customerPhone || null,
      customerEmailSnapshot: customerEmail || null,
      salesRepresentativeId: salesRepresentativeId || null,
      salesName: salesName || null,
      salesTitleSnapshot: salesTitle || null,
      salesPhone: salesPhone || null,
      salesEmail: salesEmail || null,
      discountAmount: Number(discountAmount) || 0,
      shippingFee: Number(shippingFee) || 0,
      vatRate: Number(vatRate) || 0,
      customerNote: customerNote || null,
      terms: DEFAULT_QUOTE_TERMS,
      items: calculatedItems,
    };
  }

  async function handleCreate(sendToCustomer = false) {
    if (!calculatedItems.length) {
      const ok = await runPricing();
      if (!ok) return;
    }
    setSubmitting(true);
    setError(null);
    const payload = buildCreatePayload(sendToCustomer ? "SENT" : "DRAFT");
    const saved = await mutate({
      loadingMessage: "Đang tạo báo giá…",
      successMessage: sendToCustomer ? "Đã tạo và gửi báo giá." : "Đã tạo báo giá.",
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
      setError("Không thể tạo báo giá");
      return;
    }
    clearQuickQuoteDraft();
    setCreatedQuote(saved);
    setStep("success");
  }

  function publicUrl() {
    if (!createdQuote?.quoteNo || !createdQuote.publicShortCode) return null;
    return getQuotePublicUrl(
      { quoteNo: createdQuote.quoteNo, publicShortCode: createdQuote.publicShortCode },
      typeof window === "undefined" ? undefined : window.location.origin,
    );
  }

  async function copyLink() {
    const url = publicUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Đã sao chép link báo giá");
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    const url = publicUrl();
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Báo giá ${createdQuote?.quoteNo ?? ""}`,
          text: "Báo giá từ ATTD",
          url,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyLink();
  }

  async function viewPdf() {
    if (!createdQuote) return;
    try {
      await openQuotePdfInlineAdmin(createdQuote.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể mở PDF");
    }
  }

  async function downloadPdf() {
    if (!createdQuote) return;
    try {
      await downloadQuotePdfFromApi(
        `/api/quotes/${createdQuote.id}/pdf`,
        quotePdfDownloadFilename(createdQuote.quoteNo),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tải PDF");
    }
  }

  if (loading) {
    return (
      <SectionLoading
        title="Đang chuẩn bị báo giá nhanh..."
        description="Hệ thống đang tải khách hàng, sản phẩm và cấu hình giá."
        tone="admin"
      />
    );
  }

  if (step === "success" && createdQuote) {
    const url = publicUrl();
    return (
      <div className="quick-quote">
        <div className="quick-quote__header">
          <h1 className="quick-quote__header-title">Báo giá đã tạo</h1>
          <div className="quick-quote__header-links">
            <Link href={`/admin/quotes/${createdQuote.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
              Xem chi tiết
            </Link>
          </div>
        </div>
        <div className="quick-quote__card">
          <p className="admin-field-hint" style={{ marginTop: 0 }}>
            Mã báo giá <strong>{createdQuote.quoteNo}</strong>
            {url ? (
              <>
                {" "}
                ·{" "}
                <a href={url} target="_blank" rel="noreferrer">
                  Link công khai
                </a>
              </>
            ) : null}
          </p>
          <div className="quick-quote__success-actions">
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void viewPdf()}>
              Xem PDF
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void downloadPdf()}>
              Tải PDF
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void copyLink()}>
              {copied ? "Đã sao chép" : "Sao chép link"}
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void shareLink()}>
              Chia sẻ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <form
      className="quick-quote"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "preview") void handleCreate(false);
        else void goNext();
      }}
    >
      <div className="quick-quote__header">
        <h1 className="quick-quote__header-title">Báo giá nhanh</h1>
        <div className="quick-quote__header-links">
          <Link href="/admin/quotes/new" className="admin-btn admin-btn--secondary admin-btn--small">
            Báo giá đầy đủ
          </Link>
          <Link href="/admin/quotes" className="admin-btn admin-btn--secondary admin-btn--small">
            Danh sách
          </Link>
        </div>
      </div>

      <div className="quick-quote__steps" aria-label="Các bước tạo báo giá">
        {STEPS.map((s, index) => (
          <div
            key={s.id}
            className={[
              "quick-quote__step",
              step === s.id ? "quick-quote__step--active" : "",
              index < stepIndex ? "quick-quote__step--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {s.label}
          </div>
        ))}
      </div>

      {error && <p className="admin-error">{error}</p>}
      {pricingWarnings.length > 0 && (
        <p className="admin-field-hint" style={{ color: "var(--admin-warning, #b45309)" }}>
          {pricingWarnings.join(" · ")}
        </p>
      )}

      {step === "customer" && (
        <div className="quick-quote__card">
          <h2 className="quick-quote__card-title">Khách hàng</h2>
          <CustomerSearchField
            value={selectedCustomer}
            onSelect={(customer) => {
              if (customer) applyCustomer(customer);
              else {
                setSelectedCustomer(null);
                setCustomerId("");
                setContactId("");
                setContacts([]);
              }
            }}
            allowQuickCreate
            quickCreateContextLabel="báo giá nhanh"
            onContactSelect={(contact) => {
              if (contact) applyContact(contact);
            }}
          />
          {recentCustomers.length > 0 && (
            <>
              <p className="admin-label" style={{ marginTop: 16 }}>
                Khách gần đây
              </p>
              <div className="quick-quote__chips">
                {recentCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="quick-quote__chip"
                    onClick={() => {
                      void fetch(`/api/crm/customers/${c.id}`)
                        .then((r) => r.json())
                        .then((data: { customer?: CrmCustomerRecord }) => {
                          if (data.customer) applyCustomer(data.customer);
                        });
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
            <div className="admin-field">
              <label className="admin-label">Công ty / Khách hàng</label>
              <input
                className="admin-input"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="Tên công ty hoặc cá nhân"
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Người liên hệ</label>
              <input
                className="admin-input"
                value={customerContactName}
                onChange={(e) => setCustomerContactName(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Điện thoại</label>
              <input
                className="admin-input"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input
                className="admin-input"
                inputMode="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
            {contacts.length > 0 && (
              <div className="admin-field">
                <label className="admin-label">Liên hệ CRM</label>
                <select
                  className="admin-input"
                  value={contactId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setContactId(id);
                    const contact = contacts.find((c) => c.id === id);
                    if (contact) applyContact(contact);
                  }}
                >
                  <option value="">— Chọn liên hệ —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {salesEmployees.length > 0 && (
              <div className="admin-field">
                <label className="admin-label">Nhân viên kinh doanh</label>
                <select
                  className="admin-input"
                  value={salesRepresentativeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const employee = salesEmployees.find((emp) => emp.id === id);
                    if (employee) applySalesEmployee(employee);
                    else setSalesRepresentativeId("");
                  }}
                >
                  <option value="">— Chọn —</option>
                  {salesEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "products" && (
        <div className="quick-quote__card">
          <h2 className="quick-quote__card-title">Sản phẩm</h2>
          {recentProducts.length > 0 && (
            <>
              <p className="admin-label">Sản phẩm thường dùng</p>
              <div className="quick-quote__chips">
                {recentProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="quick-quote__chip"
                    onClick={() => {
                      setLines((prev) => {
                        const emptyIndex = prev.findIndex((line) => !line.productId);
                        if (emptyIndex >= 0) {
                          const next = [...prev];
                          next[emptyIndex] = { ...next[emptyIndex], productId: p.id, variantId: "" };
                          return next;
                        }
                        return [...prev, { ...createEmptyQuickQuoteLine(), productId: p.id }];
                      });
                      setRecentProductIds((prev) => trackRecentProductIds(prev, p.id));
                      void loadVariants(p.id);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {lines.map((line, index) => {
            const variants = line.productId ? variantsMap[line.productId] ?? [] : [];
            return (
              <div key={line.key} className="quick-quote__line-card">
                <div className="quick-quote__line-header">
                  <strong>Dòng #{index + 1}</strong>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <div className="admin-seo-brief-form-grid">
                  <div className="admin-field">
                    <label className="admin-label">Sản phẩm</label>
                    <AdminSearchableSelect
                      value={line.productId}
                      onChange={(value) => updateLine(index, { productId: value, variantId: "" })}
                      options={productOptions}
                      placeholder="Tìm sản phẩm..."
                      searchPlaceholder="Tên, mã SKU..."
                    />
                  </div>
                  {variants.length > 0 && (
                    <div className="admin-field">
                      <label className="admin-label">Biến thể</label>
                      <select
                        className="admin-input"
                        value={line.variantId}
                        onChange={(e) => updateLine(index, { variantId: e.target.value })}
                      >
                        <option value="">— Mặc định —</option>
                        {variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {[v.colorName, v.sizeName].filter(Boolean).join(" / ") || v.sku}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="admin-field">
                    <label className="admin-label">Số lượng</label>
                    <input
                      className="admin-input"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label className="admin-label">Ghi chú / Tùy chỉnh</label>
                    <input
                      className="admin-input"
                      value={line.itemNote}
                      onChange={(e) => updateLine(index, { itemNote: e.target.value })}
                      placeholder="VD: In logo ngực trái"
                    />
                  </div>
                  <details className="quick-quote__advanced admin-field">
                    <summary>Giá thủ công (nếu cần)</summary>
                    <input
                      className="admin-input"
                      inputMode="decimal"
                      value={line.manualUnitPrice}
                      onChange={(e) => updateLine(index, { manualUnitPrice: e.target.value })}
                      placeholder="Để trống = tính theo bảng giá"
                      style={{ marginTop: 8 }}
                    />
                  </details>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => setLines((prev) => [...prev, createEmptyQuickQuoteLine()])}
          >
            + Thêm sản phẩm
          </button>
        </div>
      )}

      {step === "commercial" && (
        <div className="quick-quote__card">
          <h2 className="quick-quote__card-title">Thông tin thương mại</h2>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Chiết khấu (VND)</label>
              <input
                className="admin-input"
                inputMode="decimal"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Phí vận chuyển (VND)</label>
              <input
                className="admin-input"
                inputMode="decimal"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">VAT (%)</label>
              <input
                className="admin-input"
                inputMode="decimal"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
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
            <div className="admin-field admin-field--full">
              <label className="admin-label">Ghi chú cho khách</label>
              <textarea
                className="admin-input"
                rows={3}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
            {priceGroups.length > 1 && (
              <div className="admin-field">
                <label className="admin-label">Nhóm giá</label>
                <select
                  className="admin-input"
                  value={priceGroupId}
                  onChange={(e) => setPriceGroupId(e.target.value)}
                >
                  {priceGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <QuoteTotalsSummary totals={preview.totals} />
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="quick-quote__card">
          <h2 className="quick-quote__card-title">Xem trước</h2>
          <p className="admin-field-hint">
            <strong>{customerCompany || customerContactName || "Khách hàng"}</strong>
            {customerPhone ? ` · ${customerPhone}` : ""}
            {customerEmail ? ` · ${customerEmail}` : ""}
          </p>
          <div className="quick-quote__preview-list">
            {preview.items.map((item, index) => (
              <div key={`${item.productId}-${index}`} className="quick-quote__preview-item">
                <div>
                  <strong>{item.productNameSnapshot || "Sản phẩm"}</strong>
                  {item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ""}
                  <div className="admin-field-hint">
                    {item.quantity} {item.unit ?? "cái"}
                    {item.itemNote ? ` · ${item.itemNote}` : ""}
                  </div>
                </div>
                <div>{formatQuoteCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>
          <QuoteTotalsSummary totals={preview.totals} />
          <div className="quick-quote__desktop-actions" style={{ marginTop: 12 }}>
            <AdminLoadingButton
              variant="secondary"
              pending={submitting}
              pendingLabel="Đang tạo..."
              onClick={() => void handleCreate(true)}
            >
              Gửi khách
            </AdminLoadingButton>
            <AdminLoadingButton
              variant="primary"
              pending={submitting}
              pendingLabel="Đang tạo..."
              onClick={() => void handleCreate(false)}
            >
              Tạo báo giá
            </AdminLoadingButton>
          </div>
        </div>
      )}

      {(step === "products" || step === "commercial" || step === "preview") && (
        <div className="quick-quote__sticky-total" aria-live="polite">
          <div className="quick-quote__sticky-total-row">
            <span>Tổng cộng</span>
            <strong>{formatQuoteCurrency(preview.totals.totalAmount)}</strong>
          </div>
        </div>
      )}

      <div className="quick-quote__desktop-actions">
        {step !== "customer" && (
          <button type="button" className="admin-btn admin-btn--secondary" onClick={goBack}>
            Quay lại
          </button>
        )}
        {step === "preview" ? (
          <>
            <AdminLoadingButton
              variant="secondary"
              pending={submitting || pricingBusy}
              pendingLabel="Đang xử lý..."
              onClick={() => void handleCreate(true)}
            >
              Gửi khách
            </AdminLoadingButton>
            <AdminLoadingButton
              variant="primary"
              type="submit"
              pending={submitting || pricingBusy}
              pendingLabel="Đang tạo..."
            >
              Tạo báo giá
            </AdminLoadingButton>
          </>
        ) : (
          <AdminLoadingButton
            variant="primary"
            type="submit"
            pending={pricingBusy}
            pendingLabel="Đang tính giá..."
          >
            {step === "customer" ? "Tiếp theo" : step === "products" ? "Tính giá & tiếp" : "Xem trước"}
          </AdminLoadingButton>
        )}
      </div>

      <QuickQuoteMobileActionBar
        showBack={step !== "customer"}
        onBack={goBack}
        primaryLabel={
          step === "preview"
            ? "Tạo báo giá"
            : step === "customer"
              ? "Tiếp theo"
              : step === "products"
                ? "Tính giá & tiếp"
                : "Xem trước"
        }
        primaryType="submit"
        primaryDisabled={submitting || pricingBusy}
        secondaryLabel={step === "preview" ? "Gửi khách" : undefined}
        onSecondary={step === "preview" ? () => void handleCreate(true) : undefined}
      />
    </form>
  );
}
