"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductionFileType } from "@prisma/client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import {
  MATERIAL_TYPE_LABELS,
  PRODUCTION_FILE_STATUS_LABELS,
  PRODUCTION_FILE_TYPE_LABELS,
  PRODUCTION_FILE_TYPES,
} from "@/features/orders/production-pack-labels";
import { formatRequiredQuantityFormula } from "@/features/orders/bom-calculations";
import {
  ALLOWED_PRODUCTION_FILE_EXTENSIONS,
  classifyProductionFile,
  ERROR_R2_NOT_CONFIGURED,
  getProductionUploadHint,
  isPreviewableProductionMime,
} from "@/lib/productionFileValidation";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { OrderItemMaterialRecord, OrderProductionFileRecord } from "@/features/orders/production-pack.types";
import type { ProductionReadinessResult } from "@/features/orders/production-readiness.service";
import ProductionSheetActions from "@/components/admin/orders/production-sheet/ProductionSheetActions";
import OrderMaterialAvailabilityPanel from "@/components/admin/orders/OrderMaterialAvailabilityPanel";

type MaterialItemRow = {
  orderItemId: string;
  productNameSnapshot: string | null;
  variantNameSnapshot: string | null;
  totalQuantity: number;
  materials: OrderItemMaterialRecord[];
};

type MaterialsPayload = {
  items: MaterialItemRow[];
  summary: Array<{
    materialType: string;
    materialName: string;
    materialCode: string | null;
    unit: string;
    totalRequiredQuantity: string;
    notes: string[];
  }>;
  readiness: ProductionReadinessResult;
};

type Props = {
  orderId: string;
  order: OrderDetailRecord;
  onOrderChange?: (order: OrderDetailRecord) => void;
};

type Tab = "files" | "materials" | "availability" | "readiness";

type MediaAssetPick = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider?: string;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function OrderProductionPackSection({ orderId, order }: Props) {
  const mutate = useAdminMutation();
  const [tab, setTab] = useState<Tab>("files");
  const [files, setFiles] = useState<OrderProductionFileRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [fileFormOpen, setFileFormOpen] = useState(false);
  const [fileScope, setFileScope] = useState<"order" | string>("order");
  const [fileType, setFileType] = useState<ProductionFileType>("DESIGN_ARTWORK");
  const [fileTitle, setFileTitle] = useState("");
  const [fileVersion, setFileVersion] = useState(1);
  const [fileNote, setFileNote] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetPick | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetPick[]>([]);
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, materialsRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/production-files`),
        fetch(`/api/orders/${orderId}/materials`),
      ]);
      const filesData = await filesRes.json();
      const materialsData = await materialsRes.json();
      setFiles(Array.isArray(filesData.files) ? filesData.files : []);
      setMaterials(materialsData as MaterialsPayload);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/production-files/status")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => setR2Configured(Boolean(data.configured)))
      .catch(() => setR2Configured(false));
  }, []);

  async function openMediaPicker() {
    setPickerOpen(true);
    const res = await fetch("/api/media?folder=general");
    const data = await res.json();
    const list = (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) => ({
      id: String(a.id),
      filename: String(a.filename ?? a.originalName ?? "file"),
      url: String(a.url),
      mimeType: String(a.mimeType ?? ""),
      sizeBytes: Number(a.sizeBytes ?? 0),
    }));
    setMediaAssets(list);
  }

  async function uploadProductionFile(file: File) {
    setUploadError(null);
    const classification = classifyProductionFile({
      filename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
      productionFileType: fileType,
    });
    setUploadHint(getProductionUploadHint(classification));

    if (!classification.allowed) {
      throw new Error(classification.error ?? "Định dạng file này chưa được hỗ trợ.");
    }

    if (classification.storageProvider === "CLOUDFLARE_R2") {
      if (r2Configured === false) {
        throw new Error(ERROR_R2_NOT_CONFIGURED);
      }

      const sessionRes = await fetch("/api/production-files/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          orderItemId: fileScope === "order" ? null : fileScope,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || classification.mimeType,
          productionFileType: fileType,
        }),
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(session.message ?? ERROR_R2_NOT_CONFIGURED);
      }

      const putRes = await fetch(session.uploadUrl, {
        method: "PUT",
        body: file,
        headers: session.uploadHeaders ?? { "Content-Type": classification.mimeType ?? file.type },
      });
      if (!putRes.ok) {
        throw new Error("Tải file lên kho lưu trữ thất bại.");
      }

      const completeRes = await fetch("/api/production-files/upload-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: session.sessionToken }),
      });
      const complete = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(complete.message ?? "Không thể hoàn tất tải lên.");
      }

      setSelectedAsset({
        id: String(complete.asset.id),
        filename: String(complete.asset.filename),
        url: String(complete.asset.url),
        mimeType: String(complete.asset.mimeType),
        sizeBytes: Number(complete.asset.sizeBytes ?? 0),
        storageProvider: "CLOUDFLARE_R2",
      });
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("productionFile", "true");
    fd.append("productionFileType", fileType);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Upload thất bại");
    setSelectedAsset({
      id: String(data.id),
      filename: String(data.filename),
      url: String(data.url),
      mimeType: String(data.mimeType),
      sizeBytes: Number(data.sizeBytes ?? 0),
      storageProvider: "CLOUDINARY",
    });
  }

  async function submitFile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    await mutate({
      loadingMessage: "Đang thêm file…",
      successMessage: "Đã thêm file sản xuất.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: fileScope === "order" ? orderId : null,
            orderItemId: fileScope === "order" ? null : fileScope,
            mediaAssetId: selectedAsset.id,
            type: fileType,
            title: fileTitle || selectedAsset.filename,
            version: fileVersion,
            note: fileNote || null,
            setAsActive: true,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.file as OrderProductionFileRecord);
      },
      onSuccess: (file) => {
        setFileFormOpen(false);
        setSelectedAsset(null);
        setFileTitle("");
        setFileNote("");
        setUploadHint(null);
        setUploadError(null);
        if (file) {
          setFiles((prev) => [...prev, file]);
        } else {
          void load();
        }
      },
    });
  }

  async function setFileActive(fileId: string) {
    await mutate({
      loadingMessage: "Đang cập nhật…",
      successMessage: "Đã đặt làm bản đang sử dụng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-files/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setAsActive: true }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  async function archiveFile(fileId: string) {
    await mutate({
      loadingMessage: "Đang lưu trữ…",
      successMessage: "Đã lưu trữ file.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-files/${fileId}/archive`, {
          method: "POST",
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  const activeFiles = files.filter((f) => f.status === "ACTIVE");
  const archivedFiles = files.filter((f) => f.status !== "ACTIVE");
  const orderLevelFiles = activeFiles.filter((f) => f.orderId);
  const itemFilesByItem = order.items.map((item) => ({
    item,
    files: activeFiles.filter((f) => f.orderItemId === item.id),
  }));

  const readiness = materials?.readiness;

  function renderFileRow(file: OrderProductionFileRecord) {
    const isR2 = file.mediaAsset.storageProvider === "CLOUDFLARE_R2";
    const previewable = !isR2 && isPreviewableProductionMime(file.mediaAsset.mimeType);
    const openUrl = `/api/production-files/${file.id}/open`;
    const downloadUrl = `/api/production-files/${file.id}/download`;
    return (
      <div key={file.id} className="production-pack-file-row">
        <div className="production-pack-file-row__main">
          {previewable && file.mediaAsset.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.mediaAsset.thumbnailUrl ?? file.mediaAsset.url}
              alt=""
              className="production-pack-file-thumb"
            />
          ) : (
            <div className="production-pack-file-icon">{file.mediaAsset.format?.toUpperCase() ?? "FILE"}</div>
          )}
          <div>
            <strong>{file.title ?? file.mediaAsset.filename}</strong>
            <span className={`production-pack-status production-pack-status--${file.status.toLowerCase()}`}>
              {PRODUCTION_FILE_STATUS_LABELS[file.status]}
            </span>
            <p className="admin-field-hint">
              {PRODUCTION_FILE_TYPE_LABELS[file.type]} · v{file.version} · {formatBytes(file.mediaAsset.sizeBytes)}
            </p>
            {(file.appliesToColorName || file.appliesToSize) && (
              <p className="admin-field-hint">
                Áp dụng: {[file.appliesToColorName, file.appliesToSize].filter(Boolean).join(" · ")}
              </p>
            )}
            {file.note && <p className="admin-field-hint">{file.note}</p>}
          </div>
        </div>
        <div className="production-pack-file-row__actions">
          <a href={openUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">
            Mở
          </a>
          <a href={downloadUrl} className="admin-btn admin-btn--secondary admin-btn--xs">
            Tải
          </a>
          {file.status === "ACTIVE" && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void archiveFile(file.id)}>
              Lưu trữ
            </button>
          )}
          {file.status !== "ACTIVE" && (
            <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={() => void setFileActive(file.id)}>
              Đặt làm bản đang sử dụng
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="admin-catalog-fieldset production-pack-section" id="production-pack" style={{ marginTop: 16 }}>
      <legend>BỘ HỒ SƠ SẢN XUẤT</legend>

      <ProductionSheetActions order={order} />

      <div className="production-pack-tabs">
        {(["files", "materials", "availability", "readiness"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-btn admin-btn--secondary admin-btn--small ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "files"
              ? "Tài liệu sản xuất"
              : t === "materials"
                ? "Nguyên phụ liệu"
                : t === "availability"
                  ? "Khả dụng nguyên phụ liệu"
                  : "Kiểm tra sẵn sàng"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : tab === "files" ? (
        <>
          <div style={{ marginBottom: 12 }}>
            <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => setFileFormOpen(true)}>
              Thêm file
            </button>
          </div>

          {fileFormOpen && (
            <form className="production-pack-file-form" onSubmit={(e) => void submitFile(e)}>
              <div className="admin-field">
                <label className="admin-label">Phạm vi</label>
                <select className="admin-input" value={fileScope} onChange={(e) => setFileScope(e.target.value)}>
                  <option value="order">Toàn đơn hàng</option>
                  {order.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Loại file</label>
                <select className="admin-input" value={fileType} onChange={(e) => {
                  setFileType(e.target.value as ProductionFileType);
                  setUploadHint(null);
                }}>
                  {PRODUCTION_FILE_TYPES.map((t) => (
                    <option key={t} value={t}>{PRODUCTION_FILE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">File</label>
                {selectedAsset ? (
                  <p className="admin-field-hint">
                    {selectedAsset.filename} ({formatBytes(selectedAsset.sizeBytes)})
                    {selectedAsset.storageProvider === "CLOUDFLARE_R2" && " · File nguồn bảo mật"}
                  </p>
                ) : (
                  <p className="admin-field-hint">Chưa chọn file</p>
                )}
                {uploadHint && <p className="admin-field-hint">{uploadHint}</p>}
                {uploadError && <p className="admin-field-hint" style={{ color: "var(--primary, #dc2626)" }}>{uploadError}</p>}
                {r2Configured === false && (
                  <p className="admin-field-hint">{ERROR_R2_NOT_CONFIGURED}</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void openMediaPicker()}>
                    Chọn từ thư viện
                  </button>
                  <label className="admin-btn admin-btn--secondary admin-btn--xs">
                    Tải file mới
                    <input
                      ref={uploadRef}
                      type="file"
                      hidden
                      accept={ALLOWED_PRODUCTION_FILE_EXTENSIONS.join(",")}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void uploadProductionFile(f).catch((err: unknown) => {
                            setUploadError(err instanceof Error ? err.message : "Upload thất bại");
                          });
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="admin-field">
                <label className="admin-label">Tiêu đề</label>
                <input className="admin-input" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} placeholder="Tự điền từ tên file nếu để trống" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phiên bản</label>
                <input className="admin-input" type="number" min={1} value={fileVersion} onChange={(e) => setFileVersion(Number(e.target.value))} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Ghi chú</label>
                <textarea className="admin-textarea" rows={2} value={fileNote} onChange={(e) => setFileNote(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={!selectedAsset}>
                  Lưu file
                </button>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setFileFormOpen(false)}>
                  Hủy
                </button>
              </div>
            </form>
          )}

          <h4 className="admin-subtitle">File cấp đơn hàng</h4>
          {orderLevelFiles.length ? orderLevelFiles.map(renderFileRow) : <p className="admin-field-hint">Chưa có file.</p>}

          {itemFilesByItem.map(({ item, files: itemFiles }) => (
            <div key={item.id} style={{ marginTop: 16 }}>
              <h4 className="admin-subtitle">
                {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "Sản phẩm"}
              </h4>
              {itemFiles.length ? itemFiles.map(renderFileRow) : <p className="admin-field-hint">Chưa có file cho dòng này.</p>}
            </div>
          ))}

          {archivedFiles.length > 0 && (
            <details style={{ marginTop: 16 }} open={showArchived} onToggle={(e) => setShowArchived(e.currentTarget.open)}>
              <summary>Lịch sử / file đã lưu trữ ({archivedFiles.length})</summary>
              {archivedFiles.map(renderFileRow)}
            </details>
          )}
        </>
      ) : tab === "materials" ? (
        <>
          {materials?.items.map((row) => (
            <div key={row.orderItemId} style={{ marginBottom: 20 }}>
              <h4 className="admin-subtitle">
                {[row.productNameSnapshot, row.variantNameSnapshot].filter(Boolean).join(" · ")}
                <span className="admin-field-hint"> · {row.totalQuantity} sp</span>
              </h4>
              {row.materials.length === 0 ? (
                <p className="admin-field-hint">Chưa có định mức — cần bổ sung BOM sản phẩm hoặc thêm thủ công.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table--compact">
                    <thead>
                      <tr>
                        <th>Loại</th>
                        <th>Vật tư</th>
                        <th>Mã</th>
                        <th>ĐVT</th>
                        <th>Định mức</th>
                        <th>Hao hụt</th>
                        <th>Cần chuẩn bị</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.materials.map((m) => (
                        <tr key={m.id}>
                          <td>{MATERIAL_TYPE_LABELS[m.materialType]}</td>
                          <td>{m.materialName}</td>
                          <td>{m.materialCode ?? "—"}</td>
                          <td>{m.unit}</td>
                          <td>{m.consumptionPerUnit}</td>
                          <td>{m.wastagePercent}%</td>
                          <td>
                            {m.requiredQuantity}
                            {m.requiredQuantityOverridden && (
                              <span className="admin-field-hint"> (ghi đè thủ công)</span>
                            )}
                            <div className="admin-field-hint">
                              {formatRequiredQuantityFormula(
                                row.totalQuantity,
                                m.consumptionPerUnit,
                                m.wastagePercent,
                                m.unit,
                                m.requiredQuantity,
                              )}
                            </div>
                          </td>
                          <td>{m.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          {materials?.summary && materials.summary.length > 0 && (
            <>
              <h4 className="admin-subtitle">Tổng hợp nguyên phụ liệu đơn hàng</h4>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Vật tư</th>
                      <th>Mã</th>
                      <th>ĐVT</th>
                      <th>Tổng cần chuẩn bị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.summary.map((s, i) => (
                      <tr key={i}>
                        <td>{MATERIAL_TYPE_LABELS[s.materialType as keyof typeof MATERIAL_TYPE_LABELS] ?? s.materialType}</td>
                        <td>{s.materialName}</td>
                        <td>{s.materialCode ?? "—"}</td>
                        <td>{s.unit}</td>
                        <td>{s.totalRequiredQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : tab === "availability" ? (
        <OrderMaterialAvailabilityPanel orderId={orderId} />
      ) : (
        <>
          {readiness ? (
            <ul className="production-readiness-list">
              {readiness.items.map((item) => (
                <li key={item.key} className={`production-readiness-item production-readiness-item--${item.status}`}>
                  <span className="production-readiness-item__label">{item.label}</span>
                  <span className="production-readiness-item__status">
                    {item.status === "complete" ? "Đã đủ" : item.status === "incomplete" ? "Cần bổ sung" : "Không áp dụng"}
                  </span>
                  {item.detail && <p className="admin-field-hint">{item.detail}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-field-hint">Không thể tải checklist.</p>
          )}
          {readiness && !readiness.isReady && (
            <p className="admin-field-hint" style={{ marginTop: 8 }}>
              Khi chuyển sang &quot;Đang sản xuất&quot;, hệ thống sẽ yêu cầu xác nhận nếu hồ sơ chưa đầy đủ.
            </p>
          )}
        </>
      )}

      {pickerOpen && (
        <div className="admin-modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle">Chọn file từ thư viện</h3>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setPickerOpen(false)}>Đóng</button>
            </div>
            <div className="admin-media-grid admin-media-grid--picker">
              {mediaAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="admin-media-card admin-media-card--selectable"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setPickerOpen(false);
                  }}
                >
                  <p className="admin-media-filename">{asset.filename}</p>
                  <p className="admin-field-hint">{formatBytes(asset.sizeBytes)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
