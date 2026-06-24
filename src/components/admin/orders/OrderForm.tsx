"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminBackLink from "@/components/admin/AdminBackLink";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import QuickAddContactModal from "@/components/admin/quotes/QuickAddContactModal";
import QuickAddCustomerModal from "@/components/admin/orders/QuickAddCustomerModal";
import QuickAddColorModal from "@/components/admin/orders/QuickAddColorModal";
import QuickAddCategoryModal, {
  type CategoryOption,
} from "@/components/admin/orders/QuickAddCategoryModal";
import CustomProductModal, {
  type CustomProductResult,
} from "@/components/admin/orders/CustomProductModal";
import OrderItemFormRow, {
  emptyOrderItem,
  type OrderItemRow,
} from "@/components/admin/orders/OrderItemFormRow";
import OrderTotalsSummary from "@/components/admin/orders/OrderTotalsSummary";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import {
  contactToQuoteSnapshots,
  customerToQuoteSnapshots,
} from "@/features/quotes/quote-party-utils";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { toDateInputValue } from "@/features/quotes/format";
import { computeOrderItem, computeOrderTotals } from "@/features/orders/order-totals";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { CrmContactRecord, CrmCustomerRecord } from "@/features/crm/types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { employeeRoleLabel } from "@/features/employees/employee-role";
import { useAdminMutation } from "@/hooks/useAdminAction";
import type { ColorRecord } from "@/features/colors/color.service";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type ProductOption = { id: string; name: string };
type VariantOption = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
};

type Props = {
  mode: "create" | "edit";
  orderId?: string;
};

type QuickCreateTarget =
  | { type: "item-color"; itemIndex: number }
  | { type: "variant-color"; itemIndex: number; variantIndex: number }
  | { type: "custom-product-color" }
  | { type: "custom-product-category" }
  | { type: "category"; itemIndex: number };

function orderToItemRows(order: OrderDetailRecord): OrderItemRow[] {
  return order.items.map((item) => ({
    key: item.id,
    id: item.id,
    productId: null,
    variantId: null,
    productNameSnapshot: item.productNameSnapshot ?? "",
    variantNameSnapshot: item.variantNameSnapshot,
    description: item.description,
    designImageUrl: item.designImageUrl,
    skuSnapshot: item.skuSnapshot,
    colorId: item.colorId,
    categoryId: item.categoryId,
    gender: item.gender,
    colorSnapshot: item.colorSnapshot,
    categorySnapshot: item.categorySnapshot,
    genderSnapshot: item.genderSnapshot,
    moqSnapshot: item.moqSnapshot,
    itemNote: item.itemNote,
    productionLeadTime: item.productionLeadTime,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    sortOrder: item.sortOrder,
    supplySource: item.supplySource,
    processingMethod: item.processingMethod,
    revenueCategoryId: item.revenueCategoryId,
    variants: item.variants.map((variant) => ({
      key: variant.id,
      id: variant.id,
      colorId: variant.colorId,
      colorNameSnapshot: variant.colorNameSnapshot,
      sizeValue: variant.sizeValue,
      skuSnapshot: variant.skuSnapshot,
      quantity: variant.quantity,
      unit: variant.unit,
      sortOrder: variant.sortOrder,
    })),
  }));
}

export default function OrderForm({ mode, orderId }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [contacts, setContacts] = useState<CrmContactRecord[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);
  const skipContactAutofill = useRef(false);
  const [quickAddContactOpen, setQuickAddContactOpen] = useState(false);
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [quickAddColorOpen, setQuickAddColorOpen] = useState(false);
  const [quickAddCategoryOpen, setQuickAddCategoryOpen] = useState(false);
  const [customProductOpen, setCustomProductOpen] = useState(false);
  const [customProductItemIndex, setCustomProductItemIndex] = useState(0);
  const [quickCreateTarget, setQuickCreateTarget] = useState<QuickCreateTarget | null>(null);
  const [injectCustomProductColorId, setInjectCustomProductColorId] = useState<string | null>(null);
  const [injectCustomProductCategoryId, setInjectCustomProductCategoryId] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorRecord[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [revenueCategories, setRevenueCategories] = useState<
    Array<{ id: string; displayPath: string }>
  >([]);

  const [customerId, setCustomerId] = useState("");
  const [contactId, setContactId] = useState("");
  const [orderDate, setOrderDate] = useState(toDateInputValue(new Date().toISOString()));
  const [currency, setCurrency] = useState("VND");
  const [priceVatType, setPriceVatType] = useState("EXCLUDING_VAT");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerTaxCode, setCustomerTaxCode] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerContactName, setCustomerContactName] = useState("");
  const [customerContactTitle, setCustomerContactTitle] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [salesRepresentativeId, setSalesRepresentativeId] = useState("");
  const [salesEmployeeId, setSalesEmployeeId] = useState("");
  const [salesName, setSalesName] = useState("");
  const [salesTitle, setSalesTitle] = useState("");
  const [salesPhone, setSalesPhone] = useState("");
  const [salesEmail, setSalesEmail] = useState("");
  const [terms, setTerms] = useState(DEFAULT_QUOTE_TERMS);
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [sampleFee, setSampleFee] = useState("");
  const [sampleLeadTime, setSampleLeadTime] = useState("");
  const [sampleRefundCondition, setSampleRefundCondition] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [shippingFee, setShippingFee] = useState("0");
  const [vatRate, setVatRate] = useState("0");
  const [items, setItems] = useState<OrderItemRow[]>([emptyOrderItem()]);

  function applySalesEmployee(employee: EmployeeRecord) {
    setSalesEmployeeId(employee.id);
    setSalesRepresentativeId("");
    setSalesName(employee.fullName);
    setSalesTitle(employee.jobTitle ?? "");
    setSalesPhone(employee.phone ?? "");
    setSalesEmail(employee.email ?? "");
  }

  function handleColorCreated(color: ColorRecord) {
    setColors((prev) => (prev.some((c) => c.id === color.id) ? prev : [...prev, color]));

    if (quickCreateTarget?.type === "custom-product-color") {
      setInjectCustomProductColorId(color.id);
    } else if (quickCreateTarget?.type === "item-color") {
      setItems((prev) =>
        prev.map((row, i) =>
          i === quickCreateTarget.itemIndex
            ? { ...row, colorId: color.id, colorSnapshot: color.name }
            : row,
        ),
      );
    } else if (quickCreateTarget?.type === "variant-color") {
      setItems((prev) =>
        prev.map((row, i) => {
          if (i !== quickCreateTarget.itemIndex) return row;
          const variants = [...(row.variants ?? [])];
          const variant = variants[quickCreateTarget.variantIndex];
          if (!variant) return row;
          variants[quickCreateTarget.variantIndex] = {
            ...variant,
            colorId: color.id,
            colorNameSnapshot: color.name,
            skuSnapshot: null,
          };
          return { ...row, variants };
        }),
      );
    }

    setQuickAddColorOpen(false);
    setQuickCreateTarget(null);
  }

  function handleCategoryCreated(category: CategoryOption) {
    setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));

    if (quickCreateTarget?.type === "custom-product-category") {
      setInjectCustomProductCategoryId(category.id);
    } else if (quickCreateTarget?.type === "category") {
      setItems((prev) =>
        prev.map((row, i) =>
          i === quickCreateTarget.itemIndex
            ? { ...row, categoryId: category.id, categorySnapshot: category.name }
            : row,
        ),
      );
    }

    setQuickAddCategoryOpen(false);
    setQuickCreateTarget(null);
  }

  async function loadCustomerContacts(id: string) {
    const res = await fetch(`/api/crm/customers/${id}/contacts`);
    const data = (await res.json()) as { contacts?: CrmContactRecord[] };
    setContacts(data.contacts ?? []);
  }

  function applyCustomer(
    customer: CrmCustomerRecord,
    options?: { contacts?: CrmContactRecord[] },
  ) {
    const snapshots = customerToQuoteSnapshots(customer);
    setSelectedCustomer(customer);
    setCustomerId(customer.id);
    setCustomerCode(customer.code ?? "");
    setCustomerCompany(snapshots.customerCompanySnapshot ?? "");
    setCustomerTaxCode(snapshots.customerTaxCodeSnapshot ?? "");
    setCustomerAddress(snapshots.customerAddressSnapshot ?? "");
    setCustomerContactName("");
    setCustomerContactTitle("");
    setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
    setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
    setContactId("");
    if (options?.contacts) {
      setContacts(options.contacts);
    } else {
      void loadCustomerContacts(customer.id);
    }
  }

  function applyContact(contact: CrmContactRecord, customerOverride?: CrmCustomerRecord) {
    const customer = customerOverride ?? selectedCustomer;
    const snapshots = contactToQuoteSnapshots(contact, {
      phone: customer?.phone,
      email: customer?.email,
    });
    setContactId(contact.id);
    setCustomerContactName(snapshots.customerContactNameSnapshot ?? "");
    setCustomerContactTitle(snapshots.customerContactTitleSnapshot ?? "");
    setCustomerPhone(snapshots.customerPhoneSnapshot ?? "");
    setCustomerEmail(snapshots.customerEmailSnapshot ?? "");
  }

  async function loadCustomerById(id: string) {
    const res = await fetch(`/api/crm/customers/${id}`);
    const data = (await res.json()) as { customer?: CrmCustomerRecord };
    if (!data.customer) return;
    setSelectedCustomer(data.customer);
    await loadCustomerContacts(id);
  }

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=SALES&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=ADMIN&limit=200").then((r) => r.json()),
      fetch("/api/colors?active=1").then((r) => r.json()),
      fetch("/api/admin/products/categories").then((r) => r.json()),
      fetch("/api/admin/revenue-categories?picker=1").then((r) => r.json()),
    ]).then(([productsData, salesData, adminData, colorsData, categoriesData, revenueData]) => {
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
      const sales = (salesData as { employees?: EmployeeRecord[] }).employees ?? [];
      const admins = (adminData as { employees?: EmployeeRecord[] }).employees ?? [];
      const merged = [...sales];
      for (const admin of admins) {
        if (!merged.some((e) => e.id === admin.id)) merged.push(admin);
      }
      setSalesEmployees(merged);
      setColors((colorsData as { colors?: ColorRecord[] }).colors ?? []);
      setCategories((categoriesData as CategoryOption[]) ?? []);
      const revenueList = (revenueData as Array<{ id: string; displayPath: string }>) ?? [];
      setRevenueCategories(revenueList);
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
    if (mode !== "edit" || !orderId) return;
    void fetch(`/api/orders/${orderId}`)
      .then(async (res) => {
        const data = (await res.json()) as { order?: OrderDetailRecord; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không tải được đơn hàng");
        const order = data.order!;
        setOrderDate(toDateInputValue(order.orderDate));
        setCurrency(order.currency);
        setPriceVatType(order.priceVatType);
        const cid = order.customerId ?? "";
        setCustomerId(cid);
        skipContactAutofill.current = true;
        setContactId(order.contactId ?? "");
        setCustomerCompany(order.customerCompanyName ?? "");
        setCustomerCode(order.customerCode ?? "");
        setCustomerTaxCode(order.customerTaxCode ?? "");
        setCustomerAddress(order.customerAddress ?? "");
        setCustomerContactName(order.contactName ?? "");
        setCustomerContactTitle(order.contactTitle ?? "");
        setCustomerPhone(order.contactPhone ?? "");
        setCustomerEmail(order.contactEmail ?? "");
        setSalesRepresentativeId(order.salesRepresentativeId ?? "");
        setSalesEmployeeId(order.salesEmployeeId ?? "");
        setSalesName(order.salesName ?? "");
        setSalesTitle(order.salesTitle ?? "");
        setSalesPhone(order.salesPhone ?? "");
        setSalesEmail(order.salesEmail ?? "");
        setTerms(order.terms ?? DEFAULT_QUOTE_TERMS);
        setCustomerNote(order.customerNote ?? "");
        setInternalNote(order.internalNote ?? "");
        setSampleFee(order.sampleFee != null ? String(order.sampleFee) : "");
        setSampleLeadTime(order.sampleLeadTime ?? "");
        setSampleRefundCondition(order.sampleRefundCondition ?? "");
        setDiscountAmount(String(order.discountAmount ?? 0));
        setShippingFee(String(order.shippingFee ?? 0));
        const taxableBase = order.subtotal - order.discountAmount + order.shippingFee;
        setVatRate(
          taxableBase > 0
            ? String(Math.round((order.vatAmount / taxableBase) * 10000) / 100)
            : "0",
        );
        setItems(orderToItemRows(order).length ? orderToItemRows(order) : [emptyOrderItem()]);
        if (cid) void loadCustomerById(cid);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mode, orderId]);

  async function loadProductMeta(productId: string, itemIndex: number) {
    const res = await fetch(`/api/admin/products/${productId}`);
    const data = (await res.json()) as {
      product?: {
        name?: string;
        systemCode?: string | null;
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
              systemCode: data.product?.systemCode ?? row.systemCode ?? null,
              variants:
                row.variants?.length || !data.product?.systemCode
                  ? row.variants
                  : [
                      {
                        key: crypto.randomUUID(),
                        colorId: row.colorId ?? null,
                        colorNameSnapshot: row.colorSnapshot ?? null,
                        sizeValue: null,
                        skuSnapshot: null,
                        quantity: row.quantity,
                        unit: row.unit ?? "cái",
                      },
                    ],
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

  const totals = useMemo(
    () =>
      computeOrderTotals(
        items.map(({ key: _k, ...item }) => computeOrderItem(item)),
        {
          discountAmount: Number(discountAmount) || 0,
          shippingFee: Number(shippingFee) || 0,
          vatRate: Number(vatRate) || 0,
        },
      ),
    [items, discountAmount, shippingFee, vatRate],
  );

  function buildPayload() {
    return {
      customerId: customerId || null,
      contactId: contactId || null,
      salesRepresentativeId: salesRepresentativeId || null,
      salesEmployeeId: salesEmployeeId || null,
      orderDate: new Date(orderDate).toISOString(),
      currency,
      priceVatType,
      customerCompanyName: customerCompany,
      customerCode: customerCode || null,
      customerTaxCode: customerTaxCode || null,
      customerAddress: customerAddress || null,
      contactName: customerContactName || null,
      contactTitle: customerContactTitle || null,
      contactPhone: customerPhone || null,
      contactEmail: customerEmail || null,
      salesName: salesName || null,
      salesTitle: salesTitle || null,
      salesPhone: salesPhone || null,
      salesEmail: salesEmail || null,
      terms: terms || null,
      customerNote: customerNote || null,
      internalNote: internalNote || null,
      sampleFee: sampleFee.trim() ? Number(sampleFee) : null,
      sampleLeadTime: sampleLeadTime || null,
      sampleRefundCondition: sampleRefundCondition || null,
      discountAmount: Number(discountAmount) || 0,
      shippingFee: Number(shippingFee) || 0,
      vatRate: Number(vatRate) || 0,
      items: items.map(({ key: _k, ...item }) => item),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = buildPayload();
    const url = mode === "create" ? "/api/orders" : `/api/orders/${orderId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    await mutate({
      loadingMessage: mode === "create" ? "Đang tạo đơn hàng…" : "Đang lưu đơn hàng…",
      successMessage: mode === "create" ? "Đã tạo đơn hàng." : "Đã cập nhật đơn hàng.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (order) => {
        router.push(`/admin/orders/${order.id}`);
      },
    });
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;

  return (
    <>
    <form className="admin-panel" onSubmit={(e) => void handleSubmit(e)}>
      <AdminBackLink href={mode === "edit" && orderId ? `/admin/orders/${orderId}` : "/admin/orders"} />
      <div className="admin-section-header">
        <h2>{mode === "create" ? "Tạo đơn hàng mới" : "Chỉnh sửa đơn hàng"}</h2>
        {mode === "create" && (
          <Link href="/admin/orders/new/quick" className="admin-btn admin-btn--secondary">
            Nhập nhanh dạng bảng
          </Link>
        )}
      </div>

      {error && (
        <div className="admin-empty-state admin-empty-state--error" style={{ marginBottom: 16 }}>
          <p>{error}</p>
        </div>
      )}

      <div className="quote-form__card">
        <CustomerSearchField
          value={selectedCustomer}
          onSelect={(customer) => {
            if (customer) applyCustomer(customer);
            else {
              setSelectedCustomer(null);
              setCustomerId("");
              setCustomerCode("");
              setContacts([]);
              setContactId("");
            }
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          style={{ marginTop: 8 }}
          onClick={() => setQuickAddCustomerOpen(true)}
        >
          Thêm khách hàng mới
        </button>
      </div>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>A. Thông tin khách hàng</legend>
        <div className="quote-form__party-grid">
          <div className="quote-form__party-fields">
            <div className="admin-field">
              <label className="admin-label">Tên công ty / khách hàng *</label>
              <input className="admin-input" required value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã số thuế</label>
              <input className="admin-input" value={customerTaxCode} onChange={(e) => setCustomerTaxCode(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Địa chỉ</label>
              <input className="admin-input" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>
          <div className="quote-form__party-fields">
            {customerId ? (
              <div className="admin-field">
                <label className="admin-label">Người liên hệ</label>
                <select className="admin-input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                  <option value="">— Chọn người liên hệ —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}{c.title ? ` · ${c.title}` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setQuickAddContactOpen(true)}>
                  Thêm người liên hệ
                </button>
              </div>
            ) : (
              <p className="admin-field-hint">Chọn khách hàng để tải danh sách liên hệ</p>
            )}
            <div className="admin-field">
              <label className="admin-label">Tên người liên hệ</label>
              <input className="admin-input" value={customerContactName} onChange={(e) => setCustomerContactName(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chức vụ</label>
              <input className="admin-input" value={customerContactTitle} onChange={(e) => setCustomerContactTitle(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Số điện thoại</label>
              <input className="admin-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input className="admin-input" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>B. Thông tin đơn hàng</legend>
        <div className="admin-catalog-variant-fields">
          <div className="admin-field">
            <label className="admin-label">Ngày đơn hàng</label>
            <input className="admin-input" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Nhân viên tư vấn</label>
            <AdminSearchableSelect
              value={salesEmployeeId}
              onChange={(employeeId) => {
                const employee = salesEmployees.find((record) => record.id === employeeId);
                if (employee) applySalesEmployee(employee);
                else {
                  setSalesEmployeeId("");
                  setSalesRepresentativeId("");
                  setSalesName("");
                  setSalesTitle("");
                  setSalesPhone("");
                  setSalesEmail("");
                }
              }}
              options={salesEmployees.map((employee) => ({
                value: employee.id,
                label: employee.fullName,
                sublabel: [
                  employee.employeeCode,
                  employee.jobTitle,
                  employee.role ? employeeRoleLabel(employee.role) : null,
                ].filter(Boolean).join(" · "),
              }))}
              placeholder="— Chọn nhân viên —"
              searchPlaceholder="Tìm theo tên, mã hoặc chức vụ…"
              emptyMessage="Chưa có nhân viên tư vấn đang hoạt động."
              fallbackLabel={salesName || undefined}
              fallbackSublabel={
                salesName && !salesEmployees.some((employee) => employee.id === salesEmployeeId)
                  ? "Dữ liệu đã lưu"
                  : undefined
              }
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại tiền</label>
            <select className="admin-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Loại giá / VAT</label>
            <select className="admin-input" value={priceVatType} onChange={(e) => setPriceVatType(e.target.value)}>
              <option value="EXCLUDING_VAT">Chưa bao gồm VAT</option>
              <option value="INCLUDING_VAT">Đã bao gồm VAT</option>
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Phí mẫu</label>
            <input className="admin-input" type="number" min="0" value={sampleFee} onChange={(e) => setSampleFee(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Thời gian làm mẫu</label>
            <input className="admin-input" value={sampleLeadTime} onChange={(e) => setSampleLeadTime(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Điều kiện hoàn phí</label>
            <textarea className="admin-textarea" rows={2} value={sampleRefundCondition} onChange={(e) => setSampleRefundCondition(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Điều khoản đơn hàng</label>
            <textarea className="admin-textarea" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Ghi chú khách hàng</label>
            <textarea className="admin-textarea" rows={2} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea className="admin-textarea" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>C. Sản phẩm đặt hàng</legend>
        {items.map((item, index) => (
          <OrderItemFormRow
            key={item.key}
            index={index}
            item={item}
            currency={currency}
            customerCode={customerCode}
            products={products}
            variants={item.productId ? variantsMap[item.productId] ?? [] : []}
            colors={colors}
            categories={categories}
            revenueCategories={revenueCategories}
            onChange={(patch) =>
              setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
            }
            onRemove={items.length > 1 ? () => setItems((prev) => prev.filter((_, i) => i !== index)) : undefined}
            onLoadVariants={loadVariants}
            onProductSelect={(productId) => loadProductMeta(productId, index)}
            onAddColor={(variantIndex) => {
              if (variantIndex != null) {
                setQuickCreateTarget({ type: "variant-color", itemIndex: index, variantIndex });
              } else {
                setQuickCreateTarget({ type: "item-color", itemIndex: index });
              }
              setQuickAddColorOpen(true);
            }}
            onAddCategory={() => {
              setQuickCreateTarget({ type: "category", itemIndex: index });
              setQuickAddCategoryOpen(true);
            }}
            onCustomProduct={() => {
              setCustomProductItemIndex(index);
              setCustomProductOpen(true);
            }}
          />
        ))}
        <button
          type="button"
          className="admin-btn admin-btn--secondary"
          onClick={() => setItems((prev) => [...prev, emptyOrderItem()])}
        >
          Thêm dòng sản phẩm
        </button>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>D. Tổng giá trị</legend>
        <div className="admin-catalog-variant-fields">
          <div className="admin-field">
            <label className="admin-label">Chiết khấu</label>
            <input className="admin-input" type="number" min="0" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Phí vận chuyển</label>
            <input className="admin-input" type="number" min="0" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">VAT (%)</label>
            <input className="admin-input" type="number" min="0" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
        </div>
        <OrderTotalsSummary totals={totals} currency={currency} vatRate={Number(vatRate) || 0} />
      </fieldset>

      {mode === "edit" && orderId && (
        <p className="admin-field-hint" style={{ marginTop: 16 }}>
          Quản lý hồ sơ sản xuất, BOM và file kỹ thuật tại{" "}
          <Link href={`/admin/orders/${orderId}#production-pack`}>Bộ hồ sơ sản xuất</Link>.
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button type="submit" className="admin-btn admin-btn--primary">
          {mode === "create" ? "Tạo đơn hàng" : "Lưu thay đổi"}
        </button>
        <Link href={mode === "edit" && orderId ? `/admin/orders/${orderId}` : "/admin/orders"} className="admin-btn admin-btn--secondary">
          Hủy
        </Link>
      </div>
    </form>

      {customerId && (
        <QuickAddContactModal
          customerId={customerId}
          open={quickAddContactOpen}
          onClose={() => setQuickAddContactOpen(false)}
          onCreated={(contact) => {
            setContacts((prev) => [...prev, contact]);
            applyContact(contact);
            setQuickAddContactOpen(false);
          }}
        />
      )}

      <QuickAddCustomerModal
        open={quickAddCustomerOpen}
        onClose={() => setQuickAddCustomerOpen(false)}
        onCreated={(customer, contact) => {
          applyCustomer(customer, { contacts: customer.contacts ?? [] });
          if (contact) {
            skipContactAutofill.current = true;
            applyContact(contact, customer);
          }
          setQuickAddCustomerOpen(false);
        }}
      />

      <QuickAddColorModal
        open={quickAddColorOpen}
        onClose={() => {
          setQuickAddColorOpen(false);
          setQuickCreateTarget(null);
        }}
        onCreated={handleColorCreated}
      />

      <QuickAddCategoryModal
        open={quickAddCategoryOpen}
        onClose={() => {
          setQuickAddCategoryOpen(false);
          setQuickCreateTarget(null);
        }}
        onCreated={handleCategoryCreated}
      />

      <CustomProductModal
        open={customProductOpen}
        customerCode={customerCode}
        colors={colors}
        categories={categories}
        selectColorId={injectCustomProductColorId}
        selectCategoryId={injectCustomProductCategoryId}
        onClose={() => {
          setCustomProductOpen(false);
          setInjectCustomProductColorId(null);
          setInjectCustomProductCategoryId(null);
        }}
        onAddColor={() => {
          setQuickCreateTarget({ type: "custom-product-color" });
          setQuickAddColorOpen(true);
        }}
        onAddCategory={() => {
          setQuickCreateTarget({ type: "custom-product-category" });
          setQuickAddCategoryOpen(true);
        }}
        onCreated={(result: CustomProductResult) => {
          setProducts((prev) => {
            if (prev.some((p) => p.id === result.productId)) return prev;
            return [...prev, { id: result.productId, name: result.productNameSnapshot }];
          });
          setItems((prev) =>
            prev.map((row, i) =>
              i === customProductItemIndex
                ? {
                    ...row,
                    productId: result.productId,
                    variantId: result.variantId,
                    productNameSnapshot: result.productNameSnapshot,
                    variantNameSnapshot: result.variantNameSnapshot,
                    skuSnapshot: result.skuSnapshot,
                    colorId: result.colorId,
                    categoryId: result.categoryId,
                    gender: result.gender,
                    colorSnapshot: result.colorSnapshot,
                    categorySnapshot: result.categorySnapshot,
                    genderSnapshot: result.genderSnapshot,
                    description: result.description,
                    designImageUrl: result.designImageUrl,
                    moqSnapshot: result.moqSnapshot,
                    productionLeadTime: result.productionLeadTime,
                    unit: result.unit,
                    systemCode: result.systemCode ?? null,
                    variants: [
                      {
                        key: crypto.randomUUID(),
                        colorId: result.colorId,
                        colorNameSnapshot: result.colorSnapshot,
                        sizeValue: null,
                        skuSnapshot: result.skuSnapshot,
                        quantity: row.quantity > 0 ? row.quantity : 1,
                        unit: result.unit,
                      },
                    ],
                  }
                : row,
            ),
          );
          setCustomProductOpen(false);
          setInjectCustomProductColorId(null);
          setInjectCustomProductCategoryId(null);
        }}
      />
    </>
  );
}
