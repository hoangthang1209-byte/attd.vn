"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
} from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import PrivateFileUploadZone from "@/components/admin/tech-pack/PrivateFileUploadZone";
import {
  PATTERN_STATUS_LABELS,
} from "@/features/tech-pack/tech-pack-labels";
import {
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";
import MeasurementTemplateApplyButton from "@/components/admin/tech-pack/MeasurementTemplateApplyButton";
import TechPackMeasurementEditor from "@/components/admin/tech-pack/TechPackMeasurementEditor";
import CopyFromTechPackButton from "@/components/admin/patterns/CopyFromTechPackButton";
import CustomerSearchField from "@/components/admin/quotes/CustomerSearchField";
import SupplierSearchField, {
  type SupplierSearchRecord,
} from "@/components/admin/suppliers/SupplierSearchField";
import ProductCategoryCascadingPicker from "@/components/admin/products/ProductCategoryCascadingPicker";
import type { ProductCategoryPickerItem } from "@/features/categories/category-cascade-utils";
import type { CrmCustomerRecord } from "@/features/crm/types";
import {
  formatPatternFileSize,
  getPatternFileExtension,
  patternFileIconLabel,
  patternFilePreviewMode,
} from "@/features/patterns/pattern-file-display";
import {
  formatPatternSourceBadge,
  PATTERN_SOURCE_TYPES,
  PATTERN_SOURCE_LABELS,
} from "@/features/patterns/pattern-source-labels";
import type { PatternFileType, PatternSourceType, PatternStatus, ProductionMaterialCategory } from "@prisma/client";
import {
  PATTERN_ADMIN_LIST_PATH,
} from "@/features/patterns/pattern-admin-routes";
import PatternCategoryThumbnail from "@/components/admin/patterns/PatternCategoryThumbnail";
import {
  normalizePatternCategoryVisual,
  type PatternCategoryVisualInput,
} from "@/features/patterns/pattern-category-visual";
import { useAdminMutation } from "@/hooks/useAdminAction";
import {
  adminApiFetch,
  parseAdminJsonResponse,
} from "@/lib/admin/adminMutation";

type PatternFile = {
  id: string;
  type: PatternFileType;
  title: string | null;
  previewUrl: string | null;
  originalFileName: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  createdAt?: string;
};

type MeasurementRow = {
  id: string;
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  values: Array<{ size: string; value: string }>;
};

type PatternDetail = {
  id: string;
  code: string;
  name: string;
  version: number;
  baseSize: string | null;
  sizeRange: string | null;
  gradingRule: string | null;
  productionMaterialCategory: ProductionMaterialCategory | null;
  status: PatternStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sourceType: PatternSourceType | null;
  patternSupplierId: string | null;
  sourceSupplierCode: string | null;
  sourceSupplier: string | null;
  sourceSupplierContact: string | null;
  sourcePhone: string | null;
  sourceEmail: string | null;
  customerId: string | null;
  customerNameSnapshot: string | null;
  sourceNotes: string | null;
  patternSupplier?: SupplierSearchRecord | null;
  productCategory?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    products?: Array<{ featuredImage: string | null }>;
  } | null;
  customer?: { id: string; name: string; code: string } | null;
  product?: { id: string; name: string; productCode: string | null } | null;
  _count?: { techPacks: number };
  files: PatternFile[];
  measurements: MeasurementRow[];
};

type HistoryEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string | null;
};

type MeasurementDraftRow = Array<{
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  sortOrder?: number;
  values: Array<{ size: string; value: string }>;
}>;

type PatternDraft = {
  name: string;
  version: string;
  productCategoryId: string;
  baseSize: string;
  sizeRange: string;
  gradingRule: string;
  productionMaterialCategory: string;
  sourceType: string;
  sourceSupplier: string;
  sourceSupplierContact: string;
  sourcePhone: string;
  sourceEmail: string;
  customerNameSnapshot: string;
  sourceNotes: string;
  notes: string;
  measurements: MeasurementDraftRow;
};

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const UNSAVED_MESSAGE = "Bạn có thay đổi chưa lưu. Rời khỏi trang sẽ mất các thay đổi này.";

function measurementSizeRank(size: string): number {
  const normalized = size.trim().toUpperCase();
  const known = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const index = known.indexOf(normalized);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortMeasurementSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const rankDiff = measurementSizeRank(a) - measurementSizeRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
  });
}

function measurementsToDraft(rows: MeasurementRow[]): MeasurementDraftRow {
  const sizes = sortMeasurementSizes(
    Array.from(new Set(rows.flatMap((row) => row.values.map((value) => value.size.trim()).filter(Boolean)))),
  );
  return rows.map((row, index) => ({
    pointOfMeasure: row.pointOfMeasure,
    description: row.description ?? "",
    baseSize: row.baseSize ?? "",
    tolerance: row.tolerance ?? "",
    sortOrder: index,
    values: sizes
      .map((size) => {
        const value = row.values.find((item) => item.size.trim() === size)?.value.trim() ?? "";
        return { size, value };
      })
      .filter((value) => value.value),
  }));
}

function createDraft(pattern: PatternDetail): PatternDraft {
  return {
    name: pattern.name,
    version: String(pattern.version),
    productCategoryId: pattern.productCategory?.id ?? "",
    baseSize: pattern.baseSize ?? "",
    sizeRange: pattern.sizeRange ?? "",
    gradingRule: pattern.gradingRule ?? "",
    productionMaterialCategory: pattern.productionMaterialCategory ?? "",
    sourceType: pattern.sourceType ?? "",
    sourceSupplier: pattern.sourceSupplier ?? "",
    sourceSupplierContact: pattern.sourceSupplierContact ?? "",
    sourcePhone: pattern.sourcePhone ?? "",
    sourceEmail: pattern.sourceEmail ?? "",
    customerNameSnapshot: pattern.customerNameSnapshot ?? pattern.customer?.name ?? "",
    sourceNotes: pattern.sourceNotes ?? "",
    notes: pattern.notes ?? "",
    measurements: measurementsToDraft(pattern.measurements),
  };
}

function supplierFromPattern(pattern: PatternDetail): SupplierSearchRecord | null {
  if (!pattern.patternSupplierId) return null;
  if (pattern.patternSupplier) {
    return {
      id: pattern.patternSupplier.id,
      code: pattern.patternSupplier.code,
      name: pattern.patternSupplier.name,
      category: pattern.patternSupplier.category,
      contact: pattern.patternSupplier.contact,
      phone: pattern.patternSupplier.phone,
      email: pattern.patternSupplier.email,
    };
  }
  if (pattern.sourceSupplier || pattern.sourceSupplierCode) {
    return {
      id: pattern.patternSupplierId,
      code: pattern.sourceSupplierCode ?? "—",
      name: pattern.sourceSupplier ?? "—",
      category: "GENERAL",
      contact: pattern.sourceSupplierContact,
      phone: pattern.sourcePhone,
      email: pattern.sourceEmail,
    };
  }
  return null;
}

function customerFromPattern(pattern: PatternDetail): CrmCustomerRecord | null {
  if (!pattern.customerId) return null;
  if (pattern.customer) {
    return {
      id: pattern.customer.id,
      code: pattern.customer.code,
      name: pattern.customer.name,
      legacyType: "BUSINESS",
      customerTypeId: null,
      customerType: null,
      representativeName: null,
      representativeSalutation: null,
      representativeTitle: null,
      authorizationDocumentNo: null,
      status: "ACTIVE",
      legalName: null,
      taxCode: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      province: null,
      district: null,
      provinceId: null,
      wardId: null,
      provinceNameSnapshot: null,
      wardNameSnapshot: null,
      addressLine1: null,
      addressLine2: null,
      note: null,
      internalNote: null,
      billingNote: null,
      createdAt: "",
      updatedAt: "",
    };
  }
  if (pattern.customerNameSnapshot) {
    return {
      id: pattern.customerId,
      code: "—",
      name: pattern.customerNameSnapshot,
      legacyType: "BUSINESS",
      customerTypeId: null,
      customerType: null,
      representativeName: null,
      representativeSalutation: null,
      representativeTitle: null,
      authorizationDocumentNo: null,
      status: "ACTIVE",
      legalName: null,
      taxCode: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      province: null,
      district: null,
      provinceId: null,
      wardId: null,
      provinceNameSnapshot: null,
      wardNameSnapshot: null,
      addressLine1: null,
      addressLine2: null,
      note: null,
      internalNote: null,
      billingNote: null,
      createdAt: "",
      updatedAt: "",
    };
  }
  return null;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function formatPatternDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildPatternHistory(pattern: PatternDetail): HistoryEvent[] {
  const events: HistoryEvent[] = [
    {
      id: "created",
      label: "Tạo rập",
      at: pattern.createdAt,
      detail: pattern.createdBy,
    },
  ];

  if (pattern.status === "DRAFT") {
    events.push({
      id: "draft",
      label: "Bản nháp",
      at: pattern.updatedAt,
    });
  }

  if (pattern.approvedAt) {
    events.push({
      id: "approved",
      label: "Đã duyệt",
      at: pattern.approvedAt,
      detail: pattern.approvedBy,
    });
  }

  if (pattern.status === "ARCHIVED") {
    events.push({
      id: "archived",
      label: "Lưu trữ",
      at: pattern.updatedAt,
    });
  }

  events.push({
    id: "updated",
    label: "Cập nhật",
    at: pattern.updatedAt,
  });

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function deriveSizeChips(measurements: MeasurementDraftRow, baseSize: string): string[] {
  const fromRows = sortMeasurementSizes(
    Array.from(
      new Set(
        measurements.flatMap((row) =>
          row.values.map((value) => value.size.trim()).filter(Boolean),
        ),
      ),
    ),
  );
  if (fromRows.length > 0) return fromRows;
  if (baseSize.trim()) return [baseSize.trim()];
  return [];
}

export default function PatternDetailManager({ patternId }: { patternId: string }) {
  const mutate = useAdminMutation();
  const saveBusyRef = useRef(false);
  const [pattern, setPattern] = useState<PatternDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurementFieldErrors, setMeasurementFieldErrors] = useState<Record<string, string>>({});
  const [measurementErrorDetail, setMeasurementErrorDetail] = useState<{
    code?: string;
    traceId?: string;
    message?: string;
  } | null>(null);
  const [measurementSaving, setMeasurementSaving] = useState(false);
  const [measurementEditing, setMeasurementEditing] = useState(false);
  const [measurementBaseline, setMeasurementBaseline] = useState<MeasurementDraftRow | null>(null);
  const [categories, setCategories] = useState<ProductCategoryPickerItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomerRecord | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSearchRecord | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState<PatternDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [uploading, setUploading] = useState(false);
  const [activeFileMenuId, setActiveFileMenuId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patRes, catRes] = await Promise.all([
        adminApiFetch(`/api/patterns/${patternId}`),
        adminApiFetch("/api/categories"),
      ]);
      const data = (await patRes.json()) as PatternDetail & { message?: string };
      const catData = (await catRes.json()) as ProductCategoryPickerItem[];
      if (!patRes.ok) throw new Error(data.message ?? "Không thể tải rập");
      setPattern(data);
      const nextDraft = createDraft(data);
      setDraft(nextDraft);
      setSelectedCustomer(customerFromPattern(data));
      setSelectedSupplier(supplierFromPattern(data));
      setSavedSnapshot(stableJson({
        ...nextDraft,
        customerId: data.customerId ?? "",
        patternSupplierId: data.patternSupplierId ?? "",
      }));
      setSaveStatus("saved");
      setMeasurementEditing(false);
      setMeasurementBaseline(null);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [patternId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => {
    if (!draft || !savedSnapshot) return false;
    const snapshot = JSON.parse(savedSnapshot) as PatternDraft & {
      customerId?: string;
      patternSupplierId?: string;
    };
    const current = {
      ...draft,
      customerId: selectedCustomer?.id ?? pattern?.customerId ?? "",
      patternSupplierId: selectedSupplier?.id ?? pattern?.patternSupplierId ?? "",
    };
    const baseline = {
      ...snapshot,
      customerId: snapshot.customerId ?? "",
      patternSupplierId: snapshot.patternSupplierId ?? "",
    };
    return stableJson(current) !== stableJson(baseline);
  }, [draft, savedSnapshot, selectedCustomer?.id, selectedSupplier?.id, pattern?.customerId, pattern?.patternSupplierId]);

  useEffect(() => {
    if (saveStatus === "saving") return;
    setSaveStatus(isDirty ? "dirty" : "saved");
  }, [isDirty, saveStatus]);

  useEffect(() => {
    if (!isDirty || saveStatus === "saving") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = UNSAVED_MESSAGE;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, saveStatus]);

  function confirmLeaveIfDirty() {
    if (!isDirty || saveStatus === "saving") return true;
    return window.confirm(UNSAVED_MESSAGE);
  }

  function updateDraft(patch: Partial<PatternDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function saveStatusLabel() {
    if (saveStatus === "saving") return "Đang lưu...";
    if (saveStatus === "error") return "Lưu lỗi";
    if (isDirty) return "Chưa lưu";
    return "Đã lưu";
  }

  function saveStatusTone(): "neutral" | "info" | "success" | "warning" | "danger" {
    if (saveStatus === "saving") return "info";
    if (saveStatus === "error") return "danger";
    if (isDirty) return "warning";
    return "success";
  }

  async function savePatternDraft() {
    if (!pattern || !draft || pattern.status === "ARCHIVED" || saveBusyRef.current) return;
    const version = Number.parseInt(draft.version, 10);
    if (!draft.name.trim()) {
      setError("Tên rập không được để trống.");
      setSaveStatus("error");
      return;
    }
    if (!Number.isFinite(version) || version < 1) {
      setError("Version rập phải là số nguyên dương.");
      setSaveStatus("error");
      return;
    }

    const patch = {
      name: draft.name.trim(),
      version,
      productCategoryId: draft.productCategoryId || null,
      baseSize: draft.baseSize.trim() || null,
      sizeRange: draft.sizeRange.trim() || null,
      gradingRule: draft.gradingRule.trim() || null,
      productionMaterialCategory: draft.productionMaterialCategory || null,
      sourceType: draft.sourceType || null,
      patternSupplierId: selectedSupplier?.id ?? null,
      sourceSupplier: draft.sourceSupplier.trim() || null,
      sourceSupplierContact: draft.sourceSupplierContact.trim() || null,
      sourcePhone: draft.sourcePhone.trim() || null,
      sourceEmail: draft.sourceEmail.trim() || null,
      customerId: selectedCustomer?.id ?? null,
      customerNameSnapshot: (selectedCustomer?.name ?? draft.customerNameSnapshot.trim()) || null,
      sourceNotes: draft.sourceNotes.trim() || null,
      notes: draft.notes.trim() || null,
      measurements: draft.measurements,
    };

    saveBusyRef.current = true;
    setSaveStatus("saving");
    setMeasurementSaving(true);
    setMeasurementFieldErrors({});
    setMeasurementErrorDetail(null);
    await mutate({
      loadingMessage: "Đang lưu rập…",
      successMessage: "Đã lưu rập.",
      errorFallback: "Không thể lưu rập. Vui lòng thử lại.",
      action: async () => {
        const res = await adminApiFetch(`/api/patterns/${patternId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const result = await parseAdminJsonResponse(res, (body) => body as PatternDetail);
        if (!result.ok) {
          const detail = {
            code: result.code,
            traceId: result.traceId,
            message: result.message,
          };
          setMeasurementFieldErrors(result.fieldErrors ?? {});
          setMeasurementErrorDetail(detail);
        }
        return result;
      },
      onSuccess: (body) => {
        const nextDraft = createDraft(body);
        setPattern(body);
        setDraft(nextDraft);
        setSelectedCustomer(customerFromPattern(body));
        setSelectedSupplier(supplierFromPattern(body));
        setSavedSnapshot(stableJson({
          ...nextDraft,
          customerId: body.customerId ?? "",
          patternSupplierId: body.patternSupplierId ?? "",
        }));
        setSaveStatus("saved");
        setMeasurementEditing(false);
        setMeasurementBaseline(null);
        setError(null);
        setMeasurementFieldErrors({});
        setMeasurementErrorDetail(null);
      },
      onError: (message) => {
        setSaveStatus("error");
        setError(message);
      },
    });
    setMeasurementSaving(false);
    saveBusyRef.current = false;
  }

  function saveMeasurements(rows: Array<{
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    sortOrder?: number;
    values: Array<{ size: string; value: string }>;
  }>) {
    updateDraft({ measurements: rows });
  }

  function startMeasurementEdit() {
    if (!draft) return;
    setMeasurementBaseline(draft.measurements);
    setMeasurementEditing(true);
  }

  function cancelMeasurementEdit() {
    if (measurementBaseline) {
      updateDraft({ measurements: measurementBaseline });
    }
    setMeasurementEditing(false);
    setMeasurementBaseline(null);
  }

  function commitMeasurementTable() {
    setMeasurementEditing(false);
    setMeasurementBaseline(null);
  }

  async function deletePatternPermanently() {
    if (!window.confirm("Xóa vĩnh viễn rập này cùng bảng đo và file? Hành động không thể hoàn tác.")) {
      return;
    }
    const res = await fetch(`/api/patterns/${patternId}`, { method: "DELETE" });
    const data = (await res.json()) as {
      message?: string;
      storageWarnings?: string[];
    };
    if (!res.ok) {
      setError(data.message ?? "Không thể xóa rập.");
      return;
    }
    if (data.storageWarnings?.length) {
      setDeleteWarning(
        "Đã xóa rập. Một số file trên kho lưu trữ có thể chưa được dọn sạch.",
      );
      window.setTimeout(() => {
        window.location.href = PATTERN_ADMIN_LIST_PATH;
      }, 1200);
      return;
    }
    window.location.href = PATTERN_ADMIN_LIST_PATH;
  }

  async function approve() {
    if (!confirmLeaveIfDirty()) return;
    const res = await fetch(`/api/patterns/${patternId}/approve`, { method: "POST" });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể duyệt");
    }
  }

  async function archive() {
    if (!confirmLeaveIfDirty()) return;
    const res = await fetch(`/api/patterns/${patternId}/archive`, { method: "POST" });
    if (res.ok) void load();
  }

  async function uploadFile(file: File): Promise<void> {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "OTHER");
    try {
      const res = await fetch(`/api/patterns/${patternId}/files`, { method: "POST", body: fd });
      if (res.ok) await load();
      else {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Không thể tải file");
        throw new Error(data.message);
      }
    } finally {
      setUploading(false);
    }
  }

  async function replaceFile(fileId: string, file: File) {
    await uploadFile(file);
    await deleteFile(fileId, false);
  }

  async function deleteFile(fileId: string, shouldConfirm = true) {
    if (shouldConfirm && !window.confirm("Xóa file rập này?")) return;
    const res = await fetch(`/api/patterns/${patternId}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) await load();
    else {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? "Không thể xóa file rập.");
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải rập..." />;
  if (!pattern || !draft) return <p className="admin-error">{error ?? "Không tìm thấy rập"}</p>;

  const readOnly = pattern.status === "ARCHIVED";
  const historyEvents = buildPatternHistory(pattern);
  const sizeChips = deriveSizeChips(draft.measurements, draft.baseSize);
  const measurementRowCount = draft.measurements.filter((row) => row.pointOfMeasure.trim()).length;
  const techPackCount = pattern._count?.techPacks ?? 0;
  const sourceBadge = formatPatternSourceBadge(
    (draft.sourceType as PatternSourceType) || pattern.sourceType,
  );
  const customerLabel =
    selectedCustomer?.name ?? (draft.customerNameSnapshot.trim() || null);
  const draftCategoryVisual: PatternCategoryVisualInput | null = (() => {
    if (draft.productCategoryId) {
      const fromPicker = categories.find((category) => category.id === draft.productCategoryId);
      if (fromPicker) {
        return {
          name: fromPicker.name,
          imageUrl: fromPicker.imageUrl ?? null,
          featuredImage: null,
        };
      }
    }
    return normalizePatternCategoryVisual(pattern.productCategory);
  })();
  const categoryLabel =
    categories.find((category) => category.id === draft.productCategoryId)?.name
    ?? pattern.productCategory?.name
    ?? "—";

  return (
    <AdminPageShell>
      <div className="pattern-workspace">
        <header className="pattern-workspace__header">
          <nav className="pattern-workspace__breadcrumb" aria-label="Breadcrumb">
            <Link href={PATTERN_ADMIN_LIST_PATH} onClick={(e) => {
              if (!confirmLeaveIfDirty()) e.preventDefault();
            }}
            >
              Thư viện Pattern
            </Link>
            <span aria-hidden="true">›</span>
            <span>{pattern.code}</span>
          </nav>

          <div className="pattern-workspace__header-main">
            <div className="pattern-workspace__title-block">
              <PatternCategoryThumbnail
                category={draftCategoryVisual}
                size="header"
                showName={Boolean(draftCategoryVisual?.name)}
              />
              <div className="pattern-workspace__title-content">
                <h1 className="pattern-workspace__title">
                  {draft.name || pattern.name}
                </h1>
                <p className="pattern-workspace__title-subline">
                  {pattern.code}
                  {categoryLabel !== "—" ? ` · ${categoryLabel}` : ""}
                </p>
                <div className="pattern-workspace__badges">
                  <PatternStatusBadge status={pattern.status} />
                  <span className="pattern-workspace__badge pattern-workspace__badge--version">
                    v{draft.version || pattern.version}
                  </span>
                  {sourceBadge && (
                    <span className="pattern-workspace__badge pattern-workspace__badge--source">
                      {sourceBadge}
                    </span>
                  )}
                  <span className={`admin-status-badge admin-status-badge--${saveStatusTone()}`}>
                    {saveStatusLabel()}
                  </span>
                </div>
              </div>
            </div>

            <div className="pattern-workspace__actions">
              <Link
                href={PATTERN_ADMIN_LIST_PATH}
                className="admin-btn admin-btn--xs"
                onClick={(e) => {
                  if (!confirmLeaveIfDirty()) e.preventDefault();
                }}
              >
                Quay lại
              </Link>
              {pattern.status === "DRAFT" && (
                <button type="button" className="admin-btn admin-btn--xs" onClick={() => void approve()}>
                  Đã duyệt
                </button>
              )}
              {pattern.status !== "ARCHIVED" && (
                <button type="button" className="admin-btn admin-btn--xs" onClick={() => void archive()}>
                  Lưu trữ
                </button>
              )}
              {!readOnly && (
                <button
                  type="button"
                  className="admin-btn admin-btn--xs admin-btn--danger"
                  onClick={() => void deletePatternPermanently()}
                >
                  Xóa rập
                </button>
              )}
              {!readOnly && (
                <AdminLoadingButton
                  variant="primary"
                  size="xs"
                  pending={saveStatus === "saving"}
                  pendingLabel="Đang lưu rập…"
                  disabled={!isDirty || saveStatus === "saving"}
                  onClick={() => void savePatternDraft()}
                >
                  Lưu
                </AdminLoadingButton>
              )}
            </div>
          </div>

          <div className="pattern-workspace__summary-grid">
            <article className="pattern-workspace__summary-card">
              <strong>{measurementRowCount}</strong>
              <span>Điểm đo</span>
            </article>
            <article className="pattern-workspace__summary-card">
              <strong>{sizeChips.length}</strong>
              <span>Size</span>
            </article>
            <article className="pattern-workspace__summary-card">
              <strong>{pattern.files.length}</strong>
              <span>File</span>
            </article>
            <article className="pattern-workspace__summary-card">
              <strong>{techPackCount}</strong>
              <span>Tech Pack</span>
            </article>
          </div>
        </header>

        {error && <p className="admin-error">{error}</p>}
        {deleteWarning && <p className="admin-kb-warning-list" role="status">{deleteWarning}</p>}

        <section className="pattern-workspace__panel pattern-workspace__panel--measurements admin-panel">
          <div className="pattern-workspace__panel-head">
            <h2 className="pattern-workspace__panel-title">Bảng thông số</h2>
            <div className="pattern-workspace__panel-actions">
              {!readOnly && !measurementEditing && (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  onClick={startMeasurementEdit}
                >
                  Sửa bảng
                </button>
              )}
              {!readOnly && measurementEditing && (
                <>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--xs"
                    onClick={commitMeasurementTable}
                  >
                    Lưu bảng
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--xs"
                    onClick={cancelMeasurementEdit}
                  >
                    Huỷ
                  </button>
                </>
              )}
              {!readOnly && measurementEditing && (
                <>
                  <MeasurementTemplateApplyButton
                    applyUrl={`/api/patterns/${patternId}/apply-measurement-template`}
                    onApplied={() => void load()}
                  />
                  <CopyFromTechPackButton patternId={patternId} onCopied={() => void load()} />
                </>
              )}
            </div>
          </div>
          {!measurementEditing && !readOnly && (
            <p className="admin-field-hint pattern-workspace__measurement-lock-hint">
              Bảng đo đang ở chế độ xem. Bấm <strong>Sửa bảng</strong> để chỉnh sửa, sau đó <strong>Lưu</strong> ở header để ghi vào hệ thống.
            </p>
          )}
          <TechPackMeasurementEditor
            measurements={pattern.measurements}
            readOnly={readOnly || !measurementEditing}
            compactToolbar
            emptyText="Chưa có bảng thông số. Bấm Sửa bảng để thêm điểm đo hoặc dán bảng từ Excel."
            saving={measurementSaving}
            fieldErrors={measurementFieldErrors}
            errorDetail={measurementErrorDetail}
            showSaveButton={false}
            onDraftChange={(rows) => saveMeasurements(rows)}
            onSave={(rows) => saveMeasurements(rows)}
          />
        </section>

        <div className="pattern-workspace__secondary">
          <section className="pattern-workspace__panel admin-panel">
            <h2 className="pattern-workspace__panel-title">Thông tin rập</h2>
            <div className="pattern-workspace__info-grid admin-form-grid">
              <label className="admin-field">
                <span className="admin-field__label">Tên rập</span>
                <input
                  className="admin-input"
                  value={draft.name}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ name: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Mã rập</span>
                <input className="admin-input" value={pattern.code} disabled readOnly />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Version</span>
                <input
                  className="admin-input"
                  type="number"
                  value={draft.version}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ version: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Loại sản phẩm</span>
                <input className="admin-input" value={pattern.product?.name ?? "—"} disabled readOnly />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Danh mục sản phẩm</span>
                <ProductCategoryCascadingPicker
                  categories={categories}
                  value={draft.productCategoryId}
                  disabled={readOnly}
                  embedded
                  onChange={(categoryId) => updateDraft({ productCategoryId: categoryId })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Danh mục vật liệu</span>
                <select
                  className="admin-select"
                  value={draft.productionMaterialCategory}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ productionMaterialCategory: e.target.value })}
                >
                  <option value="">— Không chọn —</option>
                  {PRODUCTION_MATERIAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{PRODUCTION_MATERIAL_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Base size</span>
                <input
                  className="admin-input"
                  value={draft.baseSize}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ baseSize: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">Size range</span>
                <input
                  className="admin-input"
                  value={draft.sizeRange}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ sizeRange: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-field__label">Grading rule</span>
                <textarea
                  className="admin-textarea"
                  value={draft.gradingRule}
                  disabled={readOnly}
                  rows={2}
                  onChange={(e) => updateDraft({ gradingRule: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-field__label">Ghi chú</span>
                <textarea
                  className="admin-textarea"
                  value={draft.notes}
                  disabled={readOnly}
                  rows={2}
                  onChange={(e) => updateDraft({ notes: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="pattern-workspace__panel admin-panel">
            <h2 className="pattern-workspace__panel-title">Nguồn rập</h2>
            <div className="pattern-workspace__info-grid admin-form-grid">
              <label className="admin-field">
                <span className="admin-field__label">Nguồn rập</span>
                <select
                  className="admin-select"
                  value={draft.sourceType}
                  disabled={readOnly}
                  onChange={(e) => updateDraft({ sourceType: e.target.value })}
                >
                  <option value="">— Chọn nguồn —</option>
                  {PATTERN_SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PATTERN_SOURCE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-field admin-field--full">
                <SupplierSearchField
                  value={selectedSupplier}
                  disabled={readOnly}
                  onSelect={(supplier) => {
                    setSelectedSupplier(supplier);
                    updateDraft({
                      sourceSupplier: supplier?.name ?? "",
                      sourceSupplierContact: supplier?.contact ?? "",
                      sourcePhone: supplier?.phone ?? "",
                      sourceEmail: supplier?.email ?? "",
                    });
                  }}
                />
              </div>
              {!selectedSupplier &&
                (draft.sourceSupplier.trim() ||
                  draft.sourceSupplierContact.trim() ||
                  draft.sourcePhone.trim() ||
                  draft.sourceEmail.trim()) && (
                <div className="admin-field admin-field--full pattern-legacy-supplier-snapshot">
                  <span className="admin-field__label">Nhà cung cấp (lưu dạng text)</span>
                  <div className="pattern-legacy-supplier-snapshot__body">
                    {draft.sourceSupplier.trim() && <p><strong>{draft.sourceSupplier}</strong></p>}
                    {draft.sourceSupplierContact.trim() && (
                      <p>Liên hệ: {draft.sourceSupplierContact}</p>
                    )}
                    {draft.sourcePhone.trim() && <p>Điện thoại / Zalo: {draft.sourcePhone}</p>}
                    {draft.sourceEmail.trim() && <p>Email: {draft.sourceEmail}</p>}
                  </div>
                  <p className="admin-field-hint">
                    Dữ liệu cũ vẫn được giữ. Chọn nhà cung cấp từ danh mục để liên kết Supplier Master.
                  </p>
                </div>
              )}
              <div className="admin-field admin-field--full">
                <CustomerSearchField
                  value={selectedCustomer}
                  disabled={readOnly}
                  label="Khách hàng liên quan"
                  hint="CRM là nguồn dữ liệu chính cho khách hàng liên quan."
                  onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    if (customer) {
                      updateDraft({ customerNameSnapshot: customer.name });
                    } else {
                      updateDraft({ customerNameSnapshot: "" });
                    }
                  }}
                  hideHint={false}
                />
              </div>
              <label className="admin-field admin-field--full">
                <span className="admin-field__label">Ghi chú nguồn</span>
                <textarea
                  className="admin-textarea"
                  value={draft.sourceNotes}
                  disabled={readOnly}
                  rows={2}
                  onChange={(e) => updateDraft({ sourceNotes: e.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="pattern-workspace__panel admin-panel">
            <h2 className="pattern-workspace__panel-title">File rập</h2>
            {!readOnly && (
              <PrivateFileUploadZone
                label="Kéo thả hoặc chọn nhiều file"
                multiple
                onUpload={uploadFile}
              />
            )}
            {pattern.files.length === 0 ? (
              <p className="admin-muted">Chưa có file.</p>
            ) : (
              <div className="pattern-workspace__file-list">
                {pattern.files.map((file) => {
                  const fileName = file.originalFileName ?? file.title ?? "—";
                  const extension = getPatternFileExtension(fileName);
                  const previewMode = patternFilePreviewMode(file.type, fileName, file.previewUrl);
                  const canOpen = previewMode !== "download";
                  return (
                    <article key={file.id} className="pattern-workspace__file-card">
                      <div className="pattern-workspace__file-card-top">
                        {previewMode === "image" && file.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.previewUrl}
                            alt={fileName}
                            className="pattern-workspace__file-thumb"
                          />
                        ) : (
                          <span className="pattern-workspace__file-icon">
                            {patternFileIconLabel(file.type, fileName)}
                          </span>
                        )}
                        <div className="pattern-workspace__file-meta">
                          <strong className="pattern-workspace__file-name">{fileName}</strong>
                          <span className="pattern-workspace__file-submeta">
                            {extension || file.type}
                            {" · "}
                            {formatPatternFileSize(file.fileSizeBytes)}
                            {file.createdAt ? ` · ${formatPatternDateTime(file.createdAt)}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="pattern-workspace__file-actions">
                        {!readOnly && (
                          <input
                            ref={(el) => { fileInputRefs.current[file.id] = el; }}
                            type="file"
                            hidden
                            onChange={(e) => {
                              const nextFile = e.target.files?.[0];
                              e.target.value = "";
                              if (nextFile) void replaceFile(file.id, nextFile);
                            }}
                          />
                        )}
                        <details
                          className="pattern-workspace__file-menu"
                          open={activeFileMenuId === file.id}
                          onToggle={(e) => {
                            const open = (e.currentTarget as HTMLDetailsElement).open;
                            setActiveFileMenuId(open ? file.id : null);
                          }}
                        >
                          <summary className="pattern-workspace__file-menu-trigger">⋮</summary>
                          <div className="pattern-workspace__file-menu-list">
                            {canOpen ? (
                              <a
                                className="pattern-workspace__file-menu-item"
                                href={`/api/patterns/${patternId}/files/${file.id}/open`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Xem
                              </a>
                            ) : null}
                            <a
                              className="pattern-workspace__file-menu-item"
                              href={`/api/patterns/${patternId}/files/${file.id}/download`}
                            >
                              Tải xuống
                            </a>
                            {!readOnly && (
                              <button
                                type="button"
                                className="pattern-workspace__file-menu-item"
                                onClick={() => fileInputRefs.current[file.id]?.click()}
                              >
                                Thay file
                              </button>
                            )}
                            {!readOnly && (
                              <button
                                type="button"
                                className="pattern-workspace__file-menu-item pattern-workspace__file-menu-item--danger"
                                onClick={() => void deleteFile(file.id)}
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="pattern-workspace__panel admin-panel">
            <div className="pattern-workspace__panel-head">
              <h2 className="pattern-workspace__panel-title">Lịch sử</h2>
              {techPackCount > 0 ? (
                <Link href="/admin/tech-pack" className="admin-link pattern-workspace__panel-link">
                  {techPackCount} Tech Pack
                </Link>
              ) : null}
            </div>
            <ol className="pattern-workspace__history pattern-workspace__timeline">
              {historyEvents.map((event) => (
                <li key={event.id} className="pattern-workspace__history-item">
                  <span className="pattern-workspace__history-dot" aria-hidden="true">●</span>
                  <div className="pattern-workspace__history-content">
                    <span className="pattern-workspace__history-label">{event.label}</span>
                    <span className="pattern-workspace__history-time">{formatPatternDateTime(event.at)}</span>
                    {event.detail ? (
                      <span className="pattern-workspace__history-detail">{event.detail}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </AdminPageShell>
  );
}
