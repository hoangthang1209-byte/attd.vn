"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import {
  buildCostingWorkspaceClone,
  type CostingCalculationCloneRecord,
  type CostingWorkspaceClone,
} from "@/features/pricing/costing-calculation-clone";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import CostingBomQuickStart from "@/components/admin/pricing/costing/CostingBomQuickStart";
import CostingSourcePickerDialog, {
  type CostingSourcePickerSelection,
} from "@/components/admin/pricing/costing/CostingSourcePickerDialog";
import CostingStructuredSection from "@/components/admin/pricing/costing/CostingStructuredSection";
import CostingSummaryPanel from "@/components/admin/pricing/costing/CostingSummaryPanel";
import { formatPricingCurrency } from "@/features/pricing/format";
import { COSTING_BOM_PRESETS } from "@/features/pricing/costing-bom-presets";
import { COSTING_TEMPLATES } from "@/features/pricing/costing-templates";
import { previewCostingCalculation } from "@/features/pricing/costing-preview";
import type {
  CostingCalculatorResult,
  CostingQuantityBreakResult,
  CostingStructuredLine,
} from "@/features/pricing/costing-types";
import {
  COSTING_WORKSPACE_VERSION,
  costLinesFromBomItems,
  defaultV2ProcessLines,
  emptyCustomMaterialLine,
  emptyCustomProcessLine,
  emptyManualOtherLine,
  finalizeStructuredLine,
  projectLegacyInputToCostLines,
  structuredLineFromSourcePick,
} from "@/features/pricing/costing-v2";
import { parseCostingCustomerIdParam } from "@/features/crm/customer-costing-bridge";

type ProductOption = { id: string; name: string; productCode: string | null };
type VariantOption = { id: string; sku: string; colorName: string | null; sizeName: string | null };
type LeadOption = { id: string; fullName: string; companyName: string | null; company: string | null };
type CustomerOption = { id: string; name: string; code: string };
type ContactOption = { id: string; fullName: string };
type PriceGroupOption = { id: string; name: string; isDefault: boolean; isActive: boolean };

const INITIAL_FIELD_DEFAULTS = {
  unit: "cái",
  overheadRate: "0",
  targetMarginRate: "35",
  vatRate: "0",
} as const;

function isUnsetOrDefault(current: string, defaultValue: string): boolean {
  const trimmed = current.trim();
  if (!trimmed) return true;
  return trimmed === defaultValue;
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function variantLabel(variant: VariantOption | undefined): string | null {
  if (!variant) return null;
  return [variant.sku, variant.colorName, variant.sizeName].filter(Boolean).join(" · ") || variant.sku;
}

export default function CostingCalculator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCalculationId = searchParams.get("fromCalculation");
  const customerIdFromUrl = parseCostingCustomerIdParam(searchParams.get("customerId"));
  const batchId = searchParams.get("batchId");
  const batchItemId = searchParams.get("batchItemId");
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
  const [costLines, setCostLines] = useState<CostingStructuredLine[]>(() => defaultV2ProcessLines());
  const [overheadRate, setOverheadRate] = useState("0");
  const [targetMarginRate, setTargetMarginRate] = useState("35");
  const [vatRate, setVatRate] = useState("0");
  const [leadId, setLeadId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerPrefillLabel, setCustomerPrefillLabel] = useState<string | null>(null);
  const [customerPrefillError, setCustomerPrefillError] = useState<string | null>(null);
  const [customerPrefillDone, setCustomerPrefillDone] = useState(false);
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
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [replaceLineKey, setReplaceLineKey] = useState<string | null>(null);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [revisionCloneSource, setRevisionCloneSource] = useState<{
    code: string;
    revisionDisplay: string;
  } | null>(null);
  const [loadingClone, setLoadingClone] = useState(false);

  function applyCostingWorkspaceClone(workspace: CostingWorkspaceClone) {
    setProductId(workspace.productId);
    setVariantId(workspace.variantId);
    setCustomProductName(workspace.customProductName);
    setQuantity(workspace.quantity);
    setUnit(workspace.unit);
    setCostLines(
      workspace.costLines?.length
        ? workspace.costLines
        : projectLegacyInputToCostLines({
            customProductName: workspace.customProductName,
            quantity: toNumber(workspace.quantity) ?? 1,
            unit: workspace.unit,
            materialName: workspace.materialName,
            gsm: toNumber(workspace.gsm),
            fabricPrice: toNumber(workspace.fabricPrice),
            fabricConsumption: toNumber(workspace.fabricConsumption),
            fabricCostPerUnit: toNumber(workspace.fabricCostPerUnit),
            ribCostPerUnit: toNumber(workspace.ribCostPerUnit),
            components: workspace.components.map((row) => ({
              label: row.label,
              type: row.type,
              unitCost: toNumber(row.unitCost),
              totalCost: toNumber(row.totalCost),
              quantityFactor: toNumber(row.quantityFactor),
              note: row.note,
            })),
            overheadRate: toNumber(workspace.overheadRate),
            targetMarginRate: toNumber(workspace.targetMarginRate),
            vatRate: toNumber(workspace.vatRate),
          }),
    );
    setOverheadRate(workspace.overheadRate);
    setTargetMarginRate(workspace.targetMarginRate);
    setVatRate(workspace.vatRate);
    setLeadId(workspace.leadId);
    setCustomerId(workspace.customerId);
    setContactId(workspace.contactId);
    setPriceGroupId(workspace.priceGroupId);
    setInternalNote(workspace.internalNote);
    setQuantityTiers(workspace.quantityTiers);
  }

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedVariant = (variantsMap[productId] ?? []).find((v) => v.id === variantId);
  const parsedQuantity = Math.max(1, toNumber(quantity) ?? 1);
  const finalizedCostLines = useMemo(
    () => costLines.map((line) => finalizeStructuredLine(line, parsedQuantity)),
    [costLines, parsedQuantity],
  );

  const previewInput = useMemo(
    () => ({
      productId: productId || undefined,
      variantId: variantId || undefined,
      customProductName: customProductName.trim() || undefined,
      quantity: parsedQuantity,
      unit: unit.trim() || "cái",
      workspaceVersion: COSTING_WORKSPACE_VERSION,
      costLines: finalizedCostLines,
      overheadRate: toNumber(overheadRate),
      targetMarginRate: toNumber(targetMarginRate),
      vatRate: toNumber(vatRate),
    }),
    [
      customProductName,
      finalizedCostLines,
      overheadRate,
      parsedQuantity,
      productId,
      targetMarginRate,
      unit,
      variantId,
      vatRate,
    ],
  );

  const livePreview = useMemo(
    () =>
      previewCostingCalculation(previewInput, {
        productName: selectedProduct?.name,
        variantName: variantLabel(selectedVariant),
      }),
    [previewInput, selectedProduct?.name, selectedVariant],
  );

  useEffect(() => {
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
        if (!fromCalculationId) {
          const defaultGroup = nextGroups.find((group) => group.isDefault);
          if (defaultGroup) setPriceGroupId(defaultGroup.id);
        }
      })
      .catch(() => setError("Không thể tải dữ liệu nền cho bộ tính giá."));
  }, [fromCalculationId]);

  useEffect(() => {
    if (!fromCalculationId) return;

    let cancelled = false;
    setLoadingClone(true);
    setError(null);

    void fetch(`/api/pricing/calculations/${fromCalculationId}`)
      .then(async (res) => {
        const data = await res.json() as {
          calculation?: CostingCalculationCloneRecord;
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? "Không thể tải bản tính giá nguồn");
        if (!data.calculation) throw new Error("Không tìm thấy bản tính giá nguồn");

        const workspace = buildCostingWorkspaceClone(data.calculation);
        if (!workspace) throw new Error("Bản tính giá này không có dữ liệu costing để sao chép.");
        if (cancelled) return;

        applyCostingWorkspaceClone(workspace);
        setRevisionCloneSource({
          code: workspace.sourceCode,
          revisionDisplay: workspace.sourceRevisionDisplay,
        });
        setResult(null);
        setQuantityBreaks([]);
        if (workspace.productId) void loadVariants(workspace.productId);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingClone(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromCalculationId]);

  useEffect(() => {
    // fromCalculation clone owns customer selection; do not fight it with URL prefill.
    if (fromCalculationId || !customerIdFromUrl || customerPrefillDone) return;

    let cancelled = false;
    void fetch(`/api/crm/customers/${encodeURIComponent(customerIdFromUrl)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          customer?: { id: string; name: string; code: string; contacts?: ContactOption[] };
          message?: string;
        };
        if (!res.ok || !data.customer?.id) {
          throw new Error(data.message ?? "Không tìm thấy khách hàng.");
        }
        if (cancelled) return;
        const option: CustomerOption = {
          id: data.customer.id,
          name: data.customer.name,
          code: data.customer.code,
        };
        setCustomers((prev) =>
          prev.some((row) => row.id === option.id) ? prev : [option, ...prev],
        );
        setCustomerId(option.id);
        setCustomerPrefillLabel(`${option.name} (${option.code})`);
        setCustomerPrefillError(null);
        setContacts(data.customer.contacts ?? []);
        setCustomerPrefillDone(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setCustomerPrefillError(
          err.message || "Không thể chọn khách hàng từ liên kết. Vui lòng chọn lại.",
        );
        setCustomerPrefillLabel(null);
        setCustomerPrefillDone(true);
      });

    return () => {
      cancelled = true;
    };
  }, [customerIdFromUrl, fromCalculationId, customerPrefillDone]);

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
    return {
      mode,
      productId: productId || undefined,
      variantId: variantId || undefined,
      customProductName: customProductName.trim() || undefined,
      quantity: parsedQuantity,
      unit: unit.trim() || "cái",
      workspaceVersion: COSTING_WORKSPACE_VERSION,
      costLines: finalizedCostLines,
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
        body: JSON.stringify({
          ...payload,
          batchItemId: batchItemId || undefined,
        }),
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
        if (batchId) {
          router.push(`/admin/pricing/costing/batch/${batchId}`);
        } else {
          router.push(`/admin/pricing/history/${data.saved.calculationId}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi bộ tính giá");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  }

  function updateCostLine(key: string, patch: Partial<CostingStructuredLine>) {
    setCostLines((prev) =>
      prev.map((line) => (line.key === key ? finalizeStructuredLine({ ...line, ...patch }, parsedQuantity) : line)),
    );
  }

  function removeCostLine(key: string) {
    setCostLines((prev) => prev.filter((line) => line.key !== key));
  }

  function handleSourcePick(section: "MATERIAL" | "PROCESS", selection: CostingSourcePickerSelection) {
    const nextLine = structuredLineFromSourcePick({
      section,
      source: selection.source,
      price: selection.price,
      manual: selection.manual,
      quantity: parsedQuantity,
    });
    setCostLines((prev) => {
      if (!replaceLineKey) return [...prev, nextLine];
      return prev.map((line) =>
        line.key === replaceLineKey
          ? { ...nextLine, key: replaceLineKey, consumption: null }
          : line,
      );
    });
    setReplaceLineKey(null);
    setMaterialPickerOpen(false);
    setServicePickerOpen(false);
  }

  function applyBomPreset(presetKey: string) {
    const selectedBomPreset = COSTING_BOM_PRESETS.find((preset) => preset.key === presetKey);
    if (!selectedBomPreset) return;

    if (selectedBomPreset.defaultUnit && isUnsetOrDefault(unit, INITIAL_FIELD_DEFAULTS.unit)) {
      setUnit(selectedBomPreset.defaultUnit);
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

    const mapped = costLinesFromBomItems(selectedBomPreset.items, {
      quantity: parsedQuantity,
      materialName: selectedBomPreset.defaultMaterialName,
      fabricPrice: selectedBomPreset.defaultFabricPrice,
      fabricConsumption: selectedBomPreset.defaultFabricConsumption,
      ribCostPerUnit: selectedBomPreset.defaultRibCostPerUnit,
    });
    setCostLines((prev) => [...prev, ...mapped]);
  }

  function applyTemplate(templateKey: string) {
    const selectedTemplate = COSTING_TEMPLATES.find((template) => template.key === templateKey);
    if (!selectedTemplate) return;
    setUnit(selectedTemplate.defaultUnit);
    setOverheadRate(String(selectedTemplate.defaultOverheadRate));
    setTargetMarginRate(String(selectedTemplate.defaultTargetMarginRate));
    setVatRate(String(selectedTemplate.defaultVatRate));
    setCostLines(
      costLinesFromBomItems(selectedTemplate.defaultComponents.map((component) => ({
        label: component.label,
        type: component.type,
        unitCost: component.unitCost ?? 0,
        quantityFactor: component.quantityFactor,
        note: component.note,
      })), {
        quantity: parsedQuantity,
        materialName: selectedTemplate.defaultMaterialName,
        fabricPrice: selectedTemplate.defaultFabricPrice,
        fabricConsumption: selectedTemplate.defaultFabricConsumption,
        ribCostPerUnit: selectedTemplate.defaultRibCostPerUnit,
      }),
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

  if (loadingClone && fromCalculationId) {
    return <AdminLoadingState label="Đang tải bản tính giá nguồn…" />;
  }

  return (
    <div className="costing-workspace">
      <div className="costing-workspace__main">
        {revisionCloneSource && (
          <p
            className="admin-kb-badge admin-kb-badge--ai"
            style={{ display: "block", marginBottom: 16, padding: "10px 12px" }}
          >
            Đang tạo phiên bản mới từ {revisionCloneSource.code} · {revisionCloneSource.revisionDisplay}
          </p>
        )}
        {customerPrefillLabel && !fromCalculationId && (
          <p
            className="admin-kb-badge admin-kb-badge--medium"
            style={{ display: "block", marginBottom: 16, padding: "10px 12px" }}
          >
            Khách hàng: <strong>{customerPrefillLabel}</strong>
          </p>
        )}
        {customerPrefillError && !fromCalculationId && (
          <p className="admin-error" role="alert">
            {customerPrefillError}
          </p>
        )}
        {batchId && (
          <p
            className="admin-kb-badge admin-kb-badge--medium"
            style={{ display: "block", marginBottom: 16, padding: "10px 12px" }}
          >
            Costing trong batch
            {batchItemId && <> · dòng {batchItemId.slice(0, 8)}…</>}
            {" · "}
            <Link href={`/admin/pricing/costing/batch/${batchId}`}>Quay lại batch</Link>
          </p>
        )}
        {error && <p className="admin-error">{error}</p>}

        <section className="costing-section">
          <div className="costing-section__head">
            <h2 className="costing-section__title">Thông tin tính giá</h2>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => setQuickStartOpen(true)}
            >
              Bắt đầu nhanh từ mẫu
            </button>
          </div>
          <div className="admin-seo-brief-form-grid">
            <div className="admin-field">
              <label className="admin-label">Khách hàng</label>
              <select
                className="admin-input"
                value={customerId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCustomerId(nextId);
                  setCustomerPrefillError(null);
                  if (!nextId) {
                    setCustomerPrefillLabel(null);
                    return;
                  }
                  const selected = customers.find((row) => row.id === nextId);
                  setCustomerPrefillLabel(
                    selected ? `${selected.name} (${selected.code})` : null,
                  );
                }}
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
              <label className="admin-label">Sản phẩm</label>
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

          <details className="costing-details">
            <summary>Thông tin bổ sung (lead, liên hệ)</summary>
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
            </div>
          </details>
        </section>

        <CostingStructuredSection
          section="MATERIAL"
          title="Nguyên vật liệu & phụ liệu"
          addLabel="+ Thêm nguyên phụ liệu"
          lines={finalizedCostLines.filter((line) => line.section === "MATERIAL")}
          quantity={parsedQuantity}
          subtotal={livePreview.materialCostPerUnit}
          onAdd={() => {
            setReplaceLineKey(null);
            setMaterialPickerOpen(true);
          }}
          onChange={updateCostLine}
          onRemove={removeCostLine}
          onReplaceSource={(key) => {
            setReplaceLineKey(key);
            setMaterialPickerOpen(true);
          }}
        />

        <CostingStructuredSection
          section="PROCESS"
          title="Gia công & dịch vụ"
          addLabel="+ Thêm gia công"
          lines={finalizedCostLines.filter((line) => line.section === "PROCESS")}
          quantity={parsedQuantity}
          subtotal={livePreview.processCostPerUnit}
          onAdd={() => setServicePickerOpen(true)}
          onChange={updateCostLine}
          onRemove={removeCostLine}
        />

        <CostingStructuredSection
          section="OTHER"
          title="Chi phí khác"
          addLabel="+ Chi phí khác"
          lines={finalizedCostLines.filter((line) => line.section === "OTHER")}
          quantity={parsedQuantity}
          subtotal={livePreview.otherCostPerUnit ?? 0}
          onAdd={() => setCostLines((prev) => [...prev, emptyManualOtherLine(parsedQuantity)])}
          onChange={updateCostLine}
          onRemove={removeCostLine}
        />

        <p className="admin-field-hint costing-manual-escape">
          Không tìm thấy trong thư viện? Thêm dòng thủ công từ picker hoặc dùng Chi phí khác.
        </p>

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

      <CostingSourcePickerDialog
        open={materialPickerOpen}
        kind="MATERIALS"
        title="Thêm nguyên phụ liệu"
        onClose={() => {
          setMaterialPickerOpen(false);
          setReplaceLineKey(null);
        }}
        onSelect={(selection) => handleSourcePick("MATERIAL", selection)}
        onManualWithoutSource={() => {
          if (replaceLineKey) {
            setCostLines((prev) =>
              prev.map((line) =>
                line.key === replaceLineKey ? { ...emptyCustomMaterialLine(parsedQuantity), key: replaceLineKey } : line,
              ),
            );
            setReplaceLineKey(null);
          } else {
            setCostLines((prev) => [...prev, emptyCustomMaterialLine(parsedQuantity)]);
          }
          setMaterialPickerOpen(false);
        }}
      />
      <CostingSourcePickerDialog
        open={servicePickerOpen}
        kind="COST_LIBRARY"
        title="Thêm gia công / dịch vụ"
        onClose={() => setServicePickerOpen(false)}
        onSelect={(selection) => handleSourcePick("PROCESS", selection)}
        onManualWithoutSource={() => {
          setCostLines((prev) => [...prev, emptyCustomProcessLine(parsedQuantity)]);
          setServicePickerOpen(false);
        }}
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
