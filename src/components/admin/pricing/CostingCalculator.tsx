"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { formatPricingCurrency, formatPricingPercent } from "@/features/pricing/format";
import {
  COST_LIBRARY,
  COST_LIBRARY_CATEGORY_LABELS,
  costLibraryCategoryToComponentType,
  type CostLibraryCategory,
} from "@/features/pricing/cost-library";
import {
  COSTING_BOM_PRESETS,
  COSTING_BOM_PRESET_CATEGORY_LABELS,
  type CostingBomPresetCategory,
  type CostingBomPresetItem,
} from "@/features/pricing/costing-bom-presets";
import { COSTING_TEMPLATES } from "@/features/pricing/costing-templates";
import type {
  CostingCalculatorResult,
  CostingComponentInput,
  CostingComponentType,
  CostingQuantityBreakResult,
} from "@/features/pricing/costing-types";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };
type LeadOption = { id: string; fullName: string; companyName: string | null; company: string | null };
type CustomerOption = { id: string; name: string; code: string };
type ContactOption = { id: string; fullName: string };
type PriceGroupOption = { id: string; name: string; isDefault: boolean; isActive: boolean };

type ComponentRow = {
  label: string;
  type: CostingComponentType;
  unitCost: string;
  totalCost: string;
  quantityFactor: string;
  note: string;
};

const componentOptions: Array<{ value: CostingComponentType; label: string }> = [
  { value: "CUTTING", label: "Cắt" },
  { value: "SEWING", label: "May" },
  { value: "PRINTING", label: "In" },
  { value: "EMBROIDERY", label: "Thêu" },
  { value: "WASH", label: "Wash" },
  { value: "PACKAGING", label: "Đóng gói" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "OTHER", label: "Khác" },
];

const defaultComponents: ComponentRow[] = [
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

function bomItemToComponentRow(item: CostingBomPresetItem): ComponentRow {
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

function emptyComponent(): ComponentRow {
  return { label: "", type: "OTHER", unitCost: "", totalCost: "", quantityFactor: "1", note: "" };
}

export default function CostingCalculator() {
  const router = useRouter();
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
  const [components, setComponents] = useState<ComponentRow[]>(defaultComponents);
  const [overheadRate, setOverheadRate] = useState("0");
  const [targetMarginRate, setTargetMarginRate] = useState("35");
  const [vatRate, setVatRate] = useState("0");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(COSTING_TEMPLATES[0]?.key ?? "");
  const [costLibrarySearch, setCostLibrarySearch] = useState("");
  const [costLibraryCategory, setCostLibraryCategory] = useState<CostLibraryCategory | "ALL">("ALL");
  const [bomPresetCategory, setBomPresetCategory] = useState<CostingBomPresetCategory | "ALL">("ALL");
  const [selectedBomPresetKey, setSelectedBomPresetKey] = useState(COSTING_BOM_PRESETS[0]?.key ?? "");
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

  const derivedFabricCost = useMemo(() => {
    const price = toNumber(fabricPrice) ?? 0;
    const consumption = toNumber(fabricConsumption) ?? 0;
    if (price <= 0 || consumption <= 0) return null;
    return price / consumption;
  }, [fabricPrice, fabricConsumption]);

  const selectedTemplate = useMemo(
    () => COSTING_TEMPLATES.find((template) => template.key === selectedTemplateKey) ?? null,
    [selectedTemplateKey],
  );

  const filteredCostLibrary = useMemo(() => {
    const query = costLibrarySearch.trim().toLocaleLowerCase("vi-VN");
    return COST_LIBRARY.filter((item) => {
      if (costLibraryCategory !== "ALL" && item.category !== costLibraryCategory) return false;
      if (!query) return true;
      return item.name.toLocaleLowerCase("vi-VN").includes(query);
    });
  }, [costLibraryCategory, costLibrarySearch]);

  const filteredBomPresets = useMemo(() => {
    return COSTING_BOM_PRESETS.filter((preset) => {
      if (bomPresetCategory !== "ALL" && preset.category !== bomPresetCategory) return false;
      return true;
    });
  }, [bomPresetCategory]);

  const selectedBomPreset = useMemo(
    () => COSTING_BOM_PRESETS.find((preset) => preset.key === selectedBomPresetKey) ?? null,
    [selectedBomPresetKey],
  );

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=200").then((r) => r.json()),
      fetch("/api/crm/leads?limit=100").then((r) => r.json()),
      fetch("/api/crm/customers?limit=100").then((r) => r.json()),
      fetch("/api/pricing/price-groups").then((r) => r.json()),
    ]).then(([productsData, leadsData, customersData, groupsData]) => {
      setProducts((productsData as { products?: ProductOption[] }).products ?? []);
      setLeads((leadsData as { leads?: LeadOption[] }).leads ?? []);
      setCustomers((customersData as { customers?: CustomerOption[] }).customers ?? []);
      const nextGroups = (groupsData as { priceGroups?: PriceGroupOption[] }).priceGroups ?? [];
      setGroups(nextGroups);
      const defaultGroup = nextGroups.find((group) => group.isDefault);
      if (defaultGroup) setPriceGroupId(defaultGroup.id);
    }).catch(() => setError("Không thể tải dữ liệu nền cho bộ tính giá."));
  }, []);

  useEffect(() => {
    if (!customerId) { setContacts([]); setContactId(""); return; }
    void fetch(`/api/crm/customers/${customerId}`)
      .then((r) => r.json())
      .then((data: { customer?: { contacts?: ContactOption[] } }) => setContacts(data.customer?.contacts ?? []))
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
    if (mode === "calculate") setLoading(true); else setSaving(true);
    setError(null);
    try {
      const payload: ReturnType<typeof buildPayload> & { quantityBreaks?: CostingQuantityBreakResult[] } = buildPayload(mode);
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

  function updateComponent(index: number, patch: Partial<ComponentRow>) {
    setComponents((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function appendCostLibraryItem(itemId: string) {
    const item = COST_LIBRARY.find((entry) => entry.id === itemId);
    if (!item) return;
    setComponents((prev) => [
      ...prev,
      {
        label: item.name,
        type: costLibraryCategoryToComponentType(item.category, item.name),
        unitCost: String(item.defaultUnitCost),
        totalCost: "",
        quantityFactor: String(item.defaultQuantityFactor ?? 1),
        note: item.defaultNote ?? item.description ?? "",
      },
    ]);
  }

  function applyBomPreset() {
    if (!selectedBomPreset) return;

    if (
      selectedBomPreset.defaultUnit &&
      isUnsetOrDefault(unit, INITIAL_FIELD_DEFAULTS.unit)
    ) {
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

    setComponents((prev) => [
      ...prev,
      ...selectedBomPreset.items.map(bomItemToComponentRow),
    ]);
  }

  function applyTemplate() {
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

  return (
    <div className="admin-panel">
      <div className="admin-empty-state" style={{ alignItems: "flex-start", marginBottom: 20 }}>
        <strong>Costing linh hoạt cho sales</strong>
        <p>
          Dựa trên workflow Google Sheet: cost vải = giá vải / định mức, cộng bo/phụ liệu,
          công đoạn, overhead, margin và VAT. Có thể thêm chi phí tự do cho túi, nón, bình,
          bandana, gift set hoặc OEM.
        </p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <fieldset className="admin-catalog-fieldset">
        <legend>Mẫu costing nhanh</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Mẫu chi phí</label>
            <select className="admin-input" value={selectedTemplateKey} onChange={(e) => setSelectedTemplateKey(e.target.value)}>
              {COSTING_TEMPLATES.map((template) => (
                <option key={template.key} value={template.key}>{template.name}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Mô tả mẫu</label>
            <p style={{ margin: "8px 0 0" }}>{selectedTemplate?.description ?? "Chọn mẫu để áp dụng nhanh các giá trị mặc định."}</p>
          </div>
          <div className="admin-field">
            <label className="admin-label">Hành động</label>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={applyTemplate}
              disabled={!selectedTemplate}
            >
              Áp dụng mẫu
            </button>
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Sản phẩm / khách hàng</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Sản phẩm có sẵn</label>
            <select className="admin-input" value={productId} onChange={(e) => {
              setProductId(e.target.value);
              setVariantId("");
              void loadVariants(e.target.value);
            }}>
              <option value="">— Sản phẩm tùy chỉnh —</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Biến thể</label>
            <select className="admin-input" value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!productId}>
              <option value="">— Không chọn —</option>
              {(variantsMap[productId] ?? []).map((variant) => (
                <option key={variant.id} value={variant.id}>{variant.sku} {variant.colorName} {variant.sizeName}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tên sản phẩm tùy chỉnh</label>
            <input className="admin-input" value={customProductName} onChange={(e) => setCustomProductName(e.target.value)} placeholder="VD: Túi canvas 2 lớp, bình giữ nhiệt..." />
          </div>
          <div className="admin-field">
            <label className="admin-label">Số lượng</label>
            <input className="admin-input" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Đơn vị</label>
            <input className="admin-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Lead</label>
            <select className="admin-input" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ?? lead.company ?? ""}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Khách hàng</label>
            <select className="admin-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.code})</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Liên hệ</label>
            <select className="admin-input" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!customerId}>
              <option value="">— Không chọn —</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Nhóm giá</label>
            <select className="admin-input" value={priceGroupId} onChange={(e) => setPriceGroupId(e.target.value)}>
              <option value="">— Không chọn —</option>
              {groups.filter((group) => group.isActive).map((group) => (
                <option key={group.id} value={group.id}>{group.name} {group.isDefault ? "(mặc định)" : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Vải / vật liệu chính</legend>
        <div className="admin-seo-brief-form-grid">
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
            <input className="admin-input" type="number" min="0" value={fabricPrice} onChange={(e) => setFabricPrice(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Định mức</label>
            <input className="admin-input" type="number" min="0" step="0.01" value={fabricConsumption} onChange={(e) => setFabricConsumption(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Cost vải / đơn vị (override)</label>
            <input className="admin-input" type="number" min="0" value={fabricCostPerUnit} onChange={(e) => setFabricCostPerUnit(e.target.value)} placeholder={derivedFabricCost ? formatPricingCurrency(derivedFabricCost) : "Tự tính từ giá / định mức"} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Bo / phụ liệu chính / đơn vị</label>
            <input className="admin-input" type="number" min="0" value={ribCostPerUnit} onChange={(e) => setRibCostPerUnit(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>BOM preset</legend>
        <p style={{ marginTop: 0 }}>
          BOM preset chỉ giúp tạo nhanh cấu trúc chi phí. Sales vẫn có thể sửa/xóa từng dòng trước khi tính giá.
        </p>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Danh mục</label>
            <select
              className="admin-input"
              value={bomPresetCategory}
              onChange={(e) => {
                const nextCategory = e.target.value as CostingBomPresetCategory | "ALL";
                setBomPresetCategory(nextCategory);
                const nextPresets = COSTING_BOM_PRESETS.filter((preset) =>
                  nextCategory === "ALL" ? true : preset.category === nextCategory,
                );
                if (!nextPresets.some((preset) => preset.key === selectedBomPresetKey)) {
                  setSelectedBomPresetKey(nextPresets[0]?.key ?? "");
                }
              }}
            >
              <option value="ALL">Tất cả</option>
              {(Object.keys(COSTING_BOM_PRESET_CATEGORY_LABELS) as CostingBomPresetCategory[]).map(
                (category) => (
                  <option key={category} value={category}>
                    {COSTING_BOM_PRESET_CATEGORY_LABELS[category]}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Preset</label>
            <select
              className="admin-input"
              value={selectedBomPresetKey}
              onChange={(e) => setSelectedBomPresetKey(e.target.value)}
            >
              {filteredBomPresets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Mô tả</label>
            <p style={{ margin: "8px 0 0" }}>
              {selectedBomPreset?.description ?? "Chọn preset để xem cấu trúc BOM costing."}
            </p>
          </div>
          <div className="admin-field">
            <label className="admin-label">Hành động</label>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={applyBomPreset}
              disabled={!selectedBomPreset}
            >
              Áp dụng BOM preset
            </button>
          </div>
        </div>
        {selectedBomPreset && (
          <div style={{ marginTop: 12 }}>
            <p className="admin-field-hint" style={{ marginBottom: 8 }}>
              {selectedBomPreset.items.length} dòng sẽ được thêm vào bảng tính (không ghi đè dòng hiện có).
            </p>
            <ul className="admin-field-hint" style={{ margin: 0, paddingLeft: 18 }}>
              {selectedBomPreset.items.map((item) => (
                <li key={`${selectedBomPreset.key}-${item.label}`}>
                  {item.label} · {formatPricingCurrency(item.unitCost)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Thư viện chi phí</legend>
        <p style={{ marginTop: 0 }}>
          Chọn chi phí có sẵn để thêm nhanh vào bảng tính. Sales vẫn có thể chỉnh sửa sau khi áp dụng.
        </p>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Danh mục</label>
            <select
              className="admin-input"
              value={costLibraryCategory}
              onChange={(e) => setCostLibraryCategory(e.target.value as CostLibraryCategory | "ALL")}
            >
              <option value="ALL">Tất cả</option>
              {(Object.keys(COST_LIBRARY_CATEGORY_LABELS) as CostLibraryCategory[]).map((category) => (
                <option key={category} value={category}>
                  {COST_LIBRARY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tìm kiếm</label>
            <input
              className="admin-input"
              value={costLibrarySearch}
              onChange={(e) => setCostLibrarySearch(e.target.value)}
              placeholder="Tìm theo tên chi phí..."
            />
          </div>
        </div>
        {filteredCostLibrary.length === 0 ? (
          <p className="admin-field-hint" style={{ marginTop: 12 }}>Không tìm thấy chi phí phù hợp.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {filteredCostLibrary.map((item) => (
              <div
                key={item.id}
                className="admin-catalog-variant-row"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
              >
                <div>
                  <strong>{item.name}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--admin-muted, #6b7280)" }}>
                    {COST_LIBRARY_CATEGORY_LABELS[item.category]}
                    {" · "}
                    {formatPricingCurrency(item.defaultUnitCost)} / đơn vị
                    {item.defaultNote ? ` · ${item.defaultNote}` : ""}
                  </p>
                  {item.description && (
                    <p style={{ margin: "4px 0 0" }}>{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => appendCostLibraryItem(item.id)}
                >
                  + Thêm vào bảng tính
                </button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Công đoạn / chi phí mở rộng</legend>
        {components.map((row, index) => (
          <div key={index} className="admin-catalog-variant-row" style={{ marginBottom: 12 }}>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Tên chi phí</label>
                <input className="admin-input" value={row.label} onChange={(e) => updateComponent(index, { label: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Loại</label>
                <select className="admin-input" value={row.type} onChange={(e) => updateComponent(index, { type: e.target.value as CostingComponentType })}>
                  {componentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Cost / đơn vị</label>
                <input className="admin-input" type="number" min="0" value={row.unitCost} onChange={(e) => updateComponent(index, { unitCost: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Tổng cost dòng</label>
                <input className="admin-input" type="number" min="0" value={row.totalCost} onChange={(e) => updateComponent(index, { totalCost: e.target.value })} placeholder="Nếu nhập sẽ ưu tiên tổng" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Hệ số</label>
                <input className="admin-input" type="number" min="0" step="0.01" value={row.quantityFactor} onChange={(e) => updateComponent(index, { quantityFactor: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Ghi chú</label>
                <input className="admin-input" value={row.note} onChange={(e) => updateComponent(index, { note: e.target.value })} />
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setComponents(components.filter((_, i) => i !== index))}>Xóa dòng</button>
            </div>
          </div>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setComponents([...components, emptyComponent()])}>+ Thêm chi phí</button>
      </fieldset>

      <fieldset className="admin-catalog-fieldset">
        <legend>Overhead / Margin / VAT</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Overhead (%)</label>
            <input className="admin-input" type="number" min="0" value={overheadRate} onChange={(e) => setOverheadRate(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Target margin (%)</label>
            <input className="admin-input" type="number" min="0" max="99" value={targetMarginRate} onChange={(e) => setTargetMarginRate(e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">VAT (%)</label>
            <input className="admin-input" type="number" min="0" max="100" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          </div>
          <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
            <label className="admin-label">Ghi chú nội bộ</label>
            <textarea className="admin-textarea" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <AdminLoadingButton variant="primary" onClick={() => void postCosting("calculate")} pending={loading} pendingLabel="Đang tính costing…" disabled={saving}>
          Tính costing
        </AdminLoadingButton>
        <AdminLoadingButton variant="secondary" onClick={() => void postCosting("save")} pending={saving} pendingLabel="Đang lưu bản tính…" disabled={loading}>
          Lưu bản tính
        </AdminLoadingButton>
        <AdminLoadingButton variant="secondary" onClick={() => void postCosting("createQuote")} pending={saving} pendingLabel="Đang tạo báo giá…" disabled={loading}>
          Tạo báo giá nháp
        </AdminLoadingButton>
      </div>

      <fieldset className="admin-catalog-fieldset">
        <legend>Bảng giá theo số lượng</legend>
        <div className="admin-seo-brief-form-grid">
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
        <p style={{ marginTop: 10 }}>
          Bảng giá được tính theo dữ liệu tại thời điểm bấm nút.
        </p>
        {quantityBreaks.length > 0 && (
          <div className="admin-table-wrap" style={{ marginTop: 12 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Số lượng</th>
                  <th>Total cost / đơn vị</th>
                  <th>Giá bán / đơn vị</th>
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
                    <td>{formatPricingPercent(item.actualMarginRate)}</td>
                    <td>{formatPricingCurrency(item.finalQuotePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>

      {result && (
        <fieldset className="admin-catalog-fieldset">
          <legend>Kết quả costing</legend>
          {result.warnings.length > 0 && (
            <ul className="admin-kb-warning-list">
              {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          <div className="admin-catalog-kpi-bar">
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.totalCostPerUnit)}</strong><span>Total cost / đơn vị</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.totalCost)}</strong><span>Tổng cost</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.suggestedSellingPricePerUnit)}</strong><span>Giá bán đề xuất / đơn vị</span></div>
            <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{formatPricingCurrency(result.finalQuotePrice)}</strong><span>Giá báo cuối</span></div>
          </div>
          <div className="admin-catalog-kpi-bar" style={{ marginTop: 12 }}>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.materialCostPerUnit)}</strong><span>Material / đơn vị</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.processCostPerUnit)}</strong><span>Process / đơn vị</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingCurrency(result.grossProfit)}</strong><span>Gross profit</span></div>
            <div className="admin-catalog-kpi"><strong>{formatPricingPercent(result.actualMarginRate)}</strong><span>Margin thực tế</span></div>
          </div>

          <div className="admin-table-wrap" style={{ marginTop: 18 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Chi phí</th>
                  <th>Loại</th>
                  <th>Cost / đơn vị</th>
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
        </fieldset>
      )}
    </div>
  );
}
