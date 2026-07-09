"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductionFileType } from "@prisma/client";
import { useAdminMutation, useAdminAction } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import {
  MATERIAL_TYPE_LABELS,
  PRODUCTION_FILE_TYPE_LABELS,
  PRODUCTION_FILE_TYPES,
} from "@/features/orders/production-pack-labels";
import { formatRequiredQuantityFormula } from "@/features/orders/bom-calculations";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import {
  ALLOWED_PRODUCTION_FILE_EXTENSIONS,
  classifyProductionFile,
  ERROR_R2_NOT_CONFIGURED,
  getProductionUploadHint,
} from "@/lib/productionFileValidation";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { OrderItemMaterialRecord, OrderProductionFileRecord } from "@/features/orders/production-pack.types";
import type { ProductionReadinessResult } from "@/features/orders/production-readiness.service";
import ProductionSheetActions from "@/components/admin/orders/production-sheet/ProductionSheetActions";
import OrderMaterialAvailabilityPanel from "@/components/admin/orders/OrderMaterialAvailabilityPanel";
import ProductionPackFileRow from "@/components/admin/orders/ProductionPackFileRow";
import OrderItemReadinessBadge from "@/components/admin/orders/OrderItemReadinessBadge";
import { formatOrderItemCardHeading } from "@/features/orders/order-item-display";
import type { ProductionExecutionBundle } from "@/features/orders/production-execution.service";

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
  /** Lock to a single internal tab (production job workspace embed) */
  embeddedTab?: Tab;
  /** Focus files/materials on one order item */
  focusOrderItemId?: string;
  /** Strip outer fieldset chrome for embedded workspace tabs */
  embedMode?: boolean;
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

type EditFileState = {
  id: string;
  type: ProductionFileType;
  title: string;
  version: number;
  note: string;
  appliesToColorName: string;
  appliesToSize: string;
};

const LINK_FAILURE_MESSAGE =
  "File đã tải lên nhưng chưa được gắn vào đơn hàng. Vui lòng thử lại hoặc liên hệ quản trị viên.";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function itemLabel(item: OrderDetailRecord["items"][number]): string {
  return [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "Sản phẩm";
}

function mergeFileRecord(
  prev: OrderProductionFileRecord[],
  file: OrderProductionFileRecord,
): OrderProductionFileRecord[] {
  const withoutDup = prev.filter(
    (existing) =>
      existing.id !== file.id &&
      !(
        existing.mediaAssetId === file.mediaAssetId &&
        existing.orderItemId === file.orderItemId &&
        existing.orderId === file.orderId
      ),
  );
  return [...withoutDup, file];
}

export default function OrderProductionPackSection({
  orderId,
  order,
  onOrderChange,
  embeddedTab,
  focusOrderItemId,
  embedMode = false,
}: Props) {
  const mutate = useAdminMutation();
  const { toast } = useAdminAction();
  const [tab, setTab] = useState<Tab>(embeddedTab ?? "files");
  const [files, setFiles] = useState<OrderProductionFileRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [executionBundle, setExecutionBundle] = useState<ProductionExecutionBundle | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [fileFormOpen, setFileFormOpen] = useState(false);
  const [fileScope, setFileScope] = useState<"order" | string>("order");
  const [fileType, setFileType] = useState<ProductionFileType>("DESIGN_ARTWORK");
  const [fileTitle, setFileTitle] = useState("");
  const [fileVersion, setFileVersion] = useState(1);
  const [fileNote, setFileNote] = useState("");
  const [appliesToColorName, setAppliesToColorName] = useState("");
  const [appliesToSize, setAppliesToSize] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetPick | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetPick[]>([]);
  const [r2Configured, setR2Configured] = useState<boolean | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrderProductionFileRecord | null>(null);
  const [editTarget, setEditTarget] = useState<EditFileState | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, materialsRes, executionRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/production-files`),
        fetch(`/api/orders/${orderId}/materials`),
        fetch(`/api/orders/${orderId}/production-execution`),
      ]);
      const filesData = await filesRes.json();
      const materialsData = await materialsRes.json();
      const executionData = await executionRes.json();
      setFiles(Array.isArray(filesData.files) ? filesData.files : []);
      setMaterials(materialsData as MaterialsPayload);
      setExecutionBundle(executionData.bundle ?? null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const refreshFilesAndReadiness = useCallback(async () => {
    const [filesRes, materialsRes, executionRes] = await Promise.all([
      fetch(`/api/orders/${orderId}/production-files`),
      fetch(`/api/orders/${orderId}/materials`),
      fetch(`/api/orders/${orderId}/production-execution`),
    ]);
    const filesData = await filesRes.json();
    const materialsData = await materialsRes.json();
    const executionData = await executionRes.json();
    setFiles(Array.isArray(filesData.files) ? filesData.files : []);
    setMaterials(materialsData as MaterialsPayload);
    setExecutionBundle(executionData.bundle ?? null);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (embeddedTab) setTab(embeddedTab);
  }, [embeddedTab]);

  useEffect(() => {
    void fetch("/api/production-files/status")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => setR2Configured(Boolean(data.configured)))
      .catch(() => setR2Configured(false));
  }, []);

  function openAddFileForm(scope: "order" | string) {
    setFileScope(scope);
    setFileFormOpen(true);
    setSelectedAsset(null);
    setFileTitle("");
    setFileNote("");
    setFileVersion(1);
    setAppliesToColorName("");
    setAppliesToSize("");
    setUploadHint(null);
    setUploadError(null);
  }

  function openNewVersionForm(file: OrderProductionFileRecord) {
    setFileScope(file.orderItemId ?? "order");
    setFileType(file.type);
    setFileTitle(file.title ?? file.mediaAsset.filename);
    setFileVersion(file.version + 1);
    setFileNote(file.note ?? "");
    setAppliesToColorName(file.appliesToColorName ?? "");
    setAppliesToSize(file.appliesToSize ?? "");
    setSelectedAsset(null);
    setUploadHint(null);
    setUploadError(null);
    setFileFormOpen(true);
  }

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
      storageProvider: typeof a.storageProvider === "string" ? a.storageProvider : undefined,
    }));
    setMediaAssets(list);
  }

  async function linkProductionAsset(asset: MediaAssetPick): Promise<OrderProductionFileRecord> {
    const res = await fetch(`/api/orders/${orderId}/production-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: fileScope === "order" ? orderId : null,
        orderItemId: fileScope === "order" ? null : fileScope,
        mediaAssetId: asset.id,
        type: fileType,
        title: fileTitle || asset.filename,
        version: fileVersion,
        note: fileNote || null,
        appliesToColorName: appliesToColorName.trim() || null,
        appliesToSize: appliesToSize.trim() || null,
        setAsActive: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body.message === "string" ? body.message : LINK_FAILURE_MESSAGE);
    }
    return body.file as OrderProductionFileRecord;
  }

  async function uploadProductionAsset(file: File): Promise<MediaAssetPick> {
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

      return {
        id: String(complete.asset.id),
        filename: String(complete.asset.filename),
        url: String(complete.asset.url),
        mimeType: String(complete.asset.mimeType),
        sizeBytes: Number(complete.asset.sizeBytes ?? 0),
        storageProvider: "CLOUDFLARE_R2",
      };
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("productionFile", "true");
    fd.append("productionFileType", fileType);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "Upload thất bại");
    return {
      id: String(data.id),
      filename: String(data.filename),
      url: String(data.url),
      mimeType: String(data.mimeType),
      sizeBytes: Number(data.sizeBytes ?? 0),
      storageProvider: "CLOUDINARY",
    };
  }

  async function finishFileLink(
    asset: MediaAssetPick,
    successToast: string,
  ): Promise<void> {
    try {
      const linked = await linkProductionAsset(asset);
      setFiles((prev) => mergeFileRecord(prev, linked));
      setFileFormOpen(false);
      setSelectedAsset(null);
      setFileTitle("");
      setFileNote("");
      setUploadHint(null);
      setUploadError(null);
      await refreshFilesAndReadiness();
      toast.success(successToast);
    } catch (err) {
      setSelectedAsset(asset);
      setUploadError(err instanceof Error ? err.message : LINK_FAILURE_MESSAGE);
    }
  }

  async function handleUploadFile(file: File) {
    try {
      const asset = await uploadProductionAsset(file);
      const successToast =
        fileScope === "order"
          ? "Đã thêm tài liệu chung cho đơn hàng."
          : "Đã thêm tài liệu cho sản phẩm.";
      await finishFileLink(asset, successToast);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload thất bại");
    }
  }

  async function submitFile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    const successToast =
      fileScope === "order"
        ? "Đã thêm tài liệu chung cho đơn hàng."
        : "Đã thêm tài liệu cho sản phẩm.";
    await mutate({
      loadingMessage: "Đang thêm file…",
      successMessage: successToast,
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
            appliesToColorName: appliesToColorName.trim() || null,
            appliesToSize: appliesToSize.trim() || null,
            setAsActive: true,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.file as OrderProductionFileRecord);
      },
      onSuccess: async (file) => {
        setFileFormOpen(false);
        setSelectedAsset(null);
        setFileTitle("");
        setFileNote("");
        setUploadHint(null);
        setUploadError(null);
        if (file) {
          setFiles((prev) => mergeFileRecord(prev, file));
        }
        await refreshFilesAndReadiness();
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
        return parseAdminJsonResponse(res, (body) => body.file as OrderProductionFileRecord);
      },
      onSuccess: async (file) => {
        if (file) {
          setFiles((prev) => prev.map((f) => (f.id === file.id ? file : f)));
        }
        await refreshFilesAndReadiness();
      },
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
        return parseAdminJsonResponse(res, (body) => body.file as OrderProductionFileRecord);
      },
      onSuccess: async (file) => {
        if (file) {
          setFiles((prev) => prev.map((f) => (f.id === file.id ? file : f)));
        }
        await refreshFilesAndReadiness();
      },
    });
  }

  async function confirmDeleteFile() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    await mutate({
      loadingMessage: "Đang xóa file…",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-files/${targetId}`, {
          method: "DELETE",
        });
        return parseAdminJsonResponse(res, (body) => ({
          removedRelationOnly: Boolean(body.removedRelationOnly),
        }));
      },
      onSuccess: async (result) => {
        setDeleteTarget(null);
        setFiles((prev) => prev.filter((f) => f.id !== targetId));
        await refreshFilesAndReadiness();
        if (result?.removedRelationOnly) {
          toast.success("Đã gỡ file khỏi bộ hồ sơ sản xuất.");
        } else {
          toast.success("Đã xóa file khỏi bộ hồ sơ sản xuất.");
        }
      },
    });
  }

  async function saveFileEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    await mutate({
      loadingMessage: "Đang lưu…",
      successMessage: "Đã cập nhật thông tin file.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production-files/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: editTarget.type,
            title: editTarget.title || null,
            version: editTarget.version,
            note: editTarget.note || null,
            appliesToColorName: editTarget.appliesToColorName.trim() || null,
            appliesToSize: editTarget.appliesToSize.trim() || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.file as OrderProductionFileRecord);
      },
      onSuccess: async (file) => {
        setEditTarget(null);
        if (file) {
          setFiles((prev) => prev.map((f) => (f.id === file.id ? file : f)));
        }
        await refreshFilesAndReadiness();
      },
    });
  }

  const activeFiles = files.filter((f) => f.status === "ACTIVE");
  const archivedFiles = files.filter((f) => f.status !== "ACTIVE");
  const orderLevelFiles = activeFiles.filter((f) => !f.orderItemId);
  const scopedOrderItems = focusOrderItemId
    ? order.items.filter((item) => item.id === focusOrderItemId)
    : order.items;
  const itemFilesByItem = scopedOrderItems.map((item) => ({
    item,
    files: activeFiles.filter((f) => f.orderItemId === item.id),
  }));
  const focusedItemFiles = focusOrderItemId
    ? activeFiles.filter((f) => f.orderItemId === focusOrderItemId)
    : [];
  const focusedArchivedFiles = focusOrderItemId
    ? archivedFiles.filter((f) => !f.orderItemId || f.orderItemId === focusOrderItemId)
    : archivedFiles;
  const focusedReadiness = focusOrderItemId
    ? executionBundle?.items.find((i) => i.orderItemId === focusOrderItemId)?.readiness
    : null;
  const latestFocusedVersion =
    focusedItemFiles.length > 0
      ? Math.max(...focusedItemFiles.map((f) => f.version))
      : null;

  const readiness = materials?.readiness;
  const materialItems = focusOrderItemId
    ? materials?.items.filter((row) => row.orderItemId === focusOrderItemId) ?? []
    : materials?.items ?? [];

  const shellClass = embedMode
    ? "production-pack-section production-pack-section--embed"
    : "admin-catalog-fieldset production-pack-section";
  const ShellTag = embedMode ? "div" : "fieldset";

  function renderFileList(list: OrderProductionFileRecord[]) {
    return list.map((file) => (
      <ProductionPackFileRow
        key={file.id}
        file={file}
        onSetActive={(id) => void setFileActive(id)}
        onArchive={(id) => void archiveFile(id)}
        onDelete={setDeleteTarget}
        onEdit={(f) =>
          setEditTarget({
            id: f.id,
            type: f.type,
            title: f.title ?? f.mediaAsset.filename,
            version: f.version,
            note: f.note ?? "",
            appliesToColorName: f.appliesToColorName ?? "",
            appliesToSize: f.appliesToSize ?? "",
          })
        }
        onNewVersion={openNewVersionForm}
      />
    ));
  }

  const fileForm = fileFormOpen ? (
    <form className="production-pack-file-form" onSubmit={(e) => void submitFile(e)}>
      <div className="admin-field">
        <label className="admin-label">Phạm vi</label>
        {fileScope === "order" ? (
          <select className="admin-input" value={fileScope} onChange={(e) => setFileScope(e.target.value)}>
            <option value="order">Toàn đơn hàng</option>
            {order.items.map((item) => (
              <option key={item.id} value={item.id}>
                {itemLabel(item)}
              </option>
            ))}
          </select>
        ) : (
          <p className="admin-field-hint">
            Sản phẩm: {formatOrderItemCardHeading(order.items.find((i) => i.id === fileScope) ?? order.items[0])}
          </p>
        )}
      </div>
      <div className="admin-field">
        <label className="admin-label">Loại file</label>
        <select
          className="admin-input"
          value={fileType}
          onChange={(e) => {
            setFileType(e.target.value as ProductionFileType);
            setUploadHint(null);
          }}
        >
          {PRODUCTION_FILE_TYPES.map((t) => (
            <option key={t} value={t}>
              {PRODUCTION_FILE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-field">
        <label className="admin-label">File</label>
        {selectedAsset ? (
          <p className="admin-field-hint">
            {selectedAsset.filename} ({formatBytes(selectedAsset.sizeBytes)})
          </p>
        ) : (
          <p className="admin-field-hint">Chưa chọn file</p>
        )}
        {uploadHint && <p className="admin-field-hint">{uploadHint}</p>}
        {uploadError && (
          <p className="admin-field-hint" style={{ color: "var(--primary, #dc2626)" }}>
            {uploadError}
          </p>
        )}
        {r2Configured === false && <p className="admin-field-hint">{ERROR_R2_NOT_CONFIGURED}</p>}
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
                if (f) void handleUploadFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-label">Tiêu đề</label>
        <input
          className="admin-input"
          value={fileTitle}
          onChange={(e) => setFileTitle(e.target.value)}
          placeholder="Tự điền từ tên file nếu để trống"
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Phiên bản</label>
        <input
          className="admin-input"
          type="number"
          min={1}
          value={fileVersion}
          onChange={(e) => setFileVersion(Number(e.target.value))}
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Màu áp dụng (tuỳ chọn)</label>
        <input
          className="admin-input"
          value={appliesToColorName}
          onChange={(e) => setAppliesToColorName(e.target.value)}
          placeholder="VD: Đen"
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Size áp dụng (tuỳ chọn)</label>
        <input
          className="admin-input"
          value={appliesToSize}
          onChange={(e) => setAppliesToSize(e.target.value)}
          placeholder="VD: XL"
        />
      </div>
      <div className="admin-field">
        <label className="admin-label">Ghi chú</label>
        <textarea className="admin-textarea" rows={2} value={fileNote} onChange={(e) => setFileNote(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={!selectedAsset}>
          Lưu file
        </button>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => {
            setFileFormOpen(false);
            setUploadError(null);
            setSelectedAsset(null);
          }}
        >
          Hủy
        </button>
      </div>
    </form>
  ) : null;

  return (
    <ShellTag className={shellClass} id="production-documents" style={{ marginTop: embedMode ? 0 : 16 }}>
      {!embedMode && <legend>Tài liệu sản xuất</legend>}

      {!embedMode && <ProductionSheetActions order={order} />}

      {!embeddedTab && (
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
      )}

      {embedMode && embeddedTab === "files" && (
        <div className="prod-job-pack-summary">
          <span>{focusedItemFiles.length} file đang dùng</span>
          {latestFocusedVersion != null && <span>Phiên bản mới nhất: v{latestFocusedVersion}</span>}
          {focusedReadiness?.state === "MISSING_DOCS" && (
            <span className="prod-job-pack-summary__warn">Thiếu tài liệu bắt buộc</span>
          )}
        </div>
      )}

      {embedMode && embeddedTab === "materials" && (
        <div className="prod-job-pack-summary">
          {materialItems.length === 0 || materialItems.every((r) => r.materials.length === 0) ? (
            <span>Công việc này không yêu cầu vật tư riêng.</span>
          ) : (
            <>
              {readiness?.isReady && <span>Đủ vật tư</span>}
              {readiness && !readiness.isReady && readiness.missingMandatory.length > 0 && (
                <span className="prod-job-pack-summary__warn">Thiếu vật tư</span>
              )}
              {readiness && !readiness.isReady && readiness.missingMandatory.length === 0 && (
                <span className="prod-job-pack-summary__muted">Chờ xác nhận</span>
              )}
            </>
          )}
        </div>
      )}

      {loading ? (
        <AdminInlineLoader message="Đang tải hồ sơ sản xuất…" />
      ) : tab === "files" ? (
        <>
          {fileForm}

          <section className="production-pack-section-block">
            <div className="production-pack-section-block__header">
              <h4 className="admin-subtitle">
                Tài liệu chung của đơn hàng ({orderLevelFiles.length})
              </h4>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--small"
                onClick={() => openAddFileForm("order")}
              >
                Thêm tài liệu chung
              </button>
            </div>
            {orderLevelFiles.length > 0 ? (
              renderFileList(orderLevelFiles)
            ) : (
              <p className="admin-field-hint">Chưa có tài liệu chung cho đơn hàng.</p>
            )}
          </section>

          <section className="production-pack-section-block">
            <h4 className="admin-subtitle">Tài liệu theo sản phẩm</h4>
            {itemFilesByItem.map(({ item, files: itemFiles }) => {
              const readiness = executionBundle?.items.find((i) => i.orderItemId === item.id)?.readiness;
              return (
              <div key={item.id} className="production-pack-product-card">
                <div className="production-pack-product-card__header">
                  <div>
                    <h5 className="admin-subtitle" style={{ margin: 0 }}>
                      {formatOrderItemCardHeading(item)}
                    </h5>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                      <span className="production-pack-product-card__count">
                        {itemFiles.length} tài liệu đang sử dụng
                      </span>
                      {readiness && (
                        <OrderItemReadinessBadge state={readiness.state} label={readiness.stateLabel} />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--small"
                    onClick={() => openAddFileForm(item.id)}
                  >
                    + Thêm tài liệu
                  </button>
                </div>
                {itemFiles.length > 0 ? (
                  renderFileList(itemFiles)
                ) : (
                  <p className="admin-field-hint">Chưa có tài liệu sản xuất cho sản phẩm này.</p>
                )}
              </div>
            );
            })}
          </section>

          {focusedArchivedFiles.length > 0 && (
            <details style={{ marginTop: 16 }} open={showArchived} onToggle={(e) => setShowArchived(e.currentTarget.open)}>
              <summary>Tài liệu đã lưu trữ ({focusedArchivedFiles.length})</summary>
              {renderFileList(focusedArchivedFiles)}
            </details>
          )}
        </>
      ) : tab === "materials" ? (
        <>
          {materialItems.length === 0 ? (
            <p className="admin-field-hint">Công việc này không yêu cầu vật tư riêng.</p>
          ) : (
          materialItems.map((row) => (
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
          ))
          )}

          {materials?.summary && !embedMode && materials.summary.length > 0 && (
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
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setPickerOpen(false)}>
                Đóng
              </button>
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

      {deleteTarget && (
        <div className="admin-modal-overlay" role="presentation">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle">Xóa tài liệu sản xuất?</h3>
            </div>
            <p className="admin-field-hint">
              File sẽ bị gỡ khỏi bộ hồ sơ sản xuất. Hành động này không thể hoàn tác.
            </p>
            <div className="admin-modal-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button type="button" className="admin-btn admin-btn--danger admin-btn--small" onClick={() => void confirmDeleteFile()}>
                Xóa file
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="admin-modal-overlay" role="presentation">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => void saveFileEdit(e)}>
              <div className="admin-modal-header">
                <h3 className="admin-subtitle">Chỉnh sửa thông tin file</h3>
              </div>
              <div className="admin-field">
                <label className="admin-label">Loại file</label>
                <select
                  className="admin-input"
                  value={editTarget.type}
                  onChange={(e) =>
                    setEditTarget((prev) =>
                      prev ? { ...prev, type: e.target.value as ProductionFileType } : prev,
                    )
                  }
                >
                  {PRODUCTION_FILE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PRODUCTION_FILE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Tiêu đề</label>
                <input
                  className="admin-input"
                  value={editTarget.title}
                  onChange={(e) =>
                    setEditTarget((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Phiên bản</label>
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  value={editTarget.version}
                  onChange={(e) =>
                    setEditTarget((prev) =>
                      prev ? { ...prev, version: Number(e.target.value) } : prev,
                    )
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Màu áp dụng</label>
                <input
                  className="admin-input"
                  value={editTarget.appliesToColorName}
                  onChange={(e) =>
                    setEditTarget((prev) =>
                      prev ? { ...prev, appliesToColorName: e.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Size áp dụng</label>
                <input
                  className="admin-input"
                  value={editTarget.appliesToSize}
                  onChange={(e) =>
                    setEditTarget((prev) =>
                      prev ? { ...prev, appliesToSize: e.target.value } : prev,
                    )
                  }
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Ghi chú</label>
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={editTarget.note}
                  onChange={(e) =>
                    setEditTarget((prev) => (prev ? { ...prev, note: e.target.value } : prev))
                  }
                />
              </div>
              <div className="admin-modal-actions" style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setEditTarget(null)}>
                  Hủy
                </button>
                <button type="submit" className="admin-btn admin-btn--primary admin-btn--small">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ShellTag>
  );
}
