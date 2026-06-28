"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  PageHeader,
  SectionCard,
} from "@/components/admin/AdminUi";
import { TechPackStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import PatternPicker from "@/components/admin/tech-pack/PatternPicker";
import PrivateFileUploadZone from "@/components/admin/tech-pack/PrivateFileUploadZone";
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
import TechPackBomEditor from "@/components/admin/tech-pack/TechPackBomEditor";
import TechPackArtworkPlacementsEditor from "@/components/admin/tech-pack/TechPackArtworkPlacementsEditor";
import TechPackReleaseChecklist from "@/components/admin/tech-pack/TechPackReleaseChecklist";
import TechPackReleaseHistoryPanel from "@/components/admin/tech-pack/TechPackReleaseHistoryPanel";
import TechPackReleaseDiffPanel from "@/components/admin/tech-pack/TechPackReleaseDiffPanel";
import MeasurementTemplateApplyButton from "@/components/admin/tech-pack/MeasurementTemplateApplyButton";
import TechPackMeasurementEditor from "@/components/admin/tech-pack/TechPackMeasurementEditor";
import type { TechPackBomCategory, ArtworkPlacementType, TechPackAssetType, TechPackStatus } from "@prisma/client";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";

type TabId = "bom" | "construction" | "measurement";

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

const ARTWORK_ASSET_TYPES: TechPackAssetType[] = [
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "ARTWORK_REFERENCE",
];

const CONSTRUCTION_TYPES: TechPackAssetType[] = [
  "FLAT_SKETCH_FRONT",
  "FLAT_SKETCH_BACK",
  "LOGO_PLACEMENT",
  "PRINT_PLACEMENT",
  "EMBROIDERY_PLACEMENT",
  "CONSTRUCTION_CALLOUT",
  "ARTWORK_REFERENCE",
];

export default function TechPackDetailManager({ techPackId }: { techPackId: string }) {
  const [pack, setPack] = useState<TechPackDetail | null>(null);
  const [tab, setTab] = useState<TabId>("bom");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packRes = await fetch(`/api/tech-packs/${techPackId}`);
      const data = (await packRes.json()) as TechPackDetail & { message?: string };
      if (!packRes.ok) throw new Error(data.message ?? "Không thể tải Tech Pack");
      setPack(data);
      setSelectedPatternId(data.pattern?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [techPackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const readOnly = pack?.status !== "DRAFT";
  const isReleased = pack?.status === "RELEASED";
  const isSuperseded = pack?.status === "SUPERSEDED";

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

  async function save(patch: Record<string, unknown>) {
    if (!pack || readOnly) return;
    const res = await fetch(`/api/tech-packs/${techPackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) setError(data.message ?? "Không thể lưu");
    else void load();
  }

  async function release() {
    const res = await fetch(`/api/tech-packs/${techPackId}/release`, { method: "POST" });
    if (res.ok) void load();
    else {
      const data = (await res.json()) as { message?: string };
      setError(data.message ?? "Không thể phát hành");
    }
  }

  async function newVersion() {
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
  if (!pack) return <p className="admin-error">{error ?? "Không tìm thấy Tech Pack"}</p>;

  return (
    <AdminPageShell className={readOnly ? "tech-pack-detail--readonly" : undefined}>
      <PageHeader
        title={`${pack.code} v${pack.version}`}
        meta={<TechPackStatusBadge status={pack.status} />}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/tech-pack" className="admin-btn">
              Quay lại
            </Link>
            <a
              href={`/api/tech-packs/${techPackId}/pdf`}
              className="admin-btn"
              target="_blank"
              rel="noreferrer"
            >
              Xuất PDF
            </a>
            {pack.status === "DRAFT" && (
              <span className="admin-muted" style={{ fontSize: 12 }}>
                Dùng checklist bên phải để phát hành
              </span>
            )}
            {isReleased && (
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void newVersion()}>
                Tạo version mới
              </button>
            )}
          </div>
        }
      />

      {isReleased && (
        <div className="tech-pack-detail__banner tech-pack-detail__banner--released">
          Tech Pack đã phát hành. Tạo version mới để chỉnh sửa.
          <div className="tech-pack-detail__banner-actions">
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void newVersion()}>
              Tạo version mới
            </button>
            <a
              href={`/api/tech-packs/${techPackId}/pdf`}
              className="admin-btn"
              target="_blank"
              rel="noreferrer"
            >
              Xuất PDF
            </a>
          </div>
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

      <div className="tech-pack-detail-layout">
        <div className="tech-pack-detail-main">
      <div className="admin-tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["bom", "Main Page / BOM"],
            ["construction", "Construction Page"],
            ["measurement", "Measurement & Grading"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-btn${tab === id ? " admin-btn--primary" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "bom" && (
        <SectionCard title="Main Page / BOM">
          <div className="admin-form-grid">
            <Field label="Mã đơn" value={pack.orderCodeSnapshot} />
            <Field label="Khách hàng" value={pack.customerNameSnapshot} />
            <Field label="Sản phẩm" value={pack.productNameSnapshot} />
            <Field label="Màu" value={pack.colorSnapshot} />
            <Field label="Size" value={pack.sizeSnapshot} />
            <Field label="Số lượng" value={pack.quantitySnapshot?.toString() ?? null} />
            <Field label="Nguồn sản phẩm" value={formatSourceType(pack.sourceType)} />
            <Field label="Cách xử lý" value={formatProcessingMethod(pack.processingMethod)} />
            <TextAreaField
              label="Phụ liệu"
              value={pack.trimsNotes}
              readOnly={readOnly}
              onSave={(v) => void save({ trimsNotes: v })}
            />
            <TextAreaField
              label="Công nghệ in/thêu"
              value={`${pack.printMethodNotes ?? ""}\n${pack.embroideryNotes ?? ""}`.trim()}
              readOnly={readOnly}
              onSave={(v) => void save({ printMethodNotes: v })}
            />
            <label className="admin-field">
              <span>Deadline</span>
              <input
                type="date"
                className="admin-input"
                defaultValue={pack.deadline ? pack.deadline.slice(0, 10) : ""}
                disabled={readOnly}
                onBlur={(e) => void save({ deadline: e.target.value || null })}
              />
            </label>
            <TextAreaField
              label="QC"
              value={pack.qcNotes}
              readOnly={readOnly}
              onSave={(v) => void save({ qcNotes: v })}
            />
            <TextAreaField
              label="Ghi chú sản xuất"
              value={pack.productionNotes}
              readOnly={readOnly}
              onSave={(v) => void save({ productionNotes: v })}
            />
            <TextAreaField
              label="Ghi chú BOM (bổ sung)"
              value={pack.bomNotes}
              readOnly={readOnly}
              onSave={(v) => void save({ bomNotes: v })}
            />
          </div>

          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 8 }}>Bảng BOM</h4>
            <TechPackBomEditor
              techPackId={techPackId}
              items={pack.bomItems ?? []}
              readOnly={readOnly}
              patternProductionMaterialCategory={pack.pattern?.productionMaterialCategory ?? null}
              onSaved={() => void load()}
            />
          </div>
        </SectionCard>
      )}

      {tab === "construction" && (
        <SectionCard title="Construction Page">
          {CONSTRUCTION_TYPES.map((type) => {
            const assets = pack.assets.filter((a) => a.type === type);
            return (
              <div key={type} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4>{TECH_PACK_ASSET_TYPE_LABELS[type]}</h4>
                  {!readOnly && (
                    <PrivateFileUploadZone
                      onUpload={(file) => uploadAssetFile(type, file)}
                    />
                  )}
                </div>
                {assets.length === 0 ? (
                  <p className="admin-muted">Chưa có file.</p>
                ) : (
                  <div className="admin-file-grid">
                    {assets.map((asset) => (
                      <AssetCard
                        key={asset.id}
                        asset={asset}
                        readOnly={readOnly}
                        onDelete={() => void deleteAsset(asset.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ marginBottom: 8 }}>Vị trí artwork</h4>
            <TechPackArtworkPlacementsEditor
              techPackId={techPackId}
              items={pack.artworkPlacements ?? []}
              artworkAssets={pack.assets.filter((a) => ARTWORK_ASSET_TYPES.includes(a.type))}
              readOnly={readOnly}
              onSaved={() => void load()}
            />
          </div>
        </SectionCard>
      )}

      {tab === "measurement" && (
        <>
          <SectionCard title="Rập đã chọn">
            {pack.pattern?.status === "ARCHIVED" && (
              <div className="tech-pack-detail__banner tech-pack-detail__banner--warning">
                Rập đã lưu trữ. Cân nhắc chọn rập khác trước khi phát hành.
              </div>
            )}
            {!readOnly && (
              <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <PatternPicker value={selectedPatternId} onChange={setSelectedPatternId} />
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => void selectPattern()}
                >
                  Áp dụng rập
                </button>
                <MeasurementTemplateApplyButton
                  disabled={readOnly}
                  applyUrl={`/api/tech-packs/${techPackId}/apply-measurement-template`}
                  onApplied={() => void load()}
                />
              </div>
            )}
            {pack.pattern ? (
              <dl className="admin-dl">
                <dt>Mã rập</dt>
                <dd>{pack.pattern.code}</dd>
                <dt>Version</dt>
                <dd>{pack.pattern.version}</dd>
                <dt>Base size</dt>
                <dd>{pack.pattern.baseSize ?? "—"}</dd>
                <dt>Size range</dt>
                <dd>{pack.pattern.sizeRange ?? "—"}</dd>
                <dt>Grading rule</dt>
                <dd>{pack.pattern.gradingRule ?? "—"}</dd>
                <dt>Trạng thái duyệt</dt>
                <dd>
                  {PATTERN_STATUS_LABELS[pack.pattern.status as keyof typeof PATTERN_STATUS_LABELS] ??
                    pack.pattern.status}
                </dd>
              </dl>
            ) : (
              <p className="admin-muted">Chưa chọn rập.</p>
            )}
          </SectionCard>

          <SectionCard title="Sơ đồ đo">
            {!readOnly && (
              <PrivateFileUploadZone
                label="Kéo thả sơ đồ đo hoặc bấm để chọn"
                onUpload={(file) => uploadAssetFile("MEASUREMENT_DIAGRAM", file)}
              />
            )}
            <div className="admin-file-grid">
              {pack.assets
                .filter((a) => a.type === "MEASUREMENT_DIAGRAM")
                .map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    readOnly={readOnly}
                    onDelete={() => void deleteAsset(asset.id)}
                  />
                ))}
            </div>
          </SectionCard>

          <SectionCard title="Bảng đo">
            <TechPackMeasurementEditor
              measurements={pack.measurements}
              readOnly={readOnly}
              onSave={(rows) => void save({ measurements: rows })}
            />
          </SectionCard>
        </>
      )}
        </div>

        <aside className="tech-pack-detail-sidebar">
          <TechPackReleaseChecklist
            techPackId={techPackId}
            status={pack.status}
            hasPattern={Boolean(pack.pattern)}
            patternExceptionReason={pack.patternExceptionReason}
            readOnly={readOnly}
            onPatternExceptionChange={(v) => void save({ patternExceptionReason: v })}
            onRelease={() => void release()}
          />
          <TechPackReleaseDiffPanel techPackId={techPackId} />
          <TechPackReleaseHistoryPanel techPackId={techPackId} />
        </aside>
      </div>
    </AdminPageShell>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input className="admin-input" value={value ?? ""} readOnly disabled />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  readOnly,
  onSave,
}: {
  label: string;
  value: string | null;
  readOnly: boolean;
  onSave: (value: string | null) => void;
}) {
  return (
    <label className="admin-field admin-field--full">
      <span>{label}</span>
      <textarea
        className="admin-textarea"
        defaultValue={value ?? ""}
        rows={4}
        readOnly={readOnly}
        disabled={readOnly}
        onBlur={(e) => onSave(e.target.value || null)}
      />
    </label>
  );
}

function AssetCard({
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
    asset.previewUrl &&
    (asset.fileType === "IMAGE" || asset.fileType === "PDF");

  return (
    <div className="admin-file-card">
      {previewable ? (
        asset.fileType === "PDF" ? (
          <a href={asset.previewUrl!} target="_blank" rel="noreferrer" className="admin-link">
            PDF xem nhanh
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.previewUrl!} alt={asset.originalFileName ?? "preview"} />
        )
      ) : (
        <div className="admin-file-card__placeholder">
          <strong>{asset.originalFileName ?? asset.fileType}</strong>
          <p>{PRIVATE_FILE_HINT}</p>
        </div>
      )}
      <p className="admin-field-hint">{asset.fileType}</p>
      {!readOnly && onDelete && (
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={onDelete}>
          Xóa
        </button>
      )}
    </div>
  );
}
