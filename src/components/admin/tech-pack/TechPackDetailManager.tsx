"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdminLoadingState, AdminPageShell } from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { TechPackStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import PatternPicker from "@/components/admin/tech-pack/PatternPicker";
import {
  PATTERN_STATUS_LABELS,
  PRIVATE_FILE_HINT,
  TECH_PACK_ASSET_TYPE_LABELS,
  TECH_PACK_SOURCE_TYPE_LABELS,
} from "@/features/tech-pack/tech-pack-labels";
import {
  getOrderItemProcessingMethodLabel,
  getOrderItemSupplySourceLabel,
} from "@/features/orders/order-item-classification";
import { patternAdminDetailPath } from "@/features/patterns/pattern-admin-routes";
import TechPackBomEditor from "@/components/admin/tech-pack/TechPackBomEditor";
import TechPackArtworkPlacementsEditor from "@/components/admin/tech-pack/TechPackArtworkPlacementsEditor";
import TechPackReleaseChecklist from "@/components/admin/tech-pack/TechPackReleaseChecklist";
import TechPackReleaseHistoryPanel from "@/components/admin/tech-pack/TechPackReleaseHistoryPanel";
import TechPackReleaseDiffPanel from "@/components/admin/tech-pack/TechPackReleaseDiffPanel";
import TechPackPdfActions from "@/components/admin/tech-pack/TechPackPdfActions";
import MeasurementTemplateApplyButton from "@/components/admin/tech-pack/MeasurementTemplateApplyButton";
import TechPackMeasurementEditor from "@/components/admin/tech-pack/TechPackMeasurementEditor";
import type { ArtworkPlacementType, TechPackAssetType, TechPackBomCategory, TechPackStatus } from "@prisma/client";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { adminApiFetch, parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type TechPackDetail = {
  id: string;
  code: string;
  version: number;
  status: TechPackStatus;
  title: string | null;
  customerNameSnapshot: string | null;
  orderCodeSnapshot: string | null;
  productNameSnapshot: string | null;
  colorSnapshot: string | null;
  sizeSnapshot: string | null;
  quantitySnapshot: number | null;
  sourceType: string | null;
  processingMethod: string | null;
  bomNotes: string | null;
  patternExceptionReason: string | null;
  trimsNotes: string | null;
  printMethodNotes: string | null;
  embroideryNotes: string | null;
  deadline: string | null;
  qcNotes: string | null;
  productionNotes: string | null;
  internalNotes: string | null;
  patternCodeSnapshot: string | null;
  patternVersionSnapshot: string | null;
  pattern?: {
    id: string;
    code: string;
    name: string;
    version: number;
    baseSize: string | null;
    sizeRange: string | null;
    gradingRule: string | null;
    status: string;
    productionMaterialCategory?: string | null;
  } | null;
  assets: Array<{
    id: string;
    type: TechPackAssetType;
    title: string | null;
    previewUrl: string | null;
    originalFileName: string | null;
    r2ObjectKey: string | null;
    fileType: string;
  }>;
  bomItems: Array<{
    id: string;
    sortOrder: number;
    category: TechPackBomCategory;
    itemName: string;
    specification: string | null;
    color: string | null;
    supplier: string | null;
    unit: string | null;
    consumption: string | null;
    wastePercent: string | null;
    notes: string | null;
  }>;
  artworkPlacements: Array<{
    id: string;
    sortOrder: number;
    artworkAssetId: string | null;
    placementType: ArtworkPlacementType;
    title: string | null;
    bodyPart: string | null;
    width: string | null;
    height: string | null;
    measurementUnit: string | null;
    printMethod: string | null;
    embroideryMethod: string | null;
    inkColors: string | null;
    threadColors: string | null;
    notes: string | null;
    artworkAsset?: {
      id: string;
      previewUrl: string | null;
      originalFileName: string | null;
      fileType: string;
    } | null;
  }>;
  supersededBy?: { id: string; code: string; version: number } | null;
  measurements: Array<{
    id: string;
    pointOfMeasure: string;
    description: string | null;
    baseSize: string | null;
    tolerance: string | null;
    values: Array<{ size: string; value: string }>;
  }>;
};

type MeasurementDraftRow = Array<{
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  sortOrder?: number;
  values: Array<{ size: string; value: string }>;
}>;

type TechPackDraft = {
  trimsNotes: string;
  printMethodNotes: string;
  embroideryNotes: string;
  deadline: string;
  qcNotes: string;
  productionNotes: string;
  internalNotes: string;
  bomNotes: string;
  patternExceptionReason: string;
  measurements: MeasurementDraftRow;
};

type SaveStatus = "saved" | "dirty" | "saving" | "error";

const UNSAVED_MESSAGE = "Bạn có thay đổi chưa lưu. Rời khỏi trang sẽ mất các thay đổi này.";

const ARTWORK_ASSET_TYPES: TechPackAssetType[] = [
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "ARTWORK_REFERENCE",
];

const ASSET_DISPLAY_TYPES: TechPackAssetType[] = [
  "FLAT_SKETCH_FRONT",
  "FLAT_SKETCH_BACK",
  "MEASUREMENT_DIAGRAM",
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "CONSTRUCTION_CALLOUT",
  "ARTWORK_REFERENCE",
  "OTHER",
];

function measurementsToDraft(
  rows: TechPackDetail["measurements"],
): MeasurementDraftRow {
  return rows.map((row, index) => ({
    pointOfMeasure: row.pointOfMeasure,
    description: row.description ?? "",
    baseSize: row.baseSize ?? "",
    tolerance: row.tolerance ?? "",
    sortOrder: index,
    values: row.values.map((v) => ({ size: v.size, value: v.value })),
  }));
}

function createDraft(pack: TechPackDetail): TechPackDraft {
  return {
    trimsNotes: pack.trimsNotes ?? "",
    printMethodNotes: pack.printMethodNotes ?? "",
    embroideryNotes: pack.embroideryNotes ?? "",
    deadline: pack.deadline ? pack.deadline.slice(0, 10) : "",
    qcNotes: pack.qcNotes ?? "",
    productionNotes: pack.productionNotes ?? "",
    internalNotes: pack.internalNotes ?? "",
    bomNotes: pack.bomNotes ?? "",
    patternExceptionReason: pack.patternExceptionReason ?? "",
    measurements: measurementsToDraft(pack.measurements),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

export default function TechPackDetailManager({ techPackId }: { techPackId: string }) {
  const mutate = useAdminMutation();
  const saveBusyRef = useRef(false);
  const [pack, setPack] = useState<TechPackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState("");
  const [draft, setDraft] = useState<TechPackDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [measurementSaving, setMeasurementSaving] = useState(false);
  const [measurementFieldErrors, setMeasurementFieldErrors] = useState<Record<string, string>>({});
  const [measurementErrorDetail, setMeasurementErrorDetail] = useState<{
    code?: string;
    traceId?: string;
    message?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packRes = await adminApiFetch(`/api/tech-packs/${techPackId}`);
      const data = (await packRes.json()) as TechPackDetail & { message?: string };
      if (!packRes.ok) throw new Error(data.message ?? "Không thể tải Tech Pack");
      setPack(data);
      setSelectedPatternId(data.pattern?.id ?? "");
      const nextDraft = createDraft(data);
      setDraft(nextDraft);
      setSavedSnapshot(stableJson(nextDraft));
      setSaveStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [techPackId]);

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

  const readOnly = pack?.status !== "DRAFT";
  const isReleased = pack?.status === "RELEASED";
  const isSuperseded = pack?.status === "SUPERSEDED";

  function updateDraft(patch: Partial<TechPackDraft>) {
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

  function confirmLeaveIfDirty() {
    if (!isDirty || saveStatus === "saving") return true;
    return window.confirm(UNSAVED_MESSAGE);
  }

  async function saveTechPackDraft() {
    if (!pack || !draft || readOnly || saveBusyRef.current) return;
    saveBusyRef.current = true;
    setSaveStatus("saving");
    setMeasurementSaving(true);
    setMeasurementFieldErrors({});
    setMeasurementErrorDetail(null);

    const patch = {
      trimsNotes: draft.trimsNotes.trim() || null,
      printMethodNotes: draft.printMethodNotes.trim() || null,
      embroideryNotes: draft.embroideryNotes.trim() || null,
      deadline: draft.deadline || null,
      qcNotes: draft.qcNotes.trim() || null,
      productionNotes: draft.productionNotes.trim() || null,
      internalNotes: draft.internalNotes.trim() || null,
      bomNotes: draft.bomNotes.trim() || null,
      patternExceptionReason: draft.patternExceptionReason.trim() || null,
      measurements: draft.measurements,
    };

    await mutate({
      loadingMessage: "Đang lưu Tech Pack…",
      successMessage: "Đã lưu Tech Pack.",
      errorFallback: "Không thể lưu Tech Pack. Vui lòng thử lại.",
      action: async () => {
        const res = await adminApiFetch(`/api/tech-packs/${techPackId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const result = await parseAdminJsonResponse(res, (body) => body as TechPackDetail);
        if (!result.ok) {
          setMeasurementFieldErrors(result.fieldErrors ?? {});
          setMeasurementErrorDetail({
            code: result.code,
            traceId: result.traceId,
            message: result.message,
          });
        }
        return result;
      },
      onSuccess: (body) => {
        const nextDraft = createDraft(body);
        setPack(body);
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

  function formatSourceType(value: string | null): string | null {
    if (!value) return null;
    if (value === "FROM_QUOTE") return TECH_PACK_SOURCE_TYPE_LABELS.FROM_QUOTE;
    return getOrderItemSupplySourceLabel(value as OrderItemSupplySource);
  }

  function formatProcessingMethod(value: string | null): string | null {
    if (!value) return null;
    return getOrderItemProcessingMethodLabel(value as OrderItemProcessingMethod);
  }

  async function deleteAsset(assetId: string) {
    if (!window.confirm("Xóa file này?")) return;
    const res = await fetch(`/api/tech-packs/${techPackId}/assets/${assetId}`, { method: "DELETE" });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể xóa file");
    }
  }

  async function uploadAssetFile(type: TechPackAssetType, file: File): Promise<void> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const res = await fetch(`/api/tech-packs/${techPackId}/assets`, { method: "POST", body: fd });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể tải file lên. Vui lòng thử lại.");
      throw new Error(data.message);
    }
  }

  async function release() {
    if (!confirmLeaveIfDirty()) return;
    const res = await fetch(`/api/tech-packs/${techPackId}/release`, { method: "POST" });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể phát hành");
    }
  }

  async function newVersion() {
    if (!confirmLeaveIfDirty()) return;
    const res = await fetch(`/api/tech-packs/${techPackId}/new-version`, { method: "POST" });
    const data = (await res.json()) as { id?: string; message?: string };
    if (res.ok && data.id) window.location.href = `/admin/tech-pack/${data.id}`;
    else setError(data.message ?? "Không thể tạo version mới");
  }

  async function selectPattern() {
    if (!selectedPatternId) return;
    const res = await fetch(`/api/tech-packs/${techPackId}/select-pattern`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patternId: selectedPatternId }),
    });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể chọn rập");
    }
  }

  if (loading) return <AdminLoadingState label="Đang tải Tech Pack..." />;
  if (!pack || !draft) return <p className="admin-error">{error ?? "Không tìm thấy Tech Pack"}</p>;

  const bomCount = pack.bomItems?.length ?? 0;
  const artworkCount = pack.artworkPlacements?.length ?? 0;
  const measurementCount = draft.measurements.filter((r) => r.pointOfMeasure.trim()).length;
  const assetCount = pack.assets?.length ?? 0;

  return (
    <AdminPageShell className={readOnly ? "tech-pack-detail--readonly" : undefined}>
      <div className="tech-pack-workspace">
        <header className="tech-pack-workspace__header">
          <nav className="tech-pack-workspace__breadcrumb" aria-label="Breadcrumb">
            <Link
              href="/admin/tech-pack"
              onClick={(e) => {
                if (!confirmLeaveIfDirty()) e.preventDefault();
              }}
            >
              Tech Pack
            </Link>
            <span aria-hidden="true">›</span>
            <span>{pack.code}</span>
          </nav>

          <div className="tech-pack-workspace__header-main">
            <div className="tech-pack-workspace__title-block">
              <h1 className="tech-pack-workspace__title">
                {pack.code} — {pack.title ?? pack.productNameSnapshot ?? "Tech Pack"}
              </h1>
              <div className="tech-pack-workspace__badges">
                <TechPackStatusBadge status={pack.status} />
                <span className="tech-pack-workspace__badge tech-pack-workspace__badge--version">
                  v{pack.version}
                </span>
                <span className={`admin-status-badge admin-status-badge--${saveStatusTone()}`}>
                  {saveStatusLabel()}
                </span>
              </div>
            </div>

            <div className="tech-pack-workspace__actions">
              <Link
                href="/admin/tech-pack"
                className="admin-btn admin-btn--xs"
                onClick={(e) => {
                  if (!confirmLeaveIfDirty()) e.preventDefault();
                }}
              >
                Quay lại
              </Link>
              {!readOnly && (
                <AdminLoadingButton
                  variant="primary"
                  size="xs"
                  pending={saveStatus === "saving"}
                  pendingLabel="Đang lưu Tech Pack…"
                  disabled={!isDirty || saveStatus === "saving"}
                  onClick={() => void saveTechPackDraft()}
                >
                  Lưu
                </AdminLoadingButton>
              )}
              {!readOnly && (
                <button type="button" className="admin-btn admin-btn--xs" onClick={() => void release()}>
                  Phát hành
                </button>
              )}
              {isReleased && (
                <button type="button" className="admin-btn admin-btn--xs" onClick={() => void newVersion()}>
                  Tạo version mới
                </button>
              )}
              <TechPackPdfActions techPackId={techPackId} />
            </div>
          </div>

          <div className="tech-pack-workspace__summary-chips">
            <span className="tech-pack-workspace__chip"><strong>{bomCount}</strong> BOM</span>
            <span className="tech-pack-workspace__chip"><strong>{artworkCount}</strong> artwork</span>
            <span className="tech-pack-workspace__chip"><strong>{measurementCount}</strong> điểm đo</span>
            <span className="tech-pack-workspace__chip"><strong>{assetCount}</strong> file</span>
            {pack.pattern ? (
              <span className="tech-pack-workspace__chip">
                Rập: <strong>{pack.pattern.code}</strong>
              </span>
            ) : (
              <span className="tech-pack-workspace__chip tech-pack-workspace__chip--warn">Chưa chọn rập</span>
            )}
            {pack.orderCodeSnapshot ? (
              <span className="tech-pack-workspace__chip">Đơn: {pack.orderCodeSnapshot}</span>
            ) : null}
            {pack.customerNameSnapshot ? (
              <span className="tech-pack-workspace__chip">{pack.customerNameSnapshot}</span>
            ) : null}
          </div>
        </header>

        {isReleased && (
          <div className="tech-pack-detail__banner tech-pack-detail__banner--released">
            Tech Pack đã phát hành. Tạo version mới để chỉnh sửa.
          </div>
        )}
        {isSuperseded && (
          <div className="tech-pack-detail__banner tech-pack-detail__banner--superseded">
            Tech Pack này đã bị thay thế bởi version mới.
            {pack.supersededBy && (
              <>
                {" "}
                <Link href={`/admin/tech-pack/${pack.supersededBy.id}`} className="admin-link">
                  Xem {pack.supersededBy.code} v{pack.supersededBy.version}
                </Link>
              </>
            )}
          </div>
        )}

        {error && <p className="admin-error">{error}</p>}

        <div className="tech-pack-workspace__layout">
          <div className="tech-pack-workspace__main">
            <section className="tech-pack-workspace__panel admin-panel">
              <h2 className="tech-pack-workspace__panel-title">Tóm tắt sản xuất</h2>
              <div className="tech-pack-workspace__snapshot-grid">
                <SnapshotField label="Mã đơn" value={pack.orderCodeSnapshot} />
                <SnapshotField label="Khách hàng" value={pack.customerNameSnapshot} />
                <SnapshotField label="Sản phẩm" value={pack.productNameSnapshot} />
                <SnapshotField label="Màu" value={pack.colorSnapshot} />
                <SnapshotField label="Size" value={pack.sizeSnapshot} />
                <SnapshotField label="Số lượng" value={pack.quantitySnapshot?.toString() ?? null} />
                <SnapshotField label="Nguồn" value={formatSourceType(pack.sourceType)} />
                <SnapshotField label="Xử lý" value={formatProcessingMethod(pack.processingMethod)} />
              </div>
            </section>

            <section className="tech-pack-workspace__panel tech-pack-workspace__panel--bom admin-panel">
              <h2 className="tech-pack-workspace__panel-title">Bảng BOM</h2>
              <TechPackBomEditor
                techPackId={techPackId}
                items={pack.bomItems ?? []}
                readOnly={readOnly}
                patternProductionMaterialCategory={pack.pattern?.productionMaterialCategory ?? null}
                onSaved={() => void load()}
              />
            </section>

            <section className="tech-pack-workspace__panel admin-panel">
              <h2 className="tech-pack-workspace__panel-title">Vị trí artwork</h2>
              <TechPackArtworkPlacementsEditor
                techPackId={techPackId}
                items={pack.artworkPlacements ?? []}
                artworkAssets={pack.assets.filter((a) => ARTWORK_ASSET_TYPES.includes(a.type))}
                readOnly={readOnly}
                onSaved={() => void load()}
              />
            </section>

            <section className="tech-pack-workspace__panel tech-pack-workspace__panel--measurements admin-panel">
              <div className="tech-pack-workspace__panel-head">
                <h2 className="tech-pack-workspace__panel-title">Bảng thông số</h2>
                {!readOnly && (
                  <div className="tech-pack-workspace__panel-actions">
                    <PatternPicker value={selectedPatternId} onChange={setSelectedPatternId} />
                    <button type="button" className="admin-btn admin-btn--xs" onClick={() => void selectPattern()}>
                      Áp dụng rập
                    </button>
                    <MeasurementTemplateApplyButton
                      disabled={readOnly}
                      applyUrl={`/api/tech-packs/${techPackId}/apply-measurement-template`}
                      onApplied={() => void load()}
                    />
                  </div>
                )}
              </div>
              {pack.pattern?.status === "ARCHIVED" && (
                <div className="tech-pack-detail__banner tech-pack-detail__banner--warning">
                  Rập đã lưu trữ. Cân nhắc chọn rập khác trước khi phát hành.
                </div>
              )}
              <TechPackMeasurementEditor
                measurements={pack.measurements}
                readOnly={readOnly}
                compactToolbar
                saving={measurementSaving}
                fieldErrors={measurementFieldErrors}
                errorDetail={measurementErrorDetail}
                showSaveButton={false}
                onDraftChange={(rows) => updateDraft({ measurements: rows })}
                onSave={(rows) => updateDraft({ measurements: rows })}
              />
            </section>

            <section className="tech-pack-workspace__panel admin-panel">
              <h2 className="tech-pack-workspace__panel-title">Ghi chú sản xuất</h2>
              <div className="tech-pack-workspace__notes-grid">
                <DraftTextArea
                  label="Phụ liệu"
                  value={draft.trimsNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ trimsNotes: v })}
                />
                <DraftTextArea
                  label="Công nghệ in"
                  value={draft.printMethodNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ printMethodNotes: v })}
                />
                <DraftTextArea
                  label="Công nghệ thêu"
                  value={draft.embroideryNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ embroideryNotes: v })}
                />
                <DraftTextArea
                  label="QC"
                  value={draft.qcNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ qcNotes: v })}
                />
                <DraftTextArea
                  label="Ghi chú sản xuất"
                  value={draft.productionNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ productionNotes: v })}
                />
                <DraftTextArea
                  label="Ghi chú BOM"
                  value={draft.bomNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ bomNotes: v })}
                />
                <label className="admin-field">
                  <span className="admin-field__label">Deadline</span>
                  <input
                    type="date"
                    className="admin-input"
                    value={draft.deadline}
                    disabled={readOnly}
                    onChange={(e) => updateDraft({ deadline: e.target.value })}
                  />
                </label>
                <DraftTextArea
                  label="Ghi chú nội bộ"
                  value={draft.internalNotes}
                  readOnly={readOnly}
                  onChange={(v) => updateDraft({ internalNotes: v })}
                />
              </div>
            </section>
          </div>

          <aside className="tech-pack-workspace__sidebar">
            <section className="tech-pack-workspace__panel admin-panel">
              <h2 className="tech-pack-workspace__panel-title">Rập đã chọn</h2>
              {pack.pattern ? (
                <dl className="tech-pack-workspace__pattern-dl">
                  <div>
                    <dt>Mã</dt>
                    <dd>
                      <Link href={patternAdminDetailPath(pack.pattern.id)} className="admin-link">
                        {pack.pattern.code}
                      </Link>
                    </dd>
                  </div>
                  <div><dt>Version</dt><dd>v{pack.pattern.version}</dd></div>
                  <div><dt>Base size</dt><dd>{pack.pattern.baseSize ?? "—"}</dd></div>
                  <div><dt>Size range</dt><dd>{pack.pattern.sizeRange ?? "—"}</dd></div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>
                      {PATTERN_STATUS_LABELS[pack.pattern.status as keyof typeof PATTERN_STATUS_LABELS] ??
                        pack.pattern.status}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="admin-muted">Chưa chọn rập.</p>
              )}
            </section>

            <section className="tech-pack-workspace__panel admin-panel">
              <h2 className="tech-pack-workspace__panel-title">File / tài sản</h2>
              {ASSET_DISPLAY_TYPES.map((type) => {
                const assets = pack.assets.filter((a) => a.type === type);
                if (assets.length === 0 && readOnly) return null;
                return (
                  <AssetTypeGroup
                    key={type}
                    type={type}
                    label={TECH_PACK_ASSET_TYPE_LABELS[type]}
                    assets={assets}
                    readOnly={readOnly}
                    onUpload={(file) => uploadAssetFile(type, file)}
                    onDelete={(id) => void deleteAsset(id)}
                  />
                );
              })}
            </section>

            <div className="tech-pack-workspace__panel admin-panel">
              <TechPackReleaseChecklist
                techPackId={techPackId}
                status={pack.status}
                hasPattern={Boolean(pack.pattern)}
                patternExceptionReason={draft.patternExceptionReason || null}
                readOnly={readOnly}
                onPatternExceptionChange={(v) => updateDraft({ patternExceptionReason: v ?? "" })}
                onRelease={() => void release()}
              />
            </div>

            <div className="tech-pack-workspace__panel admin-panel">
              <TechPackReleaseDiffPanel techPackId={techPackId} />
            </div>

            <div className="tech-pack-workspace__panel admin-panel">
              <TechPackReleaseHistoryPanel techPackId={techPackId} />
            </div>
          </aside>
        </div>
      </div>
    </AdminPageShell>
  );
}

function SnapshotField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="tech-pack-workspace__snapshot-field">
      <span className="tech-pack-workspace__snapshot-label">{label}</span>
      <span className="tech-pack-workspace__snapshot-value">{value ?? "—"}</span>
    </div>
  );
}

function CompactAssetCard({
  asset,
  readOnly,
  onDelete,
}: {
  asset: {
    id: string;
    previewUrl: string | null;
    originalFileName: string | null;
    r2ObjectKey: string | null;
    fileType: string;
  };
  readOnly?: boolean;
  onDelete?: () => void;
}) {
  const previewable =
    asset.previewUrl && (asset.fileType === "IMAGE" || asset.fileType === "PDF");

  return (
    <article className="tech-pack-workspace__asset-card">
      {previewable ? (
        asset.fileType === "PDF" ? (
          <span className="tech-pack-workspace__asset-icon">PDF</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.previewUrl!}
            alt={asset.originalFileName ?? "preview"}
            className="tech-pack-workspace__asset-thumb"
          />
        )
      ) : (
        <span className="tech-pack-workspace__asset-icon">{asset.fileType}</span>
      )}
      <div
        className="tech-pack-workspace__asset-meta"
        title={asset.r2ObjectKey ? PRIVATE_FILE_HINT : undefined}
      >
        <strong>{asset.originalFileName ?? asset.fileType}</strong>
        <span>{asset.fileType}</span>
      </div>
      <div className="tech-pack-workspace__asset-actions">
        {asset.previewUrl ? (
          <a
            className="admin-btn admin-btn--xs"
            href={asset.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Xem
          </a>
        ) : null}
        {!readOnly && onDelete ? (
          <button type="button" className="admin-btn admin-btn--xs admin-btn--danger" onClick={onDelete}>
            Xóa
          </button>
        ) : null}
      </div>
    </article>
  );
}

function DraftTextArea({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      <textarea
        className="admin-textarea"
        value={value}
        rows={2}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function AssetTypeGroup({
  type,
  label,
  assets,
  readOnly,
  onUpload,
  onDelete,
}: {
  type: TechPackAssetType;
  label: string;
  assets: TechPackDetail["assets"];
  readOnly: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const inputId = `asset-upload-${type}`;
  return (
    <div className="tech-pack-workspace__asset-group">
      <div className="tech-pack-workspace__asset-group-head">
        <span>{label}</span>
        {!readOnly && (
          <>
            <input
              id={inputId}
              type="file"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void onUpload(file);
              }}
            />
            <label htmlFor={inputId} className="admin-btn admin-btn--xs">
              Tải lên
            </label>
          </>
        )}
      </div>
      {assets.length === 0 ? (
        <p className="admin-muted tech-pack-workspace__asset-empty">Chưa có file.</p>
      ) : (
        <div className="tech-pack-workspace__asset-list">
          {assets.map((asset) => (
            <CompactAssetCard
              key={asset.id}
              asset={asset}
              readOnly={readOnly}
              onDelete={() => onDelete(asset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
