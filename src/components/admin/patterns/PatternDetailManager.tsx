"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminUi";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import PrivateFileUploadZone from "@/components/admin/tech-pack/PrivateFileUploadZone";
import {
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
  productCategory?: { id: string; name: string } | null;
  files: PatternFile[];
  measurements: MeasurementRow[];
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

function measurementsToDraft(rows: MeasurementRow[]): MeasurementDraftRow {
  return rows.map((row, index) => ({
    pointOfMeasure: row.pointOfMeasure,
    description: row.description ?? "",
    baseSize: row.baseSize ?? "",
    tolerance: row.tolerance ?? "",
    sortOrder: index,
    values: row.values.map((value) => ({ size: value.size, value: value.value })),
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
  const [formRevision, setFormRevision] = useState(0);
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
        setFormRevision((value) => value + 1);
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

  return (
    <AdminPageShell>
      <PageHeader
        title={`${pattern.code} — ${pattern.name}`}
        meta={<PatternStatusBadge status={pattern.status} />}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={`admin-status-badge admin-status-badge--${saveStatusTone()}`}>
              {saveStatusLabel()}
            </span>
            <Link
              href={PATTERN_ADMIN_LIST_PATH}
              className="admin-btn"
              onClick={(e) => {
                if (!confirmLeaveIfDirty()) e.preventDefault();
              }}
            >
              Quay lại
            </Link>
            {!readOnly && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!isDirty || saveStatus === "saving"}
                onClick={() => void savePatternDraft()}
              >
                Lưu
              </button>
            )}
            {pattern.status === "DRAFT" && (
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void approve()}>
                Đã duyệt
              </button>
            )}
            {pattern.status !== "ARCHIVED" && (
              <button type="button" className="admin-btn" onClick={() => void archive()}>
                Lưu trữ
              </button>
            )}
          </div>
        }
      />

      {error && <p className="admin-error">{error}</p>}

      <SectionCard title="Thông tin rập" key={`${pattern.id}-${formRevision}-info`}>
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Tên rập</span>
            <input
              className="admin-input"
              value={draft.name}
              disabled={readOnly}
              onChange={(e) => updateDraft({ name: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Version</span>
            <input
              className="admin-input"
              type="number"
              value={draft.version}
              disabled={readOnly}
              onChange={(e) => updateDraft({ version: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Nhóm sản phẩm</span>
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
            <span>Danh mục vật liệu SX</span>
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
            <p className="admin-muted" style={{ marginTop: 4, fontSize: 12 }}>
              Nhóm chất liệu này sẽ được dùng để gợi ý nguyên liệu trong BOM Tech Pack.
            </p>
          </label>
          <label className="admin-field">
            <span>Base size</span>
            <input
              className="admin-input"
              value={draft.baseSize}
              disabled={readOnly}
              onChange={(e) => updateDraft({ baseSize: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Size range</span>
            <input
              className="admin-input"
              value={draft.sizeRange}
              disabled={readOnly}
              onChange={(e) => updateDraft({ sizeRange: e.target.value })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Grading rule</span>
            <textarea
              className="admin-textarea"
              value={draft.gradingRule}
              disabled={readOnly}
              rows={3}
              onChange={(e) => updateDraft({ gradingRule: e.target.value })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Ghi chú</span>
            <textarea
              className="admin-textarea"
              value={draft.notes}
              disabled={readOnly}
              rows={3}
              onChange={(e) => updateDraft({ notes: e.target.value })}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="File rập">
        {!readOnly && (
          <PrivateFileUploadZone
            label={uploading ? "Đang tải file..." : "Kéo thả hoặc chọn file để tải lên"}
            onUpload={uploadFile}
          />
        )}
        {pattern.files.length === 0 ? (
          <p className="admin-muted">Chưa có file.</p>
        ) : (
          <div className="admin-file-grid">
            {pattern.files.map((file) => (
              <div key={file.id} className="admin-file-card">
                {file.previewUrl && isPreviewableFile(file.type) ? (
                  file.type === "PDF" ? (
                    <a href={`/api/patterns/${patternId}/files/${file.id}/open`} target="_blank" rel="noreferrer" className="admin-link">
                      PDF xem nhanh
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.previewUrl} alt={file.title ?? file.originalFileName ?? "preview"} />
                  )
                ) : (
                  <div className="admin-file-card__placeholder">
                    <strong>{file.originalFileName ?? file.type}</strong>
                  </div>
                )}
                <div className="admin-file-card__meta">
                  <div className="admin-file-card__type">{file.type}</div>
                  <div>{file.originalFileName ?? file.title ?? "—"}</div>
                  {file.r2ObjectKey && <div>{PRIVATE_FILE_HINT}</div>}
                </div>
                <div className="admin-file-card__actions">
                  <a className="admin-btn admin-btn--xs" href={`/api/patterns/${patternId}/files/${file.id}/open`} target="_blank" rel="noreferrer">
                    Xem
                  </a>
                  <a className="admin-btn admin-btn--xs" href={`/api/patterns/${patternId}/files/${file.id}/download`}>
                    Tải xuống
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
                      <button type="button" className="admin-btn admin-btn--xs" onClick={() => fileInputRefs.current[file.id]?.click()}>
                        Thay file
                      </button>
                      <button type="button" className="admin-btn admin-btn--xs admin-btn--danger" onClick={() => void deleteFile(file.id)}>
                        Xóa
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Bảng đo"
        actions={
          !readOnly && (
            <>
              <MeasurementTemplateApplyButton
                applyUrl={`/api/patterns/${patternId}/apply-measurement-template`}
                onApplied={() => void load()}
              />
              <CopyFromTechPackButton patternId={patternId} onCopied={() => void load()} />
            </>
          )
        }
      >
        <TechPackMeasurementEditor
          measurements={pattern.measurements}
          readOnly={readOnly}
          emptyText="Chưa có bảng đo. Thêm điểm đo hoặc dán bảng từ Excel."
          saving={measurementSaving}
          fieldErrors={measurementFieldErrors}
          errorDetail={measurementErrorDetail}
          showSaveButton={false}
          onDraftChange={(rows) => saveMeasurements(rows)}
          onSave={(rows) => void saveMeasurements(rows)}
        />
      </SectionCard>
    </AdminPageShell>
  );
}
