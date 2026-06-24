"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickOrderGrid from "@/components/admin/orders/QuickOrderGrid";
import OrderTotalsSummary from "@/components/admin/orders/OrderTotalsSummary";
import { contactToQuoteSnapshots, customerToQuoteSnapshots } from "@/features/quotes/quote-party-utils";
import { toDateInputValue } from "@/features/quotes/format";
import { computeOrderItem, computeOrderTotals } from "@/features/orders/order-totals";
import { quickOrderRowsToOrderItems, validateQuickOrderRow } from "@/features/orders/quick-order/quick-order-mapper";
import {
  applyRevenueCategoriesToImportedRows,
  downloadQuickOrderTemplate,
  parseQuickOrderClipboard,
  parseQuickOrderWorkbook,
  type QuickOrderImportSummary,
} from "@/features/orders/quick-order/quick-order-excel";
import {
  clearQuickOrderDraft,
  loadQuickOrderDraft,
  saveQuickOrderDraft,
} from "@/features/orders/quick-order/quick-order-draft";
import {
  createEmptyQuickOrderRow,
  type QuickOrderGridRow,
  type QuickOrderHeaderState,
} from "@/features/orders/quick-order/quick-order.types";
import { isProcessingWithDecoration } from "@/features/orders/order-item-classification";
import type { RevenueCategoryPickerOption } from "@/features/revenue-categories/revenue-category.service";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import "@/styles/quick-order-grid.css";

type ProductListItem = {
  id: string;
  name: string;
  productCode: string | null;
  hasStockVariants?: boolean;
};

function defaultHeader(): QuickOrderHeaderState {
  return {
    customerId: null,
    contactId: null,
    salesEmployeeId: null,
    orderDate: toDateInputValue(new Date().toISOString()),
    currency: "VND",
    priceVatType: "EXCLUDING_VAT",
    customerNote: "",
    internalNote: "",
    productionDueDate: "",
    productionOwnerId: null,
  };
}

export default function QuickOrderForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [header, setHeader] = useState<QuickOrderHeaderState>(defaultHeader);
  const [rows, setRows] = useState<QuickOrderGridRow[]>([createEmptyQuickOrderRow()]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryPickerOption[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);
  const [productionEmployees, setProductionEmployees] = useState<EmployeeRecord[]>([]);
  const [productColorsByProductId, setProductColorsByProductId] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerTaxCode, setCustomerTaxCode] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactTitle, setContactTitle] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [shippingFee, setShippingFee] = useState("0");
  const [vatRate, setVatRate] = useState("8");
  const [importSummary, setImportSummary] = useState<QuickOrderImportSummary | null>(null);
  const [revenueSuggestionRowKey, setRevenueSuggestionRowKey] = useState<string | null>(null);
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useAdminToast();

  const computedItems = useMemo(
    () => quickOrderRowsToOrderItems(rows).map((item) => computeOrderItem(item)),
    [rows],
  );
  const totals = useMemo(
    () =>
      computeOrderTotals(computedItems, {
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
      }),
    [computedItems, discountAmount, shippingFee, vatRate],
  );

  const loadProductColors = useCallback(async (productId: string) => {
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = (await res.json()) as {
      product?: { variants?: Array<{ colorName?: string | null; colorId?: string | null }> };
    };
    const variants = data.product?.variants ?? [];
    const colorMap = new Map<string, { id: string; name: string }>();
    for (const variant of variants) {
      const name = variant.colorName?.trim();
      if (!name) continue;
      const id = variant.colorId?.trim() || `name:${name.toLowerCase()}`;
      colorMap.set(id, { id, name });
    }
    setProductColorsByProductId((prev) => ({
      ...prev,
      [productId]: Array.from(colorMap.values()),
    }));
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, hasStockVariants: variants.some((v) => (v as { stockQty?: number }).stockQty != null) }
          : product,
      ),
    );
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=300").then((r) => r.json()),
      fetch("/api/admin/revenue-categories?picker=1").then((r) => r.json()),
      fetch("/api/employees?active=1&role=SALES&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=PRODUCTION&limit=200").then((r) => r.json()),
    ]).then(([productsData, revenueData, salesData, productionData]) => {
      const list = (productsData as { products?: ProductListItem[] }).products ?? [];
      setProducts(list.map((p) => ({ ...p, hasStockVariants: false })));
      setRevenueCategories((revenueData as RevenueCategoryPickerOption[]) ?? []);
      setSalesEmployees((salesData as { employees?: EmployeeRecord[] }).employees ?? []);
      setProductionEmployees((productionData as { employees?: EmployeeRecord[] }).employees ?? []);
    });

    const draft = loadQuickOrderDraft();
    if (draft) {
      setHeader(draft.header);
      setRows(draft.rows.length ? draft.rows : [createEmptyQuickOrderRow()]);
      setDiscountAmount(String(draft.discountAmount ?? 0));
      setShippingFee(String(draft.shippingFee ?? 0));
      setVatRate(String(draft.vatRate ?? 8));
      setDraftToast("Đã khôi phục bản nháp chưa lưu.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveQuickOrderDraft({
        header,
        rows,
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
        savedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [header, rows, discountAmount, shippingFee, vatRate]);

  function applyCustomer(
    customer: CrmCustomerRecord,
    options?: { contacts?: CrmContactRecord[] },
  ) {
    const snapshots = customerToQuoteSnapshots(customer);
    setSelectedCustomer(customer);
    setHeader((prev) => ({ ...prev, customerId: customer.id, contactId: null }));
    setCustomerCompany(snapshots.customerCompanySnapshot ?? customer.name);
    setCustomerCode(customer.code ?? "");
    setCustomerTaxCode(snapshots.customerTaxCodeSnapshot ?? "");
    setCustomerAddress(snapshots.customerAddressSnapshot ?? "");
    setContactName("");
    setContactTitle("");
    setContactPhone(snapshots.customerPhoneSnapshot ?? "");
    setContactEmail(snapshots.customerEmailSnapshot ?? "");
    if (options?.contacts) {
      setContacts(options.contacts);
    } else {
      void loadCustomerContacts(customer.id);
    }
  }

  async function loadCustomerContacts(id: string) {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    setContacts(data.contacts ?? []);
  }

  function applyContact(contact: CrmContactRecord) {
    const snapshots = contactToQuoteSnapshots(contact, {
      phone: selectedCustomer?.phone,
      email: selectedCustomer?.email,
    });
    setHeader((prev) => ({ ...prev, contactId: contact.id }));
    setContactName(snapshots.customerContactNameSnapshot ?? "");
    setContactTitle(snapshots.customerContactTitleSnapshot ?? "");
    setContactPhone(snapshots.customerPhoneSnapshot ?? "");
    setContactEmail(snapshots.customerEmailSnapshot ?? "");
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const summary = parseQuickOrderClipboard(
        text,
        products.map((p) => ({
          id: p.id,
          name: p.name,
          productCode: p.productCode,
          colors: productColorsByProductId[p.id] ?? [],
          hasStockVariants: Boolean(p.hasStockVariants),
        })),
      );
      const resolvedRows = applyRevenueCategoriesToImportedRows(summary.rows, revenueCategories);
      setRows(resolvedRows.length ? resolvedRows : [createEmptyQuickOrderRow()]);
      setImportSummary({ ...summary, rows: resolvedRows });
    } catch {
      setError("Không đọc được dữ liệu từ clipboard.");
    }
  }

  async function handleImportFile(file: File) {
    const buffer = await file.arrayBuffer();
    const summary = parseQuickOrderWorkbook(
      buffer,
      products.map((p) => ({
        id: p.id,
        name: p.name,
        productCode: p.productCode,
        colors: productColorsByProductId[p.id] ?? [],
        hasStockVariants: Boolean(p.hasStockVariants),
      })),
    );
    const resolvedRows = applyRevenueCategoriesToImportedRows(summary.rows, revenueCategories);
    setRows(resolvedRows.length ? resolvedRows : [createEmptyQuickOrderRow()]);
    setImportSummary({ ...summary, rows: resolvedRows, message: summary.message });
  }

  function validateAllRows(): boolean {
    let valid = true;
    const next = rows.map((row) => {
      const fieldErrors = validateQuickOrderRow(row);
      if (Object.keys(fieldErrors).length) valid = false;
      return { ...row, fieldErrors };
    });
    setRows(next);
    return valid;
  }

  async function handleSubmit() {
    setError(null);
    if (!customerCompany.trim()) {
      setError("Vui lòng chọn hoặc nhập thông tin khách hàng.");
      return;
    }
    if (!validateAllRows()) {
      setError("Vui lòng kiểm tra các dòng sản phẩm được đánh dấu.");
      return;
    }
    if (!computedItems.length) {
      setError("Vui lòng thêm ít nhất một dòng sản phẩm có số lượng.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: header.customerId,
        contactId: header.contactId,
        salesEmployeeId: header.salesEmployeeId,
        orderDate: header.orderDate,
        currency: header.currency,
        priceVatType: header.priceVatType,
        customerCompanyName: customerCompany,
        customerCode: customerCode || null,
        customerTaxCode: customerTaxCode || null,
        customerAddress: customerAddress || null,
        contactName: contactName || null,
        contactTitle: contactTitle || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        customerNote: header.customerNote || null,
        internalNote: header.internalNote || null,
        productionDueDate: header.productionDueDate || null,
        productionOwnerId: header.productionOwnerId,
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
        requireItemClassification: true,
        items: quickOrderRowsToOrderItems(rows),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await parseAdminJsonResponse(res, (body) => body.order as { id: string });
      if (!result.ok) throw new Error(result.message ?? "Không thể tạo đơn hàng.");
      if (!result.data?.id) throw new Error("Không thể tạo đơn hàng.");
      clearQuickOrderDraft();
      toast.success("Đã tạo đơn hàng.");
      router.push(`/admin/orders/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="quick-order-page">
      <div className="quick-order-page__top">
        <AdminBackLink href="/admin/orders" label="Quay lại danh sách đơn hàng" />
        <p className="quick-order-page__warning">Nhập đơn nhanh phù hợp nhất trên máy tính.</p>
      </div>

      {draftToast && <p className="admin-toast">{draftToast}</p>}
      {error && <p className="admin-error">{error}</p>}

      <fieldset className="admin-catalog-fieldset">
        <legend>Thông tin đơn hàng</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field admin-field--full">
            <label className="admin-label">Khách hàng</label>
            <CustomerSearchField
              value={selectedCustomer}
              onSelect={(customer) => {
                if (customer) applyCustomer(customer);
                else {
                  setSelectedCustomer(null);
                  setHeader((prev) => ({ ...prev, customerId: null, contactId: null }));
                  setContacts([]);
                }
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên công ty / khách hàng</label>
            <input className="admin-input" value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Người liên hệ</label>
            <select
              className="admin-input"
              value={header.contactId ?? ""}
              onChange={(e) => {
                const contact = contacts.find((c) => c.id === e.target.value);
                if (contact) applyContact(contact);
                else setHeader((prev) => ({ ...prev, contactId: e.target.value || null }));
              }}
            >
              <option value="">—</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.fullName}
                  {contact.title ? ` · ${contact.title}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Nhân viên tư vấn</label>
            <select
              className="admin-input"
              value={header.salesEmployeeId ?? ""}
              onChange={(e) => setHeader((prev) => ({ ...prev, salesEmployeeId: e.target.value || null }))}
            >
              <option value="">—</option>
              {salesEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Ngày đơn hàng</label>
            <input
              type="date"
              className="admin-input"
              value={header.orderDate}
              onChange={(e) => setHeader((prev) => ({ ...prev, orderDate: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Tiền tệ</label>
            <input className="admin-input" value={header.currency} onChange={(e) => setHeader((prev) => ({ ...prev, currency: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại giá VAT</label>
            <select
              className="admin-input"
              value={header.priceVatType}
              onChange={(e) =>
                setHeader((prev) => ({
                  ...prev,
                  priceVatType: e.target.value as QuickOrderHeaderState["priceVatType"],
                }))
              }
            >
              <option value="EXCLUDING_VAT">Chưa gồm VAT</option>
              <option value="INCLUDING_VAT">Đã gồm VAT</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Hạn sản xuất dự kiến</label>
            <input
              type="date"
              className="admin-input"
              value={header.productionDueDate}
              onChange={(e) => setHeader((prev) => ({ ...prev, productionDueDate: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Người phụ trách sản xuất</label>
            <select
              className="admin-input"
              value={header.productionOwnerId ?? ""}
              onChange={(e) => setHeader((prev) => ({ ...prev, productionOwnerId: e.target.value || null }))}
            >
              <option value="">—</option>
              {productionEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.fullName}</option>
              ))}
            </select>
          </div>
          <div className="admin-field admin-field--full">
            <label className="admin-label">Ghi chú đơn hàng</label>
            <textarea className="admin-textarea" rows={2} value={header.customerNote} onChange={(e) => setHeader((prev) => ({ ...prev, customerNote: e.target.value }))} />
          </div>
          <div className="admin-field admin-field--full">
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea className="admin-textarea" rows={2} value={header.internalNote} onChange={(e) => setHeader((prev) => ({ ...prev, internalNote: e.target.value }))} />
          </div>
        </div>
      </fieldset>

      <div className="quick-order-toolbar">
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setRows((prev) => [...prev, createEmptyQuickOrderRow(prev.length + 1)])}>
          Thêm dòng
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void handlePasteFromClipboard()}>
          Dán từ Excel
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => downloadQuickOrderTemplate()}>
          Tải mẫu Excel
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => fileInputRef.current?.click()}>
          Nhập file Excel
        </button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setRows([createEmptyQuickOrderRow()])}>
          Xóa toàn bộ dòng
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {importSummary && (
        <div className="quick-order-import-summary">
          <p>Đã nhập {importSummary.importedCount} dòng.</p>
          {importSummary.unresolvedProductCount > 0 && <p>Một số dòng cần chọn lại sản phẩm hoặc màu sắc.</p>}
          {importSummary.unresolvedRevenueCategoryCount > 0 && <p>Một số dòng cần chọn lại nhóm doanh thu.</p>}
          {importSummary.invalidQuantityCount > 0 && <p>Số lượng phải là số lớn hơn hoặc bằng 0.</p>}
          {importSummary.message && <p>{importSummary.message}</p>}
        </div>
      )}

      <QuickOrderGrid
        rows={rows}
        products={products}
        revenueCategories={revenueCategories}
        productColorsByProductId={productColorsByProductId}
        onRowsChange={(nextRows) => {
          setRows(nextRows);
          const changed = nextRows.find(
            (row) =>
              isProcessingWithDecoration(row.processingMethod) &&
              row.processingMethod !== "AS_IS" &&
              row.revenueCategoryId &&
              revenueCategories.find((c) => c.id === row.revenueCategoryId)?.code?.startsWith("WHOLESALE_BLANK"),
          );
          if (changed) setRevenueSuggestionRowKey(changed.key);
        }}
        onLoadProductColors={loadProductColors}
        revenueSuggestionRowKey={revenueSuggestionRowKey}
        onDismissRevenueSuggestion={() => setRevenueSuggestionRowKey(null)}
        onApplyRevenueSuggestion={(rowKey, categoryId) => {
          setRows((prev) =>
            prev.map((row) => (row.key === rowKey ? { ...row, revenueCategoryId: categoryId } : row)),
          );
          setRevenueSuggestionRowKey(null);
        }}
      />

      <div className="quick-order-footer">
        <div className="quick-order-footer__summary">
          <p>Tổng số dòng sản phẩm: {computedItems.length}</p>
          <p>Tổng số lượng: {computedItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
          <div className="admin-catalog-variant-fields" style={{ marginTop: 8, marginBottom: 8 }}>
            <div className="admin-field">
              <label className="admin-label">Chiết khấu</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Phí vận chuyển</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">VAT (%)</label>
              <input
                className="admin-input"
                type="number"
                min={0}
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
              />
            </div>
          </div>
          <OrderTotalsSummary
            totals={totals}
            currency={header.currency}
            vatRate={Number(vatRate) || 0}
          />
        </div>
        <div className="quick-order-footer__actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              saveQuickOrderDraft({
                header,
                rows,
                discountAmount: Number(discountAmount) || 0,
                shippingFee: Number(shippingFee) || 0,
                vatRate: Number(vatRate) || 0,
                savedAt: new Date().toISOString(),
              });
              toast.info("Đã lưu nháp cục bộ.");
            }}
          >
            Lưu nháp
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Đang tạo đơn hàng…" : "Tạo đơn hàng"}
          </button>
          <Link href="/admin/orders/new" className="admin-btn admin-btn--ghost">
            Form chuẩn
          </Link>
        </div>
      </div>
    </div>
  );
}
