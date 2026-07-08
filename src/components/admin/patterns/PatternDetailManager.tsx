"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
} from "@/components/admin/AdminUi";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import PrivateFileUploadZone from "@/components/admin/tech-pack/PrivateFileUploadZone";
import {
  PATTERN_STATUS_LABELS,
  PRIVATE_FILE_HINT,
} from "@/features/tech-pack/tech-pack-labels";
import type { PatternFileType, PatternStatus, ProductionMaterialCategory } from "@prisma/client";
import {
  PRODUCTION_MATERIAL_CATEGORIES,
  PRODUCTION_MATERIAL_CATEGORY_LABELS,
} from "@/features/production-master/production-master-labels";
import MeasurementTemplateApplyButton from "@/components/admin/tech-pack/MeasurementTemplateApplyButton";
import TechPackMeasurementEditor from "@/components/admin/tech-pack/TechPackMeasurementEditor";
import CopyFromTechPackButton from "@/components/admin/patterns/CopyFromTechPackButton";
import { isPreviewableFile } from "@/features/tech-pack/tech-pack-file-validation";
import {
  PATTERN_ADMIN_LIST_PATH,
} from "@/features/patterns/pattern-admin-routes";
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
  r2ObjectKey: string | null;
  mimeType?: string | null;
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
  productCategory?: { id: string; name: string } | null;
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
    notes: pattern.notes ?? "",
    measurements: measurementsToDraft(pattern.measurements),
  };
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
    label: "Cập nhật gần nhất",
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
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [draft, setDraft] = useState<PatternDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [uploading, setUploading] = useState(false);
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
      const catData = (await catRes.json()) as Array<{ id: string; name: string }>;
      if (!patRes.ok) throw new Error(data.message ?? "Không thể tải rập");
      setPattern(data);
      const nextDraft = createDraft(data);
      setDraft(nextDraft);
      setSavedSnapshot(stableJson(nextDraft));
      setSaveStatus("saved");
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
    return stableJson(draft) !== savedSnapshot;
  }, [draft, savedSnapshot]);

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
        setSavedSnapshot(stableJson(nextDraft));
        setSaveStatus("saved");
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
              <h1 className="pattern-workspace__title">
                {pattern.code} — {draft.name || pattern.name}
              </h1>
              <div className="pattern-workspace__badges">
                <PatternStatusBadge status={pattern.status} />
                <span className="pattern-workspace__badge pattern-workspace__badge--version">
                  v{draft.version || pattern.version}
                </span>
                <span className={`admin-status-badge admin-status-badge--${saveStatusTone()}`}>
                  {saveStatusLabel()}
                </span>
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
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  disabled={!isDirty || saveStatus === "saving"}
                  onClick={() => void savePatternDraft()}
                >
                  {saveStatus === "saving" ? "Đang lưu…" : "Lưu"}
                </button>
              )}
            </div>
          </div>

          <div className="pattern-workspace__summary-chips">
            <span className="pattern-workspace__chip">
              <strong>{measurementRowCount}</strong> điểm đo
            </span>
            <span className="pattern-workspace__chip">
              <strong>{sizeChips.length}</strong> size
            </span>
            <span className="pattern-workspace__chip">
              <strong>{pattern.files.length}</strong> file
            </span>
            <span className="pattern-workspace__chip">
              <strong>{techPackCount}</strong> Tech Pack
            </span>
            {sizeChips.length > 0 && (
              <span className="pattern-workspace__chip-sizes">
                {sizeChips.map((size) => (
                  <span
                    key={size}
                    className={[
                      "pattern-workspace__size-chip",
                      draft.baseSize.trim().toUpperCase() === size.toUpperCase()
                        ? "pattern-workspace__size-chip--base"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {size}
                  </span>
                ))}
              </span>
            )}
          </div>
        </header>

        {error && <p className="admin-error">{error}</p>}

        <div className="pattern-workspace__layout">
          <div className="pattern-workspace__main">
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
                  <span className="admin-field__label">Nhóm sản phẩm</span>
                  <input
                    className="admin-input"
                    value={pattern.product?.name ?? "—"}
                    disabled
                    readOnly
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Danh mục sản phẩm</span>
                  <select
                    className="admin-select"
                    value={draft.productCategoryId}
                    disabled={readOnly}
                    onChange={(e) => updateDraft({ productCategoryId: e.target.value })}
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Danh mục vật liệu SX</span>
                  <select
                    className="admin-select"
                    value={draft.productionMaterialCategory}
                    disabled={readOnly}
                    onChange={(e) => updateDraft({ productionMaterialCategory: e.target.value })}
                  >
                    <option value="">— Không chọn —</option>
                    {PRODUCTION_MATERIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {PRODUCTION_MATERIAL_CATEGORY_LABELS[c]}
                      </option>
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
                <label className="admin-field">
                  <span className="admin-field__label">Trạng thái</span>
                  <input
                    className="admin-input"
                    value={PATTERN_STATUS_LABELS[pattern.status]}
                    disabled
                    readOnly
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Ngày tạo</span>
                  <input
                    className="admin-input"
                    value={formatPatternDateTime(pattern.createdAt)}
                    disabled
                    readOnly
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Người tạo</span>
                  <input className="admin-input" value={pattern.createdBy ?? "—"} disabled readOnly />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Cập nhật gần nhất</span>
                  <input
                    className="admin-input"
                    value={formatPatternDateTime(pattern.updatedAt)}
                    disabled
                    readOnly
                  />
                </label>
                <label className="admin-field">
                  <span className="admin-field__label">Người duyệt</span>
                  <input className="admin-input" value={pattern.approvedBy ?? "—"} disabled readOnly />
                </label>
                <label className="admin-field admin-field--full">
                  <span className="admin-field__label">Ghi chú</span>
                  <textarea
                    className="admin-textarea"
                    value={draft.notes}
                    disabled={readOnly}
                    rows={3}
                    onChange={(e) => updateDraft({ notes: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <section className="pattern-workspace__panel pattern-workspace__panel--measurements admin-panel">
              <div className="pattern-workspace__panel-head">
                <h2 className="pattern-workspace__panel-title">Bảng thông số</h2>
                {!readOnly && (
                  <div className="pattern-workspace__panel-actions">
                    <MeasurementTemplateApplyButton
                      applyUrl={`/api/patterns/${patternId}/apply-measurement-template`}
                      onApplied={() => void load()}
                    />
                    <CopyFromTechPackButton patternId={patternId} onCopied={() => void load()} />
                  </div>
                )}
              </div>
              <TechPackMeasurementEditor
                measurements={pattern.measurements}
                readOnly={readOnly}
                emptyText="Chưa có bảng thông số. Thêm điểm đo hoặc dán bảng từ Excel."
                saving={measurementSaving}
                fieldErrors={measurementFieldErrors}
                errorDetail={measurementErrorDetail}
                showSaveButton={false}
                onDraftChange={(rows) => saveMeasurements(rows)}
                onSave={(rows) => void saveMeasurements(rows)}
              />
            </section>
          </div>

          <aside className="pattern-workspace__sidebar">
            <section className="pattern-workspace__panel admin-panel">
              <h2 className="pattern-workspace__panel-title">File rập</h2>
              {!readOnly && (
                <PrivateFileUploadZone
                  label={uploading ? "Đang tải file..." : "Kéo thả hoặc chọn file để tải lên"}
                  onUpload={uploadFile}
                />
              )}
              {pattern.files.length === 0 ? (
                <p className="admin-muted">Chưa có file.</p>
              ) : (
                <div className="pattern-workspace__file-list">
                  {pattern.files.map((file) => (
                    <article key={file.id} className="pattern-workspace__file-card">
                      <div className="pattern-workspace__file-card-top">
                        {file.previewUrl && isPreviewableFile(file.type) ? (
                          file.type === "PDF" ? (
                            <span className="pattern-workspace__file-icon">PDF</span>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.previewUrl}
                              alt={file.title ?? file.originalFileName ?? "preview"}
                              className="pattern-workspace__file-thumb"
                            />
                          )
                        ) : (
                          <span className="pattern-workspace__file-icon">{file.type}</span>
                        )}
                        <div
                          className="pattern-workspace__file-meta"
                          title={file.r2ObjectKey ? PRIVATE_FILE_HINT : undefined}
                        >
                          <strong>{file.originalFileName ?? file.title ?? "—"}</strong>
                          <span>
                            {file.type}
                            {file.createdAt ? ` · ${formatPatternDateTime(file.createdAt)}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="pattern-workspace__file-actions">
                        <a
                          className="admin-btn admin-btn--xs"
                          href={`/api/patterns/${patternId}/files/${file.id}/open`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Xem
                        </a>
                        <a
                          className="admin-btn admin-btn--xs"
                          href={`/api/patterns/${patternId}/files/${file.id}/download`}
                          title="Tải xuống"
                          aria-label="Tải xuống"
                        >
                          ↓
                        </a>
                        {!readOnly && (
                          <>
                            <input
                              ref={(el) => {
                                fileInputRefs.current[file.id] = el;
                              }}
                              type="file"
                              hidden
                              onChange={(e) => {
                                const nextFile = e.target.files?.[0];
                                e.target.value = "";
                                if (nextFile) void replaceFile(file.id, nextFile);
                              }}
                            />
                            <button
                              type="button"
                              className="admin-btn admin-btn--xs"
                              onClick={() => fileInputRefs.current[file.id]?.click()}
                              title="Thay file"
                            >
                              Thay
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--xs admin-btn--danger"
                              onClick={() => void deleteFile(file.id)}
                              title="Xóa"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="pattern-workspace__panel admin-panel">
              <div className="pattern-workspace__panel-head">
                <h2 className="pattern-workspace__panel-title">Lịch sử phiên bản</h2>
                {techPackCount > 0 ? (
                  <Link href="/admin/tech-pack" className="admin-link pattern-workspace__panel-link">
                    {techPackCount} Tech Pack
                  </Link>
                ) : null}
              </div>
              <ol className="pattern-workspace__history">
                {historyEvents.map((event) => (
                  <li key={event.id} className="pattern-workspace__history-item">
                    <span className="pattern-workspace__history-label">{event.label}</span>
                    <span className="pattern-workspace__history-time">{formatPatternDateTime(event.at)}</span>
                    {event.detail ? (
                      <span className="pattern-workspace__history-detail">{event.detail}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            <section className="pattern-workspace__panel admin-panel">
              <div className="pattern-workspace__panel-head">
                <h2 className="pattern-workspace__panel-title">Xuất dữ liệu</h2>
                <div className="pattern-workspace__panel-actions">
                  <button type="button" className="admin-btn admin-btn--xs" disabled title="Sắp có">
                    Excel
                  </button>
                  <button type="button" className="admin-btn admin-btn--xs" disabled title="Sắp có">
                    PDF
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminPageShell>
  );
}
