"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import QuickOrderGrid, { syncRowsToSizeColumns } from "@/components/admin/orders/QuickOrderGrid";
import OrderTotalsSummary from "@/components/admin/orders/OrderTotalsSummary";
import OrderCustomerPartyFields, {
  type OrderCustomerPartyValues,
} from "@/components/admin/orders/OrderCustomerPartyFields";
import {
  contactToOrderSnapshots,
  customerToOrderSnapshots,
} from "@/features/crm/order-customer-snapshot";
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
  addSizeColumnFromLabel,
  DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
  mergeImportedSizeColumns,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";
import {
  createEmptyQuickOrderRow,
  normalizeQuickOrderDraft,
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

type ProductStockVariant = {
  colorId: string | null;
  colorName: string | null;
  sizeName: string | null;
};

type ProductListItem = {
  id: string;
  name: string;
  productCode: string | null;
  hasStockVariants?: boolean;
};

const EMPTY_PARTY: OrderCustomerPartyValues = {
  customerId: "",
  contactId: "",
  customerCode: "",
  customerCompanyName: "",
  customerNameSnapshot: "",
  customerLegalNameSnapshot: "",
  customerTaxCode: "",
  customerAddress: "",
  customerPhoneSnapshot: "",
  customerEmailSnapshot: "",
  customerWebsiteSnapshot: "",
  customerProvinceNameSnapshot: "",
  customerWardNameSnapshot: "",
  customerAddressLine1Snapshot: "",
  contactName: "",
  contactTitle: "",
  contactDepartment: "",
  contactPhone: "",
  contactEmail: "",
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
  const [sizeColumns, setSizeColumns] = useState<QuickOrderSizeColumn[]>([
    ...DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
  ]);
  const [rows, setRows] = useState<QuickOrderGridRow[]>([createEmptyQuickOrderRow()]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategoryPickerOption[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);
  const [productionEmployees, setProductionEmployees] = useState<EmployeeRecord[]>([]);
  const [productColorsByProductId, setProductColorsByProductId] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [productStockVariantsByProductId, setProductStockVariantsByProductId] = useState<
    Record<string, ProductStockVariant[]>
  >({});
  const [addSizeOpen, setAddSizeOpen] = useState(false);
  const [addSizeLabel, setAddSizeLabel] = useState("");
  const [addSizeError, setAddSizeError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [partyValues, setPartyValues] = useState<OrderCustomerPartyValues>(EMPTY_PARTY);
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
    () => quickOrderRowsToOrderItems(rows, sizeColumns).map((item) => computeOrderItem(item)),
    [rows, sizeColumns],
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
      product?: {
        variants?: Array<{
          colorName?: string | null;
          colorId?: string | null;
          sizeName?: string | null;
          stockQty?: number | null;
        }>;
      };
    };
    const variants = data.product?.variants ?? [];
    const colorMap = new Map<string, { id: string; name: string }>();
    const stockVariants: ProductStockVariant[] = [];
    for (const variant of variants) {
      const name = variant.colorName?.trim();
      const sizeName = variant.sizeName?.trim() || null;
      const colorId = variant.colorId?.trim() || null;
      stockVariants.push({ colorId, colorName: name ?? null, sizeName });
      if (!name) continue;
      const id = colorId && !colorId.startsWith("name:") ? colorId : `name:${name.toLowerCase()}`;
      colorMap.set(id, { id, name });
    }
    setProductColorsByProductId((prev) => ({
      ...prev,
      [productId]: Array.from(colorMap.values()),
    }));
    setProductStockVariantsByProductId((prev) => ({
      ...prev,
      [productId]: stockVariants,
    }));
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, hasStockVariants: variants.some((v) => v.stockQty != null) }
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
      const normalized = normalizeQuickOrderDraft(draft);
      setHeader(normalized.header);
      setSizeColumns(normalized.sizeColumns);
      setRows(normalized.rows.length ? normalized.rows : [createEmptyQuickOrderRow(1, normalized.sizeColumns)]);
      setDiscountAmount(String(normalized.discountAmount ?? 0));
      setShippingFee(String(normalized.shippingFee ?? 0));
      setVatRate(String(normalized.vatRate ?? 8));
      if (normalized.header.customerId) {
        void fetch(`/api/crm/customers/${normalized.header.customerId}`)
          .then((res) => res.json())
          .then((data: { customer?: CrmCustomerRecord }) => {
            if (data.customer) applyCustomer(data.customer);
          });
      }
      setDraftToast("Đã khôi phục bản nháp chưa lưu.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveQuickOrderDraft({
        header,
        sizeColumns,
        rows,
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
        savedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [header, sizeColumns, rows, discountAmount, shippingFee, vatRate]);

  function applyCustomer(
    customer: CrmCustomerRecord,
    options?: { contacts?: CrmContactRecord[] },
  ) {
    const snapshots = customerToOrderSnapshots(customer);
    setSelectedCustomer(customer);
    setHeader((prev) => ({ ...prev, customerId: customer.id, contactId: null }));
    setPartyValues((prev) => ({
      ...prev,
      customerId: customer.id,
      contactId: "",
      customerCode: snapshots.customerCode ?? "",
      customerCompanyName: snapshots.customerCompanyName ?? customer.name,
      customerNameSnapshot: snapshots.customerNameSnapshot ?? customer.name,
      customerLegalNameSnapshot: snapshots.customerLegalNameSnapshot ?? "",
      customerTaxCode: snapshots.customerTaxCode ?? "",
      customerAddress: snapshots.customerAddress ?? "",
      customerPhoneSnapshot: snapshots.customerPhoneSnapshot ?? "",
      customerEmailSnapshot: snapshots.customerEmailSnapshot ?? "",
      customerWebsiteSnapshot: snapshots.customerWebsiteSnapshot ?? "",
      customerProvinceNameSnapshot: snapshots.customerProvinceNameSnapshot ?? "",
      customerWardNameSnapshot: snapshots.customerWardNameSnapshot ?? "",
      customerAddressLine1Snapshot: snapshots.customerAddressLine1Snapshot ?? "",
      contactName: "",
      contactTitle: "",
      contactDepartment: "",
      contactPhone: "",
      contactEmail: "",
    }));
    if (options?.contacts) {
      setContacts(options.contacts);
      const primary = options.contacts.find((c) => c.isPrimary);
      if (primary) applyContact(primary);
    } else {
      void loadCustomerContacts(customer.id);
    }
  }

  async function loadCustomerContacts(id: string) {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    const list = data.contacts ?? [];
    setContacts(list);
    const primary = list.find((c) => c.isPrimary);
    if (primary) applyContact(primary);
  }

  function applyContact(contact: CrmContactRecord) {
    const snapshots = contactToOrderSnapshots(contact);
    setHeader((prev) => ({ ...prev, contactId: contact.id }));
    setPartyValues((prev) => ({
      ...prev,
      contactId: contact.id,
      contactName: snapshots.contactName ?? "",
      contactTitle: snapshots.contactTitle ?? "",
      contactDepartment: snapshots.contactDepartment ?? "",
      contactPhone: snapshots.contactPhone ?? "",
      contactEmail: snapshots.contactEmail ?? "",
    }));
  }

  function applyImportedSummary(summary: QuickOrderImportSummary) {
    const mergedColumns = mergeImportedSizeColumns(sizeColumns, summary.sizeColumns);
    const resolvedRows = applyRevenueCategoriesToImportedRows(summary.rows, revenueCategories);
    const nextRows = resolvedRows.length
      ? resolvedRows.map((row) => ({
          ...row,
          sizes: {
            ...Object.fromEntries(mergedColumns.map((col) => [col.key, 0])),
            ...row.sizes,
          },
        }))
      : [createEmptyQuickOrderRow(1, mergedColumns)];
    setSizeColumns(mergedColumns);
    setRows(nextRows);
    setImportSummary({ ...summary, rows: nextRows, sizeColumns: mergedColumns });
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
      applyImportedSummary({ ...summary, rows: resolvedRows });
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
    applyImportedSummary({ ...summary, rows: resolvedRows, message: summary.message });
  }

  function validateAllRows(): boolean {
    let valid = true;
    const next = rows.map((row) => {
      const fieldErrors = validateQuickOrderRow(row, {
        sizeColumns,
        productColors: row.productId ? productColorsByProductId[row.productId] ?? [] : [],
        productStockVariants: row.productId
          ? productStockVariantsByProductId[row.productId] ?? []
          : [],
      });
      if (Object.keys(fieldErrors).length) valid = false;
      return { ...row, fieldErrors };
    });
    setRows(next);
    return valid;
  }

  function handleAddSizeColumn() {
    const result = addSizeColumnFromLabel(sizeColumns, addSizeLabel);
    if (result.error) {
      setAddSizeError(result.error);
      return;
    }
    setSizeColumns(result.columns);
    setRows((prev) => syncRowsToSizeColumns(prev, result.columns));
    setAddSizeLabel("");
    setAddSizeError(null);
    setAddSizeOpen(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!partyValues.customerCompanyName.trim()) {
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
        salesEmployeeId: header.salesEmployeeId,
        orderDate: header.orderDate,
        currency: header.currency,
        priceVatType: header.priceVatType,
        customerId: header.customerId,
        contactId: header.contactId,
        customerCompanyName: partyValues.customerCompanyName,
        customerCode: partyValues.customerCode || null,
        customerTaxCode: partyValues.customerTaxCode || null,
        customerAddress: partyValues.customerAddress || null,
        customerNameSnapshot: partyValues.customerNameSnapshot || null,
        customerLegalNameSnapshot: partyValues.customerLegalNameSnapshot || null,
        customerPhoneSnapshot: partyValues.customerPhoneSnapshot || null,
        customerEmailSnapshot: partyValues.customerEmailSnapshot || null,
        customerWebsiteSnapshot: partyValues.customerWebsiteSnapshot || null,
        customerProvinceNameSnapshot: partyValues.customerProvinceNameSnapshot || null,
        customerWardNameSnapshot: partyValues.customerWardNameSnapshot || null,
        customerAddressLine1Snapshot: partyValues.customerAddressLine1Snapshot || null,
        contactName: partyValues.contactName || null,
        contactTitle: partyValues.contactTitle || null,
        contactDepartment: partyValues.contactDepartment || null,
        contactPhone: partyValues.contactPhone || null,
        contactEmail: partyValues.contactEmail || null,
        customerNote: header.customerNote || null,
        internalNote: header.internalNote || null,
        productionDueDate: header.productionDueDate || null,
        productionOwnerId: header.productionOwnerId,
        discountAmount: Number(discountAmount) || 0,
        shippingFee: Number(shippingFee) || 0,
        vatRate: Number(vatRate) || 0,
        requireItemClassification: true,
        items: quickOrderRowsToOrderItems(rows, sizeColumns),
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

      <OrderCustomerPartyFields
        values={partyValues}
        selectedCustomer={selectedCustomer}
        contacts={contacts}
        onCustomerSelect={(customer, nextContacts) => {
          if (customer) applyCustomer(customer, { contacts: nextContacts });
          else {
            setSelectedCustomer(null);
            setHeader((prev) => ({ ...prev, customerId: null, contactId: null }));
            setContacts([]);
            setPartyValues(EMPTY_PARTY);
          }
        }}
        onContactsChange={setContacts}
        onChange={(patch) => setPartyValues((prev) => ({ ...prev, ...patch }))}
      />

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Thông tin đơn hàng</legend>
        <div className="admin-seo-brief-form-grid">
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
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => setRows((prev) => [...prev, createEmptyQuickOrderRow(prev.length + 1, sizeColumns)])}
        >
          Thêm dòng
        </button>
        <div className="quick-order-add-size">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setAddSizeOpen((open) => !open);
              setAddSizeError(null);
            }}
          >
            + Thêm size
          </button>
          {addSizeOpen && (
            <div className="quick-order-add-size__popover">
              <label className="admin-label" htmlFor="quick-order-add-size-input">
                Tên size
              </label>
              <input
                id="quick-order-add-size-input"
                className="admin-input admin-input--compact"
                value={addSizeLabel}
                placeholder="Ví dụ: XS, 5XL, 28, 30, 2 tuổi"
                onChange={(e) => {
                  setAddSizeLabel(e.target.value);
                  setAddSizeError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSizeColumn();
                }}
              />
              {addSizeError && <p className="admin-field-error">{addSizeError}</p>}
              <div className="quick-order-add-size__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost admin-btn--xs"
                  onClick={() => {
                    setAddSizeOpen(false);
                    setAddSizeLabel("");
                    setAddSizeError(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={handleAddSizeColumn}
                >
                  Thêm size
                </button>
              </div>
            </div>
          )}
        </div>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void handlePasteFromClipboard()}>
          Dán từ Excel
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => downloadQuickOrderTemplate()}>
          Tải mẫu Excel
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => fileInputRef.current?.click()}>
          Nhập file Excel
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--ghost"
          onClick={() => {
            setSizeColumns([...DEFAULT_QUICK_ORDER_SIZE_COLUMNS]);
            setRows([createEmptyQuickOrderRow(1, DEFAULT_QUICK_ORDER_SIZE_COLUMNS)]);
          }}
        >
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
        sizeColumns={sizeColumns}
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
        onSizeColumnsChange={(nextColumns) => {
          setSizeColumns(nextColumns);
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
                sizeColumns,
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
