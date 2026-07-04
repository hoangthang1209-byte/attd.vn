"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  resolveAdminMutationErrorMessage,
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

export default function PatternDetailManager({ patternId }: { patternId: string }) {
  const mutate = useAdminMutation();
  const saveBusyRef = useRef(false);
  const [pattern, setPattern] = useState<PatternDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurementFieldErrors, setMeasurementFieldErrors] = useState<Record<string, string>>({});
  const [measurementSaving, setMeasurementSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [formRevision, setFormRevision] = useState(0);

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

  async function saveField(patch: Record<string, unknown>) {
    if (!pattern || pattern.status === "ARCHIVED" || saveBusyRef.current) return;

    saveBusyRef.current = true;
    await mutate({
      loadingMessage: "Đang cập nhật rập…",
      successMessage: "Đã cập nhật rập.",
      errorFallback: "Không thể cập nhật rập. Vui lòng thử lại.",
      action: async () => {
        const res = await adminApiFetch(`/api/patterns/${patternId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        return parseAdminJsonResponse(res, (body) => body as PatternDetail);
      },
      onSuccess: () => {
        setError(null);
        setFormRevision((value) => value + 1);
        void load();
      },
      onError: (message) => setError(message),
    });
    saveBusyRef.current = false;
  }

  async function saveMeasurements(rows: Array<{
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    sortOrder?: number;
    values: Array<{ size: string; value: string }>;
  }>) {
    if (!pattern || pattern.status === "ARCHIVED" || saveBusyRef.current) return;

    const patch = { measurements: rows };
    if (process.env.NODE_ENV === "development") {
      console.info("[pattern.measurements.save.request]", { patternId, measurements: rows });
    }

    saveBusyRef.current = true;
    setMeasurementSaving(true);
    setMeasurementFieldErrors({});
    await mutate({
      loadingMessage: "Đang lưu bảng đo…",
      successMessage: "Đã lưu bảng đo.",
      errorFallback: "Không thể lưu bảng đo. Vui lòng thử lại.",
      action: async () => {
        const res = await adminApiFetch(`/api/patterns/${patternId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          fieldErrors?: Record<string, string>;
        } & PatternDetail;

        if (!res.ok) {
          const fieldErrors =
            body.fieldErrors && typeof body.fieldErrors === "object" ? body.fieldErrors : {};
          setMeasurementFieldErrors(fieldErrors);
          const firstFieldError = Object.values(fieldErrors).find(Boolean);
          const message =
            firstFieldError ??
            resolveAdminMutationErrorMessage(res, body as Record<string, unknown>) ??
            "Không thể lưu bảng đo. Vui lòng thử lại.";
          return { ok: false as const, message };
        }

        return { ok: true as const, data: body };
      },
      onSuccess: (body) => {
        setPattern(body);
        setError(null);
        setMeasurementFieldErrors({});
      },
      onError: (message) => setError(message),
    });
    setMeasurementSaving(false);
    saveBusyRef.current = false;
  }

  async function approve() {
    const res = await fetch(`/api/patterns/${patternId}/approve`, { method: "POST" });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể duyệt");
    }
  }

  async function archive() {
    const res = await fetch(`/api/patterns/${patternId}/archive`, { method: "POST" });
    if (res.ok) void load();
  }

  async function uploadFile(file: File): Promise<void> {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "OTHER");
    const res = await fetch(`/api/patterns/${patternId}/files`, { method: "POST", body: fd });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể tải file");
      throw new Error(data.message);
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải rập..." />;
  if (!pattern) return <p className="admin-error">{error ?? "Không tìm thấy rập"}</p>;

  const readOnly = pattern.status === "ARCHIVED";

  return (
    <AdminPageShell>
      <PageHeader
        title={`${pattern.code} — ${pattern.name}`}
        meta={<PatternStatusBadge status={pattern.status} />}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={PATTERN_ADMIN_LIST_PATH} className="admin-btn">
              Quay lại
            </Link>
            {!readOnly && (
              <>
                <MeasurementTemplateApplyButton
                  applyUrl={`/api/patterns/${patternId}/apply-measurement-template`}
                  onApplied={() => void load()}
                />
                <CopyFromTechPackButton patternId={patternId} onCopied={() => void load()} />
              </>
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
              defaultValue={pattern.name}
              disabled={readOnly}
              onBlur={(e) => e.target.value !== pattern.name && void saveField({ name: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Version</span>
            <input
              className="admin-input"
              type="number"
              defaultValue={pattern.version}
              disabled={readOnly}
              onBlur={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (!Number.isFinite(v) || v < 1) return;
                if (v !== pattern.version) void saveField({ version: v });
              }}
            />
          </label>
          <label className="admin-field">
            <span>Nhóm sản phẩm</span>
            <select
              className="admin-select"
              defaultValue={pattern.productCategory?.id ?? ""}
              disabled={readOnly}
              onChange={(e) => void saveField({ productCategoryId: e.target.value || null })}
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
              defaultValue={pattern.productionMaterialCategory ?? ""}
              disabled={readOnly}
              onChange={(e) =>
                void saveField({
                  productionMaterialCategory: e.target.value || null,
                })
              }
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
              defaultValue={pattern.baseSize ?? ""}
              disabled={readOnly}
              onBlur={(e) => void saveField({ baseSize: e.target.value || null })}
            />
          </label>
          <label className="admin-field">
            <span>Size range</span>
            <input
              className="admin-input"
              defaultValue={pattern.sizeRange ?? ""}
              disabled={readOnly}
              onBlur={(e) => void saveField({ sizeRange: e.target.value || null })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Grading rule</span>
            <textarea
              className="admin-textarea"
              defaultValue={pattern.gradingRule ?? ""}
              disabled={readOnly}
              rows={3}
              onBlur={(e) => void saveField({ gradingRule: e.target.value || null })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span>Ghi chú</span>
            <textarea
              className="admin-textarea"
              defaultValue={pattern.notes ?? ""}
              disabled={readOnly}
              rows={3}
              onBlur={(e) => void saveField({ notes: e.target.value || null })}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="File rập">
        {!readOnly && (
          <PrivateFileUploadZone
            label="Kéo thả hoặc chọn file để tải lên"
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
                    <a href={file.previewUrl} target="_blank" rel="noreferrer" className="admin-link">
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
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Bảng đo">
        <TechPackMeasurementEditor
          measurements={pattern.measurements}
          readOnly={readOnly}
          emptyText="Chưa có điểm đo. Áp dụng mẫu thông số hoặc sao chép từ Tech Pack."
          saving={measurementSaving}
          fieldErrors={measurementFieldErrors}
          onSave={(rows) => void saveMeasurements(rows)}
        />
      </SectionCard>
    </AdminPageShell>
  );
}
