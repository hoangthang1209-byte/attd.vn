"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import CostingBomQuickStart from "@/components/admin/pricing/costing/CostingBomQuickStart";
import CostingComponentTable, {
  type CostingComponentRow,
} from "@/components/admin/pricing/costing/CostingComponentTable";
import CostingCostPicker from "@/components/admin/pricing/costing/CostingCostPicker";
import CostingCustomCostForm, {
  type CustomCostFormValues,
} from "@/components/admin/pricing/costing/CostingCustomCostForm";
import CostingSummaryPanel from "@/components/admin/pricing/costing/CostingSummaryPanel";
import { formatPricingCurrency } from "@/features/pricing/format";
import {
  BUILTIN_COST_LIBRARY,
  costLibraryCategoryToComponentType,
  type CostLibraryItem,
} from "@/features/pricing/cost-library";
import {
  COSTING_BOM_PRESETS,
  type CostingBomPresetItem,
} from "@/features/pricing/costing-bom-presets";
import { COSTING_TEMPLATES } from "@/features/pricing/costing-templates";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import type {
  CostingCalculatorResult,
  CostingComponentInput,
  CostingQuantityBreakResult,
} from "@/features/pricing/costing-types";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };
type LeadOption = { id: string; fullName: string; companyName: string | null; company: string | null };
type CustomerOption = { id: string; name: string; code: string };
type ContactOption = { id: string; fullName: string };
type PriceGroupOption = { id: string; name: string; isDefault: boolean; isActive: boolean };

const defaultComponents: CostingComponentRow[] = [
  { label: "Cắt", type: "CUTTING", unitCost: "1000", totalCost: "", quantityFactor: "1", note: "" },
  { label: "May", type: "SEWING", unitCost: "20000", totalCost: "", quantityFactor: "1", note: "" },
  { label: "In", type: "PRINTING", unitCost: "9000", totalCost: "", quantityFactor: "1", note: "" },
  { label: "Đóng gói + bao bì, thùng", type: "PACKAGING", unitCost: "1000", totalCost: "", quantityFactor: "1", note: "" },
];

const INITIAL_FIELD_DEFAULTS = {
  unit: "cái",
  materialName: "65/35",
  fabricPrice: "135000",
  fabricConsumption: "3.7",
  ribCostPerUnit: "4600",
  overheadRate: "0",
  targetMarginRate: "35",
  vatRate: "0",
} as const;

function isUnsetOrDefault(current: string, defaultValue: string): boolean {
  const trimmed = current.trim();
  if (!trimmed) return true;
  return trimmed === defaultValue;
}

function bomItemToComponentRow(item: CostingBomPresetItem): CostingComponentRow {
  return {
    label: item.label,
    type: item.type,
    unitCost: String(item.unitCost),
    totalCost: "",
    quantityFactor: String(item.quantityFactor ?? 1),
    note: item.note ?? "",
  };
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function libraryItemToComponentRow(item: CostLibraryItem): CostingComponentRow {
  return {
    label: item.name,
    type: costLibraryCategoryToComponentType(item.category, item.name),
    unitCost: String(item.defaultUnitCost),
    totalCost: "",
    quantityFactor: String(item.defaultQuantityFactor ?? 1),
    note: item.defaultNote ?? item.description ?? "",
  };
}

function customValuesToComponentRow(values: CustomCostFormValues): CostingComponentRow {
  return {
    label: values.name.trim(),
    type: costLibraryCategoryToComponentType(values.category, values.name),
    unitCost: values.defaultUnitCost.trim(),
    totalCost: "",
    quantityFactor: "1",
    note: values.note.trim(),
  };
}

function variantLabel(variant: VariantOption | undefined): string | null {
  if (!variant) return null;
  return [variant.sku, variant.colorName, variant.sizeName].filter(Boolean).join(" · ") || variant.sku;
}

export default function CostingCalculator() {
  const router = useRouter();
  const { permissions } = useAdminPermissions();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, VariantOption[]>>({});
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [groups, setGroups] = useState<PriceGroupOption[]>([]);

  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("cái");
  const [materialName, setMaterialName] = useState("65/35");
  const [gsm, setGsm] = useState("");
  const [fabricPrice, setFabricPrice] = useState("135000");
  const [fabricConsumption, setFabricConsumption] = useState("3.7");
  const [fabricCostPerUnit, setFabricCostPerUnit] = useState("");
  const [ribCostPerUnit, setRibCostPerUnit] = useState("4600");
  const [components, setComponents] = useState<CostingComponentRow[]>(defaultComponents);
  const [overheadRate, setOverheadRate] = useState("0");
  const [targetMarginRate, setTargetMarginRate] = useState("35");
  const [vatRate, setVatRate] = useState("0");
  const [leadId, setLeadId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contactId, setContactId] = useState("");
  const [priceGroupId, setPriceGroupId] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [result, setResult] = useState<CostingCalculatorResult | null>(null);
  const [quantityTiers, setQuantityTiers] = useState("30, 50, 100, 300, 500, 1000");
  const [quantityBreaks, setQuantityBreaks] = useState<CostingQuantityBreakResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingBreaks, setLoadingBreaks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costPickerOpen, setCostPickerOpen] = useState(false);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [customCostOpen, setCustomCostOpen] = useState(false);
  const [customCostBusy, setCustomCostBusy] = useState(false);
  const [customCostError, setCustomCostError] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<CostLibraryItem[]>(BUILTIN_COST_LIBRARY);
  const [canManageLibrary, setCanManageLibrary] = useState(permissions.canAccessPricing);

  async function loadCostLibrary() {
    try {
      const res = await fetch("/api/pricing/cost-library");
      const data = await res.json() as {
        items?: CostLibraryItem[];
        canManageLibrary?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải thư viện chi phí");
      setLibraryItems(data.items ?? BUILTIN_COST_LIBRARY);
      if (data.canManageLibrary != null) setCanManageLibrary(data.canManageLibrary);
    } catch {
      setLibraryItems(BUILTIN_COST_LIBRARY);
    }
  }

  const derivedFabricCost = useMemo(() => {
    const price = toNumber(fabricPrice) ?? 0;
    const consumption = toNumber(fabricConsumption) ?? 0;
    if (price <= 0 || consumption <= 0) return null;
    return price / consumption;
  }, [fabricPrice, fabricConsumption]);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedVariant = (variantsMap[productId] ?? []).find((v) => v.id === variantId);

  const previewInput = useMemo(() => {
    const cleanComponents: CostingComponentInput[] = components
      .filter((row) => row.label.trim() || row.unitCost.trim() || row.totalCost.trim())
      .map((row) => ({
        label: row.label.trim() || "Chi phí khác",
        type: row.type,
        unitCost: toNumber(row.unitCost),
        totalCost: toNumber(row.totalCost),
        quantityFactor: toNumber(row.quantityFactor),
        note: row.note.trim() || undefined,
      }));

    return {
      productId: productId || undefined,
      variantId: variantId || undefined,
      customProductName: customProductName.trim() || undefined,
      quantity: toNumber(quantity) ?? 1,
      unit: unit.trim() || "cái",
      materialName: materialName.trim() || undefined,
      gsm: toNumber(gsm),
      fabricPrice: toNumber(fabricPrice),
      fabricConsumption: toNumber(fabricConsumption),
      fabricCostPerUnit: toNumber(fabricCostPerUnit),
      ribCostPerUnit: toNumber(ribCostPerUnit),
      components: cleanComponents,
      overheadRate: toNumber(overheadRate),
      targetMarginRate: toNumber(targetMarginRate),
      vatRate: toNumber(vatRate),
    };
  }, [
    components,
    customProductName,
    fabricConsumption,
    fabricCostPerUnit,
    fabricPrice,
    gsm,
    materialName,
    overheadRate,
    productId,
    quantity,
    ribCostPerUnit,
    targetMarginRate,
    unit,
    variantId,
    vatRate,
  ]);

  const livePreview = useMemo(
    () =>
      previewCostingCalculation(previewInput, {
        productName: selectedProduct?.name,
        variantName: variantLabel(selectedVariant),
      }),
    [previewInput, selectedProduct?.name, selectedVariant],
  );

  useEffect(() => {
    void loadCostLibrary();
    void Promise.all([
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/crm/leads?limit=100").then((r) => r.json()),
      fetch("/api/crm/customers?limit=100").then((r) => r.json()),
      fetch("/api/pricing/price-groups").then((r) => r.json()),
    ])
      .then(([productsData, leadsData, customersData, groupsData]) => {
        setProducts((productsData as { products?: ProductOption[] }).products ?? []);
        setLeads((leadsData as { leads?: LeadOption[] }).leads ?? []);
        setCustomers((customersData as { customers?: CustomerOption[] }).customers ?? []);
        const nextGroups = (groupsData as { priceGroups?: PriceGroupOption[] }).priceGroups ?? [];
        setGroups(nextGroups);
        const defaultGroup = nextGroups.find((group) => group.isDefault);
        if (defaultGroup) setPriceGroupId(defaultGroup.id);
      })
      .catch(() => setError("Không thể tải dữ liệu nền cho bộ tính giá."));
  }, []);

  useEffect(() => {
    if (!customerId) {
      setContacts([]);
      setContactId("");
      return;
    }
    void fetch(`/api/crm/customers/${customerId}`)
      .then((r) => r.json())
      .then((data: { customer?: { contacts?: ContactOption[] } }) =>
        setContacts(data.customer?.contacts ?? []),
      )
      .catch(() => setContacts([]));
  }, [customerId]);

  async function loadVariants(nextProductId: string) {
    if (!nextProductId || variantsMap[nextProductId]) return;
    const res = await fetch(`/api/admin/products/${nextProductId}`);
    const data = await res.json() as { variants?: VariantOption[] };
    setVariantsMap((prev) => ({ ...prev, [nextProductId]: data.variants ?? [] }));
  }

  function buildPayload(mode = "calculate") {
    const cleanComponents: CostingComponentInput[] = components
      .filter((row) => row.label.trim() || row.unitCost.trim() || row.totalCost.trim())
      .map((row) => ({
        label: row.label.trim() || "Chi phí khác",
        type: row.type,
        unitCost: toNumber(row.unitCost),
        totalCost: toNumber(row.totalCost),
        quantityFactor: toNumber(row.quantityFactor),
        note: row.note.trim() || undefined,
      }));

    return {
      mode,
      productId: productId || undefined,
      variantId: variantId || undefined,
      customProductName: customProductName.trim() || undefined,
      quantity: toNumber(quantity) ?? 1,
      unit: unit.trim() || "cái",
      materialName: materialName.trim() || undefined,
      gsm: toNumber(gsm),
      fabricPrice: toNumber(fabricPrice),
      fabricConsumption: toNumber(fabricConsumption),
      fabricCostPerUnit: toNumber(fabricCostPerUnit),
      ribCostPerUnit: toNumber(ribCostPerUnit),
      components: cleanComponents,
      overheadRate: toNumber(overheadRate),
      targetMarginRate: toNumber(targetMarginRate),
      vatRate: toNumber(vatRate),
      leadId: leadId || undefined,
      customerId: customerId || undefined,
      contactId: contactId || undefined,
      priceGroupId: priceGroupId || undefined,
      internalNote: internalNote.trim() || undefined,
    };
  }

  async function postCosting(mode: "calculate" | "save" | "createQuote") {
    if (mode === "calculate") setLoading(true);
    else setSaving(true);
    setError(null);
    try {
      const payload: ReturnType<typeof buildPayload> & { quantityBreaks?: CostingQuantityBreakResult[] } =
        buildPayload(mode);
      if (mode === "createQuote" || mode === "save") {
        payload.quantityBreaks = quantityBreaks;
      }
      const res = await fetch("/api/pricing/costing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as {
        result?: CostingCalculatorResult;
        saved?: { calculationId: string; quoteId?: string };
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể xử lý bộ tính giá");
      if (mode === "calculate") {
        setResult(data.result ?? null);
      } else if (mode === "createQuote" && data.saved?.quoteId) {
        router.push(`/admin/quotes/${data.saved.quoteId}`);
      } else if (data.saved?.calculationId) {
        router.push(`/admin/pricing/history/${data.saved.calculationId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi bộ tính giá");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }

  function updateComponent(index: number, patch: Partial<CostingComponentRow>) {
    setComponents((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function appendCostLibraryItem(itemId: string) {
    const item = libraryItems.find((entry) => entry.id === itemId);
    if (!item) return;
    setComponents((prev) => [...prev, libraryItemToComponentRow(item)]);
  }

  async function handleCustomCostSubmit(values: CustomCostFormValues) {
    setCustomCostBusy(true);
    setCustomCostError(null);
    const unitCost = toNumber(values.defaultUnitCost);
    if (unitCost == null || unitCost < 0) {
      setCustomCostError("Cost mặc định phải >= 0.");
      setCustomCostBusy(false);
      return;
    }
    if (!values.name.trim()) {
      setCustomCostError("Tên chi phí là bắt buộc.");
      setCustomCostBusy(false);
      return;
    }

    try {
      if (values.saveToLibrary && canManageLibrary) {
        const res = await fetch("/api/pricing/cost-library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: values.name.trim(),
            category: values.category,
            defaultUnitCost: unitCost,
            defaultNote: values.note.trim() || null,
            defaultQuantityFactor: 1,
          }),
        });
        const data = await res.json() as {
          item?: CostLibraryItem;
          existingItem?: CostLibraryItem | null;
          message?: string;
        };

        if (res.status === 409 && data.existingItem) {
          setComponents((prev) => [...prev, libraryItemToComponentRow(data.existingItem!)]);
          await loadCostLibrary();
          setCustomCostOpen(false);
          setCostPickerOpen(false);
          return;
        }

        if (!res.ok) {
          const code = (data as { code?: string }).code;
          if (code === "DUPLICATE_BUILTIN" && data.existingItem) {
            setComponents((prev) => [...prev, libraryItemToComponentRow(data.existingItem!)]);
            setCustomCostOpen(false);
            setCostPickerOpen(false);
            return;
          }
          throw new Error(data.message ?? "Không thể lưu vào thư viện chi phí");
        }

        if (data.item) {
          setComponents((prev) => [...prev, libraryItemToComponentRow(data.item!)]);
          await loadCostLibrary();
        } else {
          setComponents((prev) => [...prev, customValuesToComponentRow(values)]);
        }
      } else {
        setComponents((prev) => [...prev, customValuesToComponentRow(values)]);
      }

      setCustomCostOpen(false);
      setCostPickerOpen(false);
    } catch (err) {
      setCustomCostError(err instanceof Error ? err.message : "Không thể thêm chi phí");
    } finally {
      setCustomCostBusy(false);
    }
  }

  function applyBomPreset(presetKey: string) {
    const selectedBomPreset = COSTING_BOM_PRESETS.find((preset) => preset.key === presetKey);
    if (!selectedBomPreset) return;

    if (selectedBomPreset.defaultUnit && isUnsetOrDefault(unit, INITIAL_FIELD_DEFAULTS.unit)) {
      setUnit(selectedBomPreset.defaultUnit);
    }
    if (
      selectedBomPreset.defaultMaterialName &&
      isUnsetOrDefault(materialName, INITIAL_FIELD_DEFAULTS.materialName)
    ) {
      setMaterialName(selectedBomPreset.defaultMaterialName);
    }
    if (
      selectedBomPreset.defaultFabricPrice != null &&
      isUnsetOrDefault(fabricPrice, INITIAL_FIELD_DEFAULTS.fabricPrice)
    ) {
      setFabricPrice(String(selectedBomPreset.defaultFabricPrice));
    }
    if (
      selectedBomPreset.defaultFabricConsumption != null &&
      isUnsetOrDefault(fabricConsumption, INITIAL_FIELD_DEFAULTS.fabricConsumption)
    ) {
      setFabricConsumption(String(selectedBomPreset.defaultFabricConsumption));
    }
    if (
      selectedBomPreset.defaultRibCostPerUnit != null &&
      isUnsetOrDefault(ribCostPerUnit, INITIAL_FIELD_DEFAULTS.ribCostPerUnit)
    ) {
      setRibCostPerUnit(String(selectedBomPreset.defaultRibCostPerUnit));
    }
    if (
      selectedBomPreset.defaultOverheadRate != null &&
      isUnsetOrDefault(overheadRate, INITIAL_FIELD_DEFAULTS.overheadRate)
    ) {
      setOverheadRate(String(selectedBomPreset.defaultOverheadRate));
    }
    if (
      selectedBomPreset.defaultTargetMarginRate != null &&
      isUnsetOrDefault(targetMarginRate, INITIAL_FIELD_DEFAULTS.targetMarginRate)
    ) {
      setTargetMarginRate(String(selectedBomPreset.defaultTargetMarginRate));
    }
    if (
      selectedBomPreset.defaultVatRate != null &&
      isUnsetOrDefault(vatRate, INITIAL_FIELD_DEFAULTS.vatRate)
    ) {
      setVatRate(String(selectedBomPreset.defaultVatRate));
    }

    setComponents((prev) => [...prev, ...selectedBomPreset.items.map(bomItemToComponentRow)]);
  }

  function applyTemplate(templateKey: string) {
    const selectedTemplate = COSTING_TEMPLATES.find((template) => template.key === templateKey);
    if (!selectedTemplate) return;
    setUnit(selectedTemplate.defaultUnit);
    setMaterialName(selectedTemplate.defaultMaterialName);
    setFabricPrice(String(selectedTemplate.defaultFabricPrice));
    setFabricConsumption(String(selectedTemplate.defaultFabricConsumption));
    setRibCostPerUnit(String(selectedTemplate.defaultRibCostPerUnit));
    setOverheadRate(String(selectedTemplate.defaultOverheadRate));
    setTargetMarginRate(String(selectedTemplate.defaultTargetMarginRate));
    setVatRate(String(selectedTemplate.defaultVatRate));
    setComponents(
      selectedTemplate.defaultComponents.map((component) => ({
        label: component.label,
        type: component.type,
        unitCost: component.unitCost != null ? String(component.unitCost) : "",
        totalCost: component.totalCost != null ? String(component.totalCost) : "",
        quantityFactor: component.quantityFactor != null ? String(component.quantityFactor) : "1",
        note: component.note ?? "",
      })),
    );
  }

  async function postQuantityBreaks() {
    setLoadingBreaks(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing/costing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload("quantityBreaks"), quantityTiers }),
      });
      const data = await res.json() as { breaks?: CostingQuantityBreakResult[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tính bảng giá theo số lượng");
      setQuantityBreaks(data.breaks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tính bảng giá theo số lượng");
    } finally {
      setLoadingBreaks(false);
    }
  }

  const parsedQuantity = Math.max(1, toNumber(quantity) ?? 1);

  return (
    <div className="costing-workspace">
      <div className="costing-workspace__main">
        {error && <p className="admin-error">{error}</p>}

        <section className="costing-section">
          <h2 className="costing-section__title">Thông tin costing</h2>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Sản phẩm có sẵn</label>
              <select
                className="admin-input"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setVariantId("");
                  void loadVariants(e.target.value);
                }}
              >
                <option value="">— Sản phẩm tùy chỉnh —</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Biến thể</label>
              <select
                className="admin-input"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                disabled={!productId}
              >
                <option value="">— Không chọn —</option>
                {(variantsMap[productId] ?? []).map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.sku} {variant.colorName} {variant.sizeName}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Tên sản phẩm tùy chỉnh</label>
              <input
                className="admin-input"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                placeholder="VD: Sleeveless Top, Tour Hoodie..."
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Số lượng</label>
              <input
                className="admin-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Đơn vị</label>
              <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Target margin (%)</label>
              <input
                className="admin-input"
                type="number"
                min="0"
                max="99"
                value={targetMarginRate}
                onChange={(e) => setTargetMarginRate(e.target.value)}
              />
            </div>
          </div>

          <details className="costing-details">
            <summary>Thông tin bổ sung (lead, khách hàng, nhóm giá)</summary>
            <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
              <div className="admin-field">
                <label className="admin-label">Lead</label>
                <select className="admin-input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                  <option value="">— Không chọn —</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.fullName} {lead.companyName ?? lead.company ?? ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Khách hàng</label>
                <select
                  className="admin-input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">— Không chọn —</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Liên hệ</label>
                <select
                  className="admin-input"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  disabled={!customerId}
                >
                  <option value="">— Không chọn —</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Nhóm giá</label>
                <select
                  className="admin-input"
                  value={priceGroupId}
                  onChange={(e) => setPriceGroupId(e.target.value)}
                >
                  <option value="">— Không chọn —</option>
                  {groups
                    .filter((group) => group.isActive)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} {group.isDefault ? "(mặc định)" : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </details>
        </section>

        <section className="costing-section">
          <div className="costing-section__head">
            <h2 className="costing-section__title">Chi phí</h2>
            <div className="costing-section__actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => setQuickStartOpen(true)}
              >
                Bắt đầu nhanh từ mẫu
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--small"
                onClick={() => setCostPickerOpen(true)}
              >
                + Thêm chi phí
              </button>
            </div>
          </div>

          <details className="costing-details costing-details--fabric">
            <summary>Vải & phụ liệu chính</summary>
            <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
              <div className="admin-field">
                <label className="admin-label">Tên vải / vật liệu</label>
                <input className="admin-input" value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
              </div>
              <div className="admin-field">
                <label className="admin-label">GSM</label>
                <input className="admin-input" type="number" min="0" value={gsm} onChange={(e) => setGsm(e.target.value)} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá vải / vật liệu</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={fabricPrice}
                  onChange={(e) => setFabricPrice(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Định mức</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fabricConsumption}
                  onChange={(e) => setFabricConsumption(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Cost vải / SP (override)</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={fabricCostPerUnit}
                  onChange={(e) => setFabricCostPerUnit(e.target.value)}
                  placeholder={
                    derivedFabricCost ? formatPricingCurrency(derivedFabricCost) : "Tự tính từ giá / định mức"
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Bo / phụ liệu chính / SP</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={ribCostPerUnit}
                  onChange={(e) => setRibCostPerUnit(e.target.value)}
                />
              </div>
            </div>
          </details>

          <div className="costing-breakdown">
            <p className="costing-breakdown__title">Cấu trúc giá vốn / SP</p>
            <ul className="costing-breakdown__list">
              {livePreview.components.map((component) => (
                <li key={component.key}>
                  <span>{component.label}</span>
                  <span>{formatPricingCurrency(component.unitCost)}</span>
                </li>
              ))}
            </ul>
            <div className="costing-breakdown__total">
              <span>GIÁ VỐN / SP</span>
              <strong>{formatPricingCurrency(livePreview.totalCostPerUnit)}</strong>
            </div>
            {livePreview.overheadRate > 0 && (
              <p className="admin-field-hint">
                Overhead {livePreview.overheadRate}% ·{" "}
                {formatPricingCurrency(livePreview.overheadCostPerUnit)}/SP
              </p>
            )}
          </div>

          <CostingComponentTable
            rows={components}
            quantity={parsedQuantity}
            onUpdate={updateComponent}
            onRemove={(index) => setComponents(components.filter((_, i) => i !== index))}
          />
        </section>

        <section className="costing-section costing-section--actions">
          <div className="costing-actions">
            <AdminLoadingButton
              variant="primary"
              onClick={() => void postCosting("calculate")}
              pending={loading}
              pendingLabel="Đang tính costing…"
              disabled={saving}
            >
              Tính costing
            </AdminLoadingButton>
            {result && (
              <AdminLoadingButton
                variant="secondary"
                onClick={() => void postCosting("save")}
                pending={saving}
                pendingLabel="Đang lưu bản tính…"
                disabled={loading}
              >
                Lưu bản tính
              </AdminLoadingButton>
            )}
          </div>
          <details className="costing-details">
            <summary>Hành động phụ (tạo báo giá nháp)</summary>
            <div style={{ marginTop: 12 }}>
              <AdminLoadingButton
                variant="secondary"
                onClick={() => void postCosting("createQuote")}
                pending={saving}
                pendingLabel="Đang tạo báo giá…"
                disabled={loading || !result}
              >
                Tạo báo giá nháp
              </AdminLoadingButton>
              {!result && (
                <p className="admin-field-hint" style={{ marginTop: 8 }}>
                  Tính costing trước khi tạo báo giá nháp.
                </p>
              )}
            </div>
          </details>
        </section>

        <details className="costing-details costing-details--advanced">
          <summary>Cài đặt giá nâng cao (overhead, VAT, ghi chú)</summary>
          <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
            <div className="admin-field">
              <label className="admin-label">Overhead (%)</label>
              <input
                className="admin-input"
                type="number"
                min="0"
                value={overheadRate}
                onChange={(e) => setOverheadRate(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">VAT (%)</label>
              <input
                className="admin-input"
                type="number"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
              />
            </div>
            <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Ghi chú nội bộ</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
              />
            </div>
          </div>
        </details>

        <details className="costing-details">
          <summary>Bảng giá theo số lượng</summary>
          <div className="admin-seo-brief-form-grid" style={{ marginTop: 12 }}>
            <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
              <label className="admin-label">Các mốc số lượng (phân tách bằng dấu phẩy)</label>
              <input
                className="admin-input"
                value={quantityTiers}
                onChange={(e) => setQuantityTiers(e.target.value)}
                placeholder="30, 50, 100, 300, 500, 1000"
              />
            </div>
            <div className="admin-field">
              <AdminLoadingButton
                variant="secondary"
                onClick={() => void postQuantityBreaks()}
                pending={loadingBreaks}
                pendingLabel="Đang tính bảng giá…"
                disabled={loading || saving}
              >
                Tính bảng giá
              </AdminLoadingButton>
            </div>
          </div>
          {quantityBreaks.length > 0 && (
            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Số lượng</th>
                    <th>Total cost / SP</th>
                    <th>Giá bán / SP</th>
                    <th>Doanh thu trước VAT</th>
                    <th>Lợi nhuận gộp</th>
                    <th>Margin %</th>
                    <th>Giá báo cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {quantityBreaks.map((item) => (
                    <tr key={item.quantity}>
                      <td>{item.quantity.toLocaleString("vi-VN")}</td>
                      <td>{formatPricingCurrency(item.totalCostPerUnit)}</td>
                      <td>{formatPricingCurrency(item.suggestedSellingPricePerUnit)}</td>
                      <td>{formatPricingCurrency(item.revenueBeforeVat)}</td>
                      <td>{formatPricingCurrency(item.grossProfit)}</td>
                      <td>{item.actualMarginRate}%</td>
                      <td>{formatPricingCurrency(item.finalQuotePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>

        {result && (
          <details className="costing-details">
            <summary>Chi tiết kết quả tính (sau khi bấm Tính costing)</summary>
            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Chi phí</th>
                    <th>Loại</th>
                    <th>Cost / SP</th>
                    <th>Tổng cost</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {result.components.map((component) => (
                    <tr key={component.key}>
                      <td>{component.label}</td>
                      <td>{component.type}</td>
                      <td>{formatPricingCurrency(component.unitCost)}</td>
                      <td>{formatPricingCurrency(component.totalCost)}</td>
                      <td>{component.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      <CostingSummaryPanel preview={livePreview} officialResult={result} />

      <CostingCostPicker
        open={costPickerOpen}
        items={libraryItems}
        onClose={() => setCostPickerOpen(false)}
        onPickLibraryItem={appendCostLibraryItem}
        onOpenCustomForm={() => {
          setCustomCostError(null);
          setCustomCostOpen(true);
        }}
      />

      <CostingCustomCostForm
        open={customCostOpen}
        busy={customCostBusy}
        error={customCostError}
        canSaveToLibrary={canManageLibrary}
        onClose={() => setCustomCostOpen(false)}
        onSubmit={(values) => void handleCustomCostSubmit(values)}
      />

      <CostingBomQuickStart
        open={quickStartOpen}
        onClose={() => setQuickStartOpen(false)}
        onApplyTemplate={applyTemplate}
        onApplyBomPreset={applyBomPreset}
      />
    </div>
  );
}
