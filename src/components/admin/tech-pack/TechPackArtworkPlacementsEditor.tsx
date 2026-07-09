"use client";

import { useCallback, useEffect, useState } from "react";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import type { ArtworkPlacementType } from "@prisma/client";
import {
  ARTWORK_PLACEMENT_TYPES,
  ARTWORK_PLACEMENT_TYPE_LABELS,
} from "@/features/tech-pack/tech-pack-bom-labels";
import ProductionMasterSearchSelect from "@/components/admin/production-master/ProductionMasterSearchSelect";

export type PlacementRow = {
  clientKey: string;
  sortOrder: number;
  artworkAssetId: string;
  placementType: ArtworkPlacementType;
  title: string;
  bodyPart: string;
  width: string;
  height: string;
  measurementUnit: string;
  printMethod: string;
  printMethodId: string;
  printMethodLabel: string;
  printMethodCode: string;
  embroideryMethod: string;
  inkColors: string;
  threadColors: string;
  notes: string;
};

type ServerPlacement = {
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
  printMethodId?: string | null;
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
  printMethodRef?: { id: string; code: string; name: string } | null;
};

type ArtworkAsset = {
  id: string;
  previewUrl: string | null;
  originalFileName: string | null;
  fileType: string;
};

function toRows(items: ServerPlacement[]): PlacementRow[] {
  return items.map((item) => ({
    clientKey: item.id,
    sortOrder: item.sortOrder,
    artworkAssetId: item.artworkAssetId ?? "",
    placementType: item.placementType,
    title: item.title ?? "",
    bodyPart: item.bodyPart ?? "",
    width: item.width ?? "",
    height: item.height ?? "",
    measurementUnit: item.measurementUnit ?? "cm",
    printMethod: item.printMethod ?? "",
    printMethodId: item.printMethodId ?? "",
    printMethodLabel: item.printMethodRef
      ? `${item.printMethodRef.code} — ${item.printMethodRef.name}`
      : "",
    printMethodCode: item.printMethodRef?.code ?? "",
    embroideryMethod: item.embroideryMethod ?? "",
    inkColors: item.inkColors ?? "",
    threadColors: item.threadColors ?? "",
    notes: item.notes ?? "",
  }));
}

function emptyRow(sortOrder: number): PlacementRow {
  return {
    clientKey: `new-${Date.now()}`,
    sortOrder,
    artworkAssetId: "",
    placementType: "PRINT",
    title: "",
    bodyPart: "",
    width: "",
    height: "",
    measurementUnit: "cm",
    printMethod: "",
    printMethodId: "",
    printMethodLabel: "",
    printMethodCode: "",
    embroideryMethod: "",
    inkColors: "",
    threadColors: "",
    notes: "",
  };
}

type Props = {
  techPackId: string;
  items: ServerPlacement[];
  artworkAssets: ArtworkAsset[];
  readOnly?: boolean;
  onSaved?: () => void;
};

export default function TechPackArtworkPlacementsEditor({
  techPackId,
  items,
  artworkAssets,
  readOnly,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<PlacementRow[]>(() => toRows(items));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(toRows(items));
  }, [items]);

  const persist = useCallback(
    async (nextRows: PlacementRow[]) => {
      setSaving(true);
      setError(null);
      const payload = nextRows.map((row, index) => ({
        sortOrder: index,
        artworkAssetId: row.artworkAssetId || null,
        placementType: row.placementType,
        title: row.title || null,
        bodyPart: row.bodyPart || null,
        width: row.width || null,
        height: row.height || null,
        measurementUnit: row.measurementUnit || null,
        printMethod: row.printMethod || null,
        printMethodId: row.printMethodId || null,
        embroideryMethod: row.embroideryMethod || null,
        inkColors: row.inkColors || null,
        threadColors: row.threadColors || null,
        notes: row.notes || null,
      }));
      const res = await fetch(`/api/tech-packs/${techPackId}/artwork-placements`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) setError(data.message ?? "Không thể lưu vị trí artwork");
      else onSaved?.();
      setSaving(false);
    },
    [techPackId, onSaved],
  );

  function updateRow(key: string, patch: Partial<PlacementRow>) {
    if (readOnly) return;
    const next = rows.map((r) => (r.clientKey === key ? { ...r, ...patch } : r));
    setRows(next);
  }

  function addRow() {
    const next = [...rows, emptyRow(rows.length)];
    setRows(next);
    void persist(next);
  }

  function deleteRow(key: string) {
    const next = rows.filter((r) => r.clientKey !== key);
    setRows(next);
    void persist(next);
  }

  function technologyLabel(row: PlacementRow): string {
    if (row.placementType === "EMBROIDERY") return row.embroideryMethod || "Thêu";
    if (row.printMethodCode) return `${row.printMethodCode} — ${row.printMethod || row.printMethodLabel}`;
    if (row.placementType === "PRINT" || row.placementType === "HEAT_TRANSFER") {
      return row.printMethod || ARTWORK_PLACEMENT_TYPE_LABELS[row.placementType];
    }
    return ARTWORK_PLACEMENT_TYPE_LABELS[row.placementType];
  }

  function previewAsset(assetId: string) {
    return artworkAssets.find((a) => a.id === assetId) ?? items.find((i) => i.artworkAssetId === assetId)?.artworkAsset;
  }

  if (rows.length === 0 && readOnly) {
    return <p className="admin-muted">Chưa có vị trí artwork.</p>;
  }

  return (
    <div className="tech-pack-placements">
      {error && <p className="admin-error">{error}</p>}
      {saving && <AdminInlineLoader message="Đang lưu vị trí artwork…" />}

      {!readOnly && (
        <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" style={{ marginBottom: 12 }} onClick={addRow}>
          Thêm vị trí
        </button>
      )}

      {rows.length === 0 ? (
        <p className="admin-muted">Chưa có vị trí artwork. Tải artwork lên trước, sau đó thêm vị trí.</p>
      ) : (
        <div className="tech-pack-placements__grid">
          {rows.map((row) => {
            const asset = row.artworkAssetId ? previewAsset(row.artworkAssetId) : null;
            return (
              <div key={row.clientKey} className="tech-pack-placement-card">
                <div className="tech-pack-placement-card__preview">
                  {asset?.previewUrl && asset.fileType === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.previewUrl} alt={asset.originalFileName ?? "Artwork"} />
                  ) : (
                    <div className="tech-pack-placement-card__placeholder">
                      {asset?.originalFileName ?? "Chưa chọn artwork"}
                    </div>
                  )}
                </div>
                <div className="tech-pack-placement-card__fields">
                  <label className="admin-field">
                    <span>Loại</span>
                    <select
                      className="admin-select"
                      value={row.placementType}
                      disabled={readOnly}
                      onChange={(e) => {
                        updateRow(row.clientKey, { placementType: e.target.value as ArtworkPlacementType });
                        void persist(rows);
                      }}
                    >
                      {ARTWORK_PLACEMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ARTWORK_PLACEMENT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Artwork liên kết</span>
                    <select
                      className="admin-select"
                      value={row.artworkAssetId}
                      disabled={readOnly}
                      onChange={(e) => {
                        updateRow(row.clientKey, { artworkAssetId: e.target.value });
                        void persist(rows.map((r) => (r.clientKey === row.clientKey ? { ...r, artworkAssetId: e.target.value } : r)));
                      }}
                    >
                      <option value="">— Chọn file —</option>
                      {artworkAssets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.originalFileName ?? a.id.slice(-6)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Tên</span>
                    <input
                      className="admin-input"
                      value={row.title}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { title: e.target.value })}
                      onBlur={() => void persist(rows)}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Vị trí</span>
                    <input
                      className="admin-input"
                      value={row.bodyPart}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { bodyPart: e.target.value })}
                      onBlur={() => void persist(rows)}
                    />
                  </label>
                  <div className="admin-form-grid admin-form-grid--2">
                    <label className="admin-field">
                      <span>Chiều rộng</span>
                      <input
                        className="admin-input"
                        value={row.width}
                        disabled={readOnly}
                        onChange={(e) => updateRow(row.clientKey, { width: e.target.value })}
                        onBlur={() => void persist(rows)}
                      />
                    </label>
                    <label className="admin-field">
                      <span>Chiều cao</span>
                      <input
                        className="admin-input"
                        value={row.height}
                        disabled={readOnly}
                        onChange={(e) => updateRow(row.clientKey, { height: e.target.value })}
                        onBlur={() => void persist(rows)}
                      />
                    </label>
                  </div>
                  <p className="admin-muted">
                    Kích thước: {[row.width, row.height].filter(Boolean).join(" × ") || "—"}{" "}
                    {row.measurementUnit}
                  </p>
                  <p className="admin-field-hint">Công nghệ: {technologyLabel(row)}</p>
                  {!readOnly && (row.placementType === "PRINT" || row.placementType === "HEAT_TRANSFER") && (
                    <label className="admin-field">
                      <span>Công nghệ in (thư viện)</span>
                      <ProductionMasterSearchSelect
                        apiPath="/api/print-methods"
                        value={row.printMethodId || null}
                        displayLabel={row.printMethodLabel || row.printMethod}
                        placeholder="Chọn công nghệ in..."
                        onSelect={(item) => {
                          const next = rows.map((r) =>
                            r.clientKey === row.clientKey
                              ? {
                                  ...r,
                                  printMethodId: item?.id ?? "",
                                  printMethodLabel: item ? `${item.code} — ${item.name}` : "",
                                  printMethodCode: item?.code ?? "",
                                  printMethod: item?.name ?? r.printMethod,
                                }
                              : r,
                          );
                          setRows(next);
                          void persist(next);
                        }}
                      />
                    </label>
                  )}
                  <label className="admin-field">
                    <span>Màu in</span>
                    <input
                      className="admin-input"
                      value={row.inkColors}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { inkColors: e.target.value })}
                      onBlur={() => void persist(rows)}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Màu chỉ</span>
                    <input
                      className="admin-input"
                      value={row.threadColors}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { threadColors: e.target.value })}
                      onBlur={() => void persist(rows)}
                    />
                  </label>
                  <label className="admin-field">
                    <span>Ghi chú</span>
                    <textarea
                      className="admin-textarea"
                      rows={2}
                      value={row.notes}
                      disabled={readOnly}
                      onChange={(e) => updateRow(row.clientKey, { notes: e.target.value })}
                      onBlur={() => void persist(rows)}
                    />
                  </label>
                  {!readOnly && (
                    <button type="button" className="admin-btn admin-btn--xs admin-btn--danger" onClick={() => deleteRow(row.clientKey)}>
                      Xóa vị trí
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
